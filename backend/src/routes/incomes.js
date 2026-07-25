const express = require('express');
const router = express.Router();
const db = require('./database');

router.get('/', (req, res) => {
  const { month, year } = req.query;
  let query = 'SELECT * FROM incomes WHERE 1=1';
  const params = [];
  if (month && year) {
    query += ` AND strftime('%m', date) = ? AND strftime('%Y', date) = ?`;
    params.push(month.padStart(2, '0'), year);
  }
  query += ' ORDER BY date DESC';
  const incomes = db.prepare(query).all(...params);
  res.json(incomes);
});

router.post('/', (req, res) => {
  const { description, amount, date, source, is_recurring, recurrence_interval, notes } = req.body;
  if (!description || !amount || !date) {
    return res.status(400).json({ error: 'Campos obrigatórios: description, amount, date' });
  }
  try {
    const result = db.prepare(`
      INSERT INTO incomes (description, amount, date, source, is_recurring, recurrence_interval, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(description, amount, date, source || '', is_recurring ? 1 : 0, recurrence_interval || 'monthly', notes || '');
    const income = db.prepare('SELECT * FROM incomes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(income);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  const { description, amount, date, source, is_recurring, recurrence_interval, notes } = req.body;
  const { id } = req.params;
  try {
    db.prepare(`
      UPDATE incomes SET
        description = COALESCE(?, description), amount = COALESCE(?, amount),
        date = COALESCE(?, date), source = COALESCE(?, source),
        is_recurring = COALESCE(?, is_recurring), recurrence_interval = COALESCE(?, recurrence_interval),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(description, amount, date, source, is_recurring, recurrence_interval, notes, id);
    const income = db.prepare('SELECT * FROM incomes WHERE id = ?').get(id);
    if (!income) return res.status(404).json({ error: 'Receita não encontrada' });
    res.json(income);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM incomes WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Receita não encontrada' });
  res.json({ success: true });
});

module.exports = router;
