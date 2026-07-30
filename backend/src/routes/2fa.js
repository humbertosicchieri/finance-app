const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const db = require('../database');
const authMiddleware = require('../middleware');
const { JWT_SECRET } = require('../config');

const router = express.Router();
const APP_NAME = 'FinanceFlow';

router.post('/setup', authMiddleware, async (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM user_2fa WHERE user_id = ?').get(req.user.id);
    if (existing && existing.enabled) {
      return res.status(400).json({ error: '2FA já está ativado' });
    }

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(req.user.username, APP_NAME, secret);

    db.prepare(
      'INSERT OR REPLACE INTO user_2fa (user_id, secret, enabled, updated_at) VALUES (?, ?, 0, datetime(\'now\'))'
    ).run(req.user.id, secret);

    const qrDataUrl = await QRCode.toDataURL(otpauth);

    res.json({
      secret,
      otpauth,
      qrCode: qrDataUrl,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao configurar 2FA' });
  }
});

router.post('/enable', authMiddleware, (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Código é obrigatório' });
  }

  const record = db.prepare('SELECT * FROM user_2fa WHERE user_id = ?').get(req.user.id);
  if (!record) return res.status(400).json({ error: 'Execute /setup primeiro' });
  if (record.enabled) return res.status(400).json({ error: '2FA já ativado' });

  const isValid = authenticator.verify({ token: code.trim(), secret: record.secret });
  if (!isValid) return res.status(401).json({ error: 'Código inválido' });

  db.prepare('UPDATE user_2fa SET enabled = 1, updated_at = datetime(\'now\') WHERE user_id = ?').run(req.user.id);
  res.json({ success: true, message: '2FA ativado com sucesso' });
});

router.post('/disable', authMiddleware, (req, res) => {
  const { code, password } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Código 2FA é obrigatório' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Senha é obrigatória' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Senha incorreta' });
  }

  const record = db.prepare('SELECT * FROM user_2fa WHERE user_id = ?').get(req.user.id);
  if (!record || !record.enabled) return res.status(400).json({ error: '2FA não está ativado' });

  const isValid = authenticator.verify({ token: code.trim(), secret: record.secret });
  if (!isValid) return res.status(401).json({ error: 'Código 2FA inválido' });

  db.prepare('DELETE FROM user_2fa WHERE user_id = ?').run(req.user.id);
  res.json({ success: true, message: '2FA desativado' });
});

router.get('/status', authMiddleware, (req, res) => {
  const record = db.prepare('SELECT enabled FROM user_2fa WHERE user_id = ?').get(req.user.id);
  res.json({ enabled: record ? !!record.enabled : false });
});

const TEMP_TOKEN_EXPIRY = '5m';

router.post('/verify-login', (req, res) => {
  const { tempToken, code } = req.body;
  if (!tempToken || !code) {
    return res.status(400).json({ error: 'Token temporário e código são obrigatórios' });
  }

  try {
    const decoded = jwt.verify(tempToken, JWT_SECRET);
    if (decoded.purpose !== '2fa_login') {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const record = db.prepare('SELECT * FROM user_2fa WHERE user_id = ?').get(decoded.id);
    if (!record || !record.enabled) return res.status(400).json({ error: '2FA não está ativado' });

    const isValid = authenticator.verify({ token: code.trim(), secret: record.secret });
    if (!isValid) return res.status(401).json({ error: 'Código 2FA inválido' });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    if (!user || !user.is_active) return res.status(401).json({ error: 'Usuário não encontrado' });

    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name, role: user.role, jti: require('crypto').randomBytes(16).toString('hex') },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    require('./auth').setTokenCookie(req, res, token);

    res.json({
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role }
    });
  } catch (err) {
    return res.status(401).json({ error: 'Token expirado ou inválido' });
  }
});

module.exports = router;
