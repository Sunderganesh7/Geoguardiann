import React, { useState } from "react";
import axios from "axios";
import MapSelector from "../components/MapSelector";
import CoordinatesConverter from "../components/CoordinatesConverter";
import { Satellite, Calendar, Map, Calculator, Download, Info, AlertCircle, CheckCircle, Cloud, RefreshCw, MapPin } from "lucide-react";
import config from "../config";

const Dashboard = () => {
  const [date, setDate] = useState("2024-07-25");
  const [bbox, setBbox] = useState("-121.8,39.8,-121.3,40.2");
  const [imageUrl, setImageUrl] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(null);
  const [imageRetry, setImageRetry] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [showConverter, setShowConverter] = useState(false);
  const token = localStorage.getItem("token");

  const fetchImage = async () => {
    try {
      setLoading(true);
      setError(null);
      setImageUrl(null);
      setImageLoadError(null);

      const bboxArray = bbox.split(",").map((val) => parseFloat(val.trim()));

      console.log("📤 Sending request to backend:", {
        date,
        bbox: bboxArray,
      });

      const response = await axios.post(
        `${config.API_URL}/api/nasa/image`,
        {
          date,
          bbox: bboxArray,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("✅ Response from backend:", response.data);

      if (response.data.imageUrl) {
        setImageUrl(response.data.imageUrl?.startsWith("/") ? `${config.API_URL}${response.data.imageUrl}` : response.data.imageUrl);
        setMetadata(response.data.metadata);
        setImageLoading(true);
        console.log("✅ Image URL set to:", response.data.imageUrl);
      } else {
        throw new Error("No imageUrl in response");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || error.message || "Failed to fetch image";
      console.error("❌ Error fetching image:", errorMessage);
      setError(errorMessage);
      alert(`Failed to fetch image: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const describeImageLoadFailure = async () => {
    try {
      await axios.get(imageUrl, { responseType: "blob", timeout: 10000 });
      return "The image response could not be rendered by the browser.";
    } catch (requestError) {
      const body = requestError.response?.data;
      const details = body instanceof Blob ? await body.text() : body;
      try {
        const parsed = typeof details === "string" ? JSON.parse(details) : details;
        return parsed?.error || parsed?.details || `Image endpoint returned HTTP ${requestError.response?.status}.`;
      } catch {
        return `Image endpoint returned HTTP ${requestError.response?.status || "an unavailable response"}.`;
      }
    }
  };

  const retryImage = () => {
    setImageLoadError(null);
    setError(null);
    setImageLoading(true);
    setImageRetry((value) => value + 1);
  };

  const saveAnalysis = async () => {
    try {
      if (!metadata || !imageUrl) {
        alert("Image data missing");
        return;
      }

      setSaving(true);
      console.log("💾 Saving analysis...");

      const response = await axios.post(
        `${config.API_URL}/api/analysis`,
        {
          title: `Analysis - ${date}`,
          description: `Sentinel-2 satellite imagery analysis`,
          location: "User Location",
          bbox: metadata.bbox,
          nasaLayer: "Sentinel-2-L2A",
          date: metadata.date,
          imageFileId: imageUrl.split('/').pop(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("✅ Analysis saved:", response.data);
      alert("✅ Analysis saved to history!");
      
      setImageUrl(null);
      setMetadata(null);
    } catch (error) {
      console.error("❌ Error saving analysis:", error);
      alert("Failed to save analysis");
    } finally {
      setSaving(false);
    }
  };

  const handleMapBBoxSelect = (mapBbox) => {
    const bboxString = `${mapBbox.west},${mapBbox.south},${mapBbox.east},${mapBbox.north}`;
    setBbox(bboxString);
    setShowMap(false);
  };

  const handleConverterBBoxSelect = (converterBbox) => {
    setBbox(converterBbox);
    setShowConverter(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 text-white py-12 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Satellite className="w-10 h-10" />
            <h1 className="text-4xl font-bold">GeoGuardian Dashboard</h1>
          </div>
          <p className="text-emerald-100 text-lg">Fetch high-resolution satellite imagery using Sentinel-2 (10m resolution)</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Input Form Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Info className="w-6 h-6 text-emerald-600" />
            Configure Your Query
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Date Input */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Date (YYYY-MM-DD)
              </label>
              <input
                type="text"
                placeholder="2024-07-25"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">Sentinel-2 data available from 2015 onwards, updated every 5 days</p>
            </div>

            {/* Satellite Source */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <Satellite className="w-4 h-4 text-emerald-600" />
                Satellite Source
              </label>
              <input
                type="text"
                value="Sentinel-2 L2A (High Resolution, Cloud-Masked)"
                disabled
                className="w-full px-4 py-3 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 cursor-not-allowed"
              />
              <p className="text-xs text-slate-500 mt-1">✅ 10m resolution | ✅ Automatic cloud masking | ✅ Professional-grade data</p>
            </div>
          </div>

          {/* Bounding Box */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Bounding Box (Region)
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="west,south,east,north"
                value={bbox}
                onChange={(e) => setBbox(e.target.value)}
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
              />
              <button
                onClick={() => {
                  setShowMap(!showMap);
                  setShowConverter(false);
                }}
                className={`px-6 py-3 rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2 ${
                  showMap ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                <Map className="w-5 h-5" />
                {showMap ? "Close" : "Map"}
              </button>
              <button
                onClick={() => {
                  setShowConverter(!showConverter);
                  setShowMap(false);
                }}
                className={`px-6 py-3 rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2 ${
                  showConverter ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                <Calculator className="w-5 h-5" />
                {showConverter ? "Close" : "Convert"}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">Format: west,south,east,north (e.g., -121.8,39.8,-121.3,40.2 for California wildfire)</p>
          </div>

          {/* Fetch Button */}
          <button
            onClick={fetchImage}
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-4 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <Download className="w-6 h-6" />
            {loading ? "⏳ Fetching from Sentinel..." : "📥 Fetch Satellite Image"}
          </button>
        </div>

        {/* Map Selector */}
        {showMap && (
          <div className="mb-8">
            <MapSelector
              onBBoxSelect={handleMapBBoxSelect}
              initialBBox={
                bbox
                  ? {
                      west: parseFloat(bbox.split(",")[0]),
                      south: parseFloat(bbox.split(",")[1]),
                      east: parseFloat(bbox.split(",")[2]),
                      north: parseFloat(bbox.split(",")[3]),
                    }
                  : null
              }
            />
          </div>
        )}

        {/* Coordinates Converter */}
        {showConverter && (
          <div className="mb-8">
            <CoordinatesConverter
              onBBoxSelect={handleConverterBBoxSelect}
              initialBBox={bbox}
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-8 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Metadata Box */}
        {metadata && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Info className="w-6 h-6 text-blue-600" />
              Image Information
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-xs font-semibold text-slate-600 mb-1">File ID</p>
                <p className="text-sm text-slate-800 font-mono">{metadata.fileId}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-xs font-semibold text-slate-600 mb-1">Date</p>
                <p className="text-sm text-slate-800">{metadata.date}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-xs font-semibold text-slate-600 mb-1">Source</p>
                <p className="text-sm text-slate-800">{metadata.source || "Sentinel-2"}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-xs font-semibold text-slate-600 mb-1">Size</p>
                <p className="text-sm text-slate-800">{metadata.size}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-xs font-semibold text-slate-600 mb-1">Uploaded</p>
                <p className="text-sm text-slate-800">{new Date(metadata.uploadDate).toLocaleString()}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-xs font-semibold text-slate-600 mb-1">Coordinates</p>
                <p className="text-sm text-slate-800 font-mono">{metadata.bbox?.join(", ")}</p>
              </div>
            </div>
          </div>
        )}

        {/* Image Result */}
        {imageUrl && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-slate-200">
            <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Satellite className="w-6 h-6 text-emerald-600" />
              Satellite Image Result
            </h3>
            <div className="rounded-lg overflow-hidden shadow-xl border border-slate-200 mb-4">
              {imageLoading && !imageLoadError && <div className="p-10 text-center text-slate-600">Loading satellite image…</div>}
              {!imageLoadError && <img
                key={imageRetry}
                src={imageUrl}
                alt="Satellite"
                className="w-full h-auto"
                onLoad={() => { setImageLoading(false); setImageLoadError(null); }}
                onError={async () => {
                  const message = await describeImageLoadFailure();
                  setImageLoading(false);
                  setImageLoadError(message);
                  setError(message);
                }}
              />}
              {imageLoadError && <div className="p-8 text-center text-red-700"><p className="font-semibold">Satellite image could not be loaded</p><p className="text-sm mt-1">{imageLoadError}</p><button onClick={retryImage} className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white">Retry image load</button></div>}
            </div>
            <div className="bg-slate-50 p-4 rounded-lg mb-4">
              <p className="text-xs font-semibold text-slate-600 mb-1">Image URL</p>
              <p className="text-sm text-slate-800 font-mono break-all">{imageUrl}</p>
            </div>
            <button
              onClick={saveAnalysis}
              disabled={saving}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <CheckCircle className="w-6 h-6" />
              {saving ? "💾 Saving..." : "💾 Save to Analysis History"}
            </button>
          </div>
        )}

        {/* Placeholder - Get Started */}
        {!imageUrl && !loading && !error && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-slate-200">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full mb-6">
              <Satellite className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">Get Started</h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">Select a date and region, then click "Fetch Satellite Image" to view high-resolution satellite imagery</p>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-xl border border-emerald-200">
                <div className="w-12 h-12 bg-emerald-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-6 h-6 text-emerald-700" />
                </div>
                <h4 className="font-bold text-slate-800 mb-2">High Resolution</h4>
                <p className="text-sm text-slate-600">10m per pixel clarity</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border border-blue-200">
                <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Cloud className="w-6 h-6 text-blue-700" />
                </div>
                <h4 className="font-bold text-slate-800 mb-2">Cloud Masked</h4>
                <p className="text-sm text-slate-600">Maximum 30% cloud coverage</p>
              </div>
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 p-6 rounded-xl border border-teal-200">
                <div className="w-12 h-12 bg-teal-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <RefreshCw className="w-6 h-6 text-teal-700" />
                </div>
                <h4 className="font-bold text-slate-800 mb-2">Updated Regularly</h4>
                <p className="text-sm text-slate-600">Fresh data every 5 days</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
