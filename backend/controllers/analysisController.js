import { getDb } from "../config/db.js";
import { asDocument, isId } from "../config/storage.js";

const allowedSorts = new Set(["createdAt", "updatedAt", "date", "title"]);
export const saveAnalysis = async (req, res) => {
  try {
    const { title, description, location, bbox, nasaLayer, date, imageFileId, analysis } = req.body;
    if (!imageFileId || !bbox || !nasaLayer || !date || !isId(imageFileId)) return res.status(400).json({ error: "Missing required fields: imageFileId, bbox, nasaLayer, date" });
    const [result] = await getDb().execute("INSERT INTO analyses (user_id, title, description, location, bbox, nasaLayer, date, image_file_id, analysis_data, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')", [req.user._id, title || "Satellite Analysis", description || "", location || "Unknown", JSON.stringify(bbox), nasaLayer, new Date(date), imageFileId, JSON.stringify(analysis || {})]);
    const [rows] = await getDb().execute("SELECT * FROM analyses WHERE id = ?", [result.insertId]);
    const data = asDocument(rows[0]);
    res.status(201).json({ success: true, message: "Analysis saved successfully", analysisId: data._id, data });
  } catch (err) { res.status(500).json({ error: "Failed to save analysis", details: err.message }); }
};
export const getUserAnalyses = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const sortBy = allowedSorts.has(req.query.sortBy) ? req.query.sortBy : "createdAt";
    // `LIMIT` / `OFFSET` placeholders are not supported by every MySQL server
    // configuration. These values are parsed and bounded above, while sortBy is
    // selected from an allow-list, so interpolation remains safe.
    const offset = (page - 1) * limit;
    const [rows] = await getDb().execute(`SELECT * FROM analyses WHERE user_id = ? ORDER BY \`${sortBy}\` DESC LIMIT ${limit} OFFSET ${offset}`, [req.user._id]);
    const [[count]] = await getDb().execute("SELECT COUNT(*) AS total FROM analyses WHERE user_id = ?", [req.user._id]);
    res.json({ success: true, data: rows.map(asDocument), pagination: { page, limit, total: count.total, pages: Math.ceil(count.total / limit) } });
  } catch (err) { res.status(500).json({ error: "Failed to fetch analyses", details: err.message }); }
};
export const getAnalysisById = async (req, res) => {
  try { if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid analysis ID" }); const [rows] = await getDb().execute("SELECT * FROM analyses WHERE id = ? AND user_id = ?", [req.params.id, req.user._id]); if (!rows[0]) return res.status(404).json({ error: "Analysis not found or access denied" }); res.json({ success: true, data: asDocument(rows[0]) }); } catch (err) { res.status(500).json({ error: "Failed to fetch analysis", details: err.message }); }
};
export const deleteAnalysis = async (req, res) => {
  try { if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid analysis ID" }); const [result] = await getDb().execute("DELETE FROM analyses WHERE id = ? AND user_id = ?", [req.params.id, req.user._id]); if (!result.affectedRows) return res.status(404).json({ error: "Analysis not found or access denied" }); res.json({ success: true, message: "Analysis deleted successfully" }); } catch (err) { res.status(500).json({ error: "Failed to delete analysis", details: err.message }); }
};
export const updateAnalysis = async (req, res) => {
  try { if (!isId(req.params.id)) return res.status(400).json({ error: "Invalid analysis ID" }); const { title, description, location } = req.body; const [result] = await getDb().execute("UPDATE analyses SET title = COALESCE(?, title), description = COALESCE(?, description), location = COALESCE(?, location) WHERE id = ? AND user_id = ?", [title ?? null, description ?? null, location ?? null, req.params.id, req.user._id]); if (!result.affectedRows) return res.status(404).json({ error: "Analysis not found or access denied" }); const [rows] = await getDb().execute("SELECT * FROM analyses WHERE id = ?", [req.params.id]); res.json({ success: true, message: "Analysis updated successfully", data: asDocument(rows[0]) }); } catch (err) { res.status(500).json({ error: "Failed to update analysis", details: err.message }); }
};
