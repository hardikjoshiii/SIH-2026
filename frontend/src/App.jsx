import { useEffect, useState } from 'react';
import './App.css';
import MapView from './MapView';
import ComplianceTracker from './ComplianceTracker';
import InspectionForm from './InspectionForm';
import AlertsPanel from './AlertsPanel';
import ViolationsPanel from './ViolationsPanel';
import OCRUpload from './OCRUpload';

const API_URL = 'http://localhost:5000';

// Which tabs each role is allowed to see
const ROLE_TABS = {
  mine_official: ['dashboard', 'compliance', 'inspection', 'ocr', 'alerts', 'violations'],
  corporate_admin: ['dashboard', 'map', 'compliance', 'ocr', 'alerts', 'violations'],
  regulator: ['map', 'compliance', 'alerts', 'violations'],
};

const ROLE_LABELS = {
  mine_official: 'Mine Official',
  corporate_admin: 'Corporate Management',
  regulator: 'Regulator',
};

const TAB_LABELS = {
  dashboard: 'Dashboard',
  map: 'Map View',
  compliance: 'Compliance Tracker',
  inspection: 'Field Inspection',
  ocr: 'Document Scan',
  alerts: 'Alerts',
  violations: 'Violations',
};

function App() {
  const [mines, setMines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [recalculating, setRecalculating] = useState(false);

  const [role, setRole] = useState('corporate_admin');
  const [selectedMineId, setSelectedMineId] = useState('');

  const loadMines = () => {
    setLoading(true);
    fetch(`${API_URL}/api/mines`)
      .then((res) => res.json())
      .then((data) => {
        setMines(data);
        setLoading(false);
        if (data.length > 0) setSelectedMineId((prev) => prev || data[0].id);
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

  // When switching roles, jump to a tab that role is allowed to see
  useEffect(() => {
    const allowedTabs = ROLE_TABS[role];
    if (!allowedTabs.includes(tab)) setTab(allowedTabs[0]);
  }, [role]);

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
      loadMines();
    } catch (err) {
      console.error(err);
    }
    setRecalculating(false);
  };

  // Read-only for regulators; mine officials and corporate can act
  const readOnly = role === 'regulator';

  // Mine officials only see their selected mine's data everywhere
  const mineFilter = role === 'mine_official' ? selectedMineId : null;

  const dashboardMines = mineFilter ? mines.filter((m) => m.id === mineFilter) : mines;

  const allowedTabs = ROLE_TABS[role];

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Coal Mine Governance Dashboard</h1>
        <p>AI-Based Smart Governance & Compliance Monitoring — SIH 2026</p>
      </header>

      <div className="role-bar">
        <label>
          Viewing as
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {Object.keys(ROLE_LABELS).map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </label>

        {role === 'mine_official' && (
          <label>
            My Mine
            <select value={selectedMineId} onChange={(e) => setSelectedMineId(e.target.value)}>
              {mines.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
        )}

        {readOnly && <span className="readonly-badge">Read-only (audit view)</span>}
      </div>

      <nav className="tabs">
        {allowedTabs.map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </nav>

      {loading && <p>Loading mines...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && tab === 'dashboard' && (
        <>
          {role === 'corporate_admin' && (
            <button onClick={runRiskEngine} disabled={recalculating} className="secondary-btn">
              {recalculating ? 'Recalculating...' : '⚙ Run AI Risk Engine'}
            </button>
          )}

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
              {dashboardMines.map((mine) => (
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
      {!loading && !error && tab === 'compliance' && <ComplianceTracker mineFilter={mineFilter} />}
      {!loading && !error && tab === 'inspection' && (
        <InspectionForm mines={mineFilter ? mines.filter((m) => m.id === mineFilter) : mines} />
      )}
      {!loading && !error && tab === 'ocr' && <OCRUpload />}
      {!loading && !error && tab === 'alerts' && <AlertsPanel mineFilter={mineFilter} readOnly={readOnly} />}
      {!loading && !error && tab === 'violations' && <ViolationsPanel mineFilter={mineFilter} readOnly={readOnly} />}
    </div>
  );
}

export default App;