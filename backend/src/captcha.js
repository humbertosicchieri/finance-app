function validatePasswordStrength(password) {
  const errors = [];
  if (password.length < 8) errors.push('Mínimo 8 caracteres');
  if (!/[A-Z]/.test(password)) errors.push('Pelo menos 1 letra maiúscula');
  if (!/[a-z]/.test(password)) errors.push('Pelo menos 1 letra minúscula');
  if (!/[0-9]/.test(password)) errors.push('Pelo menos 1 número');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('Pelo menos 1 caractere especial');
  return errors;
}

module.exports = { validatePasswordStrength };
