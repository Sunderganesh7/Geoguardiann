// frontend/src/components/MapSelector.jsx
import React, { useState } from "react";
import { MapContainer, TileLayer, Rectangle, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const MapSelector = ({ onBBoxSelect, initialBBox }) => {
  const [bbox, setBbox] = useState(
    initialBBox || {
      west: -121.8,
      south: 39.8,
      east: -121.3,
      north: 40.3,
    }
  );
  const [selecting, setSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Component to handle map clicks
  const MapClickHandler = () => {
    useMapEvents({
      mousedown: (e) => {
        // Only start selection if Shift key is pressed
        if (e.originalEvent.shiftKey) {
          e.originalEvent.stopPropagation();
          e.originalEvent.preventDefault();
          setSelecting(true);
          setStartPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
          setIsDragging(false);
        }
      },
      mousemove: (e) => {
        if (selecting && startPoint) {
          e.originalEvent.stopPropagation();
          e.originalEvent.preventDefault();
          setIsDragging(true);
          const newBbox = {
            west: Math.min(startPoint.lng, e.latlng.lng),
            south: Math.min(startPoint.lat, e.latlng.lat),
            east: Math.max(startPoint.lng, e.latlng.lng),
            north: Math.max(startPoint.lat, e.latlng.lat),
          };
          setBbox(newBbox);
        }
      },
      mouseup: (e) => {
        if (selecting && startPoint && isDragging) {
          e.originalEvent.stopPropagation();
          e.originalEvent.preventDefault();
          
          const finalBbox = {
            west: Math.min(startPoint.lng, e.latlng.lng),
            south: Math.min(startPoint.lat, e.latlng.lat),
            east: Math.max(startPoint.lng, e.latlng.lng),
            north: Math.max(startPoint.lat, e.latlng.lat),
          };
          
          // Only update if the box is large enough (not just a click)
          const minSize = 0.01; // Minimum bbox size
          if (Math.abs(finalBbox.east - finalBbox.west) > minSize && 
              Math.abs(finalBbox.north - finalBbox.south) > minSize) {
            setBbox(finalBbox);
            // Don't call onBBoxSelect here - only when Apply button is clicked
          }
        }
        
        setSelecting(false);
        setStartPoint(null);
        setIsDragging(false);
      },
    });
    return null;
  };

  const bboxBounds = [
    [bbox.south, bbox.west],
    [bbox.north, bbox.east],
  ];

  const handleApplySelection = () => {
    onBBoxSelect(bbox);
  };

  const handlePresetSelect = (preset) => {
    setBbox(preset);
  };

  return (
    <div style={styles.container} onClick={(e) => e.stopPropagation()}>
      <div style={styles.instructions}>
        <h3>🗺️ Select Region on Map</h3>
        <p>
          <strong>💡 Hold SHIFT and drag</strong> to draw a bounding box<br />
          <em>Or use the Quick Presets below</em>
        </p>
        <div style={styles.coordsDisplay}>
          <strong>Selected Coordinates:</strong>
          <br />
          West: {bbox.west.toFixed(4)}, South: {bbox.south.toFixed(4)}
          <br />
          East: {bbox.east.toFixed(4)}, North: {bbox.north.toFixed(4)}
        </div>
        <button
          onClick={handleApplySelection}
          style={styles.applyButton}
        >
          ✅ Apply Selection
        </button>
      </div>

      <MapContainer
        center={[(bbox.north + bbox.south) / 2, (bbox.east + bbox.west) / 2]}
        zoom={9}
        style={styles.map}
        scrollWheelZoom={true}
        dragging={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Rectangle bounds={bboxBounds} pathOptions={{ color: "red", weight: 2 }} />
        <MapClickHandler />
      </MapContainer>

      <div style={styles.presets}>
        <h4>📍 Quick Presets:</h4>
        <button
          onClick={() => handlePresetSelect({ west: -121.8, south: 39.8, east: -121.3, north: 40.3 })}
          style={styles.presetButton}
        >
          🔥 California Wildfire
        </button>
        <button
          onClick={() => handlePresetSelect({ west: -54.5, south: -3.5, east: -54.0, north: -3.0 })}
          style={styles.presetButton}
        >
          🌳 Amazon Deforestation
        </button>
        <button
          onClick={() => handlePresetSelect({ west: -121.5, south: 36.5, east: -121.0, north: 37.0 })}
          style={styles.presetButton}
        >
          🌾 California Agriculture
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    background: "#fff",
    padding: "20px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    marginBottom: "20px",
  },
  instructions: {
    marginBottom: "15px",
    padding: "15px",
    background: "#e3f2fd",
    borderRadius: "6px",
  },
  coordsDisplay: {
    background: "#fff",
    padding: "10px",
    borderRadius: "4px",
    margin: "10px 0",
    fontSize: "14px",
    fontFamily: "monospace",
  },
  applyButton: {
    padding: "10px 20px",
    background: "#4caf50",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
  },
  map: {
    height: "400px",
    width: "100%",
    borderRadius: "8px",
    border: "2px solid #2196f3",
  },
  presets: {
    marginTop: "15px",
    padding: "15px",
    background: "#f5f5f5",
    borderRadius: "6px",
  },
  presetButton: {
    padding: "8px 16px",
    background: "#2196f3",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
    margin: "5px",
  },
};

export default MapSelector;