const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('financeflow_token');
}

function setToken(token) {
  localStorage.setItem('financeflow_token', token);
}

function removeToken() {
  localStorage.removeItem('financeflow_token');
}

function getUser() {
  const user = localStorage.getItem('financeflow_user');
  return user ? JSON.parse(user) : null;
}

function setUser(user) {
  localStorage.setItem('financeflow_user', JSON.stringify(user));
}

function removeUser() {
  localStorage.removeItem('financeflow_user');
}

async function request(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });

  if (res.status === 401) {
    removeToken();
    removeUser();
    window.location.reload();
    throw new Error('Sessão expirada');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro na requisição' }));
    throw new Error(err.error || 'Erro na requisição');
  }
  return res.json();
}

export const auth = {
  getCaptcha: async () => {
    const res = await fetch(`${API_BASE}/auth/captcha`);
    if (!res.ok) throw new Error('Erro ao gerar CAPTCHA');
    return res.json();
  },
  login: async (username, password, captchaId, captchaAnswer) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, captchaId, captchaAnswer }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro na requisição' }));
      throw new Error(err.error || 'Erro na requisição');
    }
    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
    return data;
  },
  logout: () => {
    removeToken();
    removeUser();
  },
  verify: async () => {
    const token = getToken();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/verify`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        removeToken();
        removeUser();
        return null;
      }
      const data = await res.json();
      return data.user;
    } catch {
      removeToken();
      removeUser();
      return null;
    }
  },
  isAuthenticated: () => !!getToken(),
  getUser,
};

export const api = {
  dashboard: {
    get: (month, year) => request(`/dashboard?month=${month}&year=${year}`),
    monthlySummary: () => request('/dashboard/monthly-summary'),
  },
  categories: {
    list: () => request('/categories'),
    create: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
  },
  cards: {
    list: () => request('/cards'),
    get: (id) => request(`/cards/${id}`),
    create: (data) => request('/cards', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/cards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/cards/${id}`, { method: 'DELETE' }),
    transactions: (id) => request(`/cards/${id}/transactions`),
    createTransaction: (id, data) => request(`/cards/${id}/transactions`, { method: 'POST', body: JSON.stringify(data) }),
    deleteTransaction: (cardId, txId) => request(`/cards/${cardId}/transactions/${txId}`, { method: 'DELETE' }),
  },
  expenses: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/expenses?${qs}`);
    },
    create: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
    generateRecurring: () => request('/expenses/generate-recurring', { method: 'POST' }),
  },
  incomes: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/incomes?${qs}`);
    },
    create: (data) => request('/incomes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/incomes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/incomes/${id}`, { method: 'DELETE' }),
  },
  users: {
    list: () => request('/auth/users'),
    create: (data) => request('/auth/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/auth/users/${id}`, { method: 'DELETE' }),
    changePassword: (id, data) => request(`/auth/users/${id}/password`, { method: 'PUT', body: JSON.stringify(data) }),
  },
};
