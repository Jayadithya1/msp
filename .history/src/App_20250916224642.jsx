import { MapContainer, TileLayer, Polygon, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useState } from 'react';
import * as turf from '@turf/turf';

function PolygonDrawer({ points, setPoints }) {
  useMapEvents({
    click(e) {
      setPoints([...points, [e.latlng.lat, e.latlng.lng]]);
    },
  });
  return null;
}

function calculateAreaMeters(coords) {
  if (coords.length < 3) return 0;
  // Turf expects [lng, lat]
  const turfCoords = coords.map(([lat, lng]) => [lng, lat]);
  const polygon = turf.polygon([[...turfCoords, turfCoords[0]]]);
  return turf.area(polygon); // in square meters
}

function App() {
  const [points, setPoints] = useState([]);
  const area = points.length > 2 ? calculateAreaMeters(points) : 0;

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        top: 70,
        left: 10,
        zIndex: 1000,
        background: 'rgba(255,255,255,0.9)',
        padding: '6px 12px',
        borderRadius: 8,
        fontSize: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        Area: {area > 1e6 ? (area / 1e6).toFixed(2) + ' km²' : area.toFixed(0) + ' m²'}
      </div>
      <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <PolygonDrawer points={points} setPoints={setPoints} />
        {points.length > 0 && <Polygon positions={points} />}
        {points.map((pos, idx) => (
          <Marker key={idx} position={pos} />
        ))}
      </MapContainer>
      <button
        style={{ position: 'absolute', top: 120, left: 10, zIndex: 1000 }}
        onClick={() => setPoints([])}
      >
        Reset
      </button>
    </div>
  );
}

export default App;
