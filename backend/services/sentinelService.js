import axios from "axios";
import sharp from "sharp";

const SENTINEL_TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const SENTINEL_PROCESS_URL = "https://sh.dataspace.copernicus.eu/api/v1/process";
let accessToken = null;
let tokenExpiry = 0;

const getCredentials = () => {
  const clientId = process.env.SENTINEL_CLIENT_ID?.trim();
  const clientSecret = process.env.SENTINEL_CLIENT_SECRET?.trim();
  console.info("Sentinel Client ID loaded:", Boolean(clientId));
  console.info("Sentinel Client Secret loaded:", Boolean(clientSecret));
  if (!clientId || !clientSecret) {
    throw new Error("Sentinel Hub authentication is not configured. Add SENTINEL_CLIENT_ID and SENTINEL_CLIENT_SECRET to backend/.env, then restart the backend.");
  }
  return { clientId, clientSecret };
};

export const getAccessToken = async () => {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;
  const { clientId, clientSecret } = getCredentials();
  console.info("Sentinel OAuth token endpoint:", SENTINEL_TOKEN_URL);
  try {
    const response = await axios.post(SENTINEL_TOKEN_URL, new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }), { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15000 });
    const token = response.data?.access_token;
    if (!token) throw new Error("OAuth response did not include an access token");
    const expiresIn = Number(response.data?.expires_in) || 300;
    accessToken = token;
    tokenExpiry = Date.now() + Math.max(30, expiresIn - 60) * 1000;
    console.info("Sentinel OAuth response status:", response.status);
    return accessToken;
  } catch (error) {
    accessToken = null;
    tokenExpiry = 0;
    const status = error.response?.status;
    const code = typeof error.response?.data?.error === "string" ? error.response.data.error : null;
    console.error("Sentinel OAuth failed:", { status: status || "network_error", code: code || "unavailable" });
    const detail = code ? ` (${code})` : "";
    throw new Error(`Sentinel Hub authentication failed${detail}. Check the Copernicus OAuth client credentials in backend/.env.`);
  }
};

export const fetchSatelliteImage = async (date, bbox, width = 400, height = 400) => {
  if (!Array.isArray(bbox) || bbox.length !== 4 || bbox.some(value => !Number.isFinite(Number(value)))) {
    throw new Error("BBox must be an array of 4 numbers: [minLon, minLat, maxLon, maxLat]");
  }
  const dateObj = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(dateObj.getTime())) throw new Error("Date must be in YYYY-MM-DD format");
  const [minLon, minLat, maxLon, maxLat] = bbox.map(Number);
  if (minLon >= maxLon || minLat >= maxLat || minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90) {
    throw new Error("BBox coordinates are invalid");
  }
  const buildRequestBody = (days, maxCloudCoverage) => {
    const fromDate = new Date(dateObj.getTime() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const toDate = new Date(dateObj.getTime() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return {
    input: { bounds: { bbox: [minLon, minLat, maxLon, maxLat], properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" } }, data: [{ type: "sentinel-2-l2a", dataFilter: { timeRange: { from: `${fromDate}T00:00:00Z`, to: `${toDate}T23:59:59Z` }, maxCloudCoverage, mosaickingOrder: "leastCC" } }] },
    output: { width: Number(width), height: Number(height), responses: [{ identifier: "default", format: { type: "image/jpeg" } }] },
    evalscript: "//VERSION=3\nfunction setup() { return { input: [\"B04\", \"B03\", \"B02\", \"dataMask\"], output: { bands: 3 } }; }\nfunction evaluatePixel(sample) { return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02]; }",
    };
  };
  const isVisibleImage = async image => (await sharp(image).stats()).channels.slice(0, 3).some(channel => channel.max > 5);
  const requestImage = async (token, requestBody) => {
    const response = await axios.post(SENTINEL_PROCESS_URL, requestBody, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "image/jpeg" }, responseType: "arraybuffer", timeout: 60000 });
    console.info("Sentinel Process API response status:", response.status, "content-length:", response.data?.byteLength);
    if (response.status !== 200) {
      throw new Error(`Sentinel Hub returned non-200 status: ${response.status}`);
    }
    console.info("Sentinel Process API response status:", response.status);
    if (!response.data || response.data.byteLength < 1000) return null;
    return Buffer.from(response.data);
  };
  try {
    const token = await getAccessToken();
    let image = await requestImage(token, buildRequestBody(3, 30));
    if (!image || !(await isVisibleImage(image))) {
      console.info("No visible pixels in the primary Sentinel query; retrying the least-cloudy acquisition in a wider date window.");
      image = await requestImage(token, buildRequestBody(30, 100));
    }
    if (!image || !(await isVisibleImage(image))) throw new Error("No usable Sentinel-2 pixels were found for this date and area, even after checking nearby acquisitions. Choose another date or location.");
    return image;
  } catch (error) {
    if (error.message.includes("Sentinel Hub authentication") || error.message.includes("No satellite data") || error.message.includes("No usable Sentinel-2")) throw error;
    const status = error.response?.status;
    console.error("Sentinel Process API failed:", { status: status || "network_error" });
    throw new Error(status ? `Sentinel Hub image request failed (HTTP ${status}). Check the date, bounding box, and data availability.` : `Failed to fetch satellite image: ${error.message}`);
  }
};
