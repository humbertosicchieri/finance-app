const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const { ADMIN_USERNAME, ADMIN_PASSWORD } = require('./config');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'finance.db');

const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6366f1',
    icon TEXT DEFAULT 'tag',
    type TEXT CHECK(type IN ('expense','income')) DEFAULT 'expense',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS credit_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    last_digits TEXT NOT NULL,
    limit_amount REAL NOT NULL DEFAULT 0,
    used_amount REAL NOT NULL DEFAULT 0,
    due_day INTEGER NOT NULL CHECK(due_day BETWEEN 1 AND 31),
    closing_day INTEGER NOT NULL CHECK(closing_day BETWEEN 1 AND 31),
    brand TEXT DEFAULT '',
    color TEXT DEFAULT '#6366f1',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    date TEXT NOT NULL,
    category_id INTEGER,
    card_id INTEGER,
    expense_type TEXT CHECK(expense_type IN ('fixed','variable')) NOT NULL DEFAULT 'variable',
    is_recurring INTEGER DEFAULT 0,
    recurrence_count INTEGER,
    recurrence_remaining INTEGER,
    recurrence_interval TEXT CHECK(recurrence_interval IN ('monthly','weekly','yearly')) DEFAULT 'monthly',
    is_paid INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (card_id) REFERENCES credit_cards(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS incomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    date TEXT NOT NULL,
    source TEXT DEFAULT '',
    is_recurring INTEGER DEFAULT 0,
    recurrence_interval TEXT CHECK(recurrence_interval IN ('monthly','weekly','yearly')) DEFAULT 'monthly',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS card_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    date TEXT NOT NULL,
    installments INTEGER DEFAULT 1,
    installment_current INTEGER DEFAULT 1,
    category_id INTEGER,
    is_paid INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (card_id) REFERENCES credit_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin','user')) DEFAULT 'user',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

const defaultCategories = [
  { name: 'Alimentação', color: '#ef4444', icon: 'utensils', type: 'expense' },
  { name: 'Transporte', color: '#f59e0b', icon: 'car', type: 'expense' },
  { name: 'Moradia', color: '#3b82f6', icon: 'home', type: 'expense' },
  { name: 'Saúde', color: '#10b981', icon: 'heart', type: 'expense' },
  { name: 'Educação', color: '#8b5cf6', icon: 'book', type: 'expense' },
  { name: 'Lazer', color: '#ec4899', icon: 'gamepad', type: 'expense' },
  { name: 'Contas Fixas', color: '#f97316', icon: 'repeat', type: 'expense' },
  { name: 'Vestuário', color: '#06b6d4', icon: 'shirt', type: 'expense' },
  { name: 'Assinaturas', color: '#a855f7', icon: 'wifi', type: 'expense' },
  { name: 'Outros', color: '#64748b', icon: 'more-horizontal', type: 'expense' },
  { name: 'Salário', color: '#22c55e', icon: 'dollar-sign', type: 'income' },
  { name: 'Freelance', color: '#3b82f6', icon: 'briefcase', type: 'income' },
  { name: 'Investimentos', color: '#f59e0b', icon: 'trending-up', type: 'income' },
];

const insertCat = db.prepare(
  'INSERT OR IGNORE INTO categories (name, color, icon, type) VALUES (?, ?, ?, ?)'
);

const insertCats = db.transaction((cats) => {
  for (const cat of cats) {
    insertCat.run(cat.name, cat.color, cat.icon, cat.type);
  }
});

insertCats(defaultCategories);

const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get(ADMIN_USERNAME);
if (!existingAdmin) {
  const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, 12);
  db.prepare(
    'INSERT OR IGNORE INTO users (username, password, name, role) VALUES (?, ?, ?, ?)'
  ).run(ADMIN_USERNAME, hashedPassword, 'Administrador', 'admin');
  console.log(`Admin user '${ADMIN_USERNAME}' created`);
}

module.exports = db;
