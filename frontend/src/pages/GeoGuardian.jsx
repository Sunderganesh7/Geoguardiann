// frontend/src/pages/GeoGuardian.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import config from "../config";
import { useAnalysis } from "../context/AnalysisContext";
import { resultMatchesConfig } from "../utils/analysisDataset";
import {
  Satellite, MapPin, AlertTriangle, CheckCircle, Info,
  BarChart2, FileText, Activity, ShieldCheck, Play, Pause,
  RefreshCw, Layers, Download,
  TrendingDown, TrendingUp, Clock, Database, Globe
} from "lucide-react";
import { MapContainer, TileLayer, Rectangle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title as ChartTitle, Tooltip as ChartTooltip,
  Legend as ChartLegend, Filler
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTitle, ChartTooltip, ChartLegend, Filler);

const API = config.API_URL;

// ─── Small reusable helpers ────────────────────────────────────────────────

const Badge = ({ children, color = "gray" }) => {
  const colors = {
    green: "bg-emerald-100 text-emerald-800 border-emerald-200",
    amber: "bg-amber-100 text-amber-800 border-amber-200",
    red:   "bg-red-100 text-red-800 border-red-200",
    gray:  "bg-slate-100 text-slate-600 border-slate-200",
    blue:  "bg-blue-100 text-blue-800 border-blue-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[color]}`}>
      {children}
    </span>
  );
};

