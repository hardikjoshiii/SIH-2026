import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const riskColor = (level) => {
  if (level === 'critical') return '#e11d48';
  if (level === 'high') return '#f97316';
  if (level === 'medium') return '#eab308';
  return '#22c55e';
};

// Supabase stores location as PostGIS geography (WKB hex string).
// For the prototype, we instead keep a small lookup of known coordinates
// by mine name, since parsing WKB on the frontend is extra complexity
// we don't need for a hackathon demo.
const COORDS = {
  'Jharia Colliery': [23.7398, 86.4141],
  'Kusunda Colliery': [23.75, 86.43],
  'Dipka Mine': [22.33, 82.66],
  'Bhelatand Mine': [23.75, 86.43],
  'Gevra Mine': [22.3595, 82.6825],
  'Kusmunda Mine': [22.37, 82.67],
  'Talcher Coalfields': [20.95, 85.2333],
  'Jayant Mine': [24.1997, 82.6747],
  'Nigahi Mine': [24.21, 82.63],
  'Piparwar Mine': [23.9333, 85.1667],
  'Rajmahal Mine': [24.7833, 87.6167],
  'Wani Area': [20.05, 78.95],
};

function MapView({ mines }) {
  const center = [22.9734, 82.8]; // roughly central India

  return (
    <div className="map-wrapper">
      <MapContainer center={center} zoom={5} style={{ height: '500px', width: '100%', borderRadius: '8px' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {mines.map((mine) => {
          const coords = COORDS[mine.name];
          if (!coords) return null;
          return (
            <CircleMarker
              key={mine.id}
              center={coords}
              radius={10}
              pathOptions={{ color: riskColor(mine.risk_level), fillColor: riskColor(mine.risk_level), fillOpacity: 0.8 }}
            >
              <Popup>
                <strong>{mine.name}</strong>
                <br />
                {mine.address}
                <br />
                Risk: {mine.risk_level} ({mine.risk_score})
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default MapView;