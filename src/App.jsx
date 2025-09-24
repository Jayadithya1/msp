import {
  MapContainer,
  TileLayer,
  Polygon,
  Marker,
  Polyline,
  useMap,
  useMapEvents,
  LayersControl,
  ScaleControl,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useState, useMemo, useRef, useEffect } from "react";
import * as turf from "@turf/turf";
import L from "leaflet";

// Fix missing marker icons in Vite builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).href,
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).href,
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).href,
});

const { BaseLayer } = LayersControl;

// Polygon / distance drawing
function PolygonDrawer({ setPoints, mode, setDistancePoints }) {
  useMapEvents({
    click(e) {
      if (mode === "area") {
        setPoints((prev) => [...prev, [e.latlng.lat, e.latlng.lng]]);
      } else if (mode === "distance") {
        setDistancePoints((prev) => {
          if (prev.length === 1) return [...prev, [e.latlng.lat, e.latlng.lng]];
          else return [[e.latlng.lat, e.latlng.lng]]; // restart
        });
      }
    },
  });
  return null;
}

// Area / distance helpers (turf)
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

// LocateButton (with status banner)
function LocateButton({ setUserLocation }) {
  const map = useMap();
  const btnRef = useRef(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (btnRef.current) {
      L.DomEvent.disableClickPropagation(btnRef.current);
      L.DomEvent.disableScrollPropagation(btnRef.current);
    }
  }, []);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    console.log("▶️ Requesting location...");
    setStatus("Requesting location…");

    let watchId;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log("🎯 getCurrentPosition SUCCESS", pos);
        const { latitude, longitude, accuracy } = pos.coords;

        setStatus(`Cached fix (±${Math.round(accuracy)}m)… improving…`);
        setUserLocation([latitude, longitude]);
        map.flyTo([latitude, longitude], 16, { animate: true, duration: 2 });

        // Try watchPosition for better accuracy
        watchId = navigator.geolocation.watchPosition(
          (watchPos) => {
            const { latitude, longitude, accuracy } = watchPos.coords;
            console.log("🎯 watchPosition SUCCESS", watchPos);
            setStatus(`GPS accuracy: ±${Math.round(accuracy)}m`);

            if (accuracy < 50) {
              navigator.geolocation.clearWatch(watchId);
              setStatus("✅ Accurate fix acquired");
            }

            setUserLocation([latitude, longitude]);
            map.flyTo([latitude, longitude], 16, { animate: true, duration: 1.5 });
          },
          (err) => {
            console.warn("🚨 watchPosition error", err);
            setStatus("❌ Could not refine GPS fix — try outdoors.");
          },
          { enableHighAccuracy: true, timeout: 15000 }
        );

        // stop watching after 15s if no good fix
        setTimeout(() => {
          if (watchId) {
            navigator.geolocation.clearWatch(watchId);
            setStatus("⌛ Gave up waiting for better fix");
          }
        }, 15000);
      },
      (err) => {
        console.warn("🚨 getCurrentPosition ERROR", err);
        setStatus("❌ Could not get a location fix — check permissions.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <>
      <button
        ref={btnRef}
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
        onClick={handleLocate}
      >
        📍 Locate Me
      </button>

      {status && (
        <div
          style={{
            position: "absolute",
            top: 20,
            right: "50%",
            transform: "translateX(50%)",
            background: status.startsWith("✅")
              ? "rgba(40,167,69,0.9)"
              : status.startsWith("❌")
              ? "rgba(220,53,69,0.9)"
              : "rgba(0,123,255,0.9)",
            color: "white",
            padding: "6px 12px",
            borderRadius: 6,
            fontSize: 14,
            zIndex: 2000,
          }}
        >
          {status}
        </div>
      )}
    </>
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
      {/* Info box */}
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
            {distancePoints.length === 2 ? <div>{distance.toFixed(2)} meters</div> : <div>Click two points to measure distance</div>}
          </>
        )}
      </div>

      {/* Map */}
      <MapContainer center={[20, 0]} zoom={2} style={{ height: "100%", width: "100%" }}>
        <ScaleControl position="bottomleft" />
        <LayersControl position="topright">
          <BaseLayer checked name="Street View">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          </BaseLayer>
          <BaseLayer name="Satellite View">
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles © Esri & contributors" />
          </BaseLayer>
        </LayersControl>

        <PolygonDrawer setPoints={setPoints} mode={mode} setDistancePoints={setDistancePoints} />

        {points.length > 2 && mode === "area" && <Polygon positions={points} />}
        {points.map((pos, idx) => (mode === "area" ? <Marker key={idx} position={pos} /> : null))}

        {distancePoints.length === 2 && mode === "distance" && <Polyline positions={distancePoints} color="red" />}

        {/* Locate Button */}
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
        onClick={(e) => {
          e.stopPropagation();
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
        onClick={(e) => {
          e.stopPropagation();
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
