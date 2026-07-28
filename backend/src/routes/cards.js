const express = require('express');
const router = express.Router();
const db = require('../database');
const { getBillingCycle } = require('../billingCycle');

router.get('/', (req, res) => {
  const cards = db.prepare('SELECT * FROM credit_cards ORDER BY created_at DESC').all();
  const now = new Date();

  const result = cards.map(card => {
    const cycle = getBillingCycle(card.closing_day);

    const cycleTxs = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM card_transactions
      WHERE card_id = ? AND date >= ? AND date <= ? AND is_paid = 0
    `).get(card.id, cycle.cycleStart, cycle.cycleEnd);

    const nextCycleTxs = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM card_transactions
      WHERE card_id = ? AND date >= ? AND is_paid = 0
    `).get(card.id, cycle.nextCycleStart);

    const totalPending = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM card_transactions WHERE card_id = ? AND is_paid = 0
    `).get(card.id).total;

    const dueDate = new Date(cycle.cycleEnd);
    const origDay = dueDate.getDate();
    dueDate.setDate(card.due_day);
    if (card.due_day < card.closing_day) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      ...card,
      billingCycle: {
        label: cycle.cycleLabel,
        start: cycle.cycleStart,
        end: cycle.cycleEnd,
      },
      dueDate: dueDateStr,
      daysUntilDue: daysUntilDue > 0 ? daysUntilDue : 0,
      currentCycleAmount: cycleTxs.total || 0,
      currentCycleCount: cycleTxs.count || 0,
      nextCycleAmount: nextCycleTxs.total || 0,
      totalPending,
      available_limit: card.limit_amount - totalPending,
      usage_percentage: card.limit_amount > 0 ? Math.round((totalPending / card.limit_amount) * 100) : 0,
    };
  });

  res.json(result);
});

router.get('/:id', (req, res) => {
  const card = db.prepare('SELECT * FROM credit_cards WHERE id = ?').get(req.params.id);
  if (!card) return res.status(404).json({ error: 'Cartão não encontrado' });

  const cycle = getBillingCycle(card.closing_day);
  const now = new Date();

  const cycleTxs = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM card_transactions
    WHERE card_id = ? AND date >= ? AND date <= ? AND is_paid = 0
  `).get(card.id, cycle.cycleStart, cycle.cycleEnd);

  const totalPending = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM card_transactions WHERE card_id = ? AND is_paid = 0
  `).get(card.id).total;

  const dueDate = new Date(cycle.cycleEnd);
  dueDate.setDate(card.due_day);
  if (card.due_day < card.closing_day) {
    dueDate.setMonth(dueDate.getMonth() + 1);
  }
  const dueDateStr = dueDate.toISOString().split('T')[0];

  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  res.json({
    ...card,
    billingCycle: {
      label: cycle.cycleLabel,
      start: cycle.cycleStart,
      end: cycle.cycleEnd,
    },
    dueDate: dueDateStr,
    daysUntilDue: daysUntilDue > 0 ? daysUntilDue : 0,
    currentCycleAmount: cycleTxs.total || 0,
    currentCycleCount: cycleTxs.count || 0,
    totalPending,
    available_limit: card.limit_amount - totalPending,
    usage_percentage: card.limit_amount > 0 ? Math.round((totalPending / card.limit_amount) * 100) : 0,
  });
});

router.post('/', (req, res) => {
  const { name, last_digits, limit_amount, due_day, closing_day, brand, color } = req.body;
  if (!name || !last_digits || !limit_amount || !due_day || !closing_day) {
    return res.status(400).json({ error: 'Campos obrigatórios: name, last_digits, limit_amount, due_day, closing_day' });
  }
  try {
    const result = db.prepare(
      'INSERT INTO credit_cards (name, last_digits, limit_amount, due_day, closing_day, brand, color) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(name, last_digits, limit_amount, due_day, closing_day, brand || '', color || '#6366f1');
    const card = db.prepare('SELECT * FROM credit_cards WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  const { name, last_digits, limit_amount, due_day, closing_day, brand, color, is_active } = req.body;
  const { id } = req.params;
  try {
    db.prepare(`
      UPDATE credit_cards SET
        name = COALESCE(?, name),
        last_digits = COALESCE(?, last_digits),
        limit_amount = COALESCE(?, limit_amount),
        due_day = COALESCE(?, due_day),
        closing_day = COALESCE(?, closing_day),
        brand = COALESCE(?, brand),
        color = COALESCE(?, color),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(name, last_digits, limit_amount, due_day, closing_day, brand, color, is_active, id);
    const card = db.prepare('SELECT * FROM credit_cards WHERE id = ?').get(id);
    if (!card) return res.status(404).json({ error: 'Cartão não encontrado' });
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM credit_cards WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Cartão não encontrado' });
  res.json({ success: true });
});

