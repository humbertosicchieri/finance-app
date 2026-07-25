const express = require('express');
const router = express.Router();
const db = require('./database');

router.get('/', (req, res) => {
  const cards = db.prepare('SELECT * FROM credit_cards ORDER BY created_at DESC').all();
  res.json(cards);
});

router.get('/:id', (req, res) => {
  const card = db.prepare('SELECT * FROM credit_cards WHERE id = ?').get(req.params.id);
  if (!card) return res.status(404).json({ error: 'Cartão não encontrado' });
  res.json(card);
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

router.get('/:id/transactions', (req, res) => {
  const txs = db.prepare(`
    SELECT ct.*, c.name as category_name, c.color as category_color
    FROM card_transactions ct
    LEFT JOIN categories c ON ct.category_id = c.id
    WHERE ct.card_id = ?
    ORDER BY ct.date DESC
  `).all(req.params.id);
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
    const txs = db.prepare('SELECT * FROM card_transactions WHERE card_id = ? ORDER BY date DESC').all(card_id);
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
    db.prepare('UPDATE credit_cards SET used_amount = MAX(0, used_amount - ?) WHERE id = ?').run(tx.amount, req.params.cardId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
