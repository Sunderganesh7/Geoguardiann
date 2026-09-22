// backend/services/geoguardianService.js
import axios from "axios";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getAccessToken } from "./sentinelService.js";

const SENTINEL_CATALOG_URL = "https://sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search";
const SENTINEL_PROCESS_URL = "https://sh.dataspace.copernicus.eu/api/v1/process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 🔍 Search Sentinel-2 scenes for a given BBox and Date Range
 */
export const searchSentinelScenes = async (bbox, startDate, endDate, maxCloudCover = 30) => {
  try {
    const token = await getAccessToken();
    const [minLon, minLat, maxLon, maxLat] = bbox.map(Number);

    const payload = {
      bbox: [minLon, minLat, maxLon, maxLat],
      datetime: `${startDate}T00:00:00Z/${endDate}T23:59:59Z`,
      collections: ["sentinel-2-l2a"],
      limit: 100
    };

    console.info("🔍 Querying Copernicus Catalog API with bbox:", payload.bbox, "date range:", payload.datetime);
    
    const response = await axios.post(SENTINEL_CATALOG_URL, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      timeout: 20000
    });

    const features = response.data?.features || [];
    console.info(`Found ${features.length} satellite scenes in search window.`);

    // Map features to readable objects
    const scenes = features.map(feat => {
      const dateStr = feat.properties?.datetime?.split("T")[0];
      const cloudCover = feat.properties?.["eo:cloud_cover"];
      return {
        id: feat.id,
        date: dateStr,
        cloudCover: cloudCover !== undefined ? parseFloat(cloudCover.toFixed(2)) : 100,
        usable: cloudCover !== undefined && cloudCover <= maxCloudCover
      };
    });

    // Group by date and take the one with the lowest cloud cover for each date
    const uniqueDates = {};
    for (const scene of scenes) {
      if (!uniqueDates[scene.date] || uniqueDates[scene.date].cloudCover > scene.cloudCover) {
        uniqueDates[scene.date] = scene;
      }
    }

    const sortedScenes = Object.values(uniqueDates).sort((a, b) => new Date(a.date) - new Date(b.date));
    return sortedScenes;
  } catch (error) {
    console.error("❌ Copernicus scene search failed:", error.response?.data || error.message);
    throw new Error(`Copernicus scene search failed: ${error.response?.data?.error?.message || error.message}`);
  }
};

/**
 * 🛰️ Fetch Sentinel-2 spectral bands B04 (Red), B08 (NIR), SCL, and dataMask
 */
export const fetchNdviData = async (date, bbox, width = 512, height = 512) => {
  const dateObj = new Date(`${date}T00:00:00Z`);
  const [minLon, minLat, maxLon, maxLat] = bbox.map(Number);
  
  // Create a tight 3-day query window around target date to guarantee capture
  const fromDate = new Date(dateObj.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const toDate = new Date(dateObj.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const requestBody = {
    input: {
      bounds: {
        bbox: [minLon, minLat, maxLon, maxLat],
        properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" }
      },
      data: [{
        type: "sentinel-2-l2a",
        dataFilter: {
          timeRange: { from: `${fromDate}T00:00:00Z`, to: `${toDate}T23:59:59Z` },
          mosaickingOrder: "leastCC"
        }
      }]
    },
    output: {
      width: Number(width),
      height: Number(height),
      responses: [{ identifier: "default", format: { type: "image/png" } }]
    },
    evalscript: `//VERSION=3
function setup() {
  return {
    input: ["B04", "B08", "SCL", "dataMask"],
    output: { bands: 3 }
  };
}
function evaluatePixel(sample) {
  let ndvi = 0;
  if (sample.B08 + sample.B04 > 0) {
    ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  }
  let ndviScaled = (ndvi + 1) / 2;
  
  // Cloud masking: SCL (Scene Classification Layer)
  // 3 = cloud shadow, 8 = cloud medium probability, 9 = cloud high probability, 10 = thin cirrus
  let isValid = sample.dataMask;
  if (sample.SCL === 3 || sample.SCL === 8 || sample.SCL === 9 || sample.SCL === 10) {
    isValid = 0;
  }
  return [ndviScaled, isValid, 0];
}`
  };

  try {
    const token = await getAccessToken();
    console.info(`Requesting NDVI spectral bands from Sentinel Hub for ${date} (size ${width}x${height})...`);
    const response = await axios.post(SENTINEL_PROCESS_URL, requestBody, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "image/png"
      },
      responseType: "arraybuffer",
      timeout: 30000
    });

    console.info(`NDVI bands fetched successfully for ${date}.`);
    return Buffer.from(response.data);
  } catch (error) {
    console.error("❌ Sentinel NDVI Process API failed:", error.response?.status, error.message);
    throw new Error(`Sentinel Hub NDVI processing failed: ${error.message}`);
  }
};

