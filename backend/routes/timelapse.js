// backend/routes/timelapse.js
import express from "express";
import { createTimelapse, getTimelapseFrames, getFrame } from "../controllers/timelapseController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// POST: Generate time-lapse (requires auth)
router.post("/generate", authMiddleware, createTimelapse);

// GET: Get all frames for a time-lapse
router.get("/:parentId/frames", getTimelapseFrames);

// GET: Get single frame image
router.get("/frame/:frameId", getFrame);

export default router;