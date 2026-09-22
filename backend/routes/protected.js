import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Example: Get user profile (only if logged in)
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    res.json(req.user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
