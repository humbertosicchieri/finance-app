const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY type, name').all();
  res.json(categories);
});

router.post('/', (req, res) => {
  const { name, color, icon, type } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }
  if (type && !['expense', 'income'].includes(type)) {
    return res.status(400).json({ error: 'Tipo inválido' });
  }
  try {
    const result = db.prepare(
      'INSERT INTO categories (name, color, icon, type) VALUES (?, ?, ?, ?)'
    ).run(name.trim(), color || '#6366f1', icon || 'tag', type || 'expense');
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(category);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Categoria já existe' });
    }
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });
  const { name, color, icon, type } = req.body;
  if (type && !['expense', 'income'].includes(type)) {
    return res.status(400).json({ error: 'Tipo inválido' });
  }
  try {
    db.prepare(
      'UPDATE categories SET name = COALESCE(?, name), color = COALESCE(?, color), icon = COALESCE(?, icon), type = COALESCE(?, type) WHERE id = ?'
    ).run(name ? name.trim() : null, color, icon, type, id);
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!category) return res.status(404).json({ error: 'Categoria não encontrada' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });
  const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Categoria não encontrada' });
  res.json({ success: true });
});

module.exports = router;
