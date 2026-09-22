// backend/routes/changeDetection.js
import express from "express";
import { compareImages, getDiffImage } from "../controllers/changeDetectionController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { sendTestEmail } from "../services/emailService.js";

const router = express.Router();

// POST: Compare two images and detect changes (requires auth)
router.post("/", authMiddleware, compareImages);

// GET: Retrieve difference image (no auth needed)
router.get("/diff/:id", getDiffImage);

// POST: Send test email to authenticated user
router.post("/test-email", authMiddleware, async (req, res) => {
  try {
    await sendTestEmail(req.user.email);
    res.json({ success: true, message: "Test email sent!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;



