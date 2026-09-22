// frontend/src/components/AnalysisDetail.jsx Detailed view with side-by-side image + full metadata, edit & delete features
import React, { useState } from "react";
import config from "../config";

const AnalysisDetail = ({ analysis, onBack, onDelete }) => {
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    title: analysis.title,
    description: analysis.description,
    location: analysis.location,
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatBBox = (bbox) => {
    if (!bbox || bbox.length !== 4) return "N/A";
    const [west, south, east, north] = bbox;
    return `West: ${west.toFixed(4)}, South: ${south.toFixed(4)}, East: ${east.toFixed(4)}, North: ${north.toFixed(4)}`;
  };

  const calculateArea = (bbox) => {
    if (!bbox || bbox.length !== 4) return "N/A";
    const [west, south, east, north] = bbox;
    const width = Math.abs(east - west);
    const height = Math.abs(north - south);
    const area = width * height;
    return `${area.toFixed(2)}°²`;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>
          ← Back
        </button>
        <h2 style={styles.title}>{editData.title}</h2>
        <button onClick={onDelete} style={styles.deleteButton}>
          🗑️ Delete
        </button>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {/* Left Panel - Info */}
        <div style={styles.infoPanel}>
          <div style={styles.section}>
            <h3>📋 Details</h3>

            {editMode ? (
              <div>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) =>
                    setEditData({ ...editData, title: e.target.value })
                  }
                  style={styles.input}
                  placeholder="Title"
                />
                <textarea
                  value={editData.description}
                  onChange={(e) =>
                    setEditData({ ...editData, description: e.target.value })
                  }
                  style={styles.textarea}
                  placeholder="Description"
                  rows="3"
                />
                <input
                  type="text"
                  value={editData.location}
                  onChange={(e) =>
                    setEditData({ ...editData, location: e.target.value })
                  }
                  style={styles.input}
                  placeholder="Location"
                />
                <button
                  onClick={() => setEditMode(false)}
                  style={styles.saveButton}
                >
                  ✅ Save
                </button>
              </div>
            ) : (
              <div>
                <p style={styles.metaLabel}>
                  <strong>Description:</strong>
                </p>
                <p style={styles.metaValue}>
                  {analysis.description || "No description"}
                </p>

                <p style={styles.metaLabel}>
                  <strong>Location:</strong>
                </p>
                <p style={styles.metaValue}>{analysis.location}</p>

                <button
                  onClick={() => setEditMode(true)}
                  style={styles.editButton}
                >
                  ✏️ Edit
                </button>
              </div>
            )}
          </div>

          <div style={styles.section}>
            <h3>🛰️ NASA Data</h3>
            <p style={styles.metaLabel}>
              <strong>Layer:</strong>
            </p>
            <p style={styles.metaValue}>{analysis.nasaLayer}</p>

            <p style={styles.metaLabel}>
              <strong>Date:</strong>
            </p>
            <p style={styles.metaValue}>{formatDate(analysis.date)}</p>

            <p style={styles.metaLabel}>
              <strong>Captured:</strong>
            </p>
            <p style={styles.metaValue}>{formatDate(analysis.createdAt)}</p>
          </div>

          <div style={styles.section}>
            <h3>📍 Geographic Info</h3>
            <p style={styles.metaLabel}>
              <strong>Coordinates:</strong>
            </p>
            <p style={styles.metaValue}>{formatBBox(analysis.bbox)}</p>

            <p style={styles.metaLabel}>
              <strong>Area Size:</strong>
            </p>
            <p style={styles.metaValue}>{calculateArea(analysis.bbox)}</p>
          </div>

          {analysis.analysis && analysis.analysis.changePercentage && (
            <div style={styles.section}>
              <h3>📊 Analysis Results</h3>
              <p style={styles.metaLabel}>
                <strong>Change Detected:</strong>
              </p>
              <p style={styles.changeValue}>
                {analysis.analysis.changePercentage}%
              </p>

              <p style={styles.metaLabel}>
                <strong>Severity:</strong>
              </p>
              <p
                style={{
                  ...styles.metaValue,
                  color: getSeverityColor(analysis.analysis.severity),
                  fontWeight: "bold",
                }}
              >
                {analysis.analysis.severity?.toUpperCase()}
              </p>

              {analysis.analysis.summary && (
                <>
                  <p style={styles.metaLabel}>
                    <strong>Summary:</strong>
                  </p>
                  <p style={styles.metaValue}>{analysis.analysis.summary}</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Panel - Image */}
        <div style={styles.imagePanel}>
          <h3>🖼️ Satellite Image</h3>
          {analysis.imageFileId ? (
           <img
              src={`${config.API_URL}/api/nasa/image/${analysis.imageFileId}`}
              alt="Satellite"
              style={styles.image}
              onError={(e) => {
                e.target.style.background = "#f0f0f0";
                e.target.style.display = "flex";
                e.target.style.alignItems = "center";
                e.target.style.justifyContent = "center";
                e.target.textContent = "Image not found";
              }}
            />
          ) : (
            <div style={styles.noImage}>No image available</div>
          )}
        </div>
      </div>
    </div>
  );
};

const getSeverityColor = (severity) => {
  switch (severity) {
    case "high":
      return "#f44336";
    case "medium":
      return "#ff9800";
    case "low":
      return "#4caf50";
    default:
      return "#2196f3";
  }
};

const styles = {
  container: {
    background: "white",
    borderRadius: "8px",
    padding: "20px",
    marginTop: "20px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
    paddingBottom: "20px",
    borderBottom: "1px solid #e0e0e0",
  },
  title: {
    margin: 0,
    flex: 1,
    textAlign: "center",
    fontSize: "24px",
  },
  backButton: {
    padding: "10px 20px",
    backgroundColor: "#f5f5f5",
    border: "1px solid #ddd",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
  },
  deleteButton: {
    padding: "10px 20px",
    backgroundColor: "#f44336",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
  },
  content: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "30px",
  },
  infoPanel: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  imagePanel: {
    display: "flex",
    flexDirection: "column",
  },
  section: {
    background: "#f9f9f9",
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid #e0e0e0",
  },
  metaLabel: {
    margin: "12px 0 4px 0",
    fontSize: "12px",
    color: "#666",
    fontWeight: "bold",
  },
  metaValue: {
    margin: 0,
    fontSize: "14px",
    color: "#333",
    wordBreak: "break-word",
  },
  changeValue: {
    margin: 0,
    fontSize: "24px",
    color: "#2196f3",
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    padding: "8px",
    marginBottom: "10px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "8px",
    marginBottom: "10px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
  },
  editButton: {
    padding: "8px 16px",
    backgroundColor: "#2196f3",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    marginTop: "10px",
  },
  saveButton: {
    padding: "8px 16px",
    backgroundColor: "#4caf50",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
  },
  image: {
    width: "100%",
    maxHeight: "600px",
    objectFit: "contain",
    borderRadius: "8px",
    border: "1px solid #e0e0e0",
    backgroundColor: "#f9f9f9",
  },
  noImage: {
    width: "100%",
    height: "400px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f0f0f0",
    borderRadius: "8px",
    color: "#999",
    fontSize: "16px",
  },
};

export default AnalysisDetail;