import { MapContainer, TileLayer, Polygon, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useState } from 'react';

function PolygonDrawer({ points, setPoints }) {
  useMapEvents({
    click(e) {
      setPoints([...points, [e.latlng.lat, e.latlng.lng]]);
    },
  });
  return null;
}

function calculateArea(coords) {
  // Shoelace formula for area in degrees (approximate, not for large polygons)
  let area = 0;
  for (let i = 0, l = coords.length; i < l; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[(i + 1) % l];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

function App() {
  const [points, setPoints] = useState([]);
  const area = points.length > 2 ? calculateArea(points) : 0;

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <h2 style={{ position: 'absolute', zIndex: 1000, background: 'white', padding: 8 }}>
        Click on the map to add points. Area: {area.toFixed(2)} (approx. degrees²)
      </h2>
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
        style={{ position: 'absolute', top: 60, left: 10, zIndex: 1000 }}
        onClick={() => setPoints([])}
      >
        Reset
      </button>
    </div>
  );
}

export default App;
