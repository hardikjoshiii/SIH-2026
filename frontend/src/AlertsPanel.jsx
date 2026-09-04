import { useEffect, useState } from 'react';
import { API_URL } from './config';

function AlertsPanel({ mineFilter, readOnly }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [error, setError] = useState(null);

  const loadAlerts = () => {
    setLoading(true);
    fetch(`${API_URL}/api/alerts`)
      .then((res) => {
        if (!res.ok) throw new Error('Server error');
        return res.json();
      })
      .then((data) => {
        setAlerts(data);
        setLoading(false);
        setError(null);
      })
      .catch(() => {
        setError('Could not load alerts. Is the backend running?');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const generateAlerts = async () => {
    setGenerating(true);
    await fetch(`${API_URL}/api/generate-alerts`, { method: 'POST' });
    loadAlerts();
    setGenerating(false);
  };

  const markRead = async (id) => {
    await fetch(`${API_URL}/api/alerts/${id}/read`, { method: 'PATCH' });
    loadAlerts();
  };

  const typeColor = (type) => {
    if (type === 'overdue_compliance') return 'var(--risk-critical)';
    if (type === 'high_risk') return 'var(--risk-high)';
    if (type === 'violation_raised') return 'var(--risk-medium)';
    return 'var(--accent)';
  };

  const visible = mineFilter ? alerts.filter((a) => a.mine_id === mineFilter) : alerts;

  if (loading) return <p className="hint">Loading alerts...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      {!readOnly && (
        <button onClick={generateAlerts} disabled={generating} className="secondary-btn">
          {generating ? 'Scanning...' : '🔔 Scan for Overdue Compliance & Generate Alerts'}
        </button>
      )}

      {visible.length === 0 && <p className="hint" style={{ marginTop: '1rem' }}>No alerts yet.</p>}

      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {visible.map((alert) => (
          <div
            key={alert.id}
            style={{
              background: '#1f2937',
              border: `1px solid ${typeColor(alert.type)}55`,
              borderLeft: `4px solid ${typeColor(alert.type)}`,
              borderRadius: '6px',
              padding: '0.75rem 1rem',
              opacity: alert.is_read ? 0.5 : 1,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <strong>{alert.mines?.name || 'Unknown mine'}</strong>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: '#d1d5db' }}>{alert.message}</p>
            </div>
            {!readOnly && !alert.is_read && (
              <button onClick={() => markRead(alert.id)} className="secondary-btn" style={{ fontSize: '0.8rem' }}>
                Mark read
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AlertsPanel;