/**
 * 📊 Decode raw bands, run statistics, and prepare pixel NDVI values
 */
export const processNdviStatistics = async (imageBuffer) => {
  try {
    const { data, info } = await sharp(imageBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const totalPixels = info.width * info.height;
    let validPixelsCount = 0;
    let ndviSum = 0;
    let minNdvi = 1.0;
    let maxNdvi = -1.0;

    const ndviValues = new Float32Array(totalPixels);
    const validityMap = new Uint8Array(totalPixels);

    for (let i = 0; i < data.length; i += 3) {
      const r = data[i];     // ndviScaled * 255
      const g = data[i + 1]; // isValid * 255
      const pixelIndex = i / 3;

      if (g > 128) { // Valid pixel (not cloudy or edge no-data)
        const ndvi = (r / 255) * 2 - 1;
        
        // Scientific validation: clamp NDVI strictly between -1.0 and 1.0
        const clampedNdvi = Math.min(1.0, Math.max(-1.0, ndvi));
        ndviValues[pixelIndex] = clampedNdvi;
        validityMap[pixelIndex] = 1;

        validPixelsCount++;
        ndviSum += clampedNdvi;
        if (clampedNdvi < minNdvi) minNdvi = clampedNdvi;
        if (clampedNdvi > maxNdvi) maxNdvi = clampedNdvi;
      } else {
        ndviValues[pixelIndex] = 0;
        validityMap[pixelIndex] = 0;
      }
    }

    const validPixelPercentage = totalPixels > 0 ? (validPixelsCount / totalPixels) * 100 : 0;
    const meanNdvi = validPixelsCount > 0 ? ndviSum / validPixelsCount : 0;

    return {
      meanNdvi: validPixelsCount > 0 ? parseFloat(meanNdvi.toFixed(4)) : 0,
      minNdvi: validPixelsCount > 0 ? parseFloat(minNdvi.toFixed(4)) : 0,
      maxNdvi: validPixelsCount > 0 ? parseFloat(maxNdvi.toFixed(4)) : 0,
      validPixelPercentage: parseFloat(validPixelPercentage.toFixed(2)),
      validPixelsCount,
      totalPixels,
      width: info.width,
      height: info.height,
      ndviValues,
      validityMap
    };
  } catch (error) {
    console.error("❌ processNdviStatistics failed:", error.message);
    throw error;
  }
};

/**
 * 🎨 Map raw pixel NDVI values to a standard colormap
 */
export const generateNdviColormap = async (statistics) => {
  try {
    const { ndviValues, validityMap, width, height } = statistics;
    const outBuffer = Buffer.alloc(width * height * 4); // RGBA

    for (let i = 0; i < ndviValues.length; i++) {
      const ndvi = ndviValues[i];
      const isValid = validityMap[i];
      const idx = i * 4;

      if (isValid) {
        let r = 0, g = 0, b = 0;
        // Scientific interpretation classes
        if (ndvi < 0) {
          // Water / Non-vegetated surfaces -> Blue/Gray
          r = 54; g = 117; b = 201;
        } else if (ndvi < 0.2) {
          // Barren land, rocks, sand, concrete -> Sand/Brown
          r = 217; g = 179; b = 128;
        } else if (ndvi < 0.5) {
          // Sparse or low vegetation (shrubs, grassland) -> Yellow-Green
          r = 197; g = 219; b = 92;
        } else if (ndvi < 0.8) {
          // Moderate to dense vegetation -> Light Green / Medium Green
          r = 46; g = 166; b = 74;
        } else {
          // Very dense vegetation -> Dark Forest Green
          r = 14; g = 99; b = 37;
        }
        outBuffer[idx] = r;
        outBuffer[idx + 1] = g;
        outBuffer[idx + 2] = b;
        outBuffer[idx + 3] = 255;
      } else {
        // Cloud or invalid pixels -> Off-white/Gray translucent mask
        outBuffer[idx] = 230;
        outBuffer[idx + 1] = 230;
        outBuffer[idx + 2] = 230;
        outBuffer[idx + 3] = 180;
      }
    }

    return await sharp(outBuffer, { raw: { width, height, channels: 4 } })
      .png()
      .toBuffer();
  } catch (error) {
    console.error("❌ generateNdviColormap failed:", error.message);
    throw error;
  }
};

/**
 * 🟩🟨🟥 Calculate change maps comparing two NDVI acquisitions
 */
export const generateChangeMap = async (beforeStats, afterStats, threshold = 0.1) => {
  try {
    const { width, height, ndviValues: beforeNdvi, validityMap: beforeValid } = beforeStats;
    const { ndviValues: afterNdvi, validityMap: afterValid } = afterStats;

    const outBuffer = Buffer.alloc(width * height * 4); // RGBA
    let totalValidPixels = 0;
    let significantDecreaseCount = 0;
    let moderateDecreaseCount = 0;
    let stableCount = 0;

    for (let i = 0; i < beforeNdvi.length; i++) {
      const idx = i * 4;
      const isValid = beforeValid[i] && afterValid[i];

      if (isValid) {
        totalValidPixels++;
        const bVal = beforeNdvi[i];
        const aVal = afterNdvi[i];
        const diff = aVal - bVal;

        if (diff <= -threshold) {
          significantDecreaseCount++;
          // Significant vegetation decrease -> Red
          outBuffer[idx] = 239;     // R
          outBuffer[idx + 1] = 68;  // G
          outBuffer[idx + 2] = 68;  // B
          outBuffer[idx + 3] = 220; // Opaque-ish
        } else if (diff <= -0.05) {
          moderateDecreaseCount++;
          // Moderate vegetation decrease -> Yellow/Orange
          outBuffer[idx] = 245;
          outBuffer[idx + 1] = 158;
          outBuffer[idx + 2] = 11;
          outBuffer[idx + 3] = 220;
        } else {
          stableCount++;
          // Stable -> Translucent Light Green (very subtle overlay)
          outBuffer[idx] = 16;
          outBuffer[idx + 1] = 185;
          outBuffer[idx + 2] = 129;
          outBuffer[idx + 3] = 40; // High transparency
        }
      } else {
        // Unsuitable cloud / no data in either scene
        outBuffer[idx] = 200;
        outBuffer[idx + 1] = 200;
        outBuffer[idx + 2] = 200;
        outBuffer[idx + 3] = 80;
      }
    }

    const changeMapImage = await sharp(outBuffer, { raw: { width, height, channels: 4 } })
      .png()
      .toBuffer();

    const significantPercentage = totalValidPixels > 0 ? (significantDecreaseCount / totalValidPixels) * 100 : 0;
    const moderatePercentage = totalValidPixels > 0 ? (moderateDecreaseCount / totalValidPixels) * 100 : 0;
    const stablePercentage = totalValidPixels > 0 ? (stableCount / totalValidPixels) * 100 : 0;

    return {
      image: changeMapImage,
      significantDecreaseCount,
      moderateDecreaseCount,
      stableCount,
      totalValidPixels,
      significantPercentage: parseFloat(significantPercentage.toFixed(2)),
      moderatePercentage: parseFloat(moderatePercentage.toFixed(2)),
      stablePercentage: parseFloat(stablePercentage.toFixed(2))
    };
  } catch (error) {
    console.error("❌ generateChangeMap failed:", error.message);
    throw error;
  }
};

// Shared binary classification used by the comparison map and validation suite.
// A scene is classified as changed only when more than 10% of cloud-free pixels
// cross the same NDVI decrease threshold used to render the change map.
export const classifyChangeFromMap = (changeResults, minimumAffectedPercentage = 10) =>
  Number(changeResults?.significantPercentage || 0) > minimumAffectedPercentage;

/**
 * 🗺️ Approximate surface area of an ellipsoidal bounding box in square kilometers
 */
export const calculateBBoxAreaKm2 = (bbox) => {
  const [minLon, minLat, maxLon, maxLat] = bbox.map(Number);
  const R = 6371; // Earth's mean radius in km
  const lat1Rad = (minLat * Math.PI) / 180;
  const lat2Rad = (maxLat * Math.PI) / 180;
  const lonDiff = Math.abs(maxLon - minLon);
  
  // Area = (pi/180) * R^2 * |sin(lat1) - sin(lat2)| * |lonDiff|
  const area = (Math.PI / 180) * R * R * Math.abs(Math.sin(lat1Rad) - Math.sin(lat2Rad)) * lonDiff;
  return parseFloat(area.toFixed(4));
};

/**
 * 🎯 Confusion Matrix & Accuracy Validation Suite (Single point check)
 */
export const validateChangeDetection = (beforeStats, afterStats, threshold = 0.1, groundTruth = []) => {
  if (!groundTruth || groundTruth.length === 0) {
    return { status: "Not evaluated" };
  }

  const { width, height, ndviValues: beforeNdvi, validityMap: beforeValid } = beforeStats;
  const { ndviValues: afterNdvi, validityMap: afterValid } = afterStats;

  let tp = 0; // True Positive
  let fp = 0; // False Positive
  let tn = 0; // True Negative
  let fn = 0; // False Negative

  for (const point of groundTruth) {
    const { lon, lat, changeExpected, bbox } = point;
    if (!bbox) continue;

    const [minLon, minLat, maxLon, maxLat] = bbox;
    if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) continue;

    const xPct = (lon - minLon) / (maxLon - minLon);
    const yPct = (maxLat - lat) / (maxLat - minLat);

    const px = Math.min(width - 1, Math.max(0, Math.floor(xPct * width)));
    const py = Math.min(height - 1, Math.max(0, Math.floor(yPct * height)));
    const idx = py * width + px;

    const isValid = beforeValid[idx] && afterValid[idx];
    if (!isValid) continue;

    const bVal = beforeNdvi[idx];
    const aVal = afterNdvi[idx];
    const diff = aVal - bVal;
    
    const changePredicted = diff <= -threshold;

    if (changePredicted && changeExpected) tp++;
    else if (changePredicted && !changeExpected) fp++;
    else if (!changePredicted && !changeExpected) tn++;
    else if (!changePredicted && changeExpected) fn++;
  }

  const total = tp + fp + tn + fn;
  if (total === 0) {
    return { status: "Not evaluated" };
  }

  const accuracy = (tp + tn) / total;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1Score = precision + recall > 0 ? 2 * ((precision * recall) / (precision + recall)) : 0;

  return {
    status: "Evaluated",
    confusionMatrix: { tp, fp, tn, fn },
    metrics: {
      accuracy: parseFloat((accuracy * 100).toFixed(2)),
      precision: parseFloat((precision * 100).toFixed(2)),
      recall: parseFloat((recall * 100).toFixed(2)),
      f1Score: parseFloat((f1Score * 100).toFixed(2))
    }
  };
};

