import { getDb } from "./db.js";

export const isId = (value) => /^\d+$/.test(String(value));

export const asDocument = (row) => {
  if (!row) return null;
  const document = { ...row, _id: String(row.id) };
  delete document.id;
  for (const key of ["bbox", "coordinates", "alert_on_severity", "analysis_data", "metadata"]) {
    if (typeof document[key] === "string") { try { document[key] = JSON.parse(document[key]); } catch {} }
  }
  if (document.user_id !== undefined) { document.userId = String(document.user_id); delete document.user_id; }
  if (document.last_image_id !== undefined) { document.lastImageId = document.last_image_id ? String(document.last_image_id) : null; delete document.last_image_id; }
  if (document.alert_on_severity !== undefined) { document.monitoring = { enabled: Boolean(document.monitoring_enabled), frequency: document.monitoring_frequency, alertOnSeverity: document.alert_on_severity }; delete document.monitoring_enabled; delete document.monitoring_frequency; delete document.alert_on_severity; }
  if (document.analysis_data !== undefined) { document.analysis = document.analysis_data || {}; delete document.analysis_data; }
  if (document.image_file_id !== undefined) { document.imageFileId = String(document.image_file_id); delete document.image_file_id; }
  return document;
};

export async function saveImage({ filename, contentType = "image/jpeg", data, metadata = {}, parentId = null, frameNumber = null, frameDate = null }) {
  const [result] = await getDb().execute("INSERT INTO satellite_images (filename, content_type, image_data, metadata, parent_id, frame_number, frame_date) VALUES (?, ?, ?, ?, ?, ?, ?)", [filename, contentType, data, JSON.stringify(metadata), parentId, frameNumber, frameDate]);
  return String(result.insertId);
}
export async function getImage(id) {
  if (!isId(id)) return null;
  const [rows] = await getDb().execute("SELECT id, filename, content_type, image_data, metadata FROM satellite_images WHERE id = ?", [id]);
  return rows[0] || null;
}
export async function getTimelapseFrames(parentId) {
  const [rows] = await getDb().execute("SELECT id, frame_number, frame_date, metadata FROM satellite_images WHERE parent_id = ? ORDER BY frame_number ASC", [parentId]);
  return rows;
}
