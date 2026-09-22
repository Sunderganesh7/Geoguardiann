import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getDb } from "../config/db.js";
import { asDocument, isId } from "../config/storage.js";

const router = express.Router();

// ✅ Add a preference
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { regionName, coordinates, threshold } = req.body;

    const [result] = await getDb().execute("INSERT INTO preferences (user_id, regionName, coordinates, threshold) VALUES (?, ?, ?, ?)", [req.user._id, regionName, JSON.stringify(coordinates), threshold ?? 5]);
    const preference = { _id: String(result.insertId), user: req.user._id, regionName, coordinates, threshold: threshold ?? 5 };
    res.status(201).json(preference);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get all preferences for logged-in user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const [rows] = await getDb().execute("SELECT id, user_id, regionName, coordinates, threshold, createdAt FROM preferences WHERE user_id = ?", [req.user._id]);
    const preferences = rows.map(row => ({ ...asDocument(row), user: String(row.user_id) }));
    res.json(preferences);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Delete a preference
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: "Preference not found" });
    const [result] = await getDb().execute("DELETE FROM preferences WHERE id = ? AND user_id = ?", [req.params.id, req.user._id]);
    const pref = result.affectedRows ? true : null;

    if (!pref) return res.status(404).json({ message: "Preference not found" });

    res.json({ message: "Preference deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
