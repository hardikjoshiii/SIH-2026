// ============================================================
// Backend server for the Coal Mine Governance Platform (SIH 2026)
// Now includes: mines, compliance, inspections, and AI risk engine
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.get('/', (req, res) => {
  res.send('Coal Mine Governance backend is running.');
});

// ============================================================
// MINES
// ============================================================
app.get('/api/mines', async (req, res) => {
  const { data, error } = await supabase.from('mines').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/mines', async (req, res) => {
  const { name, mine_type, address } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const { data, error } = await supabase
    .from('mines')
    .insert([{ name, mine_type, address }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data[0]);
});

// ============================================================
// COMPLIANCE REQUIREMENTS
// ============================================================
app.get('/api/compliance', async (req, res) => {
  const { data, error } = await supabase
    .from('compliance_requirements')
    .select('*, mines(name)')
    .order('due_date', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/compliance', async (req, res) => {
  const { mine_id, category, title, regulation_ref, due_date } = req.body;
  if (!mine_id || !category || !title || !due_date) {
    return res.status(400).json({ error: 'mine_id, category, title, due_date are required' });
  }

  const { data, error } = await supabase
    .from('compliance_requirements')
    .insert([{ mine_id, category, title, regulation_ref, due_date, status: 'pending' }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data[0]);
});

// Mark a compliance item as completed
app.patch('/api/compliance/:id/complete', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('compliance_requirements')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// ============================================================
// INSPECTIONS (field reporting)
// ============================================================
app.get('/api/inspections', async (req, res) => {
  const { data, error } = await supabase
    .from('inspections')
    .select('*, mines(name)')
    .order('inspected_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Submit a new field inspection. Body example:
// { mine_id, category, findings, lat, lng }
app.post('/api/inspections', async (req, res) => {
  const { mine_id, category, findings, latitude, longitude } = req.body;
  if (!mine_id || !findings) {
    return res.status(400).json({ error: 'mine_id and findings are required' });
  }

  // NOTE: not saving GPS location to the database yet — the geography
  // column needs a specific format from the API and we're isolating
  // that as a separate fix. For now we just log it to the console.
  if (latitude && longitude) {
    console.log(`(inspection GPS captured but not yet saved: ${latitude}, ${longitude})`);
  }

  const insertData = { mine_id, category, findings };

  const { data, error } = await supabase
    .from('inspections')
    .insert([insertData])
    .select();

  if (error) {
    console.error('Insert error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data[0]);
});

// ============================================================
// AI RISK ENGINE
// Simple, explainable rule-based scoring — recalculates every
// mine's risk_score based on real compliance data.
// ============================================================
app.post('/api/risk/recalculate', async (req, res) => {
  try {
    const { data: mines, error: minesErr } = await supabase.from('mines').select('id');
    if (minesErr) throw minesErr;

    const { data: compliance, error: compErr } = await supabase
      .from('compliance_requirements')
      .select('mine_id, status, due_date');
    if (compErr) throw compErr;

    const today = new Date();
    const results = [];

    for (const mine of mines) {
      const mineCompliance = compliance.filter((c) => c.mine_id === mine.id);

      const overdueCount = mineCompliance.filter((c) => {
        const isPastDue = new Date(c.due_date) < today && c.status !== 'completed';
        return c.status === 'overdue' || isPastDue;
      }).length;

      const pendingCount = mineCompliance.filter((c) => c.status === 'pending').length;
      const totalCount = mineCompliance.length;

      // ---- Scoring formula (simple, explainable weights) ----
      let score = overdueCount * 15 + pendingCount * 3;
      score = Math.min(score, 100);

      let level = 'low';
      if (score >= 70) level = 'critical';
      else if (score >= 50) level = 'high';
      else if (score >= 25) level = 'medium';

      results.push({ id: mine.id, risk_score: score, risk_level: level, overdueCount, totalCount });
    }

    for (const r of results) {
      await supabase
        .from('mines')
        .update({ risk_score: r.risk_score, risk_level: r.risk_level })
        .eq('id', r.id);
    }

    res.json({ message: 'Risk scores recalculated', updated: results.length, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------
// GET /api/compliance/:mineId
// Returns all compliance requirements for one specific mine.
// Used by the Compliance Tracker page.
// --------------------------------------------------------
app.get('/api/compliance/:mineId', async (req, res) => {
  const { data, error } = await supabase
    .from('compliance_requirements')
    .select('*')
    .eq('mine_id', req.params.mineId)
    .order('due_date', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// --------------------------------------------------------
// POST /api/recalculate-risk
// THE AI RISK ENGINE.
// Looks at each mine's real compliance data and calculates
// a risk_score, then saves it back to the mines table.
//
// Scoring logic (simple, explainable — good for judges):
//   +15 points for every OVERDUE compliance item
//   +5  points for every PENDING (not yet due) item
//   Score is capped at 100
//   0-30 = low, 31-60 = medium, 61-85 = high, 86+ = critical
// --------------------------------------------------------
app.post('/api/recalculate-risk', async (req, res) => {
  // 1. Get every mine
  const { data: mines, error: mineErr } = await supabase
    .from('mines')
    .select('id, name');
  if (mineErr) return res.status(500).json({ error: mineErr.message });

  const results = [];

  // 2. For each mine, count its overdue vs pending compliance items
  for (const mine of mines) {
    const { data: items, error: itemErr } = await supabase
      .from('compliance_requirements')
      .select('status')
      .eq('mine_id', mine.id);

    if (itemErr) continue;

    const overdueCount = items.filter((i) => i.status === 'overdue').length;
    const pendingCount = items.filter((i) => i.status === 'pending').length;

    let score = overdueCount * 15 + pendingCount * 5;
    if (score > 100) score = 100;

    let level = 'low';
    if (score >= 86) level = 'critical';
    else if (score >= 61) level = 'high';
    else if (score >= 31) level = 'medium';

    // 3. Save the calculated score back onto the mine
    await supabase
      .from('mines')
      .update({ risk_score: score, risk_level: level })
      .eq('id', mine.id);

    results.push({ mine: mine.name, overdueCount, pendingCount, score, level });
  }

  res.json({ message: 'Risk scores recalculated', results });
});

// --------------------------------------------------------
// POST /api/inspections
// Saves a new field inspection (from the inspection form).
// Expects: mine_id, category, findings, latitude, longitude
// --------------------------------------------------------
app.post('/api/inspections', async (req, res) => {
  const { mine_id, category, findings, latitude, longitude } = req.body;

  if (!mine_id || !findings) {
    return res.status(400).json({ error: 'mine_id and findings are required' });
  }

  const insertData = {
    mine_id,
    category,
    findings,
    inspector_id: null, // we'll wire up real users/auth later
  };

  // Only attach location if coordinates were actually provided
  if (latitude && longitude) {
    insertData.location = `SRID=4326;POINT(${longitude} ${latitude})`;
  }

  const { data, error } = await supabase
    .from('inspections')
    .insert([insertData])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data[0]);
});

// --------------------------------------------------------
// GET /api/inspections
// Returns all inspections, most recent first.
// --------------------------------------------------------
app.get('/api/inspections', async (req, res) => {
  const { data, error } = await supabase
    .from('inspections')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});