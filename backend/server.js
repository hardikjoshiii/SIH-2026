// ============================================================
// Backend server for the Coal Mine Governance Platform (SIH 2026)
// Includes: mines, compliance, inspections, and AI risk engine
// ============================================================

   require('dotenv').config();
   const express = require('express');
   const cors = require('cors');
   const multer = require('multer');
   const Tesseract = require('tesseract.js');
   const { createClient } = require('@supabase/supabase-js');

   const app = express();
   app.use(cors());
   app.use(express.json());

   const upload = multer({ storage: multer.memoryStorage() });

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

// All compliance requirements across every mine (used by Compliance Tracker page)
app.get('/api/compliance', async (req, res) => {
  const { data, error } = await supabase
    .from('compliance_requirements')
    .select('*, mines(name)')
    .order('due_date', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Compliance requirements for ONE specific mine
app.get('/api/compliance/:mineId', async (req, res) => {
  const { data, error } = await supabase
    .from('compliance_requirements')
    .select('*')
    .eq('mine_id', req.params.mineId)
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

// Submit a new field inspection.
// Body: { mine_id, category, findings, latitude, longitude }
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
//
// Scoring logic:
//   +15 points for every OVERDUE compliance item
//   +5  points for every PENDING (not yet due) item
//   Score is capped at 100
//   0-30 = low, 31-60 = medium, 61-85 = high, 86+ = critical
// ============================================================
app.post('/api/recalculate-risk', async (req, res) => {
  try {
    const { data: mines, error: mineErr } = await supabase
      .from('mines')
      .select('id, name');
    if (mineErr) throw mineErr;

    const results = [];

    for (const mine of mines) {
      const { data: items, error: itemErr } = await supabase
        .from('compliance_requirements')
        .select('status')
        .eq('mine_id', mine.id);

      if (itemErr) continue;

      const overdueCount = items.filter((i) => i.status === 'overdue').length;
      const pendingCount = items.filter((i) => i.status === 'pending').length;

      let score = overdueCount * 15 + pendingCount * 5;
      score = Math.min(score, 100);

      let level = 'low';
      if (score >= 86) level = 'critical';
      else if (score >= 61) level = 'high';
      else if (score >= 31) level = 'medium';

      await supabase
        .from('mines')
        .update({ risk_score: score, risk_level: level })
        .eq('id', mine.id);

      results.push({ mine: mine.name, overdueCount, pendingCount, score, level });
    }

    res.json({ message: 'Risk scores recalculated', results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ALERTS
// ============================================================

// Get all alerts, most recent first
app.get('/api/alerts', async (req, res) => {
  const { data, error } = await supabase
    .from('alerts')
    .select('*, mines(name)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Scans for overdue compliance items and creates an alert for each
// one that doesn't already have an open alert. Safe to call repeatedly —
// it won't create duplicate alerts for the same overdue item.
app.post('/api/generate-alerts', async (req, res) => {
  try {
    const { data: overdueItems, error: itemErr } = await supabase
      .from('compliance_requirements')
      .select('id, mine_id, title, due_date')
      .eq('status', 'overdue');
    if (itemErr) throw itemErr;

    const { data: existingAlerts, error: alertErr } = await supabase
      .from('alerts')
      .select('related_id')
      .eq('type', 'overdue_compliance');
    if (alertErr) throw alertErr;

    const alreadyAlerted = new Set(existingAlerts.map((a) => a.related_id));
    const newAlerts = overdueItems
      .filter((item) => !alreadyAlerted.has(item.id))
      .map((item) => ({
        mine_id: item.mine_id,
        type: 'overdue_compliance',
        message: `"${item.title}" is overdue (was due ${item.due_date})`,
        related_id: item.id,
      }));

    if (newAlerts.length > 0) {
      const { error: insertErr } = await supabase.from('alerts').insert(newAlerts);
      if (insertErr) throw insertErr;
    }

    res.json({ message: `Generated ${newAlerts.length} new alert(s)`, count: newAlerts.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Mark an alert as read/acknowledged
app.patch('/api/alerts/:id/read', async (req, res) => {
  const { data, error } = await supabase
    .from('alerts')
    .update({ is_read: true })
    .eq('id', req.params.id)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// ============================================================
// VIOLATIONS
// ============================================================

// Get all violations, most recent first
app.get('/api/violations', async (req, res) => {
  const { data, error } = await supabase
    .from('violations')
    .select('*, mines(name)')
    .order('raised_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Log a new violation manually (e.g. from an inspection finding)
// Body: { mine_id, severity, description, corrective_action, compliance_id, inspection_id }
app.post('/api/violations', async (req, res) => {
  const { mine_id, severity, description, corrective_action, compliance_id, inspection_id } = req.body;
  if (!mine_id || !severity || !description) {
    return res.status(400).json({ error: 'mine_id, severity, and description are required' });
  }

  const { data, error } = await supabase
    .from('violations')
    .insert([{ mine_id, severity, description, corrective_action, compliance_id, inspection_id }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data[0]);
});

// Mark a violation as resolved
app.patch('/api/violations/:id/resolve', async (req, res) => {
  const { data, error } = await supabase
    .from('violations')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// Auto-generate violations from overdue compliance items that don't
// already have one — turns "overdue" into a formal tracked violation
// with a suggested severity based on category.
app.post('/api/violations/auto-generate', async (req, res) => {
  try {
    const { data: overdueItems, error: itemErr } = await supabase
      .from('compliance_requirements')
      .select('id, mine_id, category, title')
      .eq('status', 'overdue');
    if (itemErr) throw itemErr;

    const { data: existing, error: existErr } = await supabase
      .from('violations')
      .select('compliance_id')
      .not('compliance_id', 'is', null);
    if (existErr) throw existErr;

    const alreadyLogged = new Set(existing.map((v) => v.compliance_id));

    const severityFor = (category) => (category === 'safety' ? 'high' : 'medium');

    const newViolations = overdueItems
      .filter((item) => !alreadyLogged.has(item.id))
      .map((item) => ({
        mine_id: item.mine_id,
        compliance_id: item.id,
        severity: severityFor(item.category),
        description: `Non-compliance: "${item.title}" was not completed by its due date.`,
        corrective_action: 'Pending review by mine official.',
      }));

    if (newViolations.length > 0) {
      const { error: insertErr } = await supabase.from('violations').insert(newViolations);
      if (insertErr) throw insertErr;
    }

    res.json({ message: `Generated ${newViolations.length} new violation(s)`, count: newViolations.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


   app.post('/api/ocr', upload.single('document'), async (req, res) => {
     if (!req.file) {
       return res.status(400).json({ error: 'No file uploaded. Attach an image under the field name "document".' });
     }

     try {
       const result = await Tesseract.recognize(req.file.buffer, 'eng', {
         logger: () => {},
       });

       res.json({
         extractedText: result.data.text.trim(),
         confidence: result.data.confidence,
       });
     } catch (err) {
       console.error('OCR error:', err);
       res.status(500).json({ error: 'Failed to process the document. Try a clearer image.' });
     }
   });

   

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});