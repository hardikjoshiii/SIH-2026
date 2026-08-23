// ============================================================
// Backend server for the Coal Mine Governance Platform (SIH 2026)
// This is the FIRST backend file — it connects to your Supabase
// database and exposes a couple of simple API endpoints so the
// frontend has real data to display.
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to Supabase using the keys from your .env file
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// --------------------------------------------------------
// Health check — visit http://localhost:5000/ to confirm
// the server is running at all
// --------------------------------------------------------
app.get('/', (req, res) => {
  res.send('Coal Mine Governance backend is running.');
});

// --------------------------------------------------------
// GET /api/mines
// Returns every mine in the database, including its risk_score.
// This is the first real endpoint — the dashboard map/table
// will call this to show mines.
// --------------------------------------------------------
app.get('/api/mines', async (req, res) => {
  const { data, error } = await supabase
    .from('mines')
    .select('*');

  if (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// --------------------------------------------------------
// POST /api/mines
// Adds a new mine. Send JSON body like:
// { "name": "Jharia Colliery", "mine_type": "underground" }
// --------------------------------------------------------
app.post('/api/mines', async (req, res) => {
  const { name, mine_type, address } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const { data, error } = await supabase
    .from('mines')
    .insert([{ name, mine_type, address }])
    .select();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data[0]);
});

// --------------------------------------------------------
// GET /api/compliance
// Returns all compliance requirements, newest due date first.
// --------------------------------------------------------
app.get('/api/compliance', async (req, res) => {
  const { data, error } = await supabase
    .from('compliance_requirements')
    .select('*')
    .order('due_date', { ascending: true });

  if (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});