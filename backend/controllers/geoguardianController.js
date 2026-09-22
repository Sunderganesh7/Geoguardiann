// backend/controllers/geoguardianController.js
import { 
  searchSentinelScenes, 
  fetchNdviData, 
  processNdviStatistics, 
  generateNdviColormap, 
  generateChangeMap, 
  classifyChangeFromMap,
  calculateBBoxAreaKm2
} from "../services/geoguardianService.js";
import { saveImage, getImage, isId } from "../config/storage.js";
import { getDb } from "../config/db.js";
import { fetchSatelliteImage } from "../services/sentinelService.js";
import axios from "axios";
import { createEnvironmentalReportPdf } from "../services/reportPdfService.js";

/**
 * Parses and validates bounding box input
 */
const parseBbox = (bbox) => {
  const bboxArray = typeof bbox === "string" ? bbox.split(",").map(Number) : bbox;
  if (!Array.isArray(bboxArray) || bboxArray.length !== 4 || bboxArray.some(Number.isNaN)) {
    throw new Error("BBox must be an array of 4 numbers: [minLon, minLat, maxLon, maxLat]");
  }
  const [minLon, minLat, maxLon, maxLat] = bboxArray;
  if (minLon >= maxLon || minLat >= maxLat || minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90) {
    throw new Error("BBox coordinates are invalid. Ensure minLon < maxLon and minLat < maxLat.");
  }
  return bboxArray;
};

/**
 * Reverse geocode a lat/lon using Nominatim (OpenStreetMap — free, no API key).
 * Returns a structured location object. Falls back to "Location name unavailable" on failure.
 * Nominatim fair-use: 1 req/second, must identify via User-Agent.
 */
const reverseGeocode = async (lat, lon) => {
  try {
    const response = await axios.get("https://nominatim.openstreetmap.org/reverse", {
      params: { lat, lon, format: "json", zoom: 10, addressdetails: 1 },
      headers: {
        "User-Agent": "GeoGuardian/1.0 (environmental-monitoring-platform)",
        "Accept-Language": "en"
      },
      timeout: 6000
    });

    const data = response.data;
    if (!data || !data.address) return { name: "Location name unavailable", raw: null };

    const addr = data.address;
    const parts = [];
    const suburb = addr.suburb || addr.neighbourhood || addr.village || addr.hamlet || null;
    const city   = addr.town || addr.city || addr.municipality || addr.county || null;
    const state  = addr.state || null;
    const country = addr.country || null;

    if (suburb)  parts.push(suburb);
    if (city && city !== suburb) parts.push(city);
    if (addr.state_district && addr.state_district !== city) parts.push(addr.state_district);
    if (state)   parts.push(state);
    if (country) parts.push(country);

    const name = parts.length > 0 ? [...new Set(parts)].join(", ") : (data.display_name || "Location name unavailable");

    return { name, suburb, city, district: addr.county || addr.state_district || null, state, country, raw: addr };
  } catch (err) {
    console.warn("⚠️ Reverse geocoding failed:", err.message);
    return { name: "Location name unavailable", raw: null };
  }
};



/**
 * GET /api/geoguardian/scenes
 */
export const getScenes = async (req, res) => {
  try {
    const { bbox, startDate, endDate } = req.query;
    if (!bbox || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing query parameters: bbox, startDate, endDate" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || new Date(`${startDate}T00:00:00Z`) > new Date(`${endDate}T00:00:00Z`)) {
      return res.status(400).json({ success: false, error: "Dates must be YYYY-MM-DD and startDate must not be after endDate" });
    }
    const bboxArray = parseBbox(bbox);
    const cloudCover = Number(req.query.cloudCover);
    if (!Number.isNaN(cloudCover) && (cloudCover < 0 || cloudCover > 100)) return res.status(400).json({ success: false, error: "cloudCover must be between 0 and 100" });
    const scenes = await searchSentinelScenes(bboxArray, startDate, endDate, Number.isNaN(cloudCover) ? 30 : cloudCover);
    res.json({ success: true, totalScenes: scenes.length, scenes });
  } catch (error) {
    res.status(502).json({ success: false, error: error.message, details: "Satellite data service unavailable or returned an invalid response." });
  }
};

/**
 * POST /api/geoguardian/ndvi
 */
