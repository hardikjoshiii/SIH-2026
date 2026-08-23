import { useEffect, useState } from 'react';
import './App.css';

// This is the address of YOUR backend server (the one running on port 5000)
const API_URL = 'http://localhost:5000';

function App() {
  const [mines, setMines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Runs once when the page loads — fetches mine data from your backend
  useEffect(() => {
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
  }, []);

  // Returns a colour depending on risk level, for the little dot next to each mine
  const riskColor = (level) => {
    if (level === 'critical') return '#e11d48'; // red
    if (level === 'high') return '#f97316';     // orange
    if (level === 'medium') return '#eab308';   // yellow
    return '#22c55e';                           // green (low)
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Coal Mine Governance Dashboard</h1>
        <p>AI-Based Smart Governance & Compliance Monitoring</p>
      </header>

      {loading && <p>Loading mines...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
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
                <td>
                  <span
                    className="risk-dot"
                    style={{ backgroundColor: riskColor(mine.risk_level) }}
                  />
                </td>
                <td>{mine.name}</td>
                <td>{mine.mine_type}</td>
                <td>{mine.address}</td>
                <td>{mine.risk_score}</td>
                <td style={{ textTransform: 'capitalize' }}>{mine.risk_level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;