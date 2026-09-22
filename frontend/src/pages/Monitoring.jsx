import React, { useState, useEffect } from "react";
import { useAnalysis } from "../context/AnalysisContext";
import axios from "axios";
import MapSelector from "../components/MapSelector";
import { Clock, Plus, X, Map, Check, Trash2, Search, AlertCircle, Info, Bell, MapPin, Calendar, BarChart2, Mail } from "lucide-react";
import config from "../config";

const Monitoring = () => {
  const { analysisConfig } = useAnalysis();
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkingRegionId, setCheckingRegionId] = useState(null);
  const [error, setError] = useState(null);
  const [checkResult, setCheckResult] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showMap, setShowMap] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    bbox: analysisConfig.bbox || "",
    location: analysisConfig.locationName || "",
    frequency: "weekly",
    alertOnSeverity: ["high", "medium"],
  });

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchRegions();
  }, []);

  const fetchRegions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(
        `${config.API_URL}/api/monitoring/regions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRegions(response.data.regions);
    } catch (error) {
      console.error("Error fetching regions:", error);
      setError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const addRegion = async () => {
    try {
      await axios.post(
        `${config.API_URL}/api/monitoring/regions`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert("✅ Region added to monitoring!");
      setShowAddForm(false);
      setFormData({
        name: "",
        description: "",
        bbox: "",
        location: "",
        frequency: "weekly",
        alertOnSeverity: ["high", "medium"],
      });
      fetchRegions();
    } catch (error) {
      console.error("Error adding region:", error);
      alert("Failed to add region");
    }
  };

  const deleteRegion = async (id) => {
    if (!window.confirm("Delete this monitored region?")) return;

    try {
      await axios.delete(`${config.API_URL}/api/monitoring/regions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("✅ Region deleted");
      fetchRegions();
    } catch (error) {
      console.error("Error deleting region:", error);
    }
  };

  const triggerManualCheck = async (id) => {
    try {
      setCheckingRegionId(id);
      setError(null);
      setCheckResult(null);
      const response = await axios.post(
        `${config.API_URL}/api/monitoring/regions/${id}/check`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCheckResult(response.data.result || { message: response.data.message });
      await fetchRegions();
    } catch (error) {
      console.error("Error triggering check:", error);
      setError(error.response?.data?.error || error.response?.data?.details || error.message || "Satellite check failed");
    } finally {
      setCheckingRegionId(null);
    }
  };

  const handleMapBBoxSelect = (mapBbox) => {
    const bboxString = `${mapBbox.west},${mapBbox.south},${mapBbox.east},${mapBbox.north}`;
    setFormData({ ...formData, bbox: bboxString });
    setShowMap(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white py-12 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Automated Monitoring</h1>
          </div>
          <p className="text-indigo-100 text-lg">Set up regions to monitor automatically for environmental changes</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700"><strong>Unable to complete request:</strong> {error}</div>}
        {checkResult && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 text-emerald-800"><strong>Latest check completed.</strong> {checkResult.message || `Scene ${checkResult.sceneDate}: NDVI change ${checkResult.ndviChange}`}</div>}
        
        {analysisConfig.bbox && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 mb-8 flex flex-col gap-1.5">
            <h4 className="font-semibold text-indigo-900 text-sm">Active Analysis Area</h4>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-indigo-800 text-xs">
              <span><strong>Location:</strong> {analysisConfig.locationName || "Location name unavailable"}</span>
              <span><strong>BBox:</strong> {analysisConfig.bbox}</span>
              <span><strong>Period:</strong> {analysisConfig.startDate} to {analysisConfig.endDate}</span>
              <span><strong>Cloud threshold:</strong> {analysisConfig.cloudThreshold}%</span>
            </div>
          </div>
        )}

        {/* Add Region Button */}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`mb-8 px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 ${
            showAddForm 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white'
          }`}
        >
          {showAddForm ? (
            <>
              <X className="w-5 h-5" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Add New Region
            </>
          )}
        </button>

        {/* Add Region Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-slate-200">
            <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Plus className="w-6 h-6 text-indigo-600" />
              Add Region to Monitor
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Region Name</label>
                <input
                  type="text"
                  placeholder="e.g., Amazon Forest"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description (Optional)</label>
                <textarea
                  placeholder="Add a description for this monitored region"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none min-h-24"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Location</label>
                <input
                  type="text"
                  placeholder="e.g., Brazil"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Map className="w-4 h-4 text-indigo-600" />
                    Bounding Box
                  </label>
                  {analysisConfig.bbox && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, bbox: analysisConfig.bbox })}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      Use Active Area ({analysisConfig.bbox})
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="west,south,east,north"
                    value={formData.bbox}
                    onChange={(e) => setFormData({ ...formData, bbox: e.target.value })}
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                  />
                  <button
                    onClick={() => setShowMap(!showMap)}
                    className={`px-6 py-3 rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2 ${
                      showMap ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    }`}
                  >
                    {showMap ? <X className="w-5 h-5" /> : <Map className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {showMap && (
                <div className="mb-4">
                  <MapSelector
                    onBBoxSelect={handleMapBBoxSelect}
                    initialBBox={
                      formData.bbox
                        ? {
                            west: parseFloat(formData.bbox.split(",")[0]),
                            south: parseFloat(formData.bbox.split(",")[1]),
                            east: parseFloat(formData.bbox.split(",")[2]),
                            north: parseFloat(formData.bbox.split(",")[3]),
                          }
                        : null
                    }
                  />
                </div>
              )}

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Check Frequency
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                >
                  <option value="daily">Daily (9 AM every day)</option>
                  <option value="weekly">Weekly (9 AM every Monday)</option>
                  <option value="monthly">Monthly (9 AM on 1st)</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                  <Bell className="w-4 h-4 text-indigo-600" />
                  Send Alerts For
                </label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.alertOnSeverity.includes("high")}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData({
                          ...formData,
                          alertOnSeverity: checked
                            ? [...formData.alertOnSeverity, "high"]
                            : formData.alertOnSeverity.filter((s) => s !== "high"),
                        });
                      }}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700">High Severity</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.alertOnSeverity.includes("medium")}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData({
                          ...formData,
                          alertOnSeverity: checked
                            ? [...formData.alertOnSeverity, "medium"]
                            : formData.alertOnSeverity.filter((s) => s !== "medium"),
                        });
                      }}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700">Medium Severity</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.alertOnSeverity.includes("low")}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData({
                          ...formData,
                          alertOnSeverity: checked
                            ? [...formData.alertOnSeverity, "low"]
                            : formData.alertOnSeverity.filter((s) => s !== "low"),
                        });
                      }}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700">Low Severity</span>
                  </label>
                </div>
              </div>

              <button
                onClick={addRegion}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-4 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-6 h-6" />
                Save Region
              </button>
            </div>
          </div>
        )}

        {/* Monitored Regions List */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200 mb-8">
          <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-indigo-600" />
            Monitored Regions ({regions.length})
          </h3>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
              <p className="text-slate-600 mt-4">Loading regions...</p>
            </div>
          ) : regions.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg">
              <MapPin className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 font-medium mb-2">No monitored regions yet</p>
              <p className="text-slate-500">Add a region to start automated monitoring</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regions.map((region) => (
                <div key={region._id} className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl p-6 shadow-md hover:shadow-lg transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-lg font-bold text-slate-800">{region.name}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      region.monitoring.enabled 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {region.monitoring.enabled ? "Active" : "Paused"}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 mb-4">{region.description || "No description"}</p>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2 text-slate-700">
                      <MapPin className="w-4 h-4 text-indigo-500" />
                      <span className="font-medium">Location:</span>
                      <span>{region.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      <span className="font-medium">Frequency:</span>
                      <span className="capitalize">{region.monitoring.frequency}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Bell className="w-4 h-4 text-indigo-500" />
                      <span className="font-medium">Alerts:</span>
                      <span className="capitalize">{region.monitoring.alertOnSeverity.join(", ")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      <span className="font-medium">Last Check:</span>
                      <span>{region.lastChecked ? new Date(region.lastChecked).toLocaleDateString() : "Never"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <BarChart2 className="w-4 h-4 text-indigo-500" />
                      <span className="font-medium">Last Change:</span>
                      <span className="font-bold text-indigo-600">{region.lastChangePercentage}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Mail className="w-4 h-4 text-indigo-500" />
                      <span className="font-medium">Total Alerts:</span>
                      <span className="font-bold">{region.totalAlertsSent}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => triggerManualCheck(region._id)}
                      disabled={checkingRegionId === region._id}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                    >
                      <Search className="w-4 h-4" />
                      {checkingRegionId === region._id ? "Checking latest satellite data..." : "Check Now"}
                    </button>
                    <button
                      onClick={() => deleteRegion(region._id)}
                      className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8">
          <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Info className="w-6 h-6 text-blue-600" />
            How It Works
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-slate-700">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">1</div>
              <p>Add regions you want to monitor automatically</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">2</div>
              <p>Choose check frequency (daily/weekly/monthly)</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">3</div>
              <p>System fetches new satellite images on schedule</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">4</div>
              <p>Compares with previous image to detect changes</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">5</div>
              <p>Sends email alert if change severity matches your settings</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">6</div>
              <p>You can manually trigger checks anytime</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Monitoring;
