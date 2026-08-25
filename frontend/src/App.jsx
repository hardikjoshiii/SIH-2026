import { useEffect, useState } from 'react';
import './App.css';
import MapView from './MapView';
import ComplianceTracker from './ComplianceTracker';
import InspectionForm from './InspectionForm';

const API_URL = 'http://localhost:5000';

function App() {
  const [mines, setMines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [recalculating, setRecalculating] = useState(false);

  const loadMines = () => {
    setLoading(true);
    fetch(`${API_URL}/api/mines`)
      .then((res) => res.json())
      .then((data) => {
        setMines(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Could not reach the backend. Is server.js running?');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadMines();
  }, []);

  const riskColor = (level) => {
    if (level === 'critical') return '#e11d48';
    if (level === 'high') return '#f97316';
    if (level === 'medium') return '#eab308';
    return '#22c55e';
  };

  const runRiskEngine = async () => {
    setRecalculating(true);
    try {
      const res = await fetch(`${API_URL}/api/recalculate-risk`, { method: 'POST' });
      await res.json();
      loadMines(); // refresh table with new scores
    } catch (err) {
      console.error(err);
    }
    setRecalculating(false);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Coal Mine Governance Dashboard</h1>
        <p>AI-Based Smart Governance & Compliance Monitoring — SIH 2026</p>
      </header>

      <nav className="tabs">
        <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>Dashboard</button>
        <button className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}>Map View</button>
        <button className={tab === 'compliance' ? 'active' : ''} onClick={() => setTab('compliance')}>Compliance Tracker</button>
        <button className={tab === 'inspection' ? 'active' : ''} onClick={() => setTab('inspection')}>Field Inspection</button>
      </nav>

      {loading && <p>Loading mines...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && tab === 'dashboard' && (
        <>
          <button onClick={runRiskEngine} disabled={recalculating} className="secondary-btn">
            {recalculating ? 'Recalculating...' : '⚙ Run AI Risk Engine'}
          </button>

          <table className="mines-table">
            <thead>
              <tr>
                <th>Risk</th>
                <th>Mine Name</th>
                <th>Type</th>
                <th>Address</th>
                <th>Risk Score</th>
                <th>Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {mines.map((mine) => (
                <tr key={mine.id}>
                  <td><span className="risk-dot" style={{ backgroundColor: riskColor(mine.risk_level) }} /></td>
                  <td>{mine.name}</td>
                  <td>{mine.mine_type}</td>
                  <td>{mine.address}</td>
                  <td>{mine.risk_score}</td>
                  <td style={{ textTransform: 'capitalize' }}>{mine.risk_level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {!loading && !error && tab === 'map' && <MapView mines={mines} />}
      {!loading && !error && tab === 'compliance' && <ComplianceTracker />}
      {!loading && !error && tab === 'inspection' && <InspectionForm mines={mines} />}
    </div>
  );
}

export default App;