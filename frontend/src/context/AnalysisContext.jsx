// frontend/src/context/AnalysisContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";
import config from "../config";
import { normalizeIsoDate } from "../utils/analysisDataset";

const AnalysisContext = createContext();

const API = config.API_URL;
const apiAssetUrl = (url) => url && url.startsWith("/") ? `${API}${url}` : url;

const parseAndValidateBbox = (value) => {
  const bbox = (Array.isArray(value) ? value : String(value || "").split(",")).map(Number);
  if (bbox.length !== 4 || bbox.some((coordinate) => !Number.isFinite(coordinate))) throw new Error("Bounding box must contain four numbers: west,south,east,north.");
  const [west, south, east, north] = bbox;
  if (west >= east || south >= north || west < -180 || east > 180 || south < -90 || north > 90) throw new Error("Bounding box coordinates are invalid. Ensure west < east and south < north.");
  return bbox;
};

const DEFAULT_CONFIG = {
  bbox: "",
  startDate: "",
  endDate: "",
  cloudThreshold: 20,
  changeThreshold: 0.10,
  beforeDate: "",
  afterDate: "",
  // Dynamic location fields — resolved via reverse geocoding when analysis runs
  locationName: "",
  center: null
};

export const AnalysisProvider = ({ children }) => {
  const token = localStorage.getItem("token");

  // Load initial state from sessionStorage if available
  const [analysisConfig, setAnalysisConfig] = useState(() => {
    try {
      const saved = sessionStorage.getItem("geoguardian_config");
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [analysisResult, setAnalysisResult] = useState(() => {
    try {
      const saved = sessionStorage.getItem("geoguardian_result");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [scenes, setScenes] = useState(() => {
    try {
      const saved = sessionStorage.getItem("geoguardian_scenes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Unique ID for each completed analysis run
  const [analysisId, setAnalysisId] = useState(null);

  // Operational states
  const [loadingScenes, setLoadingScenes] = useState(false);
  const [scenesError, setScenesError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(-1);
  const [analysisError, setAnalysisError] = useState(null);


  // Report
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportText, setReportText] = useState("");

  // Save state to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem("geoguardian_config", JSON.stringify(analysisConfig));
  }, [analysisConfig]);

  useEffect(() => {
    if (analysisResult) {
      sessionStorage.setItem("geoguardian_result", JSON.stringify(analysisResult));
    } else {
      sessionStorage.removeItem("geoguardian_result");
    }
  }, [analysisResult]);

  useEffect(() => {
    if (scenes && scenes.length > 0) {
      sessionStorage.setItem("geoguardian_scenes", JSON.stringify(scenes));
    } else {
      sessionStorage.removeItem("geoguardian_scenes");
    }
  }, [scenes]);

  const searchScenes = async (configOverride) => {
    const activeConfig = configOverride || analysisConfig;
    if (!activeConfig.bbox) {
      setScenesError("Please select or enter a bounding box first.");
      return;
    }
    let bbox;
    try { bbox = parseAndValidateBbox(activeConfig.bbox); } catch (error) { setScenesError(error.message); return; }
    if (!activeConfig.startDate || !activeConfig.endDate || new Date(activeConfig.startDate) > new Date(activeConfig.endDate)) {
      setScenesError("Select a valid start date and end date before analyzing the area.");
      return;
    }

    try {
      setLoadingScenes(true);
      setScenesError(null);
      setAnalysisResult(null);
      setReportText("");
      setScenes([]);

      const resp = await axios.get(
        `${API}/api/geoguardian/scenes?${new URLSearchParams({ bbox: bbox.join(","), startDate: activeConfig.startDate, endDate: activeConfig.endDate, cloudCover: String(activeConfig.cloudThreshold) })}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const all = resp.data.scenes || [];
      setScenes(all);

      // Auto-select first and last usable scenes
      const usable = all.filter(s => s.usable && s.cloudCover <= activeConfig.cloudThreshold);
      let selectedBefore = "";
      let selectedAfter = "";

      if (usable.length >= 2) {
        selectedBefore = usable[0].date;
        selectedAfter = usable[usable.length - 1].date;
      } else if (all.length >= 2) {
        selectedBefore = all[0].date;
        selectedAfter = all[all.length - 1].date;
      }

      setAnalysisConfig(prev => ({
        ...prev,
        ...activeConfig,
        beforeDate: selectedBefore,
        afterDate: selectedAfter
      }));
    } catch (err) {
      setScenesError(err.response?.data?.error || err.message || "Failed to query Sentinel-2 scenes");
    } finally {
      setLoadingScenes(false);
    }
  };

  const runAnalysis = async (beforeDateStr, afterDateStr) => {
    const before = normalizeIsoDate(beforeDateStr || analysisConfig.beforeDate);
    const after = normalizeIsoDate(afterDateStr || analysisConfig.afterDate);

    if (!before || !after) {
      setAnalysisError("Please select both a before and an after acquisition date.");
      return;
    }
    let bbox;
    try { bbox = parseAndValidateBbox(analysisConfig.bbox); } catch (error) { setAnalysisError(error.message); return; }

    try {
      setAnalyzing(true);
      setAnalysisError(null);
      setAnalysisResult(null);
      setReportText("");

      // Processing pipeline step simulation for professional feedback
      const stepsCount = 17; 
      for (let step = 0; step < stepsCount - 1; step++) {
        setAnalysisStep(step);
        await new Promise(r => setTimeout(r, 300));
      }

      const resp = await axios.post(
        `${API}/api/geoguardian/compare`,
        {
          beforeDate: before,
          afterDate: after,
          bbox,
          threshold: analysisConfig.changeThreshold
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAnalysisStep(stepsCount - 1);
      await new Promise(r => setTimeout(r, 300));

      if (resp.data.success) {
        setAnalysisResult({ ...resp.data,
          dataset: {
            ...(resp.data.dataset || {}),
            bbox,
            beforeDate: before,
            afterDate: after,
            satelliteSource: "Sentinel-2 L2A",
            cloudThreshold: analysisConfig.cloudThreshold,
            ndviThreshold: analysisConfig.changeThreshold,
            analysisId: resp.data.analysisId || resp.data.dbRecordId || null,
            imageIds: { before: resp.data.beforeImageId || null, after: resp.data.afterImageId || null, change: resp.data.changeImageId || null }
          },
          changeImageUrl: apiAssetUrl(resp.data.changeImageUrl),
          beforeImageUrl: apiAssetUrl(resp.data.beforeImageUrl),
          afterImageUrl: apiAssetUrl(resp.data.afterImageUrl),
          beforeSatImageUrl: apiAssetUrl(resp.data.beforeSatImageUrl),
          afterSatImageUrl: apiAssetUrl(resp.data.afterSatImageUrl)
        });
        // Extract location and analysisId from the API response and store in context
        const locName = resp.data.locationName || "";
        const locCenter = resp.data.center || null;
        const aId = resp.data.analysisId || null;
        setAnalysisId(aId);
        setAnalysisConfig(prev => ({
          ...prev,
          beforeDate: before,
          afterDate: after,
          locationName: locName,
          center: locCenter
        }));
      }
    } catch (err) {
      setAnalysisError(err.response?.data?.error || err.message || "Vegetation analysis failed");
    } finally {
      setAnalyzing(false);
      setAnalysisStep(-1);
    }
  };

  const generateReport = async () => {
    if (!analysisResult) return;
    try {
      setGeneratingReport(true);
      const a = analysisResult.analysis;
      const resp = await axios.post(`${API}/api/geoguardian/report/pdf`, {
        analysisId: analysisId || analysisResult.analysisId || null,
        location: analysisConfig.locationName || analysisResult.locationName || "",
        bbox: analysisResult.bbox || analysisConfig.bbox,
        analysis: a,
        beforeImageId: analysisResult.dataset?.imageIds?.before,
        afterImageId: analysisResult.dataset?.imageIds?.after,
        changeImageId: analysisResult.dataset?.imageIds?.change || analysisResult.changeImageId
      }, { headers: { Authorization: `Bearer ${token}` }, responseType: "blob" });
      const filename = `GeoGuardian_Environmental_Report_Analysis_${analysisId || analysisResult.analysisId || "current"}.pdf`;
      const url = URL.createObjectURL(new Blob([resp.data], { type: "application/pdf" }));
      const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
      setReportText("Report downloaded successfully.");
    } catch (err) {
      setReportText(err.response?.data?.error || err.message || "Report generation failed.");
    } finally {
      setGeneratingReport(false);
    }
  };

  const resetAnalysis = () => {
    setAnalysisConfig(DEFAULT_CONFIG);
    setAnalysisResult(null);
    setAnalysisId(null);
    setScenes([]);
    setScenesError(null);
    setAnalysisError(null);
    setReportText("");
    sessionStorage.removeItem("geoguardian_config");
    sessionStorage.removeItem("geoguardian_result");
    sessionStorage.removeItem("geoguardian_scenes");
  };

  return (
    <AnalysisContext.Provider
      value={{
        analysisConfig,
        setAnalysisConfig,
        analysisResult,
        setAnalysisResult,
        analysisId,
        scenes,
        setScenes,
        loadingScenes,
        scenesError,
        analyzing,
        analysisStep,
        analysisError,
        generatingReport,
        reportText,
        searchScenes,
        runAnalysis,
        generateReport,
        resetAnalysis
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
};

export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error("useAnalysis must be used within an AnalysisProvider");
  }
  return context;
};
