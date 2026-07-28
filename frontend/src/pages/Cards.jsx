import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api';
import { Plus, Trash2, CreditCard, X, Check, Calendar, AlertTriangle, Clock, TrendingUp, DollarSign } from 'lucide-react';

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

function CardForm({ onSubmit, initialData, onClose }) {
  const [form, setForm] = useState({
    name: '',
    last_digits: '',
    limit_amount: '',
    due_day: '10',
    closing_day: '3',
    brand: '',
    color: '#6366f1',
    ...initialData,
    limit_amount: initialData?.limit_amount || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      limit_amount: parseFloat(form.limit_amount),
      due_day: parseInt(form.due_day),
      closing_day: parseInt(form.closing_day),
    });
  };

  const brandColors = [
    { name: 'Visa', color: '#1a1f71' },
    { name: 'Mastercard', color: '#eb001b' },
    { name: 'Elo', color: '#00a651' },
    { name: 'Amex', color: '#006fcf' },
    { name: 'Outro', color: '#6366f1' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Nome do Cartão *</label>
        <input className="input" placeholder="Ex: Nubank, Itaú..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Últimos 4 dígitos *</label>
          <input className="input" maxLength={4} placeholder="1234" value={form.last_digits} onChange={e => setForm({ ...form, last_digits: e.target.value })} required />
        </div>
        <div>
          <label className="label">Bandeira</label>
          <select className="select" value={form.brand} onChange={e => {
            const selected = brandColors.find(b => b.name === e.target.value);
            setForm({ ...form, brand: e.target.value, color: selected?.color || form.color });
          }}>
            {brandColors.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Limite (R$) *</label>
        <input className="input" type="number" step="0.01" min="0" value={form.limit_amount} onChange={e => setForm({ ...form, limit_amount: e.target.value })} required />
      </div>
      <div className="p-3 bg-dark-900/50 rounded-xl border border-dark-700/30">
        <p className="text-xs text-dark-400 mb-3 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Ciclo de Faturamento</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Dia Fechamento *</label>
            <input className="input" type="number" min="1" max="31" value={form.closing_day} onChange={e => setForm({ ...form, closing_day: e.target.value })} required />
            <p className="text-xs text-dark-500 mt-1">Após este dia, vira próximo mês</p>
          </div>
          <div>
            <label className="label">Dia Vencimento *</label>
            <input className="input" type="number" min="1" max="31" value={form.due_day} onChange={e => setForm({ ...form, due_day: e.target.value })} required />
          </div>
        </div>
      </div>
      <div>
        <label className="label">Cor</label>
        <div className="flex gap-2 flex-wrap">
          {['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4', '#1a1f71', '#eb001b'].map(c => (
            <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} className={`w-8 h-8 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-800 scale-110' : ''}`} style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1 justify-center"><Check className="w-4 h-4" /> {initialData ? 'Atualizar' : 'Adicionar'}</button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
      </div>
    </form>
  );
}

function TransactionForm({ categories, onSubmit, onClose }) {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    installments: '1',
    category_id: '',
    notes: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      amount: parseFloat(form.amount),
      installments: parseInt(form.installments) || 1,
      category_id: form.category_id || null,
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
          <label className="label">Valor Total (R$) *</label>
          <input className="input" type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
        </div>
        <div>
          <label className="label">Parcelas</label>
          <input className="input" type="number" min="1" max="48" value={form.installments} onChange={e => setForm({ ...form, installments: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Data da Compra *</label>
          <input className="input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
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
        <label className="label">Notas</label>
        <textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
      </div>
      {form.amount && form.installments > 1 && (
        <div className="p-3 bg-dark-900/50 rounded-xl border border-dark-700/30 text-sm text-dark-300">
          {form.installments}x de {formatCurrency(parseFloat(form.amount) / parseInt(form.installments))}
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1 justify-center"><Check className="w-4 h-4" /> Adicionar</button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
      </div>
    </form>
  );
}

export default function Cards() {
  const [showForm, setShowForm] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showTxForm, setShowTxForm] = useState(false);

  const { data: cards, loading, refetch } = useApi(() => api.cards.list(), []);
  const { data: categories } = useApi(() => api.categories.list(), []);
  const { data: transactions, refetch: refetchTxs } = useApi(
    () => selectedCard ? api.cards.transactions(selectedCard.id) : Promise.resolve([]),
    [selectedCard]
  );

  const handleCardSubmit = async (data) => {
    try {
      if (editCard) {
        await api.cards.update(editCard.id, data);
      } else {
        await api.cards.create(data);
      }
      setShowForm(false);
      setEditCard(null);
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteCard = async (id) => {
    if (!confirm('Excluir este cartão? As transações também serão removidas.')) return;
    try {
      await api.cards.delete(id);
      if (selectedCard?.id === id) setSelectedCard(null);
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTxSubmit = async (data) => {
    try {
      await api.cards.createTransaction(selectedCard.id, data);
      setShowTxForm(false);
      refetchTxs();
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTx = async (txId) => {
    if (!confirm('Excluir esta transação?')) return;
    try {
      await api.cards.deleteTransaction(selectedCard.id, txId);
      refetchTxs();
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Cartões de Crédito</h1>
          <p className="text-dark-400 text-sm mt-1">Gerencie seus cartões e transações com controle de fatura por ciclo</p>
        </div>
        <button onClick={() => { setEditCard(null); setShowForm(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Cartão
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="flex items-center justify-center h-40 col-span-full">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : cards && cards.length > 0 ? (
          cards.map(card => {
            const usage = card.usage_percentage || 0;
            const available = card.available_limit || 0;
            const isCloseToLimit = usage >= 80;
            const isOverdue = card.daysUntilDue <= 3 && card.currentCycleAmount > 0;
            return (
              <div
                key={card.id}
                onClick={() => setSelectedCard(selectedCard?.id === card.id ? null : card)}
                className={`cursor-pointer transition-all duration-300 rounded-2xl p-6 border ${
                  selectedCard?.id === card.id
                    ? 'border-primary-500 shadow-lg shadow-primary-500/10'
                    : 'border-dark-700/50 hover:border-dark-600'
                } ${isOverdue ? 'border-l-2 border-l-red-500' : ''}`}
                style={{ background: `linear-gradient(135deg, ${card.color}20, ${card.color}05)` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: card.color }}>
                      {card.brand || 'CC'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{card.name}</h3>
                      <p className="text-xs text-dark-400">**** **** **** {card.last_digits}</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id); }} className="p-2 hover:bg-red-500/20 rounded-lg text-dark-400 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 bg-dark-900/40 rounded-xl mb-4 border border-dark-700/30">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-dark-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Fatura atual
                    </span>
                    <span className="text-white font-medium">{formatCurrency(card.currentCycleAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-dark-500">
                    <span>{card.billingCycle?.label || '---'}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Vence {card.dueDate ? new Date(card.dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}
                      {card.daysUntilDue > 0 && card.currentCycleAmount > 0 && (
                        <span className={`${card.daysUntilDue <= 3 ? 'text-red-400' : 'text-dark-400'}`}>
                          ({card.daysUntilDue}d)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-dark-400">Limite utilizado</span>
                      <span className="text-white font-medium">{formatCurrency(card.used_amount)}</span>
                    </div>
                    <div className="w-full bg-dark-700/50 rounded-full h-2.5">
                      <div className="h-2.5 rounded-full transition-all" style={{
                        width: `${Math.min(usage, 100)}%`,
                        backgroundColor: isCloseToLimit ? '#ef4444' : usage > 60 ? '#f59e0b' : '#22c55e',
                      }} />
                    </div>
                  </div>

                  {isCloseToLimit && (
                    <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-xs text-red-400">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Limite próximo do máximo!</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-dark-900/30 rounded-xl">
                      <p className="text-dark-400 text-xs mb-1">Disponível</p>
                      <p className={`font-semibold ${available > 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(available)}</p>
                    </div>
                    <div className="p-3 bg-dark-900/30 rounded-xl">
                      <p className="text-dark-400 text-xs mb-1">Próximo ciclo</p>
                      <p className="text-white font-semibold">{formatCurrency(card.nextCycleAmount || 0)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-dark-500 pt-1">
                    <span>Fechamento: dia {card.closing_day}</span>
                    <span>Vencimento: dia {card.due_day}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="card text-center py-12 col-span-full">
            <CreditCard className="w-12 h-12 mx-auto mb-3 text-dark-500" />
            <p className="text-dark-500">Nenhum cartão cadastrado</p>
          </div>
        )}
      </div>

      {selectedCard && (
        <div className="card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                Transações - {selectedCard.name}
                <span className="text-sm font-normal text-dark-400">
                  ({selectedCard.billingCycle?.label || '---'})
                </span>
              </h3>
              <div className="flex items-center gap-3 text-sm text-dark-400 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Fechamento: dia {selectedCard.closing_day}
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Vencimento: {selectedCard.dueDate ? new Date(selectedCard.dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}
                </span>
              </div>
            </div>
            <button onClick={() => setShowTxForm(true)} className="btn-primary text-sm">
              <Plus className="w-4 h-4" /> Nova Transação
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Descrição</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Categoria</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-dark-400">Parcela</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-400">Valor</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-400">Data</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-400"></th>
                </tr>
              </thead>
              <tbody>
                {transactions && transactions.length > 0 ? (
                  transactions.map(tx => (
                    <tr key={tx.id} className="border-b border-dark-700/50 hover:bg-dark-800/30">
                      <td className="py-3 px-4 text-white">{tx.description}</td>
                      <td className="py-3 px-4 text-dark-300 text-sm">{tx.category_name || '-'}</td>
                      <td className="py-3 px-4 text-center text-dark-300 text-sm">
                        {tx.installments > 1 ? `${tx.installment_current}/${tx.installments}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-red-400">{formatCurrency(tx.amount)}</td>
                      <td className="py-3 px-4 text-right text-dark-400 text-sm">
                        {new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => handleDeleteTx(tx.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-dark-400 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-dark-500">Nenhuma transação neste ciclo</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-dark-900/40 rounded-xl border border-dark-700/30">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-dark-400 text-xs mb-1">Total desta fatura</p>
                <p className="text-white font-semibold">{formatCurrency(selectedCard.currentCycleAmount || 0)}</p>
              </div>
              <div>
                <p className="text-dark-400 text-xs mb-1">Próximo ciclo</p>
                <p className="text-white font-semibold">{formatCurrency(selectedCard.nextCycleAmount || 0)}</p>
              </div>
              <div>
                <p className="text-dark-400 text-xs mb-1">Limite disponível</p>
                <p className={selectedCard.available_limit > 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>{formatCurrency(selectedCard.available_limit || 0)}</p>
              </div>
              <div>
                <p className="text-dark-400 text-xs mb-1">Dias para vencimento</p>
                <p className={`font-semibold ${selectedCard.daysUntilDue <= 3 ? 'text-red-400' : 'text-dark-200'}`}>{selectedCard.daysUntilDue || 0}d</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditCard(null); }} title={editCard ? 'Editar Cartão' : 'Novo Cartão'}>
        <CardForm onSubmit={handleCardSubmit} initialData={editCard} onClose={() => { setShowForm(false); setEditCard(null); }} />
      </Modal>

      <Modal isOpen={showTxForm} onClose={() => setShowTxForm(false)} title="Nova Transação no Cartão">
        <TransactionForm categories={categories || []} onSubmit={handleTxSubmit} onClose={() => setShowTxForm(false)} />
      </Modal>
    </div>
  );
}
