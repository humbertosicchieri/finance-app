const express = require('express');
const router = express.Router();
const db = require('./database');

router.get('/', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY type, name').all();
  res.json(categories);
});

router.post('/', (req, res) => {
  const { name, color, icon, type } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
  try {
    const result = db.prepare(
      'INSERT INTO categories (name, color, icon, type) VALUES (?, ?, ?, ?)'
    ).run(name, color || '#6366f1', icon || 'tag', type || 'expense');
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(category);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Categoria já existe' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  const { name, color, icon, type } = req.body;
  const { id } = req.params;
  try {
    db.prepare(
      'UPDATE categories SET name = COALESCE(?, name), color = COALESCE(?, color), icon = COALESCE(?, icon), type = COALESCE(?, type) WHERE id = ?'
    ).run(name, color, icon, type, id);
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!category) return res.status(404).json({ error: 'Categoria não encontrada' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Categoria não encontrada' });
  res.json({ success: true });
});

module.exports = router;
