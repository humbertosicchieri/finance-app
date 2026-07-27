const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database');
const authMiddleware = require('../middleware');
const JWT_SECRET = require('../config');
const { generateCaptcha, verifyCaptcha, validatePasswordStrength } = require('../captcha');
const router = express.Router();

const TOKEN_EXPIRY = '24h';

const loginAttempts = new Map();

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function isLoginBlocked(ip) {
  const record = loginAttempts.get(ip);
  if (!record) return false;
  if (Date.now() - record.windowStart > 15 * 60 * 1000) {
    loginAttempts.delete(ip);
    return false;
  }
  return record.attempts >= 5;
}

function recordLoginAttempt(ip, success) {
  if (success) {
    loginAttempts.delete(ip);
    return;
  }
  const record = loginAttempts.get(ip) || { attempts: 0, windowStart: Date.now() };
  record.attempts++;
  if (Date.now() - record.windowStart > 15 * 60 * 1000) {
    record.attempts = 1;
    record.windowStart = Date.now();
  }
  loginAttempts.set(ip, record);
}

router.get('/captcha', (req, res) => {
  const captcha = generateCaptcha();
  res.json(captcha);
});

router.post('/login', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;

  if (isLoginBlocked(ip)) {
    return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em 15 minutos.' });
  }

  const { username, password, captchaId, captchaAnswer } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
  }

  if (!captchaId || captchaAnswer === undefined && captchaAnswer !== 0) {
    return res.status(400).json({ error: 'CAPTCHA é obrigatório' });
  }

  const captchaResult = verifyCaptcha(captchaId, captchaAnswer);
  if (!captchaResult.valid) {
    recordLoginAttempt(ip, false);
    return res.status(401).json({ error: captchaResult.error });
  }

  const hashedPassword = hashPassword(password);
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ? AND is_active = 1').get(username, hashedPassword);

  if (!user) {
    recordLoginAttempt(ip, false);
    return res.status(401).json({ error: 'Usuário ou senha inválidos' });
  }

  recordLoginAttempt(ip, true);

  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    }
  });
});

router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, username, name, role FROM users WHERE id = ? AND is_active = 1').get(decoded.id);
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
    res.json({ valid: true, user });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
});

router.get('/users', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  const users = db.prepare('SELECT id, username, name, role, is_active, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

router.post('/users', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { username, password, name, role } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Usuário, senha e nome são obrigatórios' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Usuário já existe' });
  }

  const passwordErrors = validatePasswordStrength(password);
  if (passwordErrors.length > 0) {
    return res.status(400).json({ error: 'Senha fraca', details: passwordErrors });
  }

  try {
    const hashedPassword = hashPassword(password);
    const result = db.prepare(
      'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)'
    ).run(username, hashedPassword, name, role || 'user');
    const user = db.prepare('SELECT id, username, name, role, is_active, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { id } = req.params;
  const { name, role, is_active } = req.body;

  try {
    db.prepare(
      'UPDATE users SET name = COALESCE(?, name), role = COALESCE(?, role), is_active = COALESCE(?, is_active) WHERE id = ?'
    ).run(name, role, is_active, id);
    const user = db.prepare('SELECT id, username, name, role, is_active, created_at FROM users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/password', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;

  if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  if (!newPassword) {
    return res.status(400).json({ error: 'Nova senha é obrigatória' });
  }

  const passwordErrors = validatePasswordStrength(newPassword);
  if (passwordErrors.length > 0) {
    return res.status(400).json({ error: 'Senha fraca', details: passwordErrors });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  if (req.user.role !== 'admin') {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Senha atual é obrigatória' });
    }
    const hashedCurrent = hashPassword(currentPassword);
    if (user.password !== hashedCurrent) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }
  }

  try {
    const hashedNew = hashPassword(newPassword);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedNew, id);
    res.json({ success: true, message: 'Senha atualizada com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { id } = req.params;

  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Não é possível excluir seu próprio usuário' });
  }

  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json({ success: true });
});

module.exports = router;
