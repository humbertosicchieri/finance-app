import { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api';
import { DollarSign, TrendingUp, TrendingDown, Wallet, CreditCard, PiggyBank, AlertCircle, Clock } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function StatCard({ icon: Icon, label, value, color, subtext }) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl`} style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <span className="text-sm text-dark-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white mt-3">{value}</p>
      {subtext && <p className="text-xs text-dark-400 mt-1">{subtext}</p>}
    </div>
  );
}

export default function Dashboard() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(now.getFullYear()));

  const { data: dashboard, loading } = useApi(() => api.dashboard.get(month, year), [month, year]);
  const { data: monthlyData } = useApi(() => api.dashboard.monthlySummary(), []);

  if (loading || !dashboard) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const { summary, expensesByCategory, dailyExpenses, dailyIncome, recentExpenses, upcomingCardBills, pendingExpenses } = dashboard;

  const pieData = expensesByCategory.map((cat, i) => ({
    name: cat.name || 'Sem categoria',
    value: cat.total,
    color: cat.color || COLORS[i % COLORS.length],
  }));

  const dailyData = {};
  dailyExpenses.forEach(d => { dailyData[d.date] = { date: d.date, expenses: d.total }; });
  dailyIncome.forEach(d => {
    if (!dailyData[d.date]) dailyData[d.date] = { date: d.date };
    dailyData[d.date].income = d.total;
  });
  const dailyChartData = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
    ...d,
    label: new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    expenses: d.expenses || 0,
    income: d.income || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-dark-400 text-sm mt-1">Visão geral das suas finanças</p>
        </div>
        <div className="flex gap-2">
          <select value={month} onChange={e => setMonth(e.target.value)} className="select w-auto">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                {new Date(2024, i).toLocaleDateString('pt-BR', { month: 'long' })}
              </option>
            ))}
          </select>
          <select value={year} onChange={e => setYear(e.target.value)} className="select w-auto">
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Receitas" value={formatCurrency(summary.totalIncome)} color="#22c55e" />
        <StatCard icon={TrendingDown} label="Despesas" value={formatCurrency(summary.totalExpenses)} color="#ef4444" />
        <StatCard icon={Wallet} label="Saldo" value={formatCurrency(summary.balance)} color={summary.balance >= 0 ? '#3b82f6' : '#ef4444'} />
        <StatCard icon={PiggyBank} label="Taxa de Poupança" value={`${summary.savingsRate}%`} color="#8b5cf6" subtext={`${formatCurrency(summary.totalIncome - summary.totalExpenses)} economizados`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Fixas" value={formatCurrency(summary.fixedExpenses)} color="#f97316" subtext="Despesas recorrentes" />
        <StatCard icon={AlertCircle} label="Variáveis" value={formatCurrency(summary.variableExpenses)} color="#06b6d4" subtext="Gastos variados" />
        <StatCard icon={CreditCard} label="Fatura Cartão" value={formatCurrency(summary.cardDebt)} color="#ec4899" subtext="Total em aberto" />
        <StatCard icon={Clock} label="Pendentes" value={pendingExpenses.count || 0} color="#f59e0b" subtext={formatCurrency(pendingExpenses.total || 0)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-semibold text-white mb-4">Fluxo Diário</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyChartData}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={v => `R$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                formatter={(value) => formatCurrency(value)}
              />
              <Area type="monotone" dataKey="income" name="Receita" stroke="#22c55e" fill="url(#colorIncome)" strokeWidth={2} />
              <Area type="monotone" dataKey="expenses" name="Despesa" stroke="#ef4444" fill="url(#colorExpenses)" strokeWidth={2} />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Por Categoria</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                  formatter={(value) => formatCurrency(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-dark-500">Sem dados</div>
          )}
          <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
            {pieData.map((cat, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-dark-300">{cat.name}</span>
                </div>
                <span className="text-white font-medium">{formatCurrency(cat.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Evolução Mensal</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={v => `R$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                formatter={(value) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="income" name="Receita" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Cartões de Crédito</h3>
          <div className="space-y-4">
            {upcomingCardBills.map(card => (
              <div key={card.id} className="p-4 bg-dark-900/50 rounded-xl border border-dark-700/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: card.color }}>
                      {card.brand || 'CC'}
                    </div>
                    <div>
                      <p className="font-medium text-white">{card.name}</p>
                      <p className="text-xs text-dark-400">**** {card.last_digits}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{formatCurrency(card.used_amount)}</p>
                    <p className="text-xs text-dark-400">de {formatCurrency(card.limit_amount)}</p>
                  </div>
                </div>
                <div className="w-full bg-dark-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(card.usage_percentage, 100)}%`,
                      backgroundColor: card.usage_percentage > 80 ? '#ef4444' : card.usage_percentage > 60 ? '#f59e0b' : '#22c55e',
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-dark-400">
                  <span>{card.usage_percentage}% utilizado</span>
                  <span>Vencimento: dia {card.due_day}</span>
                </div>
              </div>
            ))}
            {upcomingCardBills.length === 0 && (
              <div className="text-center py-8 text-dark-500">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum cartão cadastrado</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Últimas Transações</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Descrição</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Categoria</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Tipo</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-dark-400">Valor</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-dark-400">Data</th>
              </tr>
            </thead>
            <tbody>
              {recentExpenses.map(exp => (
                <tr key={exp.id} className="border-b border-dark-700/50 hover:bg-dark-800/30">
                  <td className="py-3 px-4 text-white">{exp.description}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: exp.category_color }} />
                      {exp.category_name || 'Sem categoria'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-lg ${exp.expense_type === 'fixed' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      {exp.expense_type === 'fixed' ? 'Fixa' : 'Variável'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-red-400">-{formatCurrency(exp.amount)}</td>
                  <td className="py-3 px-4 text-right text-dark-400 text-sm">
                    {new Date(exp.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
              {recentExpenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-dark-500">Nenhuma transação encontrada</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
