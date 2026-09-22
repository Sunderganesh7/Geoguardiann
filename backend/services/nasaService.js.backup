import axios from "axios";

/**
 * Fetch satellite image from NASA GIBS (Global Imagery Browse Services)
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} layer - NASA imagery layer (example: MODIS_Terra_CorrectedReflectance_TrueColor)
 * @param {array} bbox - Bounding box as array: [minLon, minLat, maxLon, maxLat]
 * @param {number} width - Image width (default: 512)
 * @param {number} height - Image height (default: 512)
 * @returns {Buffer} Image buffer
 */
export const fetchSatelliteImage = async (
  date,
  layer,
  bbox,
  width = 512,
  height = 512
) => {
  try {
    console.log(`🛰️ Fetching from NASA: date=${date}, layer=${layer}`);
    console.log(`📍 BBox: ${JSON.stringify(bbox)}`);

    // Validate bbox
    if (!Array.isArray(bbox) || bbox.length !== 4) {
      throw new Error("BBox must be an array of 4 numbers: [minLon, minLat, maxLon, maxLat]");
    }

    const [minLon, minLat, maxLon, maxLat] = bbox;

    // NASA GIBS WMTS endpoint
    const url = `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi`;

    // Build query parameters
    // For EPSG:4326, BBOX format is: minLon,minLat,maxLon,maxLat
    const params = {
      SERVICE: "WMS",
      REQUEST: "GetMap",
      VERSION: "1.3.0",
      LAYERS: layer,
      STYLES: "",
      FORMAT: "image/jpeg",
      TRANSPARENT: "false",
      HEIGHT: height,
      WIDTH: width,
      CRS: "EPSG:4326",
      BBOX: `${minLon},${minLat},${maxLon},${maxLat}`, // ✅ Format as string with commas
      TIME: date,
    };

    console.log(`🌐 NASA API URL: ${url}`);
    console.log(`📦 Query params:`, params);

    // Make request
    const response = await axios.get(url, {
      params,
      responseType: "arraybuffer", // Get raw binary data
      timeout: 30000, // 30 second timeout
    });

    console.log(`✅ NASA API response received`);
    console.log(`📊 Response size: ${response.data.length} bytes`);
    console.log(`📋 Response headers:`, response.headers);

    if (!response.data || response.data.length === 0) {
      throw new Error("Empty response from NASA API");
    }

    return Buffer.from(response.data, "binary");
  } catch (error) {
    console.error("❌ NASA API fetch error:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    throw new Error(`Failed to fetch satellite image: ${error.message}`);
  }
};