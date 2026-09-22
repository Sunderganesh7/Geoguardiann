// frontend/src/components/AnalysisCharts.jsx
import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import AIReportCard from "./AIReportCard"; // ← ADDED

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const AnalysisCharts = ({ analysisResult }) => {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case "high": return "#f44336";
      case "medium": return "#ff9800";
      case "low": return "#4caf50";
      default: return "#2196f3";
    }
  };

  // Doughnut chart - Change vs Unchanged
  const doughnutData = {
    labels: ["Changed", "Unchanged"],
    datasets: [
      {
        label: "Pixels",
        data: [
          analysisResult.changedPixels || 0,
          (analysisResult.totalPixels || 0) - (analysisResult.changedPixels || 0),
        ],
        backgroundColor: [
          getSeverityColor(analysisResult.severity),
          "#e0e0e0",
        ],
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
      },
      title: {
        display: true,
        text: "Pixel Change Distribution",
        font: { size: 16, weight: "bold" },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(2);
            return `${context.label}: ${context.parsed.toLocaleString()} (${percentage}%)`;
          },
        },
      },
    },
  };

  // Bar chart - Severity comparison
  const barData = {
    labels: ["Low", "Medium", "High"],
    datasets: [
      {
        label: "Current Change",
        data: [
          analysisResult.severity === "low" ? analysisResult.changePercentage : 0,
          analysisResult.severity === "medium" ? analysisResult.changePercentage : 0,
          analysisResult.severity === "high" ? analysisResult.changePercentage : 0,
        ],
        backgroundColor: ["#4caf50", "#ff9800", "#f44336"],
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: "Severity Level Analysis",
        font: { size: 16, weight: "bold" },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `${context.parsed.y.toFixed(2)}% change detected`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: Math.max(25, analysisResult.changePercentage + 5),
        ticks: {
          callback: function (value) {
            return value + "%";
          },
        },
        title: {
          display: true,
          text: "Change Percentage",
        },
      },
      x: {
        title: {
          display: true,
          text: "Severity Levels",
        },
      },
    },
  };

  return (
    <div style={styles.container}>
      <h2>📊 Visual Analysis</h2>
      
      <div style={styles.chartsGrid}>
        {/* Doughnut Chart */}
        <div style={styles.chartBox}>
          <Doughnut data={doughnutData} options={doughnutOptions} />
          <div style={styles.chartInfo}>
            <p><strong>Total Pixels Analyzed:</strong> {analysisResult.totalPixels?.toLocaleString()}</p>
            <p><strong>Changed Pixels:</strong> {analysisResult.changedPixels?.toLocaleString()}</p>
            <p><strong>Change Rate:</strong> {analysisResult.changePercentage}%</p>
          </div>
        </div>

        {/* Bar Chart */}
        <div style={styles.chartBox}>
          <Bar data={barData} options={barOptions} />
          <div style={styles.chartInfo}>
            <p><strong>Severity:</strong> <span style={{ color: getSeverityColor(analysisResult.severity) }}>{analysisResult.severity?.toUpperCase()}</span></p>
            <p><strong>Type:</strong> {analysisResult.changeType}</p>
            <p><strong>Threshold:</strong> Low: 0-10% | Medium: 10-20% | High: 20%+</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📈</div>
          <div style={styles.statValue}>{analysisResult.changePercentage}%</div>
          <div style={styles.statLabel}>Change Detected</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>⚠️</div>
          <div style={{ ...styles.statValue, color: getSeverityColor(analysisResult.severity) }}>
            {analysisResult.severity?.toUpperCase()}
          </div>
          <div style={styles.statLabel}>Severity Level</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>🔢</div>
          <div style={styles.statValue}>{analysisResult.changedPixels?.toLocaleString()}</div>
          <div style={styles.statLabel}>Pixels Changed</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>🎯</div>
          <div style={styles.statValue}>{analysisResult.totalPixels?.toLocaleString()}</div>
          <div style={styles.statLabel}>Total Pixels</div>
        </div>
      </div>

      {/* AI Report Card ← ADDED */}
      <AIReportCard
        analysisData={{
          changeRate: analysisResult.changePercentage,
          severity: analysisResult.severity?.toUpperCase(),
          changeType: analysisResult.changeType,
          changedPixels: analysisResult.changedPixels,
          totalPixels: analysisResult.totalPixels,
        }}
      />
    </div>
  );
};

const styles = {
  container: {
    background: "#fff",
    padding: "30px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    marginTop: "20px",
  },
  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "30px",
    marginTop: "20px",
    marginBottom: "30px",
  },
  chartBox: {
    background: "#f9f9f9",
    padding: "20px",
    borderRadius: "8px",
    border: "1px solid #e0e0e0",
  },
  chartInfo: {
    marginTop: "15px",
    padding: "10px",
    background: "#fff",
    borderRadius: "4px",
    fontSize: "13px",
  },
  statsContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "15px",
    marginTop: "20px",
  },
  statCard: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    padding: "20px",
    borderRadius: "8px",
    textAlign: "center",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  },
  statIcon: {
    fontSize: "32px",
    marginBottom: "10px",
  },
  statValue: {
    fontSize: "28px",
    fontWeight: "bold",
    marginBottom: "5px",
  },
  statLabel: {
    fontSize: "12px",
    opacity: 0.9,
  },
};

export default AnalysisCharts;