import { useEffect, useState } from 'react';
import { API_URL } from './config';

function ContractorsPanel({ mines, mineFilter, readOnly }) {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [formMine, setFormMine] = useState('');
  const [formName, setFormName] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [status, setStatus] = useState(null);

  const load = () => {
    setLoading(true);
    fetch(`${API_URL}/api/contractors`)
      .then((res) => {
        if (!res.ok) throw new Error('Server error');
        return res.json();
      })
      .then((data) => {
        setContractors(data);
        setLoading(false);
        setError(null);
      })
      .catch(() => {
        setError('Could not load contractors. Is the backend running?');
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const daysUntil = (dateStr) => {
    const diff = new Date(dateStr) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const rowColor = (contractor) => {
    if (contractor.status === 'suspended') return 'var(--risk-critical)';
    if (contractor.status === 'expired') return 'var(--text-muted)';
    const days = daysUntil(contractor.contract_end);
    if (days < 0) return 'var(--text-muted)';
    if (days <= 30) return 'var(--risk-high)';
    return 'var(--risk-low)';
  };

  const rowLabel = (contractor) => {
    if (contractor.status === 'suspended') return 'Suspended';
    if (contractor.status === 'expired') return 'Expired';
    const days = daysUntil(contractor.contract_end);
    if (days < 0) return 'Expired';
    if (days <= 30) return `Expires in ${days}d`;
    return 'Active';
  };

  const submitContractor = async (e) => {
    e.preventDefault();
    if (!formMine || !formName || !formEnd) {
      setStatus('Mine, name, and contract end date are required.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/contractors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mine_id: formMine,
          name: formName,
          contract_start: formStart || null,
          contract_end: formEnd,
        }),
      });
      if (!res.ok) throw new Error('Failed to add contractor');
      setStatus('Contractor added.');
      setFormName('');
      setFormStart('');
      setFormEnd('');
      setShowForm(false);
      load();
    } catch (err) {
      setStatus(err.message);
    }
  };

  const visible = mineFilter ? contractors.filter((c) => c.mine_id === mineFilter) : contractors;

  if (loading) return <p className="hint">Loading contractors...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      {!readOnly && (
        <button className="secondary-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Contractor'}
        </button>
      )}

      {showForm && (
        <form onSubmit={submitContractor} className="inspection-form" style={{ marginTop: '1rem' }}>
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
            Contractor Name
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. XYZ Earthmovers Pvt Ltd"
              required
              style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.6rem', borderRadius: '5px', fontFamily: 'Public Sans, sans-serif', fontSize: '0.9rem' }}
            />
          </label>
          <label>
            Contract Start
            <input
              type="date"
              value={formStart}
              onChange={(e) => setFormStart(e.target.value)}
              style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.6rem', borderRadius: '5px' }}
            />
          </label>
          <label>
            Contract End
            <input
              type="date"
              value={formEnd}
              onChange={(e) => setFormEnd(e.target.value)}
              required
              style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.6rem', borderRadius: '5px' }}
            />
          </label>
          <button type="submit">Add Contractor</button>
          {status && <p className="hint">{status}</p>}
        </form>
      )}

      {visible.length === 0 && (
        <p className="hint" style={{ marginTop: '1rem' }}>No contractors on record yet.</p>
      )}

      <table className="mines-table" style={{ marginTop: '1rem' }}>
        <thead>
          <tr>
            <th>Status</th>
            <th>Contractor</th>
            <th>Mine</th>
            <th>Start</th>
            <th>End</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((c) => (
            <tr key={c.id}>
              <td>
                <span
                  style={{
                    padding: '2px 10px',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    background: rowColor(c) + '22',
                    color: rowColor(c),
                  }}
                >
                  {rowLabel(c)}
                </span>
              </td>
              <td>{c.name}</td>
              <td>{c.mines?.name || '—'}</td>
              <td>{c.contract_start || '—'}</td>
              <td>{c.contract_end}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ContractorsPanel;