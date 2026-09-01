require('dotenv').config();

const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;
const questions = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'];

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env and fill the values.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function normalizeBody(body) {
  const result = {
    name: String(body.name ?? '').trim(),
    department: String(body.department ?? '').trim(),
  };

  for (const q of questions) {
    result[q] = String(body[q] ?? '').trim();
  }

  return result;
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.post('/api/submit', async (req, res) => {
  const data = normalizeBody(req.body);

  if (!data.name || !data.department || questions.some((q) => !data[q])) {
    return res.status(400).json({ success: false, message: '请完整填写所有题目' });
  }

  const payload = {
    name: data.name,
    department: data.department,
    q1: data.q1,
    q2: data.q2,
    q3: data.q3,
    q4: data.q4,
    q5: data.q5,
    q6: data.q6,
    q7: data.q7,
    q8: data.q8,
    q9: data.q9,
    q10: data.q10,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('answers').insert([payload]);
  if (error) {
    console.error('Insert error:', error.message);
    return res.status(500).json({ success: false, message: '保存失败' });
  }

  res.json({ success: true, message: '提交成功' });
});

app.get('/api/answers', async (req, res) => {
  const { data, error } = await supabase
    .from('answers')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    console.error('Read error:', error.message);
    return res.status(500).json({ success: false, message: '读取失败' });
  }

  res.json(data ?? []);
});

app.get('/api/stats', async (req, res) => {
  const { data, error } = await supabase.from('answers').select('department');

  if (error) {
    console.error('Stats error:', error.message);
    return res.status(500).json({ success: false, message: '统计失败' });
  }

  const total = data.length;
  const counts = {};

  for (const item of data) {
    const dept = (item.department || '未填写').trim();
    counts[dept] = (counts[dept] || 0) + 1;
  }

  const departments = Object.entries(counts).map(([department, totalCount]) => ({
    department,
    total: totalCount,
  }));

  res.json({ total, departments });
});

app.listen(port, () => {
  console.log(`Survey app started at http://localhost:${port}`);
  console.log(`Admin page: http://localhost:${port}/admin.html`);
});
