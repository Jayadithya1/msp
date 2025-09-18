import {
  MapContainer,
  TileLayer,
  Polygon,
  Marker,
  Polyline,
  useMap,
  useMapEvents,
  LayersControl,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useState, useMemo } from "react";
import * as turf from "@turf/turf";

const { BaseLayer } = LayersControl;

function PolygonDrawer({ setPoints, mode, setDistancePoints }) {
  useMapEvents({
    click(e) {
      if (mode === "area") {
        setPoints((prev) => [...prev, [e.latlng.lat, e.latlng.lng]]);
      } else if (mode === "distance") {
        setDistancePoints((prev) => {
          if (prev.length === 1) {
            return [...prev, [e.latlng.lat, e.latlng.lng]];
          } else {
            return [[e.latlng.lat, e.latlng.lng]]; // restart with first point
          }
        });
      }
    },
  });
  return null;
}

function calculateAreaMeters(coords) {
  if (coords.length < 3) return 0;
  const turfCoords = coords.map(([lat, lng]) => [lng, lat]);
  const polygon = turf.polygon([[...turfCoords, turfCoords[0]]]);
  return turf.area(polygon);
}

function calculateDistanceMeters(points) {
  if (points.length < 2) return 0;
  const line = turf.lineString(points.map(([lat, lng]) => [lng, lat]));
  return turf.length(line, { units: "meters" });
}

function LocateButton({ setUserLocation }) {
  const map = useMap();
  return (
    <button
      style={{
        position: "absolute",
        top: 260,
        left: 10,
        zIndex: 1000,
        background: "#007bff",
        color: "white",
        border: "none",
        borderRadius: 8,
        padding: "8px 12px",
        cursor: "pointer",
      }}
      onClick={() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              setUserLocation([latitude, longitude]);
              map.flyTo([latitude, longitude], 15);
            },
            (err) => alert("Unable to get location: " + err.message)
          );
        } else {
          alert("Geolocation is not supported by your browser.");
        }
      }}
    >
      📍 Locate Me
    </button>
  );
}

export default function App() {
  const [points, setPoints] = useState([]);
  const [distancePoints, setDistancePoints] = useState([]);
  const [mode, setMode] = useState("area");
  const [userLocation, setUserLocation] = useState(null);

  const area = useMemo(() => calculateAreaMeters(points), [points]);
  const distance = useMemo(() => calculateDistanceMeters(distancePoints), [distancePoints]);

  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
      {/* Info Box */}
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 10,
          zIndex: 1000,
          background: "rgba(31, 29, 29, 0.9)",
          color: "white",
          padding: "8px 12px",
          borderRadius: 8,
          fontSize: 16,
          minWidth: 200,
        }}
      >
        {mode === "area" ? (
          <>
            <strong>Area Mode</strong>
            <div>{area.toFixed(2)} m²</div>
            <div>{(area / 1_000_000).toFixed(4)} km²</div>
            <div>{(area / 10_000).toFixed(4)} hectares</div>
            <div>{(area * 0.000247105).toFixed(4)} acres</div>
          </>
        ) : (
          <>
            <strong>Distance Mode</strong>
            {distancePoints.length === 2 ? (
              <div>{distance.toFixed(2)} meters</div>
            ) : (
              <div>Click two points to measure distance</div>
            )}
          </>
        )}
      </div>

      {/* Map */}
      <MapContainer center={[20, 0]} zoom={2} style={{ height: "100%", width: "100%" }}>
        <LayersControl position="topright">
          <BaseLayer checked name="Street View">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
          </BaseLayer>
          <BaseLayer name="Satellite View">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles © Esri & contributors"
            />
          </BaseLayer>
        </LayersControl>

        <PolygonDrawer setPoints={setPoints} mode={mode} setDistancePoints={setDistancePoints} />

        {points.length > 2 && mode === "area" && <Polygon positions={points} />}
        {points.map(
          (pos, idx) => mode === "area" && <Marker key={idx} position={pos} />
        )}

        {distancePoints.length === 2 && mode === "distance" && (
          <Polyline positions={distancePoints} color="red" />
        )}

        {userLocation && <Marker position={userLocation} />}

        {/* ✅ LocateButton is ONLY inside MapContainer now */}
        <LocateButton setUserLocation={setUserLocation} />
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
        onClick={() => {
          setPoints([]);
          setDistancePoints([]);
        }}
      >
        Reset
      </button>

      {/* Mode Switch Button */}
      <button
        style={{
          position: "absolute",
          top: 300,
          left: 10,
          zIndex: 1000,
          background: mode === "area" ? "#4CAF50" : "#FF9800",
          color: "white",
          border: "none",
          borderRadius: 8,
          padding: "8px 12px",
          cursor: "pointer",
        }}
        onClick={() => {
          setMode((prev) => (prev === "area" ? "distance" : "area"));
          setPoints([]);
          setDistancePoints([]);
        }}
      >
        {mode === "area" ? "Switch to Distance Mode" : "Switch to Area Mode"}
      </button>
    </div>
  );
}
