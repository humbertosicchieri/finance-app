import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api';
import { Plus, Trash2, Edit3, Repeat, Filter, X, Check, Clock } from 'lucide-react';

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-dark-700 rounded-xl"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ExpenseForm({ categories, cards, onSubmit, initialData, onClose }) {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category_id: '',
    card_id: '',
    expense_type: 'variable',
    is_recurring: false,
    recurrence_count: '',
    recurrence_interval: 'monthly',
    notes: '',
    is_paid: false,
    ...initialData,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      amount: parseFloat(form.amount),
      category_id: form.category_id || null,
      card_id: form.card_id || null,
      is_recurring: form.is_recurring ? 1 : 0,
      recurrence_count: form.is_recurring ? (form.recurrence_count ? parseInt(form.recurrence_count) : null) : null,
      is_paid: form.is_paid ? 1 : 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Descrição *</label>
        <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Valor (R$) *</label>
          <input className="input" type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
        </div>
        <div>
          <label className="label">Data *</label>
          <input className="input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Tipo</label>
          <select className="select" value={form.expense_type} onChange={e => setForm({ ...form, expense_type: e.target.value })}>
            <option value="variable">Variável</option>
            <option value="fixed">Fixa</option>
          </select>
        </div>
        <div>
          <label className="label">Categoria</label>
          <select className="select" value={form.category_id || ''} onChange={e => setForm({ ...form, category_id: e.target.value })}>
            <option value="">Sem categoria</option>
            {categories.filter(c => c.type === 'expense').map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Cartão de Crédito (opcional)</label>
        <select className="select" value={form.card_id || ''} onChange={e => setForm({ ...form, card_id: e.target.value })}>
          <option value="">Nenhum (débito/dinheiro)</option>
          {cards.map(card => (
            <option key={card.id} value={card.id}>{card.name} **** {card.last_digits}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3 p-3 bg-dark-900/50 rounded-xl border border-dark-700/30">
        <input
          type="checkbox"
          id="recurring"
          checked={form.is_recurring}
          onChange={e => setForm({ ...form, is_recurring: e.target.checked })}
          className="w-4 h-4 rounded border-dark-600 text-primary-600 focus:ring-primary-500 bg-dark-900"
        />
        <label htmlFor="recurring" className="text-sm text-dark-300 flex items-center gap-2">
          <Repeat className="w-4 h-4" /> Despesa recorrente
        </label>
      </div>
      {form.is_recurring && (
        <div className="grid grid-cols-2 gap-4 pl-7">
          <div>
            <label className="label">Repetir</label>
            <select className="select" value={form.recurrence_interval} onChange={e => setForm({ ...form, recurrence_interval: e.target.value })}>
              <option value="monthly">Mensal</option>
              <option value="weekly">Semanal</option>
              <option value="yearly">Anual</option>
            </select>
          </div>
          <div>
            <label className="label">Vezes (vazio = indefinido)</label>
            <input className="input" type="number" min="1" placeholder="Indefinido" value={form.recurrence_count} onChange={e => setForm({ ...form, recurrence_count: e.target.value })} />
          </div>
        </div>
      )}
      <div>
        <label className="label">Notas</label>
        <textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1 justify-center">
          <Check className="w-4 h-4" /> {initialData ? 'Atualizar' : 'Adicionar'}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
      </div>
    </form>
  );
}

export default function Expenses() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: categories, refetch: refetchCats } = useApi(() => api.categories.list(), []);
  const { data: cards, refetch: refetchCards } = useApi(() => api.cards.list(), []);
  const { data: expenses, loading, refetch } = useApi(
    () => api.expenses.list({ month, year, ...(filterType && { type: filterType }) }),
    [month, year, filterType]
  );

  const handleSubmit = async (data) => {
    try {
      if (editItem) {
        await api.expenses.update(editItem.id, data);
      } else {
        await api.expenses.create(data);
      }
      setShowForm(false);
      setEditItem(null);
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    try {
      await api.expenses.delete(id);
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTogglePaid = async (exp) => {
    try {
      await api.expenses.update(exp.id, { is_paid: exp.is_paid ? 0 : 1 });
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleGenerateRecurring = async () => {
    try {
      const result = await api.expenses.generateRecurring();
      alert(result.message);
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };

  const total = expenses ? expenses.reduce((sum, e) => sum + e.amount, 0) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Despesas</h1>
          <p className="text-dark-400 text-sm mt-1">Gerencie suas despesas fixas e variáveis</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleGenerateRecurring} className="btn-secondary text-sm">
            <Repeat className="w-4 h-4" /> Gerar Recorrentes
          </button>
          <button onClick={() => { setEditItem(null); setShowForm(true); }} className="btn-primary">
            <Plus className="w-4 h-4" /> Nova Despesa
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select value={month} onChange={e => setMonth(e.target.value)} className="select w-auto">
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
              {new Date(2024, i).toLocaleDateString('pt-BR', { month: 'long' })}
            </option>
          ))}
        </select>
        <select value={year} onChange={e => setYear(e.target.value)} className="select w-auto">
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={() => setShowFilters(!showFilters)} className={`btn-secondary ${filterType ? 'border-primary-500 text-primary-400' : ''}`}>
          <Filter className="w-4 h-4" /> Filtros
        </button>
        {showFilters && (
          <div className="flex gap-2">
            <button onClick={() => setFilterType('')} className={`px-3 py-1.5 rounded-lg text-sm ${!filterType ? 'bg-primary-600 text-white' : 'bg-dark-700 text-dark-300'}`}>Todos</button>
            <button onClick={() => setFilterType('fixed')} className={`px-3 py-1.5 rounded-lg text-sm ${filterType === 'fixed' ? 'bg-orange-600 text-white' : 'bg-dark-700 text-dark-300'}`}>Fixas</button>
            <button onClick={() => setFilterType('variable')} className={`px-3 py-1.5 rounded-lg text-sm ${filterType === 'variable' ? 'bg-blue-600 text-white' : 'bg-dark-700 text-dark-300'}`}>Variáveis</button>
          </div>
        )}
        <div className="ml-auto text-sm text-dark-400">
          Total: <span className="text-white font-semibold">{formatCurrency(total)}</span>
          <span className="text-dark-500 ml-2">({expenses?.length || 0} itens)</span>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : expenses && expenses.length > 0 ? (
          expenses.map(exp => (
            <div key={exp.id} className={`card-hover flex flex-col sm:flex-row items-start sm:items-center gap-4 ${exp.is_paid ? 'opacity-60' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-white truncate">{exp.description}</h3>
                  {exp.is_recurring === 1 && <Repeat className="w-3.5 h-3.5 text-primary-400" />}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {exp.category_name && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-dark-700/50 text-dark-300">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: exp.category_color }} />
                      {exp.category_name}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-lg text-xs ${exp.expense_type === 'fixed' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                    {exp.expense_type === 'fixed' ? 'Fixa' : 'Variável'}
                  </span>
                  {exp.card_name && (
                    <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 text-xs">{exp.card_name}</span>
                  )}
                  <span className="text-dark-500">{new Date(exp.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  {exp.is_recurring === 1 && exp.recurrence_remaining > 0 && (
                    <span className="text-dark-500 text-xs">({exp.recurrence_remaining}x restantes)</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-red-400">-{formatCurrency(exp.amount)}</span>
                <div className="flex gap-1">
                  <button onClick={() => handleTogglePaid(exp)} className={`p-2 rounded-lg transition-colors ${exp.is_paid ? 'bg-green-500/20 text-green-400' : 'bg-dark-700 text-dark-400 hover:text-green-400'}`} title={exp.is_paid ? 'Pago' : 'Marcar como pago'}>
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setEditItem(exp); setShowForm(true); }} className="p-2 bg-dark-700 text-dark-400 hover:text-primary-400 rounded-lg transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(exp.id)} className="p-2 bg-dark-700 text-dark-400 hover:text-red-400 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <p className="text-dark-500">Nenhuma despesa encontrada para este período</p>
          </div>
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditItem(null); }} title={editItem ? 'Editar Despesa' : 'Nova Despesa'}>
        <ExpenseForm
          categories={categories || []}
          cards={cards || []}
          onSubmit={handleSubmit}
          initialData={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      </Modal>
    </div>
  );
}
