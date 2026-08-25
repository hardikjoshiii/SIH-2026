import { useEffect, useState } from 'react';

const API_URL = 'http://localhost:5000';

function ComplianceTracker() {
  const [compliance, setCompliance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/compliance`)
      .then((res) => res.json())
      .then((data) => {
        setCompliance(data);
        setLoading(false);
      });
  }, []);

  const statusColor = (status) => {
    if (status === 'overdue') return '#e11d48';
    if (status === 'completed') return '#22c55e';
    return '#eab308'; // pending / in_progress
  };

  if (loading) return <p>Loading compliance data...</p>;

  return (
    <div>
      <table className="mines-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Category</th>
            <th>Requirement</th>
            <th>Regulation</th>
            <th>Due Date</th>
          </tr>
        </thead>
        <tbody>
          {compliance.map((item) => (
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