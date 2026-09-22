// frontend/src/pages/TimeLapse.jsx
import React, { useState, useRef, useEffect } from "react";
import { useAnalysis } from "../context/AnalysisContext";
import { Link } from "react-router-dom";
import { Film, Calendar, Globe, Map, Sliders, Play, Pause, ChevronLeft, ChevronRight, AlertCircle, Info, Flame, Sprout, Trees, RefreshCw } from "lucide-react";
import axios from "axios";
import config from "../config";

const API = config.API_URL;
const apiAssetUrl = (url) => url && url.startsWith("/") ? `${API}${url}` : url;

const TimeLapse = () => {
  const { analysisConfig, scenes } = useAnalysis();

  const [intervalDays, setIntervalDays] = useState(15);
  const [frames, setFrames] = useState([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState(null);
  const [ndviCache, setNdviCache] = useState({});

  const token = localStorage.getItem("token");
  const timerRef = useRef(null);

  // Clear frames when active bbox/dates change
  useEffect(() => {
    setFrames([]);
    setCurrentFrame(0);
    setIsPlaying(false);
    setMetadata(null);
    setNdviCache({});
  }, [analysisConfig.bbox, analysisConfig.startDate, analysisConfig.endDate]);

  // Fetch real NDVI statistics dynamically for the current frame date
  useEffect(() => {
    if (!frames || frames.length === 0 || !frames[currentFrame]) return;
    const date = frames[currentFrame].date;
    if (ndviCache[date] !== undefined) return;

    const fetchNdviValue = async () => {
      try {
        const resp = await axios.post(
          `${API}/api/geoguardian/ndvi`,
          { date, bbox: analysisConfig.bbox },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (resp.data.success) {
          setNdviCache(prev => ({
            ...prev,
            [date]: resp.data.statistics.meanNdvi
          }));
        }
      } catch (err) {
        console.warn(`Failed to fetch NDVI for ${date}:`, err.message);
        setNdviCache(prev => ({ ...prev, [date]: "N/A" }));
      }
    };
    fetchNdviValue();
  }, [currentFrame, frames, ndviCache, analysisConfig.bbox, token]);

  // Playback timer slideshow logic
  useEffect(() => {
    if (isPlaying && frames.length > 0) {
      timerRef.current = setInterval(() => {
        setCurrentFrame((frame) => (frame < frames.length - 1 ? frame + 1 : 0));
      }, metadata?.delay || 800);
      return () => clearInterval(timerRef.current);
    } else {
      clearInterval(timerRef.current);
    }
  }, [isPlaying, frames.length, metadata]);

  const generateTimelapse = async () => {
    if (!analysisConfig.bbox) return;
    try {
      setGenerating(true);
      setError(null);
      setFrames([]);
      setProgress("📅 Calculating date ranges...");

      // Parse BBox array from centralized config string
      const bboxArray = analysisConfig.bbox.split(",").map(Number);

      setProgress(`🛰️ Querying acquisitions from Sentinel Hub...`);

      const response = await axios.post(
        `${API}/api/timelapse/generate`,
        {
          startDate: analysisConfig.startDate,
          endDate: analysisConfig.endDate,
          bbox: bboxArray,
          intervalDays: parseInt(intervalDays),
          cloudThreshold: analysisConfig.cloudThreshold,
          width: 512,
          height: 512,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("✅ Timelapse response received:", response.data);
      setFrames((response.data.frames || []).map((frame) => ({ ...frame, url: apiAssetUrl(frame.url) })));
      setMetadata(response.data.metadata || null);
      setCurrentFrame(0);
      setProgress("✅ Frames ready!");
    } catch (err) {
      console.error("❌ Error generating timelapse:", err);
      setError(err.response?.data?.error || err.response?.data?.details || err.message || "Failed to generate timelapse frames");
      setProgress("");
    } finally {
      setGenerating(false);
      setIsPlaying(false);
    }
  };

  const estimateFrames = () => {
    if (!analysisConfig.startDate || !analysisConfig.endDate) return 0;
    const start = new Date(analysisConfig.startDate);
    const end = new Date(analysisConfig.endDate);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const framesCount = Math.floor(diffDays / intervalDays) + 1;
    return Math.min(framesCount, 20);
  };

  const goToPrevFrame = () => setCurrentFrame((frame) => Math.max(frame - 1, 0));
  const goToNextFrame = () => setCurrentFrame((frame) => Math.min(frame + 1, frames.length - 1));
  const togglePlay = () => setIsPlaying((play) => !play);

  const getCurrentImageUrl = () => {
    if (!frames[currentFrame]) return "";
    return frames[currentFrame].url;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white py-10 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Film className="w-8 h-8 text-emerald-300" />
              <h1 className="text-3xl font-bold">Time-Lapse Generator</h1>
            </div>
            <p className="text-emerald-100 text-sm">Create interactive slideshows of environmental changes over time</p>
          </div>
          {analysisConfig.bbox && (
            <div className="bg-emerald-900/40 border border-emerald-500/30 rounded-lg p-3 text-xs max-w-sm">
              <p className="font-semibold text-emerald-200">Active BBox Location</p>
              <p className="font-mono text-emerald-100 mt-1">{analysisConfig.bbox}</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Placeholder if no bounding box */}
        {!analysisConfig.bbox && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
            <Globe className="w-16 h-16 mx-auto text-slate-300 mb-4 animate-pulse" />
            <h2 className="text-xl font-bold text-slate-800">Please select an analysis area.</h2>
            <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
              You must configure a bounding box and timeframe on the main GeoGuardian dashboard to view satellite time-lapses.
            </p>
            <Link
              to="/geoguardian"
              className="mt-6 inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition shadow-sm"
            >
              Configure Active Area
            </Link>
          </div>
        )}

        {analysisConfig.bbox && (
          <>
            {/* Active Config Indicator */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Using Active Analysis Area</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-slate-700">
                <div>
                  <span className="text-slate-400 block text-2xs uppercase">Location</span>
                  <span className="font-semibold text-slate-800 truncate block" title={analysisConfig.locationName}>
                    {analysisConfig.locationName || "Location name unavailable"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-2xs uppercase">Bounding Box</span>
                  <span className="font-mono font-medium">{analysisConfig.bbox}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-2xs uppercase">Observation Period</span>
                  <span className="font-medium">
                    {analysisConfig.startDate} to {analysisConfig.endDate}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-2xs uppercase">Cloud threshold</span>
                  <span className="font-medium">{analysisConfig.cloudThreshold}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-2xs uppercase">Interval Slider</span>
                  <span className="font-medium">{intervalDays} days</span>
                </div>
              </div>
            </div>

            {/* Input Config Form Section */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 space-y-6">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-700" />
                Configure Time-Lapse Details
              </h2>
              
              {/* Interval Slider */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Interval Between Frames: <span className="text-emerald-700 font-bold">{intervalDays} days</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-700"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Estimated frames to fetch: <span className="font-semibold text-emerald-700">{estimateFrames()}</span> (maximum limit 20)
                </p>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateTimelapse}
                disabled={generating}
                className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white py-3 rounded-lg font-semibold text-sm transition shadow-md hover:shadow-lg flex items-center justify-center gap-3"
              >
                {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
                {generating ? progress : "🎬 Generate Time-Lapse"}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800">Time-lapse generation failed</p>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Metadata info box */}
            {metadata && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-emerald-700" />
                  Time-Lapse Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-emerald-100">
                    <p className="text-slate-400 uppercase tracking-wider text-2xs mb-0.5">Date Range</p>
                    <p className="text-slate-700 font-semibold">{metadata.startDate} to {metadata.endDate}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-emerald-100">
                    <p className="text-slate-400 uppercase tracking-wider text-2xs mb-0.5">Total Frames</p>
                    <p className="text-slate-700 font-bold text-sm font-mono">{metadata.frameCount}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-emerald-100">
                    <p className="text-slate-400 uppercase tracking-wider text-2xs mb-0.5">Frame Delay</p>
                    <p className="text-slate-700 font-semibold font-mono">{metadata.delay}ms</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-emerald-100">
                    <p className="text-slate-400 uppercase tracking-wider text-2xs mb-0.5 font-mono">Dimensions</p>
                    <p className="text-slate-700 font-semibold">{metadata.dimensions}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Player */}
            {frames.length > 0 && (() => {
              const activeFrame = frames[currentFrame];
              const matchingScene = activeFrame ? scenes.find(s => s.date === activeFrame.date) : null;
              const cloudValue = matchingScene?.cloudCover !== undefined ? `${matchingScene.cloudCover}%` : "—";
              const ndviVal = activeFrame ? (ndviCache[activeFrame.date] !== undefined ? ndviCache[activeFrame.date] : "Loading...") : "—";
              const sceneIdVal = matchingScene?.id || "N/A";

              return (
                <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 space-y-6">
                  <div className="text-center space-y-1">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 justify-center">
                      <Film className="w-5 h-5 text-emerald-700" />
                      NDVI TIMELAPSE
                    </h2>
                    <p className="text-xs text-slate-500">
                      <strong>Active Location:</strong> {analysisConfig.locationName || "Location name unavailable"}
                    </p>
                    <p className="text-2xs text-slate-400">
                      <strong>Period:</strong> {analysisConfig.startDate} → {analysisConfig.endDate}
                    </p>
                  </div>

                  {/* Image Display */}
                  <div className="flex justify-center items-center min-h-[400px] bg-slate-100 rounded-xl p-4 border border-slate-200 relative">
                    <img
                      src={getCurrentImageUrl()}
                      alt={`Frame ${currentFrame + 1}`}
                      className="max-w-full max-h-[500px] rounded-lg shadow-md border-4 border-white"
                    />
                    <div className="absolute top-4 right-4 bg-slate-900/80 text-white text-xs px-3 py-1 rounded-full font-mono">
                      Frame {currentFrame + 1} / {frames.length}
                    </div>
                  </div>

                  {/* Metadata display */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 block text-2xs uppercase tracking-wider">Current Acquisition</span>
                      <span className="font-bold text-slate-800">{activeFrame?.date || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-2xs uppercase tracking-wider">Cloud Coverage</span>
                      <span className="font-bold text-slate-800">{cloudValue}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-2xs uppercase tracking-wider">Mean NDVI</span>
                      <span className="font-bold text-emerald-700 font-mono">{ndviVal}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-2xs uppercase tracking-wider">Scene ID</span>
                      <span className="font-mono text-slate-600 truncate block" title={sceneIdVal}>{sceneIdVal}</span>
                    </div>
                  </div>

                  {/* Playback Controls */}
                  <div className="flex justify-center items-center gap-4 border-t border-slate-100 pt-4">
                    <button
                      onClick={goToPrevFrame}
                      disabled={currentFrame === 0}
                      className="px-5 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <button
                      onClick={togglePlay}
                      className="px-8 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition flex items-center gap-2"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {isPlaying ? "Pause" : "Play"}
                    </button>
                    <button
                      onClick={goToNextFrame}
                      disabled={currentFrame === frames.length - 1}
                      className="px-5 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-2"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Example guide */}
            {!frames.length && !generating && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 space-y-6">
                <h3 className="text-sm font-bold text-slate-800 text-center">💡 Example Use Cases</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-center space-y-2">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-700">
                      <Flame className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">Wildfire Progression</h4>
                    <p className="text-xs text-slate-500">Track burn spread over weeks with 5-day intervals.</p>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-center space-y-2">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-700">
                      <Sprout className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">Agricultural Growth</h4>
                    <p className="text-xs text-slate-500">Observe crop phenology from seeding to harvest over months.</p>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-center space-y-2">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center mx-auto text-teal-700">
                      <Trees className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">Forest Clearance</h4>
                    <p className="text-xs text-slate-500">Document canopy disturbances using a 30-day interval.</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TimeLapse;
