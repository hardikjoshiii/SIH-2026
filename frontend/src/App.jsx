import { useEffect, useState } from 'react';
import './App.css';
import MapView from './MapView';
import ComplianceTracker from './ComplianceTracker';
import InspectionForm from './InspectionForm';
import AlertsPanel from './AlertsPanel';
import ViolationsPanel from './ViolationsPanel';
import OCRUpload from './OCRUpload';

const API_URL = 'http://localhost:5000';

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
  dashboard: 'Overview',
  map: 'Map',
  compliance: 'Compliance',
  inspection: 'Inspect',
  ocr: 'Scan Doc',
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
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded with status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setMines(data);
        setLoading(false);
        setError(null);
        if (data.length > 0) setSelectedMineId((prev) => prev || data[0].id);
      })
      .catch((err) => {
        console.error(err);
        setError('Could not reach the backend server.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadMines();
  }, []);

  useEffect(() => {
    const allowedTabs = ROLE_TABS[role];
    if (!allowedTabs.includes(tab)) setTab(allowedTabs[0]);
  }, [role]);

  const riskColor = (level) => {
    if (level === 'critical') return 'var(--risk-critical)';
    if (level === 'high') return 'var(--risk-high)';
    if (level === 'medium') return 'var(--risk-medium)';
    return 'var(--risk-low)';
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

  const readOnly = role === 'regulator';
  const mineFilter = role === 'mine_official' ? selectedMineId : null;
  const dashboardMines = mineFilter ? mines.filter((m) => m.id === mineFilter) : mines;
  const allowedTabs = ROLE_TABS[role];

  // Aggregate stats for the summary cards + the Seam Rail's risk-mix stripe
  const highRiskCount = mines.filter((m) => m.risk_level === 'high' || m.risk_level === 'critical').length;
  const avgRisk = mines.length ? Math.round(mines.reduce((sum, m) => sum + (m.risk_score || 0), 0) / mines.length) : 0;

  return (
    <div className="app-shell">
      {/* SEAM RAIL — vertical navigation styled as a geological core sample */}
      <aside className="seam-rail">
        <div className="seam-rail-logo" title="Risk distribution across all mines" />
        <nav className="seam-nav">
          {allowedTabs.map((t) => (
            <button key={t} className={`seam-nav-item ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-area">
        <div className="masthead">
          <div>
            <span className="masthead-eyebrow">SIH 2026 · PS 26024 · Ministry of Coal</span>
            <h1 className="masthead-title">Coal Mine Governance Platform</h1>
            <p className="masthead-subtitle">AI-Based Smart Governance &amp; Compliance Monitoring</p>
          </div>
        </div>

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

          {readOnly && <span className="readonly-badge">Read-only · Audit View</span>}
        </div>

        {loading && <p className="hint">Loading mines...</p>}
        {error && (
          <div className="error-panel">
            <strong>Connection problem</strong>
            <p>{error}</p>
            <p className="hint">Check that your backend server is running (node server.js) on port 5000.</p>
            <button className="secondary-btn" onClick={loadMines}>Retry</button>
          </div>
        )}

        {!loading && !error && tab === 'dashboard' && (
          <>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-card-value">{dashboardMines.length}</div>
                <div className="stat-card-label">Mines Monitored</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value" style={{ color: 'var(--risk-high)' }}>{highRiskCount}</div>
                <div className="stat-card-label">High / Critical Risk</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">{avgRisk}</div>
                <div className="stat-card-label">Average Risk Score</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value" style={{ color: 'var(--accent)' }}>
                  {role === 'corporate_admin' ? (
                    <button onClick={runRiskEngine} disabled={recalculating} className="primary-btn" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                      {recalculating ? 'Running...' : 'Run Engine'}
                    </button>
                  ) : '—'}
                </div>
                <div className="stat-card-label">AI Risk Engine</div>
              </div>
            </div>

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
                    <td style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{mine.risk_score}</td>
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
      </main>
    </div>
  );
}

export default App;