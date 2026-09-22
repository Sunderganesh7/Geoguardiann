// backend/routes/monitoring.js
import express from "express";
import {
  addMonitoredRegion,
  getMonitoredRegions,
  getMonitoredRegionById,
  updateMonitoredRegion,
  deleteMonitoredRegion,
  triggerManualCheck,
} from "../controllers/monitoringController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// All monitoring routes require authentication
router.use(authMiddleware);

// POST: Add new monitored region
router.post("/regions", addMonitoredRegion);

// GET: List all monitored regions
router.get("/regions", getMonitoredRegions);

// GET: Get specific region
router.get("/regions/:id", getMonitoredRegionById);

// PUT: Update region settings
router.put("/regions/:id", updateMonitoredRegion);

// DELETE: Remove region from monitoring
router.delete("/regions/:id", deleteMonitoredRegion);

// POST: Manually trigger check
router.post("/regions/:id/check", triggerManualCheck);

export default router;