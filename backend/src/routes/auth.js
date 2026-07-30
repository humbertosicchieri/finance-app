const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../database');
const authMiddleware = require('../middleware');
const { JWT_SECRET } = require('../config');
const { validatePasswordStrength } = require('../captcha');
const router = express.Router();

const TOKEN_EXPIRY = '24h';
const COOKIE_MAX_AGE = 24 * 60 * 60 * 1000;

function isLoginBlocked(ip) {
  const row = db.prepare('SELECT attempts, window_start FROM login_attempts WHERE ip = ?').get(ip);
  if (!row) return false;
  if (Date.now() - row.window_start > 15 * 60 * 1000) {
    db.prepare('DELETE FROM login_attempts WHERE ip = ?').run(ip);
    return false;
  }
  return row.attempts >= 5;
}

function recordLoginAttempt(ip, success) {
  if (success) {
    db.prepare('DELETE FROM login_attempts WHERE ip = ?').run(ip);
    return;
  }
  const row = db.prepare('SELECT attempts, window_start FROM login_attempts WHERE ip = ?').get(ip);
  if (!row || Date.now() - row.window_start > 15 * 60 * 1000) {
    db.prepare('INSERT OR REPLACE INTO login_attempts (ip, attempts, window_start) VALUES (?, 1, ?)').run(ip, Date.now());
  } else {
    db.prepare('UPDATE login_attempts SET attempts = attempts + 1 WHERE ip = ?').run(ip);
  }
}

function setTokenCookie(req, res, token) {
  const isSecure = req.headers['x-forwarded-proto'] === 'https' || req.secure;
  res.cookie('token', token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

function clearTokenCookie(res) {
  res.clearCookie('token', { path: '/' });
}

function isTokenBlacklisted(jti) {
  return !!db.prepare('SELECT 1 FROM token_blacklist WHERE jti = ?').get(jti);
}

function audit(userId, action, details) {
  try {
    db.prepare('INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)')
      .run(userId, action, JSON.stringify(details || {}));
  } catch (e) { /* silent */ }
}

function generateJti() {
  const crypto = require('crypto');
  return crypto.randomBytes(16).toString('hex');
}

router.post('/login', (req, res) => {
  try {
    const ip = req.ip;

    if (isLoginBlocked(ip)) {
      return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em 15 minutos.' });
    }

    const { username, password } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Usuário é obrigatório' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Senha é obrigatória' });
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

    const twofa = db.prepare('SELECT enabled FROM user_2fa WHERE user_id = ?').get(user.id);

  if (twofa && twofa.enabled) {
    const tempToken = jwt.sign(
      { id: user.id, purpose: '2fa_login' },
      JWT_SECRET,
      { expiresIn: '5m' }
    );
    return res.json({
      requires2fa: true,
      tempToken,
      username: user.username,
    });
  }

  const jti = generateJti();
  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role, jti },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );

  setTokenCookie(req, res, token);

  audit(user.id, 'login', { ip });

  res.json({
    token,
    user: { id: user.id, username: user.username, name: user.name, role: user.role }
  });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
      db.prepare('INSERT OR IGNORE INTO token_blacklist (jti, expires_at) VALUES (?, ?)')
        .run(decoded.jti, new Date(Date.now() + COOKIE_MAX_AGE).toISOString());
      audit(decoded.id, 'logout', { jti: decoded.jti });
    } catch (e) { /* token already invalid, ignore */ }
  }

  clearTokenCookie(res);
  res.json({ success: true });
});

router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (isTokenBlacklisted(decoded.jti)) {
      clearTokenCookie(res);
      return res.status(401).json({ error: 'Token invalidado' });
    }

    const user = db.prepare('SELECT id, username, name, role, is_active FROM users WHERE id = ?').get(decoded.id);
    if (!user || !user.is_active) {
      clearTokenCookie(res);
      return res.status(401).json({ error: 'Usuário não encontrado ou desativado' });
    }
    res.json({ valid: true, user });
  } catch (err) {
    clearTokenCookie(res);
    return res.status(401).json({ error: 'Token inválido ou expirado' });
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
  if (role && !['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Role inválida' });
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
    audit(req.user.id, 'create_user', { target_id: user.id, target_username: user.username });
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
  if (role && !['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Role inválida' });
  }

  try {
    db.prepare(
      'UPDATE users SET name = COALESCE(?, name), role = COALESCE(?, role), is_active = COALESCE(?, is_active) WHERE id = ?'
    ).run(name ? name.trim() : null, role || null, is_active !== undefined ? (is_active ? 1 : 0) : null, id);
    const user = db.prepare('SELECT id, username, name, role, is_active, created_at FROM users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    audit(req.user.id, 'update_user', { target_id: user.id, changes: { name, role, is_active } });
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
    audit(req.user.id, 'change_password', { target_id: id });
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
  audit(req.user.id, 'delete_user', { target_id: id });
  res.json({ success: true });
});

module.exports = router;
module.exports.setTokenCookie = setTokenCookie;
