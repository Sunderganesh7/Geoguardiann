// backend/index.js
import 'dotenv/config';
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import protectedRoutes from "./routes/protected.js";
import preferenceRoutes from "./routes/preferences.js";
import nasaRoutes from "./routes/nasa.js";
import analysisRoutes from "./routes/analysis.js";
import changeDetectionRoutes from "./routes/changeDetection.js";
import timelapseRoutes from "./routes/timelapse.js";
import monitoringRoutes from "./routes/monitoring.js";
import geoguardianRoutes from "./routes/geoguardian.js"; // New GeoGuardian router
import connectDB from "./config/db.js";
import { startScheduler } from "./services/schedulerService.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ✅ Enhanced CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://geoguardian-mu.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ Increase payload size limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/preferences", preferenceRoutes);
app.use("/api/nasa", nasaRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/change-detection", changeDetectionRoutes);
app.use("/api/timelapse", timelapseRoutes);
app.use("/api/monitoring", monitoringRoutes);
app.use("/api/geoguardian", geoguardianRoutes); // Register GeoGuardian API

// Start the monitoring scheduler
startScheduler();

// ✅ Health check for API
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK",
    message: "Backend is healthy",
    timestamp: new Date().toISOString()
  });
});

// Serve static files from React build
app.use(express.static(path.join(__dirname, "../frontend/build")));

// Fallback to React index.html for client-side routing
app.get("*any", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({
      error: "API Endpoint not found",
      requested: req.originalUrl,
      timestamp: new Date().toISOString()
    });
  }
  res.sendFile(path.join(__dirname, "../frontend/build/index.html"));
});

// ✅ Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err.message);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

// Validate essential environment variables
const requiredEnv = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD", "SENTINEL_CLIENT_ID", "SENTINEL_CLIENT_SECRET"];
const missingEnv = requiredEnv.filter(envName => !process.env[envName]);
if (missingEnv.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnv.join(", ")}`);
  console.error("Please configure them in backend/.env, then restart the server.");
  process.exit(1);
}

// Connect to DB and start server
connectDB()
  .then(() => {
    console.log("MySQL connected successfully");

    app.listen(PORT, () => {
      console.log(`
==================================================
 GREEN PATH AI
==================================================

Application running successfully.

Frontend:
http://localhost:${PORT}

API:
http://localhost:${PORT}/api

GeoGuardian:
http://localhost:${PORT}/geoguardian

==================================================
      `);
    });
  })
  .catch((err) => {
    console.error("Database connection error:", err.message);
    process.exit(1);
  });
