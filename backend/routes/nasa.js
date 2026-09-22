
import { getSatelliteImage , getImageById} from "../controllers/nasacontroller.js";
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";


const router = express.Router();

// Save new satellite image
router.post("/image", authMiddleware, getSatelliteImage);

// Stream image by ID
router.get("/image/:id", getImageById);

export default router;
