import { useEffect, useState } from 'react';

const API_URL = 'http://localhost:5000';

function ViolationsPanel({ mineFilter, readOnly }) {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    fetch(`${API_URL}/api/violations`)
      .then((res) => {
        if (!res.ok) throw new Error('Server error');
        return res.json();
      })
      .then((data) => {
        setViolations(data);
        setLoading(false);
        setError(null);
      })
      .catch(() => {
        setError('Could not load violations. Is the backend running?');
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const autoGenerate = async () => {
    setGenerating(true);
    await fetch(`${API_URL}/api/violations/auto-generate`, { method: 'POST' });
    load();
    setGenerating(false);
  };

  const resolve = async (id) => {
    await fetch(`${API_URL}/api/violations/${id}/resolve`, { method: 'PATCH' });
    load();
  };

  const severityColor = (s) => {
    if (s === 'critical') return 'var(--risk-critical)';
    if (s === 'high') return 'var(--risk-high)';
    if (s === 'medium') return 'var(--risk-medium)';
    return 'var(--risk-low)';
  };

  const visible = mineFilter ? violations.filter((v) => v.mine_id === mineFilter) : violations;

  if (loading) return <p className="hint">Loading violations...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      {!readOnly && (
        <button onClick={autoGenerate} disabled={generating} className="secondary-btn">
          {generating ? 'Scanning...' : '⚠ Auto-Generate Violations from Overdue Compliance'}
        </button>
      )}

      {visible.length === 0 && (
        <p className="hint" style={{ marginTop: '1rem' }}>No violations logged yet.</p>
      )}

      <table className="mines-table" style={{ marginTop: '1rem' }}>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Mine</th>
            <th>Description</th>
            <th>Status</th>
            {!readOnly && <th></th>}
          </tr>
        </thead>
        <tbody>
          {visible.map((v) => (
            <tr key={v.id}>
              <td>
                <span
                  style={{
                    padding: '2px 10px',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    background: severityColor(v.severity) + '22',
                    color: severityColor(v.severity),
                    textTransform: 'capitalize',
                  }}
                >
                  {v.severity}
                </span>
              </td>
              <td>{v.mines?.name || '—'}</td>
              <td>{v.description}</td>
              <td style={{ textTransform: 'capitalize' }}>{v.status}</td>
              {!readOnly && (
                <td>
                  {v.status !== 'resolved' && (
                    <button onClick={() => resolve(v.id)} className="secondary-btn" style={{ fontSize: '0.8rem' }}>
                      Resolve
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ViolationsPanel;