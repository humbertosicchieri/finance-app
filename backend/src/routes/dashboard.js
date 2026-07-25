const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const now = new Date();
  const month = req.query.month || String(now.getMonth() + 1).padStart(2, '0');
  const year = req.query.year || String(now.getFullYear());

  const monthStart = `${year}-${month.padStart(2, '0')}-01`;
  const monthEnd = `${year}-${month.padStart(2, '0')}-31`;

  const totalIncome = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM incomes
    WHERE date BETWEEN ? AND ?
  `).get(monthStart, monthEnd).total;

  const totalExpenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM expenses
    WHERE date BETWEEN ? AND ?
  `).get(monthStart, monthEnd).total;

  const fixedExpenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM expenses
    WHERE date BETWEEN ? AND ? AND expense_type = 'fixed'
  `).get(monthStart, monthEnd).total;

  const variableExpenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM expenses
    WHERE date BETWEEN ? AND ? AND expense_type = 'variable'
  `).get(monthStart, monthEnd).total;

  const cardDebt = db.prepare(`
    SELECT COALESCE(SUM(used_amount), 0) as total FROM credit_cards WHERE is_active = 1
  `).get().total;

  const cards = db.prepare('SELECT * FROM credit_cards WHERE is_active = 1').all();

  const expensesByCategory = db.prepare(`
    SELECT c.name, c.color, COALESCE(SUM(e.amount), 0) as total, COUNT(e.id) as count
    FROM expenses e
    LEFT JOIN categories c ON e.category_id = c.id
    WHERE e.date BETWEEN ? AND ?
    GROUP BY e.category_id
    ORDER BY total DESC
  `).all(monthStart, monthEnd);

  const dailyExpenses = db.prepare(`
    SELECT date, SUM(amount) as total
    FROM expenses
    WHERE date BETWEEN ? AND ?
    GROUP BY date
    ORDER BY date
  `).all(monthStart, monthEnd);

  const dailyIncome = db.prepare(`
    SELECT date, SUM(amount) as total
    FROM incomes
    WHERE date BETWEEN ? AND ?
    GROUP BY date
    ORDER BY date
  `).all(monthStart, monthEnd);

  const last6Months = db.prepare(`
    SELECT
      strftime('%Y-%m', date) as month,
      SUM(CASE WHEN 1=1 THEN amount ELSE 0 END) as total
    FROM expenses
    WHERE date >= date('now', '-6 months')
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month
  `).all();

  const last6MonthsIncome = db.prepare(`
    SELECT
      strftime('%Y-%m', date) as month,
      SUM(amount) as total
    FROM incomes
    WHERE date >= date('now', '-6 months')
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month
  `).all();

  const recentExpenses = db.prepare(`
    SELECT e.*, c.name as category_name, c.color as category_color
    FROM expenses e
    LEFT JOIN categories c ON e.category_id = c.id
    ORDER BY e.date DESC, e.created_at DESC
    LIMIT 10
  `).all();

  const upcomingCardBills = cards.map(card => {
    const transactions = db.prepare(`
      SELECT SUM(amount) as total, COUNT(*) as count
      FROM card_transactions
      WHERE card_id = ? AND is_paid = 0
    `).get(card.id);

    return {
      ...card,
      pending_amount: transactions.total || 0,
      pending_count: transactions.count || 0,
      available_limit: card.limit_amount - card.used_amount,
      usage_percentage: card.limit_amount > 0 ? Math.round((card.used_amount / card.limit_amount) * 100) : 0
    };
  });

  const pendingExpenses = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
    FROM expenses WHERE is_paid = 0 AND date BETWEEN ? AND ?
  `).get(monthStart, monthEnd);

  const balance = totalIncome - totalExpenses;

  res.json({
    period: { month, year },
    summary: {
      totalIncome,
      totalExpenses,
      fixedExpenses,
      variableExpenses,
      balance,
      cardDebt,
      savingsRate: totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0
    },
    expensesByCategory,
    dailyExpenses,
    dailyIncome,
    last6Months,
    last6MonthsIncome,
    recentExpenses,
    upcomingCardBills,
    pendingExpenses
  });
});

router.get('/monthly-summary', (req, res) => {
  const months = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const y = d.getFullYear();
    const monthStart = `${y}-${m}-01`;
    const monthEnd = `${y}-${m}-31`;

    const income = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM incomes WHERE date BETWEEN ? AND ?').get(monthStart, monthEnd).total;
    const expenses = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date BETWEEN ? AND ?').get(monthStart, monthEnd).total;

    months.push({
      month: `${y}-${m}`,
      label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      income,
      expenses,
      balance: income - expenses
    });
  }

  res.json(months);
});

module.exports = router;
