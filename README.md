# FinanceFlow - Gestão Financeira Pessoal

Aplicação moderna e leve para gestão financeira pessoal com suporte a cartões de crédito, despesas fixas/variáveis e dashboard interativo.

## Funcionalidades

- **Dashboard** com gráficos interativos (fluxo diário, categorias, evolução mensal)
- **Gestão de Despesas** fixas e variáveis com recorrência configurável
- **Cartões de Crédito** com controle de limite, fatura e parcelamento
- **Receitas** com suporte a recorrência
- **Relatórios** por período, categoria e tipo

## Stack

- **Backend:** Node.js + Express + SQLite
- **Frontend:** React + Vite + Tailwind CSS + Recharts
- **Containerização:** Docker + Docker Compose

## Como Executar

### Com Docker (Recomendado)

```bash
docker-compose up -d
```

Acesse: http://localhost:3000

### Desenvolvimento

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Estrutura

```
finance-app/
├── backend/
│   └── src/
│       ├── server.js
│       ├── database.js
│       └── routes/
│           ├── categories.js
│           ├── cards.js
│           ├── expenses.js
│           ├── incomes.js
│           └── dashboard.js
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── pages/
│   │   └── components/
│   └── ...
├── Dockerfile
├── docker-compose.yml
└── README.md
```
