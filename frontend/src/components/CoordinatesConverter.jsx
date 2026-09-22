// frontend/src/components/CoordinatesConverter.jsx
import React, { useState } from "react";

const CoordinatesConverter = ({ onBBoxGenerated }) => {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState(0.5); // Default 0.5 degrees (~55km)
  const [bbox, setBbox] = useState(null);

  const calculateBBox = () => {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const rad = parseFloat(radius);

    if (isNaN(lat) || isNaN(lon) || isNaN(rad)) {
      alert("Please enter valid numbers");
      return;
    }

    // Validate coordinates
    if (lat < -90 || lat > 90) {
      alert("Latitude must be between -90 and 90");
      return;
    }

    if (lon < -180 || lon > 180) {
      alert("Longitude must be between -180 and 180");
      return;
    }

    // Calculate bounding box
    const west = lon - rad;
    const east = lon + rad;
    const south = lat - rad;
    const north = lat + rad;

    const bboxArray = [west, south, east, north];
    const bboxString = `${west.toFixed(4)},${south.toFixed(4)},${east.toFixed(4)},${north.toFixed(4)}`;

    setBbox({
      array: bboxArray,
      string: bboxString,
      center: { lat, lon },
      radius: rad,
    });

    console.log("✅ BBox generated:", bboxString);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(bbox.string);
    alert("📋 BBox copied to clipboard!");
  };

  const useBBox = () => {
    if (onBBoxGenerated) {
      onBBoxGenerated(bbox.string);
    }
    alert("✅ BBox applied!");
  };

  const getAreaSize = () => {
    if (!bbox) return null;
    const width = Math.abs(bbox.array[2] - bbox.array[0]);
    const height = Math.abs(bbox.array[3] - bbox.array[1]);
    const approxKm = Math.round(width * 111); // 1 degree ≈ 111 km
    return `${width.toFixed(2)}° × ${height.toFixed(2)}° (~${approxKm} km wide)`;
  };

  return (
    <div style={styles.container}>
      <h3>📍 Coordinates to BBox Converter</h3>
      <p style={styles.subtitle}>
        Enter your location coordinates and radius to generate bounding box
      </p>

      <div style={styles.form}>
        <div style={styles.row}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Latitude (Y):</label>
            <input
              type="number"
              step="0.0001"
              placeholder="e.g., 40.7128"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              style={styles.input}
            />
            <small style={styles.hint}>Range: -90 to 90 (North/South)</small>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Longitude (X):</label>
            <input
              type="number"
              step="0.0001"
              placeholder="e.g., -74.0060"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              style={styles.input}
            />
            <small style={styles.hint}>Range: -180 to 180 (East/West)</small>
          </div>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>
            Radius: {radius}° (~{Math.round(radius * 111)} km)
          </label>
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            style={styles.slider}
          />
          <small style={styles.hint}>
            How far from center point (1° ≈ 111 km)
          </small>
        </div>

        <button onClick={calculateBBox} style={styles.calculateButton}>
          🧮 Calculate BBox
        </button>
      </div>

      {/* Quick Examples */}
      <div style={styles.examples}>
        <h4>Quick Examples:</h4>
        <div style={styles.exampleButtons}>
          <button
            onClick={() => {
              setLatitude("40.7128");
              setLongitude("-74.0060");
              setRadius(0.5);
            }}
            style={styles.exampleButton}
          >
            🗽 New York
          </button>
          <button
            onClick={() => {
              setLatitude("40.0");
              setLongitude("-121.5");
              setRadius(0.5);
            }}
            style={styles.exampleButton}
          >
            🔥 California Fire
          </button>
          <button
            onClick={() => {
              setLatitude("-3.25");
              setLongitude("-54.25");
              setRadius(0.5);
            }}
            style={styles.exampleButton}
          >
            🌳 Amazon Forest
          </button>
          <button
            onClick={() => {
              setLatitude("25.2");
              setLongitude("55.27");
              setRadius(0.3);
            }}
            style={styles.exampleButton}
          >
            🏙️ Dubai
          </button>
        </div>
      </div>

      {/* Result */}
      {bbox && (
        <div style={styles.result}>
          <h4>✅ Generated Bounding Box:</h4>

          <div style={styles.bboxDisplay}>
            <code>{bbox.string}</code>
          </div>

          <div style={styles.resultInfo}>
            <p>
              <strong>Format:</strong> west, south, east, north
            </p>
            <p>
              <strong>Center:</strong> {bbox.center.lat.toFixed(4)}, {bbox.center.lon.toFixed(4)}
            </p>
            <p>
              <strong>Area:</strong> {getAreaSize()}
            </p>
          </div>

          <div style={styles.bboxBreakdown}>
            <div style={styles.bboxItem}>
              <span style={styles.bboxLabel}>West:</span>
              <span style={styles.bboxValue}>{bbox.array[0].toFixed(4)}</span>
            </div>
            <div style={styles.bboxItem}>
              <span style={styles.bboxLabel}>South:</span>
              <span style={styles.bboxValue}>{bbox.array[1].toFixed(4)}</span>
            </div>
            <div style={styles.bboxItem}>
              <span style={styles.bboxLabel}>East:</span>
              <span style={styles.bboxValue}>{bbox.array[2].toFixed(4)}</span>
            </div>
            <div style={styles.bboxItem}>
              <span style={styles.bboxLabel}>North:</span>
              <span style={styles.bboxValue}>{bbox.array[3].toFixed(4)}</span>
            </div>
          </div>

          <div style={styles.actions}>
            <button onClick={copyToClipboard} style={styles.copyButton}>
              📋 Copy BBox
            </button>
            {onBBoxGenerated && (
              <button onClick={useBBox} style={styles.useButton}>
                ✅ Use This BBox
              </button>
            )}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div style={styles.help}>
        <h4>💡 How to Find Coordinates:</h4>
        <ul>
          <li>
            <strong>Google Maps:</strong> Right-click any location → Click coordinates to copy
          </li>
          <li>
            <strong>GPS Device:</strong> Use latitude/longitude from your GPS
          </li>
          <li>
            <strong>Address:</strong> Search address on Google Maps, then get coordinates
          </li>
        </ul>
      </div>
    </div>
  );
};

const styles = {
  container: {
    background: "#fff",
    padding: "25px",
    borderRadius: "8px",
    border: "2px solid #4caf50",
    marginBottom: "20px",
  },
  subtitle: {
    color: "#666",
    fontSize: "14px",
    marginBottom: "20px",
  },
  form: {
    background: "#f9f9f9",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginBottom: "20px",
  },
  inputGroup: {
    marginBottom: "15px",
  },
  label: {
    display: "block",
    fontWeight: "bold",
    marginBottom: "8px",
    fontSize: "14px",
  },
  input: {
    width: "100%",
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "5px",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  hint: {
    display: "block",
    color: "#999",
    fontSize: "12px",
    marginTop: "5px",
  },
  slider: {
    width: "100%",
    marginTop: "10px",
  },
  calculateButton: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#4caf50",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  examples: {
    marginBottom: "20px",
  },
  exampleButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "10px",
  },
  exampleButton: {
    padding: "8px 16px",
    backgroundColor: "#2196f3",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
  },
  result: {
    background: "#e8f5e9",
    padding: "20px",
    borderRadius: "8px",
    border: "1px solid #4caf50",
    marginBottom: "20px",
  },
  bboxDisplay: {
    background: "#fff",
    padding: "15px",
    borderRadius: "6px",
    border: "1px solid #4caf50",
    marginBottom: "15px",
    fontFamily: "monospace",
    fontSize: "16px",
    textAlign: "center",
    wordBreak: "break-all",
  },
  resultInfo: {
    fontSize: "14px",
    marginBottom: "15px",
  },
  bboxBreakdown: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "10px",
    marginBottom: "15px",
  },
  bboxItem: {
    background: "#fff",
    padding: "10px",
    borderRadius: "6px",
    textAlign: "center",
  },
  bboxLabel: {
    display: "block",
    fontSize: "11px",
    color: "#666",
    marginBottom: "5px",
  },
  bboxValue: {
    display: "block",
    fontSize: "14px",
    fontWeight: "bold",
    color: "#333",
  },
  actions: {
    display: "flex",
    gap: "10px",
  },
  copyButton: {
    flex: 1,
    padding: "10px",
    backgroundColor: "#2196f3",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  useButton: {
    flex: 1,
    padding: "10px",
    backgroundColor: "#4caf50",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  help: {
    background: "#e3f2fd",
    padding: "15px",
    borderRadius: "8px",
    border: "1px solid #2196f3",
    fontSize: "13px",
  },
};

export default CoordinatesConverter;