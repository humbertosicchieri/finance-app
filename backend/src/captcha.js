const crypto = require('crypto');

const captchas = new Map();

function generateCaptcha() {
  const id = crypto.randomBytes(16).toString('hex');

  const operations = ['+', '-', '×'];
  const op = operations[Math.floor(Math.random() * operations.length)];

  let a, b, answer;
  switch (op) {
    case '+':
      a = Math.floor(Math.random() * 50) + 1;
      b = Math.floor(Math.random() * 50) + 1;
      answer = a + b;
      break;
    case '-':
      a = Math.floor(Math.random() * 50) + 20;
      b = Math.floor(Math.random() * 50) + 1;
      answer = a - b;
      break;
    case '×':
      a = Math.floor(Math.random() * 12) + 1;
      b = Math.floor(Math.random() * 12) + 1;
      answer = a * b;
      break;
  }

  captchas.set(id, {
    answer,
    createdAt: Date.now(),
    used: false,
  });

  const expiresMs = 5 * 60 * 1000;
  setTimeout(() => captchas.delete(id), expiresMs);

  return {
    id,
    question: `Quanto é ${a} ${op} ${b}?`,
    expiresAt: Date.now() + expiresMs,
  };
}

function verifyCaptcha(id, userAnswer) {
  const captcha = captchas.get(id);
  if (!captcha) return { valid: false, error: 'CAPTCHA expirado ou inválido' };
  if (captcha.used) {
    captchas.delete(id);
    return { valid: false, error: 'CAPTCHA já utilizado' };
  }
  if (Date.now() - captcha.createdAt > 5 * 60 * 1000) {
    captchas.delete(id);
    return { valid: false, error: 'CAPTCHA expirado' };
  }

  captcha.used = true;

  if (parseInt(userAnswer) !== captcha.answer) {
    return { valid: false, error: 'Resposta incorreta' };
  }

  return { valid: true };
}

function validatePasswordStrength(password) {
  const errors = [];
  if (password.length < 8) errors.push('Mínimo 8 caracteres');
  if (!/[A-Z]/.test(password)) errors.push('Pelo menos 1 letra maiúscula');
  if (!/[a-z]/.test(password)) errors.push('Pelo menos 1 letra minúscula');
  if (!/[0-9]/.test(password)) errors.push('Pelo menos 1 número');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('Pelo menos 1 caractere especial (!@#$%...)');
  return errors;
}

module.exports = { generateCaptcha, verifyCaptcha, validatePasswordStrength };
