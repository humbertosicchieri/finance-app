import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, CreditCard, ArrowDownUp, Settings, Menu, X, TrendingUp } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Cards from './pages/Cards';
import Incomes from './pages/Incomes';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/expenses', icon: Receipt, label: 'Despesas' },
  { to: '/cards', icon: CreditCard, label: 'Cartões' },
  { to: '/incomes', icon: TrendingUp, label: 'Receitas' },
];

function Sidebar({ open, setOpen }) {
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
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="card bg-gradient-to-br from-primary-600/10 to-primary-800/10 border-primary-500/20">
            <p className="text-xs text-dark-400">v1.0.0</p>
            <p className="text-xs text-dark-500 mt-1">Gestão financeira pessoal</p>
          </div>
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Router>
      <div className="min-h-screen bg-dark-950">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
        <div className="lg:ml-64">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main className="p-4 lg:p-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/cards" element={<Cards />} />
              <Route path="/incomes" element={<Incomes />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
