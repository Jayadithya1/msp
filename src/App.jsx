import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, ScaleControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useState, useMemo } from "react";
import * as turf from "@turf/turf";

function PolygonDrawer({ setPoints }) {
  useMapEvents({
    click(e) {
      setPoints((prev) => [...prev, [e.latlng.lat, e.latlng.lng]]);
    },
  });
  return null;
}

function calculateAreaMeters(coords) {
  if (coords.length < 3) return 0;
  const turfCoords = coords.map(([lat, lng]) => [lng, lat]);
  console.log("Turf input coords:", turfCoords);
  const polygon = turf.polygon([[...turfCoords, turfCoords[0]]]);
  const area = turf.area(polygon);
  console.log("Calculated area (m²):", area);
  return area;
}

function convertArea(area) {
  return {
    m2: area,
    km2: area / 1_000_000,
    acres: area * 0.000247105,
    hectares: area / 10_000,
  };
}

export default function App() {
  const [points, setPoints] = useState([]);
  const area = useMemo(() => calculateAreaMeters(points), [points]);
  const converted = useMemo(() => convertArea(area), [area]);

  console.log("Points:", points);
  console.log("Converted Area:", converted);

  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
      {/* Area Display */}
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 10,
          zIndex: 1000,
          background: "rgba(31, 29, 29, 0.9)",
          color: "white",
          padding: "6px 12px",
          borderRadius: 8,
          fontSize: 16,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          minWidth: 180,
        }}
      >
        <strong>Area:</strong>
        <div>{converted.m2.toFixed(2)} m²</div>
        <div>{converted.km2.toFixed(4)} km²</div>
        <div>{converted.hectares.toFixed(4)} hectares</div>
        <div>{converted.acres.toFixed(4)} acres</div>
      </div>

      {/* Leaflet Map */}
      <MapContainer center={[20, 0]} zoom={3} style={{ height: "100%", width: "100%" }}>
  {/* Satellite Layer */}
  <TileLayer
    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    attribution="Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
  />

  {/* ✅ Labels Overlay */}
  <TileLayer
    url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
    attribution="&copy; Esri — Boundaries and Places"
  />

  {/* Scale bar */}
  <ScaleControl position="bottomleft" />

  <PolygonDrawer setPoints={setPoints} />
  {points.length > 2 && <Polygon positions={points} />}
  {points.map((pos, idx) => (
    <Marker key={idx} position={pos} />
  ))}
</MapContainer>


      {/* Reset Button */}
      <button
        style={{
          position: "absolute",
          top: 220,
          left: 10,
          zIndex: 1000,
          background: "#ff5252",
          color: "white",
          border: "none",
          borderRadius: 8,
          padding: "8px 12px",
          cursor: "pointer",
        }}
        onClick={() => setPoints([])}
      >
        Reset
      </button>
    </div>
  );
}
