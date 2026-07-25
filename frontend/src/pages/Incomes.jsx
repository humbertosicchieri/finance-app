import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api';
import { Plus, Trash2, Edit3, TrendingUp, X, Check, Repeat } from 'lucide-react';

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

function IncomeForm({ onSubmit, initialData, onClose }) {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    source: '',
    is_recurring: false,
    recurrence_interval: 'monthly',
    notes: '',
    ...initialData,
    amount: initialData?.amount || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      amount: parseFloat(form.amount),
      is_recurring: form.is_recurring ? 1 : 0,
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
      <div>
        <label className="label">Fonte</label>
        <input className="input" placeholder="Ex: Empresa, Freelance..." value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} />
      </div>
      <div className="flex items-center gap-3 p-3 bg-dark-900/50 rounded-xl border border-dark-700/30">
        <input type="checkbox" id="recurringIncome" checked={form.is_recurring} onChange={e => setForm({ ...form, is_recurring: e.target.checked })} className="w-4 h-4 rounded border-dark-600 text-primary-600 focus:ring-primary-500 bg-dark-900" />
        <label htmlFor="recurringIncome" className="text-sm text-dark-300 flex items-center gap-2">
          <Repeat className="w-4 h-4" /> Receita recorrente
        </label>
      </div>
      {form.is_recurring && (
        <div className="pl-7">
          <label className="label">Repetir</label>
          <select className="select" value={form.recurrence_interval} onChange={e => setForm({ ...form, recurrence_interval: e.target.value })}>
            <option value="monthly">Mensal</option>
            <option value="weekly">Semanal</option>
            <option value="yearly">Anual</option>
          </select>
        </div>
      )}
      <div>
        <label className="label">Notas</label>
        <textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1 justify-center"><Check className="w-4 h-4" /> {initialData ? 'Atualizar' : 'Adicionar'}</button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
      </div>
    </form>
  );
}

export default function Incomes() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const { data: incomes, loading, refetch } = useApi(
    () => api.incomes.list({ month, year }),
    [month, year]
  );

  const handleSubmit = async (data) => {
    try {
      if (editItem) {
        await api.incomes.update(editItem.id, data);
      } else {
        await api.incomes.create(data);
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
      await api.incomes.delete(id);
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };

  const total = incomes ? incomes.reduce((sum, i) => sum + i.amount, 0) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Receitas</h1>
          <p className="text-dark-400 text-sm mt-1">Controle suas fontes de renda</p>
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Nova Receita
        </button>
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
        <div className="ml-auto text-sm text-dark-400">
          Total: <span className="text-green-400 font-semibold">{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : incomes && incomes.length > 0 ? (
          incomes.map(income => (
            <div key={income.id} className="card-hover flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2.5 rounded-xl bg-green-500/10">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white truncate">{income.description}</h3>
                    {income.is_recurring === 1 && <Repeat className="w-3.5 h-3.5 text-primary-400" />}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-dark-400">
                    {income.source && <span>{income.source}</span>}
                    <span>{new Date(income.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-green-400">+{formatCurrency(income.amount)}</span>
                <div className="flex gap-1">
                  <button onClick={() => { setEditItem(income); setShowForm(true); }} className="p-2 bg-dark-700 text-dark-400 hover:text-primary-400 rounded-lg transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(income.id)} className="p-2 bg-dark-700 text-dark-400 hover:text-red-400 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 text-dark-500" />
            <p className="text-dark-500">Nenhuma receita encontrada para este período</p>
          </div>
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditItem(null); }} title={editItem ? 'Editar Receita' : 'Nova Receita'}>
        <IncomeForm onSubmit={handleSubmit} initialData={editItem} onClose={() => { setShowForm(false); setEditItem(null); }} />
      </Modal>
    </div>
  );
}
