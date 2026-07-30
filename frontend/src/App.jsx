import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, CreditCard, TrendingUp, LogOut, Menu, ArrowDownUp, Users as UsersIcon, Shield, Settings as SettingsIcon, ChevronDown } from 'lucide-react';
import { auth } from './api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Cards from './pages/Cards';
import Incomes from './pages/Incomes';
import Users from './pages/Users';
import Settings from './pages/Settings';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/expenses', icon: Receipt, label: 'Despesas' },
  { to: '/cards', icon: CreditCard, label: 'Cartões' },
  { to: '/incomes', icon: TrendingUp, label: 'Receitas' },
];

const adminItems = [
  { to: '/users', icon: UsersIcon, label: 'Usuários', adminOnly: true },
];

function Sidebar({ open, setOpen, user, onLogout }) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <div className={`fixed inset-0 bg-black/50 z-40 lg:hidden ${open ? 'block' : 'hidden'}`} onClick={() => setOpen(false)} />
      <aside className={`fixed top-0 left-0 h-full w-64 bg-dark-900/95 backdrop-blur-xl border-r border-dark-700/50 z-50 transform transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
            <ArrowDownUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">FinanceFlow</h1>
            <p className="text-xs text-dark-400">Gestão Financeira</p>
          </div>
        </div>

        <nav className="px-3 mt-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20'
                    : 'text-dark-400 hover:text-white hover:bg-dark-800'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <>
              <div className="my-3 border-t border-dark-700/50" />
              <p className="px-4 text-xs font-medium text-dark-500 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-3 h-3" /> Administração
              </p>
              {adminItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        : 'text-dark-400 hover:text-white hover:bg-dark-800'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              ))}
            </>
          )}

          <div className="my-3 border-t border-dark-700/50" />

          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-dark-400 hover:text-white hover:bg-dark-800 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <SettingsIcon className="w-5 h-5" />
              <span className="font-medium">Configurações</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
          </button>

          {settingsOpen && (
            <div className="ml-4 space-y-1">
              <NavLink
                to="/settings/2fa"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-600/20 text-primary-400'
                      : 'text-dark-400 hover:text-white hover:bg-dark-800'
                  }`
                }
              >
                <Shield className="w-4 h-4" />
                <span>Autenticação 2FA</span>
              </NavLink>
            </div>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
          <div className="card bg-dark-800/50">
            <p className="text-sm font-medium text-white">{user?.name || user?.username}</p>
            <p className="text-xs text-dark-400">{user?.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function Header({ onMenuClick }) {
  return (
    <header className="sticky top-0 z-30 bg-dark-950/80 backdrop-blur-xl border-b border-dark-700/50">
      <div className="flex items-center justify-between px-4 lg:px-8 py-4">
        <button onClick={onMenuClick} className="lg:hidden p-2 hover:bg-dark-800 rounded-xl">
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden lg:block" />
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-white">{new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
            <p className="text-xs text-dark-400">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white font-bold">
            FF
          </div>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const userData = await auth.verify();
      if (userData) {
        setUser(userData);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    await auth.logout();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-dark-950">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} user={user} onLogout={handleLogout} />
        <div className="lg:ml-64">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main className="p-4 lg:p-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/cards" element={<Cards />} />
              <Route path="/incomes" element={<Incomes />} />
              <Route path="/users" element={<Users currentUser={user} />} />
              <Route path="/settings/2fa" element={<Settings currentUser={user} />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
