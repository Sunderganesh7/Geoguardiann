// backend/routes/analysis.js
import express from "express";
import {
  saveAnalysis,
  getUserAnalyses,
  getAnalysisById,
  deleteAnalysis,
  updateAnalysis,
} from "../controllers/analysisController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { generateEnvironmentalReport } from "../services/geminiService.js"; // ← ADDED (fixed to ES module import)

const router = express.Router();

// All analysis routes require authentication
router.use(authMiddleware);

// POST: Save new analysis
router.post("/", saveAnalysis);

// GET: List all analyses for current user (with pagination)
router.get("/", getUserAnalyses);

// GET: Get specific analysis by ID
router.get("/:id", getAnalysisById);

// PUT: Update analysis details
router.put("/:id", updateAnalysis);

// DELETE: Delete analysis
router.delete("/:id", deleteAnalysis);

// ── NEW: AI Report endpoint ───────────────────────────────────────────────────
router.post("/ai-report", async (req, res) => {
  try {
    const {
      changeRate,
      severity,
      changeType,
      changedPixels,
      totalPixels,
      region,
      dateRange,
    } = req.body;

    if (
      changeRate === undefined ||
      !severity ||
      !changeType ||
      changedPixels === undefined ||
      totalPixels === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: changeRate, severity, changeType, changedPixels, totalPixels",
      });
    }

    const result = await generateEnvironmentalReport({
      changeRate,
      severity,
      changeType,
      changedPixels,
      totalPixels,
      region,
      dateRange,
    });

    if (!result.success) {
      return res.status(502).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("[/ai-report] Error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Internal server error generating AI report.",
    });
  }
});
// ─────────────────────────────────────────────────────────────────────────────

export default router;