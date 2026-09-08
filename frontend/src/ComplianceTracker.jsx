import { useEffect, useState } from 'react';
import { API_URL } from './config';

function ComplianceTracker({ mines, mineFilter, readOnly }) {
  const [compliance, setCompliance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [formMine, setFormMine] = useState('');
  const [formCategory, setFormCategory] = useState('safety');
  const [formTitle, setFormTitle] = useState('');
  const [formReg, setFormReg] = useState('');
  const [formDue, setFormDue] = useState('');
  const [formStatus, setFormStatus] = useState('pending');
  const [status, setStatus] = useState(null);

  const load = () => {
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
  };

  useEffect(() => {
    load();
  }, []);

  const statusColor = (status) => {
    if (status === 'overdue') return 'var(--risk-critical)';
    if (status === 'completed') return 'var(--risk-low)';
    return 'var(--risk-medium)';
  };

  const submitCompliance = async (e) => {
    e.preventDefault();
    if (!formMine || !formTitle || !formDue) {
      setStatus('Mine, title, and due date are required.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/compliance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mine_id: formMine,
          category: formCategory,
          title: formTitle,
          regulation_ref: formReg,
          due_date: formDue,
          status: formStatus,
        }),
      });
      if (!res.ok) throw new Error('Failed to add compliance item');
      setStatus('Compliance item added.');
      setFormTitle('');
      setFormReg('');
      setFormDue('');
      setShowForm(false);
      load();
    } catch (err) {
      setStatus(err.message);
    }
  };

  const visible = mineFilter ? compliance.filter((c) => c.mine_id === mineFilter) : compliance;

  if (loading) return <p className="hint">Loading compliance data...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      {!readOnly && (
        <button className="secondary-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Compliance Item'}
        </button>
      )}

      {showForm && (
        <form onSubmit={submitCompliance} className="inspection-form" style={{ marginTop: '1rem' }}>
          <label>
            Mine
            <select value={formMine} onChange={(e) => setFormMine(e.target.value)} required>
              <option value="">Select a mine</option>
              {mines.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
          <label>
            Category
            <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
              <option value="safety">Safety</option>
              <option value="environment">Environment</option>
              <option value="production">Production</option>
              <option value="labour">Labour</option>
            </select>
          </label>
          <label>
            Requirement Title
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Annual Safety Audit"
              required
              style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.6rem', borderRadius: '5px', fontFamily: 'Public Sans, sans-serif', fontSize: '0.9rem' }}
            />
          </label>
          <label>
            Regulation Reference
            <input
              type="text"
              value={formReg}
              onChange={(e) => setFormReg(e.target.value)}
              placeholder="e.g. Mines Act 1952, Sec 22"
              style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.6rem', borderRadius: '5px', fontFamily: 'Public Sans, sans-serif', fontSize: '0.9rem' }}
            />
          </label>
          <label>
            Due Date
            <input
              type="date"
              value={formDue}
              onChange={(e) => setFormDue(e.target.value)}
              required
              style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.6rem', borderRadius: '5px' }}
            />
          </label>
          <label>
            Status
            <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <button type="submit">Add Compliance Item</button>
          {status && <p className="hint">{status}</p>}
        </form>
      )}

      <table className="mines-table" style={{ marginTop: '1rem' }}>
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