// frontend/src/components/AIReportCard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Drop this component into AnalysisCharts.jsx after your existing charts.
//
// Usage inside AnalysisCharts.jsx:
//   import AIReportCard from "./AIReportCard";
//   ...
//   <AIReportCard analysisData={yourAnalysisResult} />
//
// `analysisData` should be the object your backend already returns:
//   { changeRate, severity, changeType, changedPixels, totalPixels, region?, dateRange? }
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import axios from "axios";

// ── Colour helpers ────────────────────────────────────────────────────────────
const SEVERITY_COLORS = {
  LOW: { bg: "#e8f5e9", border: "#43a047", text: "#2e7d32", badge: "#43a047" },
  MEDIUM: { bg: "#fff8e1", border: "#fb8c00", text: "#e65100", badge: "#fb8c00" },
  HIGH: { bg: "#fce4ec", border: "#e53935", text: "#b71c1c", badge: "#e53935" },
  CRITICAL: { bg: "#f3e5f5", border: "#8e24aa", text: "#4a148c", badge: "#8e24aa" },
};

const URGENCY_LABELS = {
  MONITOR: { label: "Monitor", icon: "👁️" },
  INVESTIGATE: { label: "Investigate", icon: "🔍" },
  ACT_IMMEDIATELY: { label: "Act Immediately", icon: "🚨" },
};

// ── Sub-components ────────────────────────────────────────────────────────────
function Badge({ text, color }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "12px",
        background: color,
        color: "#fff",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
      }}
    >
      {text}
    </span>
  );
}

function Section({ icon, title, children }) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "8px",
        }}
      >
        <span style={{ fontSize: "16px" }}>{icon}</span>
        <span
          style={{
            fontWeight: 700,
            fontSize: "13px",
            color: "#374151",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function BulletList({ items, dotColor = "#6366f1" }) {
  return (
    <ul style={{ margin: 0, paddingLeft: "4px", listStyle: "none" }}>
      {items.map((item, i) => (
        <li
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            marginBottom: "6px",
            fontSize: "13.5px",
            color: "#4b5563",
            lineHeight: "1.5",
          }}
        >
          <span
            style={{
              marginTop: "6px",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: dotColor,
              flexShrink: 0,
            }}
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AIReportCard({ analysisData }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token"); // adjust if you store auth differently
      const { data } = await axios.post(
  `${process.env.REACT_APP_API_URL}/api/analysis/ai-report`,
        {
          changeRate: analysisData.changeRate,
          severity: analysisData.severity,
          changeType: analysisData.changeType,
          changedPixels: analysisData.changedPixels,
          totalPixels: analysisData.totalPixels,
          region: analysisData.region || undefined,
          dateRange: analysisData.dateRange || undefined,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (data.success) {
        setReport(data.report);
        setGenerated(true);
      } else {
        setError(data.error || "Failed to generate report.");
      }
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          "Could not connect to AI service. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const colors =
    SEVERITY_COLORS[report?.riskLevel] || SEVERITY_COLORS["LOW"];
  const urgency = URGENCY_LABELS[report?.urgency] || URGENCY_LABELS["MONITOR"];

  // ── PRE-GENERATE STATE ──────────────────────────────────────────────────────
  if (!generated) {
    return (
      <div
        style={{
          marginTop: "28px",
          borderRadius: "12px",
          border: "1.5px dashed #c7d2fe",
          background: "linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)",
          padding: "28px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "36px", marginBottom: "10px" }}>🛰️</div>
        <h3
          style={{
            margin: "0 0 6px",
            fontSize: "16px",
            fontWeight: 700,
            color: "#1e1b4b",
          }}
        >
          AI Environmental Intelligence Report
        </h3>
        <p
          style={{
            margin: "0 0 20px",
            fontSize: "13.5px",
            color: "#6b7280",
            maxWidth: "380px",
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: "1.6",
          }}
        >
          Generate a detailed analyst-grade report based on your satellite
          change detection results — powered by Gemini AI.
        </p>
        {error && (
          <p
            style={{
              color: "#dc2626",
              fontSize: "13px",
              marginBottom: "14px",
              background: "#fef2f2",
              padding: "8px 14px",
              borderRadius: "8px",
              display: "inline-block",
            }}
          >
            ⚠️ {error}
          </p>
        )}
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            background: loading
              ? "#a5b4fc"
              : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "11px 28px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: loading ? "none" : "0 2px 12px rgba(99,102,241,0.35)",
            transition: "all 0.2s",
          }}
        >
          {loading ? (
            <>
              <span
                style={{
                  width: "14px",
                  height: "14px",
                  border: "2px solid #fff",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin 0.7s linear infinite",
                }}
              />
              Analyzing with Gemini AI…
            </>
          ) : (
            <>✨ Generate AI Report</>
          )}
        </button>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── REPORT STATE ────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        marginTop: "28px",
        borderRadius: "12px",
        border: `1.5px solid ${colors.border}`,
        background: colors.bg,
        overflow: "hidden",
        boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${colors.border}22, ${colors.border}11)`,
          borderBottom: `1px solid ${colors.border}44`,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "22px" }}>🛰️</span>
          <div>
            <div
              style={{ fontWeight: 700, fontSize: "15px", color: colors.text }}
            >
              AI Environmental Intelligence Report
            </div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
              Powered by Gemini AI · Generated just now
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Badge text={`Risk: ${report.riskLevel}`} color={colors.badge} />
          <Badge
            text={`${urgency.icon} ${urgency.label}`}
            color={
              report.urgency === "ACT_IMMEDIATELY"
                ? "#dc2626"
                : report.urgency === "INVESTIGATE"
                ? "#d97706"
                : "#059669"
            }
          />
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "20px 22px" }}>
        {/* Summary */}
        <div
          style={{
            background: "#fff",
            borderRadius: "8px",
            padding: "14px 16px",
            marginBottom: "18px",
            borderLeft: `4px solid ${colors.border}`,
            fontSize: "14px",
            color: "#1f2937",
            lineHeight: "1.65",
            fontStyle: "italic",
          }}
        >
          {report.summary}
        </div>

        {/* Key Findings */}
        <Section icon="🔍" title="Key Findings">
          <BulletList items={report.keyFindings} dotColor={colors.badge} />
        </Section>

        {/* Possible Causes */}
        <Section icon="🧩" title="Possible Causes">
          <BulletList items={report.possibleCauses} dotColor="#f59e0b" />
        </Section>

        {/* Recommended Actions */}
        <Section icon="✅" title="Recommended Actions">
          <BulletList items={report.recommendedActions} dotColor="#10b981" />
        </Section>

        {/* Analyst Note */}
        {report.analystNote && (
          <div
            style={{
              background: "#f8fafc",
              borderRadius: "8px",
              padding: "12px 16px",
              display: "flex",
              gap: "10px",
              alignItems: "flex-start",
              border: "1px solid #e2e8f0",
            }}
          >
            <span style={{ fontSize: "18px", flexShrink: 0 }}>💡</span>
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                color: "#475569",
                lineHeight: "1.6",
                fontStyle: "italic",
              }}
            >
              <strong style={{ color: "#1e293b" }}>Analyst Note: </strong>
              {report.analystNote}
            </p>
          </div>
        )}

        {/* Regenerate button */}
        <div style={{ marginTop: "18px", textAlign: "right" }}>
          <button
            onClick={() => {
              setGenerated(false);
              setReport(null);
            }}
            style={{
              background: "transparent",
              border: `1px solid ${colors.border}`,
              color: colors.text,
              borderRadius: "6px",
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ↺ Regenerate Report
          </button>
        </div>
      </div>
    </div>
  );
}