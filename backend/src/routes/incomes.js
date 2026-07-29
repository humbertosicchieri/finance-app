const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const { month, year } = req.query;
  let query = 'SELECT * FROM incomes WHERE 1=1';
  const params = [];
  if (month && year) {
    if (!/^\d{1,2}$/.test(month) || month < 1 || month > 12) return res.status(400).json({ error: 'Mês inválido' });
    if (!/^\d{4}$/.test(year)) return res.status(400).json({ error: 'Ano inválido' });
    query += ` AND strftime('%m', date) = ? AND strftime('%Y', date) = ?`;
    params.push(String(month).padStart(2, '0'), String(year));
  }
  query += ' ORDER BY date DESC';
  const incomes = db.prepare(query).all(...params);
  res.json(incomes);
});

router.post('/', (req, res) => {
  const { description, amount, date, source, is_recurring, recurrence_interval, notes } = req.body;
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return res.status(400).json({ error: 'Descrição é obrigatória' });
  }
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Valor deve ser um número positivo' });
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Data inválida (AAAA-MM-DD)' });

  try {
    const result = db.prepare(`
      INSERT INTO incomes (description, amount, date, source, is_recurring, recurrence_interval, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(description.trim(), amt, date, source || '', is_recurring ? 1 : 0, recurrence_interval || 'monthly', notes || '');
    const income = db.prepare('SELECT * FROM incomes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(income);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar receita' });
  }
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });

  const { description, amount, date, source, is_recurring, recurrence_interval, notes } = req.body;
  if (description !== undefined && (typeof description !== 'string' || description.trim().length === 0)) {
    return res.status(400).json({ error: 'Descrição inválida' });
  }
  if (amount !== undefined && (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)) {
    return res.status(400).json({ error: 'Valor deve ser um número positivo' });
  }
  if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Data inválida (AAAA-MM-DD)' });
  }

  try {
    db.prepare(`
      UPDATE incomes SET
        description = COALESCE(?, description), amount = COALESCE(?, amount),
        date = COALESCE(?, date), source = COALESCE(?, source),
        is_recurring = COALESCE(?, is_recurring), recurrence_interval = COALESCE(?, recurrence_interval),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(description ? description.trim() : null, amount, date, source, is_recurring, recurrence_interval, notes, id);
    const income = db.prepare('SELECT * FROM incomes WHERE id = ?').get(id);
    if (!income) return res.status(404).json({ error: 'Receita não encontrada' });
    res.json(income);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar receita' });
  }
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });
  const result = db.prepare('DELETE FROM incomes WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Receita não encontrada' });
  res.json({ success: true });
});

module.exports = router;
