// frontend/src/pages/CompareImages.jsx
import React, { useState } from "react";
import { useAnalysis } from "../context/AnalysisContext";
import { Link } from "react-router-dom";
import { Search, Calendar, Map, Globe, Download, Satellite, AlertCircle, TrendingUp, BarChart3, BarChart2, RefreshCw, Save, Image } from "lucide-react";
import axios from "axios";
import { resultMatchesConfig } from "../utils/analysisDataset";

const API = "";

const CompareImages = () => {
  const {
    analysisConfig,
    analysisResult,
    runAnalysis,
    analyzing,
    analysisStep,
    analysisError
  } = useAnalysis();

  const [saving, setSaving] = useState(false);
  const [beforeSatErr, setBeforeSatErr] = useState(false);
  const [afterSatErr, setAfterSatErr] = useState(false);

  const token = localStorage.getItem("token");

  const isDataConsistent = resultMatchesConfig(analysisConfig, analysisResult);

  // Save analysis to database history
  const saveAnalysis = async () => {
    if (!analysisResult) return;
    try {
      setSaving(true);
      console.log("💾 Saving comparison analysis...");
      const a = analysisResult.analysis;
      
      await axios.post(
        `${API}/api/analysis`,
        {
          title: `Change Detection: ${a.beforeDate} vs ${a.afterDate}`,
          description: a.status,
          location: analysisConfig.locationName || analysisResult?.locationName || "Comparison Area",
          bbox: analysisConfig.bbox.split(",").map(Number),
          nasaLayer: "Sentinel-2-L2A",
          date: a.afterDate,
          imageFileId: analysisResult.changeImageId,
          analysis: {
            changePercentage: a.affectedPercentage,
            changeType: a.status.includes("decline") ? "decline" : "stable",
            severity: a.affectedPercentage > 15 ? "high" : a.affectedPercentage > 5 ? "medium" : "low",
            summary: a.status,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert("✅ Analysis saved to history!");
    } catch (err) {
      console.error("❌ Error saving analysis:", err);
      alert("Failed to save analysis to history: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const getSeverityColor = (percentage) => {
    if (percentage > 15) return "text-red-600 bg-red-50 border-red-200";
    if (percentage > 5) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-green-600 bg-green-50 border-green-200";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white py-10 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Satellite className="w-8 h-8 text-emerald-300" />
              <h1 className="text-3xl font-bold">Compare Satellite Images</h1>
            </div>
            <p className="text-emerald-100 text-sm">Review high-resolution Sentinel-2 observations side-by-side.</p>
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
              You must configure a bounding box and timeframe on the main GeoGuardian dashboard to view satellite comparisons.
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
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Using Active Analysis Area</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-slate-700">
                <div>
                  <span className="text-slate-400 block text-2xs uppercase">Location</span>
                  <span className="font-semibold text-slate-800 truncate block" title={analysisConfig.locationName || analysisResult?.locationName}>
                    {analysisConfig.locationName || analysisResult?.locationName || "Location name unavailable"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-2xs uppercase">Bounding Box</span>
                  <span className="font-mono font-medium">{analysisConfig.bbox}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-2xs uppercase">Observation Dates</span>
                  <span className="font-medium">
                    {analysisConfig.beforeDate || "—"} to {analysisConfig.afterDate || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-2xs uppercase">Cloud threshold</span>
                  <span className="font-medium">{analysisConfig.cloudThreshold}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-2xs uppercase">NDVI Change Threshold</span>
                  <span className="font-medium">−{analysisConfig.changeThreshold}</span>
                </div>
              </div>
            </div>

            {/* Run button if result not loaded yet */}
            {!analysisResult && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
                <BarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-800">No active comparison result loaded</h3>
                <p className="text-slate-500 text-sm mt-1 mb-5">Run the comparison pipeline using the active dates.</p>
                <button
                  onClick={() => runAnalysis()}
                  disabled={analyzing || !analysisConfig.beforeDate || !analysisConfig.afterDate}
                  className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition flex items-center gap-2 mx-auto"
                >
                  {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {analyzing ? "Processing satellite bands..." : "Compare & Detect Changes"}
                </button>
                {analyzing && (
                  <p className="text-xs text-slate-400 mt-2">
                    Step {analysisStep + 1} of 17 in progress...
                  </p>
                )}
                {analysisError && (
                  <p className="text-sm text-red-600 mt-3">❌ {analysisError}</p>
                )}
              </div>
            )}

            {analysisResult && !isDataConsistent && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center text-red-800 flex flex-col items-center gap-2">
                <AlertCircle className="w-10 h-10 text-red-600" />
                <p className="font-bold text-sm">Analysis data is inconsistent. Please rerun the analysis.</p>
                <p className="text-xs text-red-500">Active configuration does not match the parameters of the loaded comparison result.</p>
              </div>
            )}

            {/* Side-by-side comparison panels */}
            {analysisResult && isDataConsistent && (
              <div className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Before Panel */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-emerald-700" />
                      Before ({analysisResult.analysis.beforeDate})
                    </h3>
                    <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative flex items-center justify-center">
                      {analysisResult.beforeSatImageUrl && !beforeSatErr ? (
                        <img
                          src={analysisResult.beforeSatImageUrl}
                          alt="Before scene"
                          className="w-full h-full object-cover"
                          onError={() => setBeforeSatErr(true)}
                        />
                      ) : (
                        <div className="text-center text-slate-400 p-4">
                          <AlertCircle className="w-10 h-10 mx-auto text-amber-500 mb-2" />
                          <p className="text-sm font-semibold text-slate-700">Imagery unavailable</p>
                          <p className="text-xs text-slate-400 mt-1">Satellite true color acquisition failed.</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
                      <div>
                        <span className="block text-2xs uppercase text-slate-400">Mean NDVI</span>
                        <span className="font-semibold text-slate-700 font-mono">{analysisResult.analysis.beforeMeanNdvi.toFixed(4)}</span>
                      </div>
                      <div>
                        <span className="block text-2xs uppercase text-slate-400">Cloud free pixels</span>
                        <span className="font-semibold text-slate-700">{analysisResult.analysis.beforeValidPixels}%</span>
                      </div>
                    </div>
                  </div>

                  {/* After Panel */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-emerald-700" />
                      After ({analysisResult.analysis.afterDate})
                    </h3>
                    <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative flex items-center justify-center">
                      {analysisResult.afterSatImageUrl && !afterSatErr ? (
                        <img
                          src={analysisResult.afterSatImageUrl}
                          alt="After scene"
                          className="w-full h-full object-cover"
                          onError={() => setAfterSatErr(true)}
                        />
                      ) : (
                        <div className="text-center text-slate-400 p-4">
                          <AlertCircle className="w-10 h-10 mx-auto text-amber-500 mb-2" />
                          <p className="text-sm font-semibold text-slate-700">Imagery unavailable</p>
                          <p className="text-xs text-slate-400 mt-1">Satellite true color acquisition failed.</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
                      <div>
                        <span className="block text-2xs uppercase text-slate-400">Mean NDVI</span>
                        <span className="font-semibold text-slate-700 font-mono">{analysisResult.analysis.afterMeanNdvi.toFixed(4)}</span>
                      </div>
                      <div>
                        <span className="block text-2xs uppercase text-slate-400">Cloud free pixels</span>
                        <span className="font-semibold text-slate-700">{analysisResult.analysis.afterValidPixels}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Change Map & Stats */}
                <div className="bg-white rounded-xl shadow-sm p-8 border border-slate-200 space-y-6">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-4">
                    <Image className="w-6 h-6 text-emerald-700" />
                    Vegetation Change Classification map
                  </h3>

                  <div className="grid lg:grid-cols-3 gap-8">
                    {/* Change Map display */}
                    <div className="lg:col-span-2">
                      <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative shadow-inner">
                        {analysisResult.changeImageUrl && (
                          <img src={analysisResult.changeImageUrl} alt="Change Map" className="w-full h-full object-cover" />
                        )}
                        <div className="absolute bottom-2 left-2 bg-white/95 px-2 py-1 rounded text-2xs text-slate-500 border border-slate-200">
                          {analysisResult.analysis.beforeDate} to {analysisResult.analysis.afterDate}
                        </div>
                      </div>
                    </div>

                    {/* Stats details */}
                    <div className="space-y-4">
                      <div className={`p-4 rounded-xl border ${getSeverityColor(analysisResult.analysis.affectedPercentage)}`}>
                        <p className="text-3xl font-bold font-mono">{analysisResult.analysis.affectedPercentage}%</p>
                        <p className="text-xs font-semibold uppercase tracking-wider mt-1">Significant local decline</p>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                        <div className="flex justify-between"><span className="text-slate-500">Monitored Area</span><span className="font-semibold text-slate-800">{analysisResult.analysis.totalMonitoredAreaKm2.toFixed(4)} km²</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Decline Area</span><span className="font-semibold text-red-600">{analysisResult.analysis.changedAreaKm2.toFixed(4)} km²</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">NDVI change</span><span className={`font-semibold ${analysisResult.analysis.ndviChange < 0 ? "text-red-600" : "text-emerald-700"}`}>{analysisResult.analysis.ndviChange >= 0 ? "+" : ""}{analysisResult.analysis.ndviChange.toFixed(4)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Relative change</span><span className={`font-semibold ${analysisResult.analysis.relativeChange < 0 ? "text-red-600" : "text-emerald-700"}`}>{analysisResult.analysis.relativeChange >= 0 ? "+" : ""}{analysisResult.analysis.relativeChange}%</span></div>
                      </div>

                      <div className="text-2xs text-slate-400">
                        ⓘ Significant local decline is defined as pixels with NDVI decrease greater than −{analysisResult.analysis.threshold} change threshold.
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
                    <strong>Scientific Interpretation:</strong> {analysisResult.analysis.status}
                  </div>

                  {/* Save button */}
                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={saveAnalysis}
                      disabled={saving}
                      className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-lg text-sm transition shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                      {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saving ? "Saving..." : "Save to History"}
                    </button>
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

export default CompareImages;
