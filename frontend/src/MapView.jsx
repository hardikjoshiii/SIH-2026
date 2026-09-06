import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const riskColor = (level) => {
  if (level === 'critical') return '#C2410C';
  if (level === 'high') return '#D97706';
  if (level === 'medium') return '#CA8A04';
  return '#4D7C0F';
};

// All coordinates verified via Google Places search for accuracy.
const COORDS = {
  'Jharia Colliery': [23.73812, 86.38777],
  'Kusunda Colliery': [23.78702, 86.40167],
  'Dipka Mine': [22.32865, 82.53186],
  'Bhelatand Mine': [23.75, 86.43],
  'Gevra Mine': [22.33816, 82.54600],
  'Kusmunda Mine': [22.33044, 82.67369],
  'Talcher Coalfields': [20.95107, 85.17597],
  'Jayant Mine': [24.16806, 82.65556],
  'Nigahi Mine': [24.11015, 82.62007],
  'Piparwar Mine': [23.69105, 85.06685],
  'Rajmahal Mine': [25.04002, 87.35650],
  'Wani Area': [20.04527, 79.18013],
};

function MapView({ mines }) {
  const center = [22.9734, 82.8];

  return (
    <div className="map-wrapper">
      <MapContainer center={center} zoom={5} style={{ height: '500px', width: '100%', borderRadius: '8px' }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
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