const MetricCard = ({ label, value, sub, icon: Icon, trend, valueColor = "text-slate-900" }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      {Icon && <Icon className="w-4 h-4 text-slate-400" />}
    </div>
    <div className={`text-2xl font-bold font-mono ${valueColor}`}>{value ?? "—"}</div>
    {sub && <div className="text-xs text-slate-500">{sub}</div>}
    {trend !== undefined && trend !== null && (
      <div className={`flex items-center gap-1 text-xs font-semibold ${trend < 0 ? "text-red-600" : "text-emerald-600"}`}>
        {trend < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
        {trend < 0 ? "" : "+"}{trend}%
      </div>
    )}
  </div>
);

const SectionHeader = ({ title, subtitle, icon: Icon }) => (
  <div className="mb-6">
    <div className="flex items-center gap-2 mb-1">
      {Icon && <Icon className="w-5 h-5 text-emerald-700" />}
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
    </div>
    {subtitle && <p className="text-sm text-slate-500 ml-7">{subtitle}</p>}
  </div>
);

const LoadingStep = ({ steps, current }) => (
  <div className="space-y-2 py-4">
    {steps.map((step, i) => (
      <div key={i} className={`flex items-center gap-3 text-sm transition-all ${i === current ? "text-emerald-700 font-semibold" : i < current ? "text-slate-400" : "text-slate-300"}`}>
        {i < current
          ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          : i === current
          ? <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin flex-shrink-0" />
          : <div className="w-4 h-4 rounded-full border-2 border-slate-200 flex-shrink-0" />}
        {step}
      </div>
    ))}
  </div>
);

const ANALYSIS_STEPS = [
  "Validating area",
  "Resolving location",
  "Searching Sentinel-2",
  "Filtering cloud coverage",
  "Selecting before scene",
  "Selecting after scene",
  "Loading B02/B03/B04",
  "Loading B04/B08",
  "Applying cloud mask",
  "Calculating NDVI",
  "Aligning rasters",
  "Calculating NDVI change",
  "Generating change map",
  "Calculating statistics",
  "Preparing timelapse",
  "Saving analysis",
  "Preparing report"
];

const GeoGuardian = () => {
  const {
    analysisConfig,
    setAnalysisConfig,
    analysisResult,
    analysisId,
    scenes,
    loadingScenes,
    scenesError,
    analyzing,
    analysisStep,
    analysisError,
    validating,
    validationResult,
    validationError,
    generatingReport,
    reportText,
    searchScenes,
    runAnalysis,
    runValidation,
    generateReport,
    resetAnalysis
  } = useAnalysis();

  // Local state for configuration form edit (defaults to empty strings to avoid hardcoded placeholders)
  const [bboxInput, setBboxInput] = useState(analysisConfig.bbox || "");
  const [startDateInput, setStartDateInput] = useState(analysisConfig.startDate || "");
  const [endDateInput, setEndDateInput] = useState(analysisConfig.endDate || "");
  const [cloudThresholdInput, setCloudThresholdInput] = useState(analysisConfig.cloudThreshold || 20);
  const [changeThresholdInput, setChangeThresholdInput] = useState(analysisConfig.changeThreshold || 0.10);

  // Sync inputs with config if config changes externally (or when loaded from context)
  useEffect(() => {
    setBboxInput(analysisConfig.bbox || "");
    setStartDateInput(analysisConfig.startDate || "");
    setEndDateInput(analysisConfig.endDate || "");
    setCloudThresholdInput(analysisConfig.cloudThreshold || 20);
    setChangeThresholdInput(analysisConfig.changeThreshold || 0.10);
  }, [analysisConfig]);

  // Image display tabs
  const [activeTab, setActiveTab] = useState("change");

  // Time lapse
  const [timelapsePlaying, setTimelapsePlaying] = useState(false);
  const [timelapseIdx, setTimelapseIdx] = useState(0);
  const [timelapseFrames, setTimelapseFrames] = useState([]);
  const [buildingTimelapse, setBuildingTimelapse] = useState(false);
  const [timelapseStatus, setTimelapseStatus] = useState(null);

  // Image load error trackers


  // Map bbox preview coords helper
  const parsedBbox = (() => {
    try {
      if (!bboxInput) return null;
      const parts = bboxInput.split(",").map(Number);
      if (parts.length === 4 && parts.every(n => !isNaN(n))) return parts;
    } catch {}
    return null;
  })();

  const centerLatLon = (() => {
    if (!analysisConfig.bbox) return null;
    try {
      const parts = analysisConfig.bbox.split(",").map(Number);
      if (parts.length === 4 && parts.every(n => !isNaN(n))) {
        return {
          lat: ((parts[1] + parts[3]) / 2).toFixed(6),
          lon: ((parts[0] + parts[2]) / 2).toFixed(6)
        };
      }
    } catch {}
    return null;
  })();

  const isDataConsistent = resultMatchesConfig(analysisConfig, analysisResult);

  const handleSearch = () => {
    if (!bboxInput || !startDateInput || !endDateInput) {
      alert("Please specify bounding box, start date, and end date.");
      return;
    }
    searchScenes({
      bbox: bboxInput,
      startDate: startDateInput,
      endDate: endDateInput,
      cloudThreshold: cloudThresholdInput,
      changeThreshold: changeThresholdInput
    });
  };

  const handleDateSelection = (beforeDateStr, afterDateStr) => {
    setAnalysisConfig(prev => ({
      ...prev,
      beforeDate: beforeDateStr,
      afterDate: afterDateStr
    }));
  };

  // Timelapse builder (RGB true color satellite timelapse)
  const buildTimelapse = async () => {
    const usable = scenes.filter(s => s.usable && s.cloudCover <= analysisConfig.cloudThreshold).slice(0, 6);
    if (usable.length < 2) {
      alert("Need at least 2 usable scenes in the selected configuration to build a timelapse.");
      return;
    }
    setBuildingTimelapse(true);
    setTimelapseFrames([]);
    setTimelapseStatus(null);
    const frames = [];
    const failures = [];
    const token = localStorage.getItem("token");

    for (const s of usable) {
      try {
        const resp = await axios.post(
          `${API}/api/geoguardian/ndvi`,
          { date: s.date, bbox: analysisConfig.bbox },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (resp.data.success) {
          frames.push({
            date: s.date,
            url: resp.data.imageUrl?.startsWith("/") ? `${API}${resp.data.imageUrl}` : resp.data.imageUrl,
            ndvi: resp.data.statistics.meanNdvi,
            cloud: s.cloudCover,
            sceneId: s.id
          });
        } else {
          failures.push({ date: s.date, reason: resp.data.error || "NDVI service did not return a frame." });
        }
      } catch (err) {
        console.error(`Timelapse frame failed for ${s.date}:`, err.message);
        failures.push({ date: s.date, reason: err.response?.data?.error || err.response?.data?.details || err.message });
      }
    }

    if (frames.length > 0) {
      setTimelapseFrames(frames);
      setTimelapseIdx(0);
      setTimelapseStatus({ successful: frames.length, failures });
    } else {
      setTimelapseStatus({ successful: 0, failures, error: "No NDVI frames could be generated from the selected satellite scenes." });
    }
    setBuildingTimelapse(false);
  };

  useEffect(() => {
    let t;
    if (timelapsePlaying && timelapseFrames.length > 0) {
      t = setInterval(() => setTimelapseIdx(p => (p + 1) % timelapseFrames.length), 1100);
    }
    return () => clearInterval(t);
  }, [timelapsePlaying, timelapseFrames]);

  // Clear timelapse frames when bbox or config changes
  useEffect(() => {
    setTimelapseFrames([]);
    setTimelapseIdx(0);
    setTimelapsePlaying(false);
  }, [analysisConfig.bbox]);

  // ─── Chart ────────────────────────────────────────────────────────────────
  const a = analysisResult?.analysis;
  const chartData = {
    labels: a ? [a.beforeDate, a.afterDate] : [],
    datasets: [{
      label: "Mean NDVI",
      data: a ? [a.beforeMeanNdvi, a.afterMeanNdvi] : [],
      borderColor: "#059669",
      backgroundColor: "rgba(5,150,105,0.08)",
      tension: 0.3, fill: true,
      pointBackgroundColor: "#065f46",
      pointRadius: 6, pointHoverRadius: 8
    }]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => ` NDVI: ${ctx.parsed.y?.toFixed(4) ?? "—"}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: "#f1f5f9" },
        ticks: { color: "#64748b", font: { size: 11 } }
      },
      y: {
        min: 0, max: 1,
        grid: { color: "#f1f5f9" },
        ticks: { color: "#64748b", font: { size: 11 }, callback: v => v.toFixed(2) }
      }
    }
  };

  const statusBadge = (statusStr) => {
    if (!statusStr) return null;
    if (statusStr.toLowerCase().includes("decline")) return <Badge color="red">⚠ Decline Detected</Badge>;
    if (statusStr.toLowerCase().includes("moderate")) return <Badge color="amber">〜 Moderate Change</Badge>;
    return <Badge color="green">✓ Stable</Badge>;
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-700 text-white p-2.5 rounded-xl">
              <Satellite className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">GeoGuardian</h1>
              <p className="text-sm text-slate-500">Satellite Vegetation Monitoring & Environmental Assessment</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="blue">Sentinel-2 L2A</Badge>
            <Badge color="gray">Copernicus CDSE</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        {/* Active Analysis Indicator Banner */}
        {analysisConfig.bbox && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-700 text-white p-2.5 rounded-lg flex-shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div className="text-sm">
                <p className="font-bold text-emerald-900 text-base">ACTIVE ANALYSIS</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-emerald-800 text-xs mt-2">
                  <div><strong>Location:</strong> {analysisConfig.locationName || analysisResult?.locationName || "Location name unavailable"}</div>
                  <div><strong>Coordinates:</strong> {centerLatLon ? `${centerLatLon.lat}°N, ${centerLatLon.lon}°E` : "—"}</div>
                  <div><strong>Bounding Box:</strong> {analysisConfig.bbox}</div>
                  <div><strong>Period:</strong> {analysisConfig.startDate} → {analysisConfig.endDate}</div>
                  <div><strong>Cloud Threshold:</strong> ≤ {analysisConfig.cloudThreshold}%</div>
                  <div><strong>Analysis ID:</strong> {analysisId || analysisResult?.analysisId || "N/A"}</div>
                </div>
              </div>
            </div>
            <button
              onClick={resetAnalysis}
              className="border border-emerald-300 bg-white hover:bg-emerald-100 text-emerald-700 font-semibold px-4 py-2 rounded-lg text-xs transition shadow-sm"
            >
              [ Change Analysis Area ]
            </button>
          </div>
        )}

        {/* ── Query Configuration ───────────────────────────────────────────── */}
        {!analysisConfig.bbox ? (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <SectionHeader title="Select Area of Interest" subtitle="Specify bounding box coordinates and timeframe to query satellite data." icon={MapPin} />

            {parsedBbox && (
              <div className="mb-5 rounded-xl overflow-hidden border border-slate-200" style={{ height: 220 }}>
                <MapContainer
                  center={[(parsedBbox[1] + parsedBbox[3]) / 2, (parsedBbox[0] + parsedBbox[2]) / 2]}
                  zoom={11} style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom={false} dragging={false} zoomControl={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                  <Rectangle
                    bounds={[[parsedBbox[1], parsedBbox[0]], [parsedBbox[3], parsedBbox[2]]]}
                    pathOptions={{ color: "#059669", weight: 2, fillOpacity: 0.1 }}
                  />
                </MapContainer>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Bounding Box <span className="text-slate-400 normal-case font-normal">(minLon, minLat, maxLon, maxLat)</span>
                </label>
                <input
                  type="text"
                  value={bboxInput}
                  onChange={e => setBboxInput(e.target.value)}
                  placeholder="e.g. 73.00,18.98,73.06,19.07"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Start Date</label>
                <input type="date" value={startDateInput} onChange={e => setStartDateInput(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-none transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">End Date</label>
                <input type="date" value={endDateInput} onChange={e => setEndDateInput(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-none transition" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Cloud Cover Threshold — <span className="text-emerald-700">≤ {cloudThresholdInput}%</span>
                </label>
                <input type="range" min={5} max={80} step={5} value={cloudThresholdInput}
                  onChange={e => setCloudThresholdInput(Number(e.target.value))}
                  className="w-full accent-emerald-700" />
                <div className="flex justify-between text-2xs text-slate-400 mt-0.5"><span>5%</span><span>80%</span></div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  NDVI Change Threshold — <span className="text-emerald-700">{changeThresholdInput.toFixed(2)}</span>
                </label>
                <input type="range" min={0.05} max={0.30} step={0.01} value={changeThresholdInput}
                  onChange={e => setChangeThresholdInput(parseFloat(e.target.value))}
                  className="w-full accent-emerald-700" />
                <div className="flex justify-between text-2xs text-slate-400 mt-0.5">
                  <span>0.05</span><span className="text-slate-400 text-2xs">(decline difference ≤ −{changeThresholdInput.toFixed(2)})</span><span>0.30</span>
                </div>
              </div>
            </div>

            <button onClick={handleSearch} disabled={loadingScenes}
              className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg flex items-center gap-2 text-sm transition shadow-sm">
              {loadingScenes ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Satellite className="w-4 h-4" />}
              {loadingScenes ? "Searching scenes…" : "Analyze Area"}
            </button>

            {scenesError && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 items-start">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Scene search failed</p>
                  <p className="text-sm text-red-600 mt-0.5">{scenesError}</p>
                </div>
              </div>
            )}
          </section>
        ) : null}

        {/* Please select analysis area placeholder */}
        {!analysisConfig.bbox && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
            <Globe className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-semibold text-base">Please select an analysis area.</p>
            <p className="text-slate-400 text-sm mt-1">Configure and analyze a bounding box to review environmental indices.</p>
          </div>
        )}

        {/* ── Scene Table ───────────────────────────────────────────────────── */}
        {analysisConfig.bbox && scenes.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <SectionHeader
              title="Sentinel-2 Acquisitions"
              subtitle={`${scenes.length} acquisitions matched — ${scenes.filter(s => s.usable && s.cloudCover <= analysisConfig.cloudThreshold).length} usable (cloud < ${analysisConfig.cloudThreshold}%)`}
              icon={Database}
            />

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-semibold">Date</th>
                    <th className="text-left px-4 py-3 font-semibold">Cloud Cover</th>
                    <th className="text-left px-4 py-3 font-semibold">Quality</th>
                    <th className="text-left px-4 py-3 font-semibold">Before</th>
                    <th className="text-left px-4 py-3 font-semibold">After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scenes.map(s => {
                    const isUsable = s.usable && s.cloudCover <= analysisConfig.cloudThreshold;
                    return (
                      <tr key={s.id} className={`hover:bg-slate-50 transition ${!isUsable ? "opacity-50" : ""}`}>
                        <td className="px-4 py-3 font-mono font-medium text-slate-800">{s.date}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className={`h-full rounded-full ${s.cloudCover < 20 ? "bg-emerald-500" : s.cloudCover < 40 ? "bg-amber-400" : "bg-red-400"}`}
                                style={{ width: `${Math.min(100, s.cloudCover)}%` }} />
                            </div>
                            <span className="text-slate-600">{s.cloudCover}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isUsable
                            ? <Badge color="green">Usable</Badge>
                            : <Badge color="red">Cloudy / Rejected</Badge>}
                        </td>
                        <td className="px-4 py-3">
                          <input type="radio" name="beforeScene" value={s.date} checked={analysisConfig.beforeDate === s.date}
                            onChange={() => handleDateSelection(s.date, analysisConfig.afterDate)} disabled={!isUsable}
                            className="accent-emerald-700" />
                        </td>
                        <td className="px-4 py-3">
                          <input type="radio" name="afterScene" value={s.date} checked={analysisConfig.afterDate === s.date}
                            onChange={() => handleDateSelection(analysisConfig.beforeDate, s.date)} disabled={!isUsable}
                            className="accent-emerald-700" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Analysis trigger */}
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="font-medium">Before:</span>
                <Badge color={analysisConfig.beforeDate ? "green" : "gray"}>{analysisConfig.beforeDate || "Not selected"}</Badge>
                <span className="font-medium ml-3">After:</span>
                <Badge color={analysisConfig.afterDate ? "green" : "gray"}>{analysisConfig.afterDate || "Not selected"}</Badge>
              </div>
              <button onClick={() => runAnalysis()} disabled={analyzing || !analysisConfig.beforeDate || !analysisConfig.afterDate}
                className="ml-auto bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold px-7 py-2.5 rounded-lg flex items-center gap-2 text-sm transition shadow-sm">
                {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                {analyzing ? "Analyzing…" : "Analyze Vegetation"}
              </button>
            </div>

            {/* Progress indicator */}
            {analyzing && (
              <div className="mt-5 bg-slate-50 border border-slate-200 rounded-xl p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Processing Pipeline</p>
                <LoadingStep steps={ANALYSIS_STEPS} current={analysisStep} />
              </div>
            )}

            {analysisError && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 items-start">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Analysis failed</p>
                  <p className="text-sm text-red-600 mt-0.5">{analysisError}</p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Main Analysis Results ─────────────────────────────────────────── */}
        {analysisConfig.bbox && analyzing && !analysisResult && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
            <RefreshCw className="w-12 h-12 mx-auto text-emerald-600 animate-spin mb-3" />
            <p className="text-slate-600 font-semibold">Analysis in progress...</p>
            <p className="text-slate-400 text-sm mt-1">Please wait while the satellite bands are retrieved and difference maps calculated.</p>
          </div>
        )}

        {analysisConfig.bbox && analysisResult && !isDataConsistent && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center text-red-850 flex flex-col items-center gap-2">
            <AlertTriangle className="w-10 h-10 text-red-600 animate-pulse" />
            <p className="font-bold text-base">Analysis data is inconsistent. Please rerun the analysis.</p>
            <p className="text-xs text-red-600">The current active analysis configuration parameters do not match the loaded result dataset.</p>
          </div>
        )}

        {analysisConfig.bbox && analysisResult && isDataConsistent && (
          <>
            {/* Overview stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Mean NDVI (After)" icon={Activity}
                value={analysisResult.analysis.afterMeanNdvi.toFixed(4)}
                sub="Normalized Difference Vegetation Index"
                valueColor={analysisResult.analysis.afterMeanNdvi > 0.5 ? "text-emerald-700" : analysisResult.analysis.afterMeanNdvi > 0.2 ? "text-amber-700" : "text-red-700"} />
              <MetricCard label="Vegetation Change" icon={TrendingDown}
                value={analysisResult.analysis.relativeChange != null ? `${analysisResult.analysis.relativeChange > 0 ? "+" : ""}${analysisResult.analysis.relativeChange}%` : "—"}
                sub={`NDVI diff: ${analysisResult.analysis.ndviChange > 0 ? "+" : ""}${analysisResult.analysis.ndviChange.toFixed(4)}`}
                trend={analysisResult.analysis.relativeChange}
                valueColor={analysisResult.analysis.ndviChange < 0 ? "text-red-600" : "text-emerald-700"} />
              <MetricCard label="Affected Area" icon={MapPin}
                value={`${analysisResult.analysis.changedAreaKm2.toFixed(4)} km²`}
                sub={`${analysisResult.analysis.affectedPercentage}% of monitored ${analysisResult.analysis.totalMonitoredAreaKm2.toFixed(4)} km²`} />
              <MetricCard label="Data Quality" icon={ShieldCheck}
                value={`${Math.min(analysisResult.analysis.beforeValidPixels, analysisResult.analysis.afterValidPixels).toFixed(1)}%`}
                sub="Minimum valid (cloud-free) pixels across both dates"
                valueColor="text-blue-700" />
            </div>

            {/* Status */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Scientific Assessment</p>
                <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                  {analysisResult.analysis.status}
                </p>
              </div>
              <div className="h-px bg-slate-100" />
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                <div className="flex gap-4">
                  <span><strong>Before Period:</strong> {analysisResult.analysis.beforeDate} (Mean NDVI: {analysisResult.analysis.beforeMeanNdvi.toFixed(4)})</span>
                  <span><strong>After Period:</strong> {analysisResult.analysis.afterDate} (Mean NDVI: {analysisResult.analysis.afterMeanNdvi.toFixed(4)})</span>
                </div>
                <div>
                  <strong>Significant Decline Threshold:</strong> NDVI difference ≤ −{analysisResult.analysis.threshold?.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Maps section */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <SectionHeader title="Vegetation Index & Classification maps" subtitle="NDVI datasets calculated from Sentinel-2 Band 4 and Band 8." icon={Layers} />

              {/* Tabs */}
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-5 w-fit">
                {["before", "after", "change"].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition capitalize ${activeTab === tab ? "bg-white shadow text-emerald-700 font-semibold" : "text-slate-500 hover:text-slate-700"}`}>
                    {tab === "change" ? "Change Map" : `${tab.charAt(0).toUpperCase() + tab.slice(1)} NDVI`}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main map display */}
                <div className="lg:col-span-2">
                  <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative">
                    {activeTab === "before" && analysisResult.beforeImageUrl && (
                      <img src={analysisResult.beforeImageUrl} alt="Before NDVI" className="w-full h-full object-cover" />
                    )}
                    {activeTab === "after" && analysisResult.afterImageUrl && (
                      <img src={analysisResult.afterImageUrl} alt="After NDVI" className="w-full h-full object-cover" />
                    )}
                    {activeTab === "change" && analysisResult.changeImageUrl && (
                      <img src={analysisResult.changeImageUrl} alt="Vegetation Change Map" className="w-full h-full object-cover" />
                    )}
                    {/* Date overlay */}
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 shadow-sm">
                      {activeTab === "before" ? analysisResult.analysis.beforeDate : activeTab === "after" ? analysisResult.analysis.afterDate : `${analysisResult.analysis.beforeDate} → ${analysisResult.analysis.afterDate}`}
                    </div>
                  </div>
                </div>

                {/* Map legend + stats */}
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">NDVI Legend</p>
                    <div className="space-y-2 text-xs">
                      {[
                        { color: "bg-blue-500", label: "< 0", desc: "Water / non-vegetated" },
                        { color: "bg-amber-300", label: "0.0 – 0.2", desc: "Barren / sparse" },
                        { color: "bg-lime-400", label: "0.2 – 0.5", desc: "Low / moderate vegetation" },
                        { color: "bg-emerald-500", label: "0.5 – 0.8", desc: "Dense vegetation" },
                        { color: "bg-emerald-900", label: "> 0.8", desc: "Very dense vegetation" },
                        { color: "bg-slate-300", label: "—", desc: "Cloud / no data" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-sm flex-shrink-0 ${item.color}`} />
                          <span className="font-mono text-slate-600 w-16">{item.label}</span>
                          <span className="text-slate-400">{item.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {activeTab === "change" && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Change Classification</p>
                      <div className="space-y-2 text-xs">
                        {[
                          { color: "bg-emerald-500", label: "Stable", value: analysisResult.analysis.distribution?.stable?.toFixed(1) + "%" },
                          { color: "bg-amber-400", label: "Moderate decline", value: analysisResult.analysis.distribution?.moderateDecrease?.toFixed(1) + "%" },
                          { color: "bg-red-500", label: `Significant decline (≤ −${analysisResult.analysis.threshold?.toFixed(2)})`, value: analysisResult.analysis.distribution?.significantDecrease?.toFixed(1) + "%" },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-sm flex-shrink-0 ${item.color}`} />
                            <span className="text-slate-600 flex-1">{item.label}</span>
                            <span className="font-mono font-semibold text-slate-700">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Data source */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-xs space-y-1 text-slate-500">
                    <p><span className="font-semibold text-slate-700">Satellite:</span> Sentinel-2</p>
                    <p><span className="font-semibold text-slate-700">Source:</span> Copernicus Data Space</p>
                    <p><span className="font-semibold text-slate-700">Bands:</span> B04 (Red, 665 nm) + B08 (NIR, 842 nm)</p>
                    <p><span className="font-semibold text-slate-700">Resolution:</span> 10 m/pixel</p>
                    <p><span className="font-semibold text-slate-700">Cloud mask:</span> SCL Layer</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Timelapse */}
            {scenes.length >= 2 && (
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <SectionHeader title="NDVI Sequential Timelapse" subtitle="Compilation of sequential acquisitions under the active area." icon={Clock} />
                  <button onClick={buildTimelapse} disabled={buildingTimelapse}
                    className="border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition">
                    <RefreshCw className={`w-3.5 h-3.5 ${buildingTimelapse ? "animate-spin" : ""}`} />
                    {buildingTimelapse ? "Compiling…" : "Compile Frames"}
                  </button>
                </div>

                {timelapseFrames.length > 0 ? (
                  <>
                    <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative mb-4">
                      <img src={timelapseFrames[timelapseIdx].url} alt="Timelapse frame" className="w-full h-full object-cover" />
                      <div className="absolute bottom-3 left-3 bg-white/90 border border-slate-200 px-3 py-1.5 rounded-lg text-xs shadow-sm space-x-3">
                        <span className="font-semibold text-slate-800">{timelapseFrames[timelapseIdx].date}</span>
                        <span className="text-slate-500">Mean NDVI: {timelapseFrames[timelapseIdx].ndvi}</span>
                        <span className="text-slate-500">Cloud: {timelapseFrames[timelapseIdx].cloud}%</span>
                      </div>
                      <div className="absolute bottom-3 right-3 bg-slate-800/70 text-white text-xs px-2 py-1 rounded-lg">
                        {timelapseIdx + 1} / {timelapseFrames.length}
                      </div>
                    </div>
                    <div className="flex justify-center gap-3">
                      <button onClick={() => setTimelapsePlaying(p => !p)}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 text-sm font-semibold transition shadow-sm">
                        {timelapsePlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {timelapsePlaying ? "Pause" : "Play"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
                    {buildingTimelapse ? "Fetching NDVI colormaps from Sentinel-2 B04/B08 data..." : timelapseStatus?.error || "Click \"Compile Frames\" to build the timelapse animation."}
                  </div>
                )}
                {timelapseStatus && (
                  <div className={`mt-4 rounded-xl border p-4 text-xs ${timelapseStatus.successful ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-700"}`}>
                    <p className="font-semibold">{timelapseStatus.successful} NDVI frame{timelapseStatus.successful === 1 ? "" : "s"} generated; {timelapseStatus.failures.length} skipped.</p>
                    {timelapseStatus.failures.length > 0 && <ul className="mt-2 list-disc pl-5 space-y-1">{timelapseStatus.failures.map((failure) => <li key={`${failure.date}-${failure.reason}`}>{failure.date}: {failure.reason}</li>)}</ul>}
                  </div>
                )}
              </section>
            )}

            {/* Time Series */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <SectionHeader title="Vegetation Index Trend" subtitle="Synchronized mean NDVI levels computed between observations." icon={BarChart2} />
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <Line data={chartData} options={chartOptions} />
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">
                ⓘ Data points are derived strictly from raw Sentinel-2 MSI bands. Interpolated lines show trend directions only.
              </p>
            </section>

            {false && <>
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-start justify-between mb-5">
                <SectionHeader title="Classification Accuracy Validation" subtitle="Performance metrics calculated strictly from validation/samples.json reference labels." icon={ShieldCheck} />
                <button onClick={runValidation} disabled={validating}
                  className="border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition flex-shrink-0">
                  {validating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                  {validating ? "Evaluating…" : "Run Validation"}
                </button>
              </div>

              {validationError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 mb-4 flex gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" text-red-500 />
                  {validationError}
                </div>
              )}

              {!validationResult ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                  <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-semibold text-sm">Validation status: Not evaluated</p>
                  <p className="text-slate-400 text-sm mt-1">No validation metrics are shown until run validation completes successfully.</p>
                  <div className="mt-4 flex justify-center gap-4 text-slate-500 font-mono text-2xs">
                    <span>Accuracy: N/A</span>
                    <span>Precision: N/A</span>
                    <span>Recall: N/A</span>
                    <span>F1 Score: N/A</span>
                  </div>
                </div>
              ) : validationResult.status === "Not evaluated" ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                  <p className="text-amber-700 font-semibold text-sm flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Validation status: Not evaluated
                  </p>
                  <p className="text-amber-600 text-xs mt-2">
                    Message: {validationResult.message || "Failed to process ground-truth verification samples."}
                  </p>
                  <div className="mt-4 flex gap-4 text-slate-500 font-mono text-2xs">
                    <span>Accuracy: N/A</span>
                    <span>Precision: N/A</span>
                    <span>Recall: N/A</span>
                    <span>F1 Score: N/A</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {validationResult.sampleSizeWarning && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span><strong>Validation confidence: insufficient sample size.</strong> {validationResult.sampleSizeWarning}</span>
                    </div>
                  )}
                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: "Accuracy", value: validationResult.metrics.accuracy },
                      { label: "Precision", value: validationResult.metrics.precision },
                      { label: "Recall", value: validationResult.metrics.recall },
                      { label: "F1 Score", value: validationResult.metrics.f1Score }
                    ].map(m => (
                      <div key={m.label} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{m.label}</p>
                        <p className="text-2xl font-bold font-mono text-emerald-700">
                          {m.value != null ? `${m.value}%` : "—"}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Confusion matrix */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Confusion Matrix</p>
                    <div className="overflow-x-auto">
                      <table className="text-sm border-collapse w-full max-w-sm">
                        <thead>
                          <tr>
                            <th className="p-2" />
                            <th className="p-2 text-center text-xs font-semibold text-slate-500 border border-slate-200 bg-slate-50">Actual: Change</th>
                            <th className="p-2 text-center text-xs font-semibold text-slate-500 border border-slate-200 bg-slate-50">Actual: Stable</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="p-2 text-xs font-semibold text-slate-500 border border-slate-200 bg-slate-50">Pred: Change</td>
                            <td className="p-3 text-center font-mono font-bold text-emerald-700 border border-slate-200 bg-emerald-50">TP {validationResult.confusionMatrix.tp}</td>
                            <td className="p-3 text-center font-mono font-bold text-red-600 border border-slate-200 bg-red-50">FP {validationResult.confusionMatrix.fp}</td>
                          </tr>
                          <tr>
                            <td className="p-2 text-xs font-semibold text-slate-500 border border-slate-200 bg-slate-50">Pred: Stable</td>
                            <td className="p-3 text-center font-mono font-bold text-amber-600 border border-slate-200 bg-amber-50">FN {validationResult.confusionMatrix.fn}</td>
                            <td className="p-3 text-center font-mono font-bold text-emerald-700 border border-slate-200 bg-emerald-50">TN {validationResult.confusionMatrix.tn}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 space-y-1">
                    <p><span className="font-medium text-slate-700">Samples evaluated:</span> {validationResult.samplesEvaluated}</p>
                    {validationResult.classCounts && <p><span className="font-medium text-slate-700">Class counts:</span> Actual Change {validationResult.classCounts.actualChange}, Actual Stable {validationResult.classCounts.actualStable}, Predicted Change {validationResult.classCounts.predictedChange}, Predicted Stable {validationResult.classCounts.predictedStable}</p>}
                    <p><span className="font-medium text-slate-700">Reference dataset:</span> <code className="bg-white border border-slate-200 px-1 rounded">backend/validation/samples.json</code></p>
                    <p><span className="font-medium text-slate-700">Change threshold used:</span> −{analysisConfig.changeThreshold.toFixed(2)} NDVI</p>
                  </div>
                </div>
              )}
            </section>

            </>}
            {/* Report */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-start justify-between mb-5">
                <SectionHeader title="Environmental Assessment Report" subtitle="Generate structured text report conforming to strict scientific limitations." icon={FileText} />
                <button onClick={generateReport} disabled={generatingReport}
                  className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm px-5 py-2.5 rounded-lg flex items-center gap-2 font-semibold transition shadow-sm flex-shrink-0">
                  {generatingReport ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {generatingReport ? "Compiling…" : "Generate Report"}
                </button>
              </div>
              {reportText ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {reportText}
                  </pre>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  Click "Generate Report" to compile a structured summary based on active results.
                </div>
              )}
            </section>
          </>
        )}

        {/* ── Scientific Disclaimer ─────────────────────────────────────────── */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4 items-start">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 leading-relaxed">
            <span className="font-semibold">Scientific Note: </span>
            NDVI measures vegetation spectral response. A decrease in NDVI indicates vegetation change but does not by itself prove deforestation. Changes may result from seasonal variation, drought, fire, vegetation removal, agriculture, cloud contamination, or other environmental factors. Independent ground verification is required to determine the specific cause.
          </div>
        </div>

      </div>
    </div>
  );
};

export default GeoGuardian;
