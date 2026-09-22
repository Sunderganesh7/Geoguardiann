import cron from "node-cron";
import { getDb } from "../config/db.js";
import { saveImage } from "../config/storage.js";
import { searchSentinelScenes, fetchNdviData, processNdviStatistics, generateNdviColormap } from "./geoguardianService.js";
import { sendChangeAlert } from "./emailService.js";

const severityFor = (change) => change <= -0.1 ? "high" : change <= -0.04 ? "medium" : "low";
const asBbox = (bbox) => typeof bbox === "string" ? JSON.parse(bbox) : bbox;
const dateDaysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

async function checkRegion(region) {
  const bbox = asBbox(region.bbox);
  const scenes = await searchSentinelScenes(bbox, dateDaysAgo(120), new Date().toISOString().slice(0, 10), 30);
  const usable = scenes.filter((scene) => scene.usable);
  if (usable.length < 2) throw new Error("No suitable satellite scene found for this region and date range.");
  const beforeScene = usable[usable.length - 2], afterScene = usable[usable.length - 1];
  const [beforeStats, afterStats] = await Promise.all([fetchNdviData(beforeScene.date, bbox, 256, 256).then(processNdviStatistics), fetchNdviData(afterScene.date, bbox, 256, 256).then(processNdviStatistics)]);
  if (!beforeStats.validPixelsCount || !afterStats.validPixelsCount) throw new Error("No suitable satellite scene found for this region and date range.");
  const ndviChange = Number((afterStats.meanNdvi - beforeStats.meanNdvi).toFixed(4)), severity = severityFor(ndviChange);
  const imageId = await saveImage({ filename: `monitor_ndvi_${region.id}_${afterScene.date}_${Date.now()}.png`, contentType: "image/png", data: await generateNdviColormap(afterStats), metadata: { type: "monitoring_ndvi", regionId: region.id, date: afterScene.date, bbox, meanNdvi: afterStats.meanNdvi } });
  const analysis = { monitoringRegionId: String(region.id), beforeDate: beforeScene.date, afterDate: afterScene.date, satelliteSceneDate: afterScene.date, cloudCoverage: afterScene.cloudCover, beforeMeanNdvi: beforeStats.meanNdvi, afterMeanNdvi: afterStats.meanNdvi, ndviChange, severity, vegetationStatus: ndviChange < -0.04 ? "vegetation decline detected" : "stable or improved vegetation" };
  await getDb().execute("INSERT INTO analyses (user_id, title, description, location, bbox, nasaLayer, date, image_file_id, analysis_data, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')", [region.user_id, `Monitoring check: ${region.name}`, "Automated Sentinel-2 NDVI monitoring check", region.location, JSON.stringify(bbox), "Sentinel-2 L2A", new Date(afterScene.date), imageId, JSON.stringify(analysis)]);
  const alerts = typeof region.alert_on_severity === "string" ? JSON.parse(region.alert_on_severity) : region.alert_on_severity;
  let alertsSent = 0;
  if (alerts.includes(severity) && region.email) { try { await sendChangeAlert(region.email, { ...analysis, changePercentage: Number((ndviChange * 100).toFixed(2)), location: region.name, date: afterScene.date }); alertsSent = 1; } catch (error) { console.error("Monitoring email alert failed:", error.message); } }
  await getDb().execute("UPDATE monitored_regions SET last_image_id = ?, lastChecked = NOW(), lastChangePercentage = ?, totalAlertsSent = totalAlertsSent + ? WHERE id = ?", [imageId, Number((ndviChange * 100).toFixed(2)), alertsSent, region.id]);
  return { message: `Satellite check completed using scenes from ${beforeScene.date} and ${afterScene.date}.`, regionId: String(region.id), sceneDate: afterScene.date, cloudCoverage: afterScene.cloudCover, beforeNdvi: beforeStats.meanNdvi, afterNdvi: afterStats.meanNdvi, ndviChange, severity, alertsSent };
}

export const manualCheckRegion = async (regionId, userId) => { const [rows] = await getDb().execute("SELECT r.*, u.email FROM monitored_regions r JOIN users u ON u.id = r.user_id WHERE r.id = ? AND r.user_id = ?", [regionId, userId]); if (!rows[0]) throw new Error("Region not found"); return checkRegion(rows[0]); };
const checkRegionsByFrequency = async (frequency) => { const [regions] = await getDb().execute("SELECT r.*, u.email FROM monitored_regions r JOIN users u ON u.id = r.user_id WHERE r.monitoring_enabled = TRUE AND r.monitoring_frequency = ?", [frequency]); for (const region of regions) await checkRegion(region).catch((error) => console.error(`Scheduled monitoring check for ${region.id} failed:`, error.message)); };
export const startScheduler = () => { cron.schedule("0 2 * * *", () => checkRegionsByFrequency("daily")); cron.schedule("0 2 * * 0", () => checkRegionsByFrequency("weekly")); cron.schedule("0 2 1 * *", () => checkRegionsByFrequency("monthly")); };