router.get('/:id/billing-cycle', (req, res) => {
  const card = db.prepare('SELECT * FROM credit_cards WHERE id = ?').get(req.params.id);
  if (!card) return res.status(404).json({ error: 'Cartão não encontrado' });

  const { cycleStart, cycleEnd, cycleLabel } = getBillingCycle(card.closing_day);

  const currentCycle = db.prepare(`
    SELECT ct.*, c.name as category_name, c.color as category_color
    FROM card_transactions ct
    LEFT JOIN categories c ON ct.category_id = c.id
    WHERE ct.card_id = ? AND ct.date >= ? AND ct.date <= ?
    ORDER BY ct.date DESC
  `).all(req.params.id, cycleStart, cycleEnd);

  res.json({
    cycle: { start: cycleStart, end: cycleEnd, label: cycleLabel },
    transactions: currentCycle,
  });
});

router.get('/:id/cycle-history', (req, res) => {
  const card = db.prepare('SELECT * FROM credit_cards WHERE id = ?').get(req.params.id);
  if (!card) return res.status(404).json({ error: 'Cartão não encontrado' });

  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, card.closing_day);
    const cycle = getBillingCycle(card.closing_day, ref);

    const amount = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM card_transactions
      WHERE card_id = ? AND date >= ? AND date <= ? AND is_paid = 0
    `).get(req.params.id, cycle.cycleStart, cycle.cycleEnd).total;

    months.push({
      label: cycle.cycleLabel,
      start: cycle.cycleStart,
      end: cycle.cycleEnd,
      amount,
    });
  }

  res.json(months);
});

router.get('/:id/transactions', (req, res) => {
  const card = db.prepare('SELECT * FROM credit_cards WHERE id = ?').get(req.params.id);
  if (!card) return res.status(404).json({ error: 'Cartão não encontrado' });

  const cycleParam = req.query.cycle;
  let start, end;

  if (cycleParam) {
    const parts = cycleParam.split('_');
    start = parts[0];
    end = parts[1];
  } else {
    const cycle = getBillingCycle(card.closing_day);
    start = cycle.cycleStart;
    end = cycle.cycleEnd;
  }

  const txs = db.prepare(`
    SELECT ct.*, c.name as category_name, c.color as category_color
    FROM card_transactions ct
    LEFT JOIN categories c ON ct.category_id = c.id
    WHERE ct.card_id = ? AND ct.date >= ? AND ct.date <= ?
    ORDER BY ct.date DESC
  `).all(req.params.id, start, end);

  res.json(txs);
});

router.post('/:id/transactions', (req, res) => {
  const { description, amount, date, installments, category_id, notes } = req.body;
  const card_id = req.params.id;
  if (!description || !amount || !date) {
    return res.status(400).json({ error: 'Campos obrigatórios: description, amount, date' });
  }
  const card = db.prepare('SELECT * FROM credit_cards WHERE id = ?').get(card_id);
  if (!card) return res.status(404).json({ error: 'Cartão não encontrado' });

  const installmentCount = installments || 1;
  const installmentAmount = amount / installmentCount;

  try {
    const insertTx = db.prepare(
      'INSERT INTO card_transactions (card_id, description, amount, date, installments, installment_current, category_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );

    const insertMany = db.transaction(() => {
      for (let i = 1; i <= installmentCount; i++) {
        const txDate = new Date(date);
        txDate.setMonth(txDate.getMonth() + (i - 1));
        insertTx.run(
          card_id,
          installmentCount > 1 ? `${description} (${i}/${installmentCount})` : description,
          Math.round(installmentAmount * 100) / 100,
          txDate.toISOString().split('T')[0],
          installmentCount,
          i,
          category_id || null,
          notes || ''
        );
      }
      db.prepare('UPDATE credit_cards SET used_amount = used_amount + ? WHERE id = ?').run(amount, card_id);
    });

    insertMany();

    const cycle = getBillingCycle(card.closing_day);
    const txs = db.prepare(`
      SELECT ct.*, c.name as category_name, c.color as category_color
      FROM card_transactions ct
      LEFT JOIN categories c ON ct.category_id = c.id
      WHERE ct.card_id = ? AND ct.date >= ? AND ct.date <= ?
      ORDER BY ct.date DESC
    `).all(card_id, cycle.cycleStart, cycle.cycleEnd);

    res.status(201).json(txs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:cardId/transactions/:txId', (req, res) => {
  const tx = db.prepare('SELECT * FROM card_transactions WHERE id = ? AND card_id = ?').get(req.params.txId, req.params.cardId);
  if (!tx) return res.status(404).json({ error: 'Transação não encontrada' });

  try {
    db.prepare('DELETE FROM card_transactions WHERE id = ?').run(req.params.txId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