export const getNdvi = async (req, res) => {
  try {
    const { date, bbox } = req.body;
    if (!date || !bbox) return res.status(400).json({ error: "Missing required fields: date, bbox" });

    const bboxArray = parseBbox(bbox);
    const imageBuffer = await fetchNdviData(date, bboxArray);
    const stats = await processNdviStatistics(imageBuffer);
    const colormap = await generateNdviColormap(stats);

    const filename = `ndvi_${date}_${Date.now()}.png`;
    const imageId = await saveImage({
      filename,
      contentType: "image/png",
      data: colormap,
      metadata: { type: "ndvi_colormap", date, bbox: bboxArray, meanNdvi: stats.meanNdvi, validPixelPercentage: stats.validPixelPercentage }
    });

    res.json({
      success: true,
      imageId,
      imageUrl: `/api/geoguardian/image/${imageId}`,
      statistics: {
        date,
        meanNdvi: stats.meanNdvi,
        minNdvi: stats.minNdvi,
        maxNdvi: stats.maxNdvi,
        validPixelPercentage: stats.validPixelPercentage,
        validPixelsCount: stats.validPixelsCount,
        totalPixels: stats.totalPixels
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/geoguardian/compare
 */
export const compareNdvi = async (req, res) => {
  try {
    const { beforeDate, afterDate, bbox, threshold = 0.1 } = req.body;
    if (!beforeDate || !afterDate || !bbox) {
      return res.status(400).json({ error: "Missing required fields: beforeDate, afterDate, bbox" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(beforeDate) || !/^\d{4}-\d{2}-\d{2}$/.test(afterDate) || beforeDate >= afterDate) {
      return res.status(400).json({ success: false, error: "beforeDate and afterDate must be distinct YYYY-MM-DD dates, with beforeDate earlier than afterDate." });
    }

    const bboxArray = parseBbox(bbox);
    const [minLon, minLat, maxLon, maxLat] = bboxArray;

    // Compute center coordinates from the active bbox
    const centerLat = parseFloat(((minLat + maxLat) / 2).toFixed(6));
    const centerLon = parseFloat(((minLon + maxLon) / 2).toFixed(6));

    // Reverse geocode center point to get human-readable location name
    console.info(`🌍 Reverse geocoding center (${centerLat}, ${centerLon}) for bbox [${bboxArray}]...`);
    const locationInfo = await reverseGeocode(centerLat, centerLon);
    console.info(`📍 Location resolved: ${locationInfo.name}`);

    const beforeRaw = await fetchNdviData(beforeDate, bboxArray);
    const beforeStats = await processNdviStatistics(beforeRaw);

    const afterRaw = await fetchNdviData(afterDate, bboxArray);
    const afterStats = await processNdviStatistics(afterRaw);

    const changeResults = await generateChangeMap(beforeStats, afterStats, Number(threshold));
    const vegetationChangeDetected = classifyChangeFromMap(changeResults);

    const filename = `change_${beforeDate}_${afterDate}_${Date.now()}.png`;
    const changeImageId = await saveImage({
      filename, contentType: "image/png", data: changeResults.image,
      metadata: { type: "vegetation_change_map", beforeDate, afterDate, bbox: bboxArray, threshold }
    });

    const beforeColormap = await generateNdviColormap(beforeStats);
    const beforeImageId = await saveImage({
      filename: `ndvi_before_${beforeDate}_${Date.now()}.png`, contentType: "image/png",
      data: beforeColormap, metadata: { type: "ndvi_colormap", date: beforeDate, bbox: bboxArray }
    });

    const afterColormap = await generateNdviColormap(afterStats);
    const afterImageId = await saveImage({
      filename: `ndvi_after_${afterDate}_${Date.now()}.png`, contentType: "image/png",
      data: afterColormap, metadata: { type: "ndvi_colormap", date: afterDate, bbox: bboxArray }
    });

    // Fetch true color RGB satellite scenes for the exact same dates/bbox
    let beforeSatImageUrl = null;
    let afterSatImageUrl = null;

    try {
      console.info(`📥 Fetching true color satellite image for before date: ${beforeDate}...`);
      const beforeSatBuffer = await fetchSatelliteImage(beforeDate, bboxArray);
      const beforeSatId = await saveImage({
        filename: `sat_before_${beforeDate}_${Date.now()}.jpg`, contentType: "image/jpeg", data: beforeSatBuffer,
        metadata: { type: "satellite_rgb", date: beforeDate, bbox: bboxArray }
      });
      beforeSatImageUrl = `/api/geoguardian/image/${beforeSatId}`;
    } catch (satErr) {
      console.error("❌ Failed to fetch true color before satellite image:", satErr.message);
    }

    try {
      console.info(`📥 Fetching true color satellite image for after date: ${afterDate}...`);
      const afterSatBuffer = await fetchSatelliteImage(afterDate, bboxArray);
      const afterSatId = await saveImage({
        filename: `sat_after_${afterDate}_${Date.now()}.jpg`, contentType: "image/jpeg", data: afterSatBuffer,
        metadata: { type: "satellite_rgb", date: afterDate, bbox: bboxArray }
      });
      afterSatImageUrl = `/api/geoguardian/image/${afterSatId}`;
    } catch (satErr) {
      console.error("❌ Failed to fetch true color after satellite image:", satErr.message);
    }

    const totalAreaKm2 = calculateBBoxAreaKm2(bboxArray);
    const affectedFraction = changeResults.totalValidPixels > 0
      ? changeResults.significantDecreaseCount / changeResults.totalValidPixels
      : 0;
    const affectedAreaKm2 = totalAreaKm2 * affectedFraction;
    const affectedPercentage = changeResults.significantPercentage;

    const ndviChange = afterStats.meanNdvi - beforeStats.meanNdvi;
    // Guard division by zero AND ensure abs() so sign doesn't distort the ratio
    const relativeChange = (beforeStats.meanNdvi !== 0 && !Number.isNaN(beforeStats.meanNdvi))
      ? parseFloat(((ndviChange / Math.abs(beforeStats.meanNdvi)) * 100).toFixed(2))
      : null;

    let overallStatus = "stable";
    if (ndviChange >= 0.05) overallStatus = "increased significantly";
    else if (ndviChange > 0.01) overallStatus = "increased moderately";
    else if (ndviChange <= -0.05) overallStatus = "decreased significantly";
    else if (ndviChange < -0.01) overallStatus = "decreased moderately";

    let localStatus = "no significant local vegetation decline detected";
    if (affectedPercentage > 15) localStatus = "significant local vegetation decline detected";
    else if (affectedPercentage > 5) localStatus = "moderate local vegetation decline detected";

    const changeSign = ndviChange >= 0 ? "+" : "";
    const relChangeText = relativeChange !== null ? `${changeSign}${relativeChange}%` : "N/A";
    const status = `Overall mean NDVI ${overallStatus} (${changeSign}${ndviChange.toFixed(4)}, relative change of ${relChangeText}). Locally, ${localStatus} affecting ${affectedAreaKm2.toFixed(4)} km² (${affectedPercentage}% of monitored area).`;

    // Persist record to DB
    let dbRecordId = null;
    try {
      const [result] = await getDb().execute(
        `INSERT INTO geoguardian_records 
        (user_id, bounding_box, start_date, end_date, selected_scenes, mean_ndvi, before_ndvi, after_ndvi, ndvi_change, affected_area) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user._id, JSON.stringify(bboxArray), beforeDate, afterDate,
          JSON.stringify([beforeDate, afterDate]),
          afterStats.meanNdvi, beforeStats.meanNdvi, afterStats.meanNdvi,
          parseFloat(ndviChange.toFixed(4)), parseFloat(affectedAreaKm2.toFixed(4))
        ]
      );
      dbRecordId = result.insertId;
      const historyAnalysis = { beforeDate, afterDate, beforeMeanNdvi: beforeStats.meanNdvi, afterMeanNdvi: afterStats.meanNdvi, ndviChange: parseFloat(ndviChange.toFixed(4)), relativeChange, affectedPercentage, affectedAreaKm2: parseFloat(affectedAreaKm2.toFixed(4)), cloudCoverage: null, status, severity: affectedPercentage > 15 ? "high" : affectedPercentage > 5 ? "medium" : "low", satelliteSceneDate: afterDate };
      const [historyInsert] = await getDb().execute("INSERT INTO analyses (user_id, title, description, location, bbox, nasaLayer, date, image_file_id, analysis_data, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')", [req.user._id, `NDVI analysis ${afterDate}`, "Sentinel-2 NDVI change analysis", locationInfo.name, JSON.stringify(bboxArray), "Sentinel-2 L2A", new Date(afterDate), afterImageId, JSON.stringify(historyAnalysis)]);
      historyAnalysis.historyAnalysisId = String(historyInsert.insertId);
    } catch (dbError) {
      console.error("Failed to persist completed GeoGuardian analysis:", dbError.message);
      throw new Error("Analysis completed but could not be saved to the database: " + dbError.message);
    }

    res.json({
      success: true,
      // Unique analysis identifier for this run
      analysisId: dbRecordId,
      // Dynamic location from reverse geocoding
      locationName: locationInfo.name,
      locationDetails: {
        suburb: locationInfo.suburb || null,
        city: locationInfo.city || null,
        district: locationInfo.district || null,
        state: locationInfo.state || null,
        country: locationInfo.country || null
      },
      // Computed center and the active bbox
      center: { lat: centerLat, lon: centerLon },
      bbox: bboxArray,
      dataset: { bbox: bboxArray, beforeDate, afterDate, satelliteSource: "Sentinel-2 L2A", ndviThreshold: Number(threshold), sceneIds: { before: beforeDate, after: afterDate }, imageIds: { before: beforeImageId, after: afterImageId, change: changeImageId } },
      changeImageId,
      changeImageUrl: `/api/geoguardian/image/${changeImageId}`,
      beforeImageUrl: `/api/geoguardian/image/${beforeImageId}`,
      afterImageUrl: `/api/geoguardian/image/${afterImageId}`,
      beforeSatImageUrl,
      afterSatImageUrl,
      dbRecordId,
      analysis: {
        beforeDate, afterDate,
        beforeMeanNdvi: beforeStats.meanNdvi,
        afterMeanNdvi: afterStats.meanNdvi,
        beforeMinNdvi: beforeStats.minNdvi,
        beforeMaxNdvi: beforeStats.maxNdvi,
        afterMinNdvi: afterStats.minNdvi,
        afterMaxNdvi: afterStats.maxNdvi,
        beforeValidPixels: beforeStats.validPixelPercentage,
        afterValidPixels: afterStats.validPixelPercentage,
        ndviChange: parseFloat(ndviChange.toFixed(4)),
        relativeChange,
        totalMonitoredAreaKm2: parseFloat(totalAreaKm2.toFixed(4)),
        changedAreaKm2: parseFloat(affectedAreaKm2.toFixed(4)),
        affectedPercentage,
        status,
        threshold: Number(threshold),
        distribution: {
          significantDecrease: changeResults.significantPercentage,
          moderateDecrease: changeResults.moderatePercentage,
          stable: changeResults.stablePercentage
        }
        , vegetationChangeDetected
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/geoguardian/report
 */
export const getReport = async (req, res) => {
  try {
    const {
      beforeDate, afterDate,
      beforeMeanNdvi, afterMeanNdvi,
      relativeChange, totalMonitoredAreaKm2,
      changedAreaKm2, affectedPercentage, status,
      beforeValidPixels, afterValidPixels,
      // Location data from the active analysis
      bbox, locationName, center, analysisId
    } = req.body;

    if (!beforeDate || !afterDate || beforeMeanNdvi === undefined || afterMeanNdvi === undefined) {
      return res.status(400).json({ error: "Missing comparison statistics required to generate report" });
    }

    // Use provided location, or resolve from bbox if not provided
    let resolvedLocation = locationName || "Location name unavailable";
    let resolvedCenter = center || null;

    if (!locationName && bbox) {
      try {
        const bboxArr = typeof bbox === "string" ? bbox.split(",").map(Number) : bbox;
        if (Array.isArray(bboxArr) && bboxArr.length === 4) {
          const cLat = parseFloat(((bboxArr[1] + bboxArr[3]) / 2).toFixed(6));
          const cLon = parseFloat(((bboxArr[0] + bboxArr[2]) / 2).toFixed(6));
          const geo = await reverseGeocode(cLat, cLon);
          resolvedLocation = geo.name;
          resolvedCenter = { lat: cLat, lon: cLon };
        }
      } catch (_) { /* use fallback */ }
    }

    const ndviChange = afterMeanNdvi - beforeMeanNdvi;
    const changeSign = ndviChange >= 0 ? "+" : "";
    const bboxDisplay = bbox ? (typeof bbox === "string" ? bbox : bbox.join(",")) : "N/A";
    const centerDisplay = resolvedCenter
      ? `${resolvedCenter.lat}°N, ${resolvedCenter.lon}°E`
      : "N/A";

    const reportContent = `GEOGUARDIAN ENVIRONMENTAL MONITORING REPORT
${"=".repeat(60)}

ANALYSIS IDENTIFICATION
${"—".repeat(60)}
Analysis ID:          ${analysisId || "N/A"}
Generated:            ${new Date().toISOString()}

LOCATION
${"—".repeat(60)}
Location:             ${resolvedLocation}
Coordinates (center): ${centerDisplay}
Bounding Box:         ${bboxDisplay}

MONITORING CONFIGURATION
${"—".repeat(60)}
Satellite Platform:   Sentinel-2 (MSI)
Data Source:          Copernicus Data Space Ecosystem
Spectral Bands:       Band 4 (Red, 665 nm) + Band 8 (NIR, 842 nm)
Processing Level:     Level 2A (atmospherically corrected)
Cloud Masking:        Scene Classification Layer (SCL)
Observation Period:   ${beforeDate}  →  ${afterDate}
Total Monitored Area: ${totalMonitoredAreaKm2 != null ? totalMonitoredAreaKm2 + " km²" : "N/A"}

VEGETATION INDEX METRICS
${"—".repeat(60)}
Before Period Mean NDVI:  ${typeof beforeMeanNdvi === "number" ? beforeMeanNdvi.toFixed(4) : "N/A"}   (${beforeDate})
After Period Mean NDVI:   ${typeof afterMeanNdvi === "number" ? afterMeanNdvi.toFixed(4) : "N/A"}   (${afterDate})
NDVI Change:              ${changeSign}${ndviChange.toFixed(4)}
Relative Change Ratio:    ${relativeChange != null ? changeSign + relativeChange + "%" : "N/A (baseline NDVI = 0)"}
Before Scene Data Quality:${beforeValidPixels != null ? " " + beforeValidPixels + "% valid pixels" : " N/A"}
After Scene Data Quality: ${afterValidPixels != null ? " " + afterValidPixels + "% valid pixels" : " N/A"}

SPATIAL VEGETATION ANALYSIS
${"—".repeat(60)}
Area of Significant Decline: ${changedAreaKm2 != null ? changedAreaKm2 + " km²" : "N/A"}
Affected Percentage:         ${affectedPercentage != null ? affectedPercentage + "%" : "N/A"}
System Assessment:           ${status || "Stable"}

SCIENTIFIC INTERPRETATION
${"—".repeat(60)}
${affectedPercentage > 5
  ? "A measurable decrease in the Normalized Difference Vegetation Index was detected across the selected monitoring period."
  : "The monitored area shows stable or increasing vegetation conditions over the selected period."}

IMPORTANT LIMITATIONS
${"—".repeat(60)}
This report reflects satellite-derived spectral indices only.
It does NOT constitute definitive evidence of deforestation or
any specific land-cover change. NDVI fluctuations can result from:

  1. Vegetation removal (deforestation, logging, clearing)
  2. Wildfire or controlled agricultural burning
  3. Drought, heat stress, or water-table changes
  4. Normal seasonal phenological variation
  5. Agricultural harvest cycles
  6. Cloud shadow artefacts or atmospheric residuals

Independent ground-truthing and field verification are required
to identify specific causal factors.

${"=".repeat(60)}
Generated by GeoGuardian | Copernicus Data Space Ecosystem`;

    res.json({ success: true, report: reportContent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const downloadReportPdf = async (req, res) => {
  try {
    const { analysisId, location, bbox, analysis, beforeImageId, afterImageId, changeImageId } = req.body;
    if (!analysis || !analysis.beforeDate || !analysis.afterDate || !bbox) return res.status(400).json({ success: false, error: "A completed analysis with dates and bounding box is required to generate a report." });
    const pdf = await createEnvironmentalReportPdf({ analysisId, location, bbox, analysis, beforeImageId, afterImageId, changeImageId });
    const safeId = String(analysisId || "current").replace(/[^a-zA-Z0-9_-]/g, "_");
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=GeoGuardian_Environmental_Report_Analysis_${safeId}.pdf`, "Content-Length": pdf.length, "Cache-Control": "no-store" });
    res.send(pdf);
  } catch (error) { res.status(500).json({ success: false, error: "Environmental PDF generation failed", details: error.message }); }
};

/**
 * GET /api/geoguardian/image/:id
 */
export const getImageById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isId(id)) return res.status(400).json({ error: "Invalid image ID format" });
    const file = await getImage(id);
    if (!file) return res.status(404).json({ error: "Image not found in storage" });
    res.set({
      "Content-Type": file.content_type,
      "Content-Length": file.image_data.length,
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*"
    });
    res.send(file.image_data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
