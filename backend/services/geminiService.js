// backend/services/geminiService.js
import axios from "axios";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/**
 * Generates an AI-powered environmental intelligence report
 * based on satellite change detection results.
 *
 * @param {Object} analysisData
 * @param {number} analysisData.changeRate       - e.g. 7.86
 * @param {string} analysisData.severity         - "LOW" | "MEDIUM" | "HIGH"
 * @param {string} analysisData.changeType       - e.g. "minor_change"
 * @param {number} analysisData.changedPixels
 * @param {number} analysisData.totalPixels
 * @param {string} [analysisData.region]         - optional region label
 * @param {string} [analysisData.dateRange]      - optional date range string
 */
async function generateEnvironmentalReport(analysisData) {
  const {
    changeRate,
    severity,
    changeType,
    changedPixels,
    totalPixels,
    region = "the selected region",
    dateRange = "the analyzed period",
  } = analysisData;

  // Sentinel-2 = 10m/pixel → each pixel covers 100 m²
  const affectedAreaKm2 = ((changedPixels * 100) / 1_000_000).toFixed(2);

  const prompt = `
You are an expert environmental analyst specializing in satellite remote sensing and geospatial intelligence.

Satellite imagery change detection results for ${region} over ${dateRange}:

- Change Rate: ${changeRate}%
- Severity Level: ${severity}
- Change Type Detected: ${changeType}
- Pixels Changed: ${changedPixels.toLocaleString()} / ${totalPixels.toLocaleString()} total
- Estimated Affected Area: ~${affectedAreaKm2} km²

Severity thresholds: LOW = 0–10% | MEDIUM = 10–20% | HIGH = 20%+

Return ONLY valid JSON with no markdown, no backticks, no extra text:

{
  "summary": "2-3 sentence plain-English summary for a non-technical audience",
  "keyFindings": [
    "Finding 1 — specific and data-backed",
    "Finding 2 — pattern or implication",
    "Finding 3 — environmental context"
  ],
  "possibleCauses": [
    "Most likely cause based on change type and severity",
    "Alternative possible cause"
  ],
  "recommendedActions": [
    "Action 1 — specific and actionable",
    "Action 2",
    "Action 3"
  ],
  "riskLevel": "LOW | MEDIUM | HIGH | CRITICAL",
  "urgency": "MONITOR | INVESTIGATE | ACT_IMMEDIATELY",
  "analystNote": "One sentence professional insight that adds value beyond the raw numbers"
}
`;

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
        },
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 15000,
        // Tell axios to treat non‑2xx as errors
        validateStatus: (status) => status < 500,
      }
    );

    // If HTTP error (4xx, 5xx), log the body as text
    if (!response.status || response.status >= 400) {
      const bodyText = response.data?.error?.message ?? String(response.data ?? "");
      throw new Error(`Gemini HTTP ${response.status}: ${bodyText}`);
    }

    // Extract raw text from Gemini's response
    const rawText =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!rawText.trim()) {
      throw new Error("Gemini returned empty or invalid text.");
    }

    // Clean possible ```json``` wrappers
    const cleaned = rawText
      .replace(/^```json\s*/, "")
      .replace(/```$/, "")
      .trim();

    // Parse JSON safely
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error(
        "[GeminiService] JSON parse error. Raw text:",
        rawText
      );
      throw new Error(`Failed to parse Gemini JSON: ${parseError.message}`);
    }

    return {
      success: true,
      report: parsed,
      generatedAt: new Date().toISOString(),
      meta: { changeRate, severity, changeType, affectedAreaKm2 },
    };
  } catch (error) {
    // If it's an axios error, log the full response
    if (error?.response?.data) {
      console.error("[GeminiService] Gemini raw error:", error.response.data);
    } else {
      console.error("[GeminiService] Unexpected error:", error);
    }

    return {
      success: false,
      error: "AI report generation failed. Please try again.",
      report: null,
    };
  }
}

export { generateEnvironmentalReport };