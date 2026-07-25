const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const { month, year, type, category_id } = req.query;
  let query = `
    SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
           cc.name as card_name, cc.brand as card_brand
    FROM expenses e
    LEFT JOIN categories c ON e.category_id = c.id
    LEFT JOIN credit_cards cc ON e.card_id = cc.id
    WHERE 1=1
  `;
  const params = [];

  if (month && year) {
    query += ` AND strftime('%m', e.date) = ? AND strftime('%Y', e.date) = ?`;
    params.push(month.padStart(2, '0'), year);
  }
  if (type) {
    query += ` AND e.expense_type = ?`;
    params.push(type);
  }
  if (category_id) {
    query += ` AND e.category_id = ?`;
    params.push(category_id);
  }

  query += ' ORDER BY e.date DESC, e.created_at DESC';
  const expenses = db.prepare(query).all(...params);
  res.json(expenses);
});

router.post('/', (req, res) => {
  const {
    description, amount, date, category_id, card_id,
    expense_type, is_recurring, recurrence_count,
    recurrence_interval, notes
  } = req.body;

  if (!description || !amount || !date) {
    return res.status(400).json({ error: 'Campos obrigatórios: description, amount, date' });
  }

  const isFixed = expense_type === 'fixed';
  const recurrenceRemaining = is_recurring ? (recurrence_count || null) : 0;

  try {
    const result = db.prepare(`
      INSERT INTO expenses (description, amount, date, category_id, card_id, expense_type, is_recurring, recurrence_count, recurrence_remaining, recurrence_interval, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      description, amount, date,
      category_id || null, card_id || null,
      expense_type || 'variable',
      is_recurring ? 1 : 0,
      is_recurring ? (recurrence_count || null) : null,
      recurrenceRemaining,
      recurrence_interval || 'monthly',
      notes || ''
    );

    if (card_id) {
      db.prepare('UPDATE credit_cards SET used_amount = used_amount + ? WHERE id = ?').run(amount, card_id);
    }

    const expense = db.prepare(`
      SELECT e.*, c.name as category_name, c.color as category_color
      FROM expenses e LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  const {
    description, amount, date, category_id, card_id,
    expense_type, is_recurring, recurrence_count,
    recurrence_remaining, recurrence_interval, is_paid, notes
  } = req.body;
  const { id } = req.params;

  try {
    const old = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    if (!old) return res.status(404).json({ error: 'Despesa não encontrada' });

    db.prepare(`
      UPDATE expenses SET
        description = COALESCE(?, description),
        amount = COALESCE(?, amount),
        date = COALESCE(?, date),
        category_id = COALESCE(?, category_id),
        card_id = COALESCE(?, card_id),
        expense_type = COALESCE(?, expense_type),
        is_recurring = COALESCE(?, is_recurring),
        recurrence_count = COALESCE(?, recurrence_count),
        recurrence_remaining = COALESCE(?, recurrence_remaining),
        recurrence_interval = COALESCE(?, recurrence_interval),
        is_paid = COALESCE(?, is_paid),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(description, amount, date, category_id, card_id, expense_type, is_recurring, recurrence_count, recurrence_remaining, recurrence_interval, is_paid, notes, id);

    if (old.card_id !== card_id) {
      if (old.card_id) db.prepare('UPDATE credit_cards SET used_amount = MAX(0, used_amount - ?) WHERE id = ?').run(old.amount, old.card_id);
      if (card_id) db.prepare('UPDATE credit_cards SET used_amount = used_amount + ? WHERE id = ?').run(amount || old.amount, card_id);
    } else if (card_id && amount && amount !== old.amount) {
      const diff = amount - old.amount;
      db.prepare('UPDATE credit_cards SET used_amount = used_amount + ? WHERE id = ?').run(diff, card_id);
    }

    const expense = db.prepare(`
      SELECT e.*, c.name as category_name, c.color as category_color
      FROM expenses e LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.id = ?
    `).get(id);
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Despesa não encontrada' });

  try {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
    if (expense.card_id) {
      db.prepare('UPDATE credit_cards SET used_amount = MAX(0, used_amount - ?) WHERE id = ?').run(expense.amount, expense.card_id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate-recurring', (req, res) => {
  try {
    const recurring = db.prepare(`
      SELECT * FROM expenses
      WHERE is_recurring = 1 AND recurrence_remaining > 0
    `).all();

    const insert = db.prepare(`
      INSERT INTO expenses (description, amount, date, category_id, card_id, expense_type, is_recurring, recurrence_count, recurrence_remaining, recurrence_interval, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const update = db.prepare(`
      UPDATE expenses SET recurrence_remaining = recurrence_remaining - 1 WHERE id = ?
    `);

    let generated = 0;
    const generateAll = db.transaction(() => {
      for (const exp of recurring) {
        const nextDate = new Date(exp.date);
        if (exp.recurrence_interval === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
        else if (exp.recurrence_interval === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
        else if (exp.recurrence_interval === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

        insert.run(
          exp.description, exp.amount, nextDate.toISOString().split('T')[0],
          exp.category_id, exp.card_id, exp.expense_type,
          1, exp.recurrence_count, exp.recurrence_remaining - 1,
          exp.recurrence_interval, exp.notes
        );
        update.run(exp.id);
        generated++;
      }
    });

    generateAll();
    res.json({ generated, message: `${generated} despesas recorrentes geradas` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
