// frontend/src/components/AnalysisCard.jsx individual card in grid .Individual card component displaying analysis summary
import React from "react";

const AnalysisCard = ({ analysis, onView }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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

  const formatBBox = (bbox) => {
    if (!bbox || bbox.length !== 4) return "N/A";
    const [west, south, east, north] = bbox;
    return `(${west.toFixed(2)}, ${south.toFixed(2)})`;
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>{analysis.title || "Satellite Analysis"}</h3>
        <span style={styles.date}>{formatDate(analysis.createdAt)}</span>
      </div>

      <div style={styles.content}>
        <p style={styles.description}>
          {analysis.description || "No description provided"}
        </p>

        <div style={styles.metadata}>
          <div style={styles.metaItem}>
            <span style={styles.label}>📍 Location:</span>
            <span style={styles.value}>{analysis.location || "Unknown"}</span>
          </div>

          <div style={styles.metaItem}>
            <span style={styles.label}>🛰️ Layer:</span>
            <span style={styles.value} title={analysis.nasaLayer}>
              {analysis.nasaLayer.substring(0, 25)}...
            </span>
          </div>

          <div style={styles.metaItem}>
            <span style={styles.label}>📊 Date:</span>
            <span style={styles.value}>{formatDate(analysis.date)}</span>
          </div>

          <div style={styles.metaItem}>
            <span style={styles.label}>🎯 Area:</span>
            <span style={styles.value}>{formatBBox(analysis.bbox)}</span>
          </div>
        </div>

        {analysis.analysis && analysis.analysis.changePercentage && (
          <div style={styles.analysis}>
            <div
              style={{
                ...styles.severityBadge,
                backgroundColor: getSeverityColor(analysis.analysis.severity),
              }}
            >
              {analysis.analysis.severity?.toUpperCase() || "N/A"}
            </div>
            <p style={styles.changeText}>
              📈 Change: {analysis.analysis.changePercentage}%
            </p>
          </div>
        )}

        <div style={styles.status}>
          <span
            style={{
              ...styles.statusBadge,
              backgroundColor:
                analysis.status === "completed" ? "#4caf50" : "#ff9800",
            }}
          >
            {analysis.status?.toUpperCase()}
          </span>
        </div>
      </div>

      <button style={styles.button} onClick={onView}>
        👁️ View Details
      </button>
    </div>
  );
};

const styles = {
  card: {
    background: "white",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    padding: "16px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    transition: "transform 0.2s, box-shadow 0.2s",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
  },
  title: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  date: {
    fontSize: "12px",
    color: "#999",
    whiteSpace: "nowrap",
    marginLeft: "10px",
  },
  content: {
    flex: 1,
    marginBottom: "12px",
  },
  description: {
    margin: 0,
    fontSize: "13px",
    color: "#666",
    lineHeight: "1.4",
    marginBottom: "12px",
  },
  metadata: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontSize: "12px",
    marginBottom: "12px",
  },
  metaItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "4px 0",
  },
  label: {
    color: "#666",
    fontWeight: "500",
  },
  value: {
    color: "#333",
    textAlign: "right",
    maxWidth: "150px",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  analysis: {
    background: "#f5f5f5",
    padding: "10px",
    borderRadius: "6px",
    marginBottom: "12px",
  },
  severityBadge: {
    display: "inline-block",
    color: "white",
    padding: "4px 10px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: "bold",
    marginBottom: "8px",
  },
  changeText: {
    margin: 0,
    fontSize: "12px",
    color: "#333",
  },
  status: {
    marginBottom: "12px",
  },
  statusBadge: {
    display: "inline-block",
    color: "white",
    padding: "4px 10px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: "bold",
  },
  button: {
    padding: "10px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "bold",
    transition: "background-color 0.2s",
  },
};

export default AnalysisCard;