// frontend/src/pages/AnalysisHistory.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import AnalysisCard from "../components/AnalysisCard";
import AnalysisDetail from "../components/AnalysisDetail";
import { History, AlertCircle, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import config from "../config";

const AnalysisHistory = () => {
  const [analyses, setAnalyses] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const token = localStorage.getItem("token");

  // Fetch all analyses
  useEffect(() => {
    fetchAnalyses();
  }, [page]);

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `${config.API_URL}/api/analysis?page=${page}&limit=6`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("✅ Analyses fetched:", response.data);
      setAnalyses(response.data.data);
      setTotalPages(response.data.pagination.pages);
    } catch (err) {
      console.error("❌ Error fetching analyses:", err);
      setError(err.response?.data?.error || err.response?.data?.details || err.message || "Failed to load analysis history");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnalysis = async (id) => {
    if (!window.confirm("Delete this analysis? This cannot be undone.")) return;

    try {
      await axios.delete(`${config.API_URL}/api/analysis/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("✅ Analysis deleted");
      setSelectedAnalysis(null);
      fetchAnalyses();
    } catch (err) {
      console.error("❌ Error deleting analysis:", err);
      setError("Failed to delete analysis");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white py-12 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <History className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Analysis History</h1>
          </div>
          <p className="text-amber-100 text-lg">View your satellite imagery analyses and detected changes</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        
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

        {selectedAnalysis ? (
          // Show detailed view
          <AnalysisDetail
            analysis={selectedAnalysis}
            onBack={() => setSelectedAnalysis(null)}
            onDelete={() => handleDeleteAnalysis(selectedAnalysis._id)}
          />
        ) : (
          // Show list view
          <div>
            {loading ? (
              <div className="bg-white rounded-xl shadow-lg p-16 text-center border border-slate-200">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-amber-200 border-t-amber-600 mb-4"></div>
                <p className="text-slate-600 text-lg font-medium">Loading analyses...</p>
              </div>
            ) : !error && analyses.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-16 text-center border border-slate-200">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full mb-6">
                  <FileText className="w-10 h-10 text-amber-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">No analyses yet</h3>
                <p className="text-slate-600 max-w-md mx-auto">
                  Go to Dashboard and fetch a satellite image to get started!
                </p>
              </div>
            ) : (
              <div>
                {/* Analysis Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {analyses.map((analysis) => (
                    <AnalysisCard
                      key={analysis._id}
                      analysis={analysis}
                      onView={() => setSelectedAnalysis(analysis)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="bg-white rounded-xl shadow-lg p-6 flex justify-center items-center gap-4 border border-slate-200">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      Previous
                    </button>

                    <span className="text-slate-700 font-medium px-4 min-w-32 text-center">
                      Page {page} of {totalPages}
                    </span>

                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      Next
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisHistory;