/**
 * 🧬 Run full evaluation over the fixed verification dataset in validation/samples.json
 */
export const evaluateValidationDataset = async (threshold = 0.1) => {
  const samplesPath = path.join(__dirname, "../validation/samples.json");
  if (!fs.existsSync(samplesPath)) {
    console.warn("⚠️ validation/samples.json not found, skipping validation run.");
    return { status: "Not evaluated", samplesEvaluated: 0 };
  }

  try {
    const samples = JSON.parse(fs.readFileSync(samplesPath, "utf-8"));
    let tp = 0, fp = 0, tn = 0, fn = 0;
    const sampleEvaluations = [];

    for (const sample of samples) {
      try {
        console.info(`Evaluating validation sample ${sample.id}...`);
        
        // Fetch low-res 64x64 maps to save quota and speed up check
        const beforeRaw = await fetchNdviData(sample.beforeDate, sample.bbox, 64, 64);
        const beforeStats = await processNdviStatistics(beforeRaw);

        const afterRaw = await fetchNdviData(sample.afterDate, sample.bbox, 64, 64);
        const afterStats = await processNdviStatistics(afterRaw);

        const changeResults = await generateChangeMap(beforeStats, afterStats, threshold);

        const changePredicted = classifyChangeFromMap(changeResults);
        const expectedChange = sample.referenceLabel === "change";

        if (changePredicted && expectedChange) tp++;
        else if (changePredicted && !expectedChange) fp++;
        else if (!changePredicted && !expectedChange) tn++;
        else if (!changePredicted && expectedChange) fn++;

        sampleEvaluations.push({
          id: sample.id,
          expected: sample.referenceLabel,
          predicted: changePredicted ? "change" : "stable",
          significantPercentage: changeResults.significantPercentage,
          status: "Success"
        });
      } catch (err) {
        console.warn(`⚠️ Validation sample ${sample.id} failed:`, err.message);
        sampleEvaluations.push({
          id: sample.id,
          status: "Error",
          error: err.message
        });
      }
    }

    const total = tp + fp + tn + fn;
    if (total === 0) {
      return {
        status: "Not evaluated",
        message: "No validation samples could be processed (Copernicus API limits or network issues)",
        samplesEvaluated: 0,
        confusionMatrix: { tp: 0, fp: 0, tn: 0, fn: 0 },
        metrics: { accuracy: null, precision: null, recall: null, f1Score: null },
        sampleEvaluations
      };
    }

    const accuracy = (tp + tn) / total;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1Score = precision + recall > 0 ? 2 * ((precision * recall) / (precision + recall)) : 0;

    const actualChange = sampleEvaluations.filter((sample) => sample.status === "Success" && sample.expected === "change").length;
    const actualStable = sampleEvaluations.filter((sample) => sample.status === "Success" && sample.expected === "stable").length;
    const predictedChange = sampleEvaluations.filter((sample) => sample.status === "Success" && sample.predicted === "change").length;
    const predictedStable = sampleEvaluations.filter((sample) => sample.status === "Success" && sample.predicted === "stable").length;
    return {
      status: "Evaluated",
      samplesEvaluated: total,
      sampleSizeWarning: total < 30 ? "Insufficient sample size for a reliable accuracy estimate; metrics are descriptive only." : null,
      classCounts: { actualChange, actualStable, predictedChange, predictedStable },
      confusionMatrix: { tp, fp, tn, fn },
      metrics: {
        accuracy: parseFloat((accuracy * 100).toFixed(1)),
        precision: parseFloat((precision * 100).toFixed(1)),
        recall: parseFloat((recall * 100).toFixed(1)),
        f1Score: parseFloat((f1Score * 100).toFixed(1))
      },
      sampleEvaluations
    };
  } catch (error) {
    console.error("❌ Failed to run validation dataset:", error.message);
    return { status: "Not evaluated", message: error.message };
  }
};
