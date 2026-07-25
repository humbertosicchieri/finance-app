import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api';
import { Plus, Trash2, Edit3, Users as UsersIcon, X, Check, Shield, ShieldOff, Key, UserCheck, UserX } from 'lucide-react';

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

function UserForm({ onSubmit, onClose }) {
  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'user',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Nome Completo *</label>
        <input className="input" placeholder="Ex: João Silva" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div>
        <label className="label">Nome de Usuário *</label>
        <input className="input" placeholder="Ex: joaosilva" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
      </div>
      <div>
        <label className="label">Senha *</label>
        <input className="input" type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
      </div>
      <div>
        <label className="label">Perfil</label>
        <select className="select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
          <option value="user">Usuário</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1 justify-center"><Check className="w-4 h-4" /> Criar Usuário</button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
      </div>
    </form>
  );
}

function PasswordForm({ userId, onSubmit, onClose }) {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    if (form.newPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    onSubmit({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Senha Atual</label>
        <input className="input" type="password" value={form.currentPassword} onChange={e => setForm({ ...form, currentPassword: e.target.value })} />
      </div>
      <div>
        <label className="label">Nova Senha *</label>
        <input className="input" type="password" placeholder="Mínimo 6 caracteres" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} required minLength={6} />
      </div>
      <div>
        <label className="label">Confirmar Nova Senha *</label>
        <input className="input" type="password" placeholder="Repita a nova senha" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required minLength={6} />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1 justify-center"><Key className="w-4 h-4" /> Alterar Senha</button>
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
      </div>
    </form>
  );
}

export default function Users({ currentUser }) {
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(null);
  const { data: users, loading, refetch } = useApi(() => api.users.list(), []);

  const handleCreate = async (data) => {
    try {
      await api.users.create(data);
      setShowForm(false);
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      await api.users.delete(id);
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await api.users.update(user.id, { is_active: user.is_active ? 0 : 1 });
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleChangePassword = async (data) => {
    try {
      await api.users.changePassword(showPassword.id, data);
      setShowPassword(null);
      alert('Senha alterada com sucesso!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleRole = async (user) => {
    try {
      await api.users.update(user.id, { role: user.role === 'admin' ? 'user' : 'admin' });
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };

  const admins = users?.filter(u => u.role === 'admin').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Usuários</h1>
          <p className="text-dark-400 text-sm mt-1">Gerencie os usuários do sistema</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Usuário
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-500/10">
              <UsersIcon className="w-5 h-5 text-primary-400" />
            </div>
            <span className="text-sm text-dark-400">Total</span>
          </div>
          <p className="text-2xl font-bold text-white mt-3">{users?.length || 0}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-yellow-500/10">
              <Shield className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-sm text-dark-400">Administradores</span>
          </div>
          <p className="text-2xl font-bold text-white mt-3">{admins}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500/10">
              <UserCheck className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-sm text-dark-400">Ativos</span>
          </div>
          <p className="text-2xl font-bold text-white mt-3">{users?.filter(u => u.is_active).length || 0}</p>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : users && users.length > 0 ? (
          users.map(user => (
            <div key={user.id} className={`card-hover flex flex-col sm:flex-row items-start sm:items-center gap-4 ${!user.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white ${
                  user.role === 'admin' ? 'bg-gradient-to-br from-yellow-500 to-yellow-700' : 'bg-gradient-to-br from-primary-500 to-primary-700'
                }`}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white truncate">{user.name}</h3>
                    {user.role === 'admin' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-yellow-500/10 text-yellow-400 text-xs">
                        <Shield className="w-3 h-3" /> Admin
                      </span>
                    )}
                    {!user.is_active && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-500/10 text-red-400 text-xs">
                        <UserX className="w-3 h-3" /> Inativo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-dark-400">@{user.username}</p>
                  <p className="text-xs text-dark-500">
                    Criado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    {currentUser?.id === user.id && <span className="ml-2 text-primary-400">(Você)</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setShowPassword(user)} className="p-2 bg-dark-700 text-dark-400 hover:text-primary-400 rounded-lg transition-colors" title="Alterar senha">
                  <Key className="w-4 h-4" />
                </button>
                <button onClick={() => handleToggleRole(user)} className="p-2 bg-dark-700 text-dark-400 hover:text-yellow-400 rounded-lg transition-colors" title={user.role === 'admin' ? 'Remover admin' : 'Tornar admin'}>
                  {user.role === 'admin' ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                </button>
                <button onClick={() => handleToggleActive(user)} className={`p-2 bg-dark-700 rounded-lg transition-colors ${user.is_active ? 'text-dark-400 hover:text-orange-400' : 'text-dark-400 hover:text-green-400'}`} title={user.is_active ? 'Desativar' : 'Ativar'}>
                  {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                </button>
                {currentUser?.id !== user.id && (
                  <button onClick={() => handleDelete(user.id)} className="p-2 bg-dark-700 text-dark-400 hover:text-red-400 rounded-lg transition-colors" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <UsersIcon className="w-12 h-12 mx-auto mb-3 text-dark-500" />
            <p className="text-dark-500">Nenhum usuário encontrado</p>
          </div>
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Novo Usuário">
        <UserForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      </Modal>

      <Modal isOpen={!!showPassword} onClose={() => setShowPassword(null)} title={`Alterar Senha - ${showPassword?.name || ''}`}>
        {showPassword && <PasswordForm userId={showPassword.id} onSubmit={handleChangePassword} onClose={() => setShowPassword(null)} />}
      </Modal>
    </div>
  );
}
