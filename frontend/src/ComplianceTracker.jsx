import { useEffect, useState } from 'react';

import { API_URL } from './config';

function ComplianceTracker({ mineFilter }) {
  const [compliance, setCompliance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/compliance`)
      .then((res) => {
        if (!res.ok) throw new Error('Server error');
        return res.json();
      })
      .then((data) => {
        setCompliance(data);
        setLoading(false);
        setError(null);
      })
      .catch(() => {
        setError('Could not load compliance data. Is the backend running?');
        setLoading(false);
      });
  }, []);

  const statusColor = (status) => {
    if (status === 'overdue') return 'var(--risk-critical)';
    if (status === 'completed') return 'var(--risk-low)';
    return 'var(--risk-medium)';
  };

  const visible = mineFilter ? compliance.filter((c) => c.mine_id === mineFilter) : compliance;

  if (loading) return <p className="hint">Loading compliance data...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <table className="mines-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Mine</th>
            <th>Category</th>
            <th>Requirement</th>
            <th>Regulation</th>
            <th>Due Date</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((item) => (
            <tr key={item.id}>
              <td>
                <span
                  style={{
                    padding: '2px 10px',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    background: statusColor(item.status) + '22',
                    color: statusColor(item.status),
                    textTransform: 'capitalize',
                  }}
                >
                  {item.status}
                </span>
              </td>
              <td>{item.mines?.name || '—'}</td>
              <td style={{ textTransform: 'capitalize' }}>{item.category}</td>
              <td>{item.title}</td>
              <td>{item.regulation_ref}</td>
              <td>{item.due_date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ComplianceTracker;