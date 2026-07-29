const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../database');
const authMiddleware = require('../middleware');
const { JWT_SECRET } = require('../config');
const { generateCaptcha, verifyCaptcha, validatePasswordStrength } = require('../captcha');
const router = express.Router();

const TOKEN_EXPIRY = '24h';

const loginAttempts = new Map();

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

const CAPTCHA_RATE = new Map();
function isCaptchaFlooded(ip) {
  const now = Date.now();
  const record = CAPTCHA_RATE.get(ip) || { count: 0, start: now };
  if (now - record.start > 60000) { record.count = 0; record.start = now; }
  record.count++;
  CAPTCHA_RATE.set(ip, record);
  return record.count > 10;
}

router.get('/captcha', (req, res) => {
  if (isCaptchaFlooded(req.ip)) {
    return res.status(429).json({ error: 'Muitas solicitações de CAPTCHA. Aguarde.' });
  }
  const captcha = generateCaptcha();
  res.json(captcha);
});

router.post('/login', (req, res) => {
  const ip = req.ip;

  if (isLoginBlocked(ip)) {
    return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em 15 minutos.' });
  }

  const { username, password, captchaId, captchaAnswer } = req.body;

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Usuário é obrigatório' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Senha é obrigatória' });
  }
  if (!captchaId || captchaAnswer === undefined || captchaAnswer === null) {
    return res.status(400).json({ error: 'CAPTCHA é obrigatório' });
  }

  const captchaResult = verifyCaptcha(captchaId, captchaAnswer);
  if (!captchaResult.valid) {
    recordLoginAttempt(ip, false);
    return res.status(401).json({ error: captchaResult.error });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username.trim());

  if (!user) {
    recordLoginAttempt(ip, false);
    return res.status(401).json({ error: 'Usuário ou senha inválidos' });
  }

  const passwordMatch = bcrypt.compareSync(password, user.password);
  if (!passwordMatch) {
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
    user: { id: user.id, username: user.username, name: user.name, role: user.role }
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
    const user = db.prepare('SELECT id, username, name, role, is_active FROM users WHERE id = ?').get(decoded.id);
    if (!user || !user.is_active) return res.status(401).json({ error: 'Usuário não encontrado ou desativado' });
    res.json({ valid: true, user });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
});

router.get('/users', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

  const users = db.prepare('SELECT id, username, name, role, is_active, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

router.post('/users', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

  const { username, password, name, role } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Usuário, senha e nome são obrigatórios' });
  }
  if (typeof username !== 'string' || username.length < 3 || username.length > 50) {
    return res.status(400).json({ error: 'Usuário deve ter entre 3 e 50 caracteres' });
  }
  if (typeof name !== 'string' || name.length < 2 || name.length > 100) {
    return res.status(400).json({ error: 'Nome deve ter entre 2 e 100 caracteres' });
  }

  const passwordErrors = validatePasswordStrength(password);
  if (passwordErrors.length > 0) {
    return res.status(400).json({ error: 'Senha fraca', details: passwordErrors });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) return res.status(409).json({ error: 'Usuário já existe' });

  try {
    const hashedPassword = bcrypt.hashSync(password, 12);
    const result = db.prepare(
      'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)'
    ).run(username.trim(), hashedPassword, name.trim(), role || 'user');
    const user = db.prepare('SELECT id, username, name, role, is_active, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

router.put('/users/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });

  const { name, role, is_active } = req.body;

  try {
    db.prepare(
      'UPDATE users SET name = COALESCE(?, name), role = COALESCE(?, role), is_active = COALESCE(?, is_active) WHERE id = ?'
    ).run(name ? name.trim() : null, role || null, is_active !== undefined ? (is_active ? 1 : 0) : null, id);
    const user = db.prepare('SELECT id, username, name, role, is_active, created_at FROM users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

router.put('/users/:id/password', authMiddleware, (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });

  const { currentPassword, newPassword } = req.body;

  if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  if (!newPassword || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'Nova senha é obrigatória' });
  }

  const passwordErrors = validatePasswordStrength(newPassword);
  if (passwordErrors.length > 0) {
    return res.status(400).json({ error: 'Senha fraca', details: passwordErrors });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  if (req.user.role !== 'admin') {
    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ error: 'Senha atual é obrigatória' });
    }
    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }
  }

  try {
    const hashedNew = bcrypt.hashSync(newPassword, 12);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedNew, id);
    res.json({ success: true, message: 'Senha atualizada com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

router.delete('/users/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });

  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Não é possível excluir seu próprio usuário' });
  }

  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json({ success: true });
});

module.exports = router;
