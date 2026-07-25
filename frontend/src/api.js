const API_BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro na requisição' }));
    throw new Error(err.error || 'Erro na requisição');
  }
  return res.json();
}

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
};
