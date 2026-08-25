import { useState } from 'react';

const API_URL = 'http://localhost:5000';

function InspectionForm({ mines }) {
  const [mineId, setMineId] = useState('');
  const [category, setCategory] = useState('safety');
  const [findings, setFindings] = useState('');
  const [status, setStatus] = useState(null);
  const [coords, setCoords] = useState(null);

  // Grabs the device's real GPS location (works on phones and most laptops)
  const captureLocation = () => {
    if (!navigator.geolocation) {
      setStatus('Geolocation not supported on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus('Location captured.');
      },
      () => setStatus('Could not get location — you can still submit without it.')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mineId || !findings) {
      setStatus('Please select a mine and enter findings.');
      return;
    }

    const body = {
      mine_id: mineId,
      category,
      findings,
      latitude: coords?.lat,
      longitude: coords?.lng,
    };

    try {
      const res = await fetch(`${API_URL}/api/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to submit');
      setStatus('Inspection submitted successfully.');
      setFindings('');
    } catch (err) {
      setStatus('Error submitting inspection: ' + err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="inspection-form">
      <label>
        Mine
        <select value={mineId} onChange={(e) => setMineId(e.target.value)} required>
          <option value="">Select a mine</option>
          {mines.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </label>

      <label>
        Category
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="safety">Safety</option>
          <option value="environment">Environment</option>
          <option value="production">Production</option>
          <option value="labour">Labour</option>
        </select>
      </label>

      <label>
        Findings
        <textarea
          value={findings}
          onChange={(e) => setFindings(e.target.value)}
          rows={4}
          placeholder="Describe what was observed during the inspection..."
          required
        />
      </label>

      <button type="button" onClick={captureLocation} className="secondary-btn">
        📍 Capture GPS Location
      </button>
      {coords && <p className="hint">Location: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</p>}

      <button type="submit">Submit Inspection</button>

      {status && <p className="hint">{status}</p>}
    </form>
  );
}

export default InspectionForm;