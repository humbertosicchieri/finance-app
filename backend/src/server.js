const express = require('express');
const cors = require('cors');
const path = require('path');
const authMiddleware = require('./middleware');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));

app.use('/api/categories', authMiddleware, require('./routes/categories'));
app.use('/api/cards', authMiddleware, require('./routes/cards'));
app.use('/api/expenses', authMiddleware, require('./routes/expenses'));
app.use('/api/incomes', authMiddleware, require('./routes/incomes'));
app.use('/api/dashboard', authMiddleware, require('./routes/dashboard'));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', '..', 'frontend', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Finance API running on port ${PORT}`);
});
