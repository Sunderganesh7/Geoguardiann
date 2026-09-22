// backend/routes/geoguardian.js
import express from "express";
import { 
  getScenes, 
  getNdvi, 
  compareNdvi, 
  getReport, downloadReportPdf,
  getImageById 
} from "../controllers/geoguardianController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Public: serve generated imagery (used in <img> tags)
router.get("/image/:id", getImageById);

// All routes below require authentication
router.use(authMiddleware);

router.get("/scenes", getScenes);
router.post("/ndvi", getNdvi);
router.post("/compare", compareNdvi);
router.post("/report", getReport);
router.post("/report/pdf", downloadReportPdf);

export default router;
