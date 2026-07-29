import { useState } from 'react';
import { ArrowDownUp, Eye, EyeOff, Lock, User, TrendingUp, Wallet, CreditCard, ShieldCheck } from 'lucide-react';
import { auth } from '../api';

function PasswordStrength({ password }) {
  const getStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
    return score;
  };

  const strength = getStrength();
  const levels = [
    { label: 'Muito fraca', color: '#ef4444', width: '16%' },
    { label: 'Fraca', color: '#f97316', width: '33%' },
    { label: 'Razoável', color: '#f59e0b', width: '50%' },
    { label: 'Boa', color: '#22c55e', width: '66%' },
    { label: 'Forte', color: '#10b981', width: '83%' },
    { label: 'Muito forte', color: '#06b6d4', width: '100%' },
  ];

  if (!password) return null;

  const level = levels[Math.min(strength, levels.length) - 1] || levels[0];

  return (
    <div className="mt-2 space-y-2">
      <div className="w-full bg-dark-700 rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all duration-300" style={{ width: level.width, backgroundColor: level.color }} />
      </div>
      <p className="text-xs" style={{ color: level.color }}>{level.label}</p>
      <div className="grid grid-cols-2 gap-1 text-xs">
        <span className={password.length >= 8 ? 'text-green-400' : 'text-dark-500'}>{password.length >= 8 ? '✓' : '○'} 8+ caracteres</span>
        <span className={/[A-Z]/.test(password) ? 'text-green-400' : 'text-dark-500'}>{/[A-Z]/.test(password) ? '✓' : '○'} Maiúscula</span>
        <span className={/[a-z]/.test(password) ? 'text-green-400' : 'text-dark-500'}>{/[a-z]/.test(password) ? '✓' : '○'} Minúscula</span>
        <span className={/[0-9]/.test(password) ? 'text-green-400' : 'text-dark-500'}>{/[0-9]/.test(password) ? '✓' : '○'} Número</span>
        <span className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'text-green-400 col-span-2' : 'text-dark-500 col-span-2'}>
          {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? '✓' : '○'} Caractere especial (!@#$%...)
        </span>
      </div>
    </div>
  );
}

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await auth.login(username, password);
      onLogin(data.user);
    } catch (err) {
      setError(err.message || 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-900 via-dark-900 to-dark-950">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary-700/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16 py-12">
          <div className="mb-12">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30">
                <ArrowDownUp className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">FinanceFlow</h1>
                <p className="text-primary-300 text-sm">Gestão Financeira Inteligente</p>
              </div>
            </div>
            <p className="text-dark-300 text-lg leading-relaxed max-w-md">
              Controle total das suas finanças. Gerencie despesas, cartões de crédito e receitas em um só lugar.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-dark-800/30 backdrop-blur-sm rounded-2xl border border-dark-700/30">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Dashboard Completo</h3>
                <p className="text-sm text-dark-400">Gráficos e relatórios em tempo real</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-dark-800/30 backdrop-blur-sm rounded-2xl border border-dark-700/30">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Cartões de Crédito</h3>
                <p className="text-sm text-dark-400">Controle de fatura e parcelamento</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-dark-800/30 backdrop-blur-sm rounded-2xl border border-dark-700/30">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Despesas Fixas e Variáveis</h3>
                <p className="text-sm text-dark-400">Recorrência automática configurável</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-dark-800/30 backdrop-blur-sm rounded-2xl border border-dark-700/30">
              <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Segurança Avançada</h3>
                <p className="text-sm text-dark-400">CAPTCHA e senhas fortes</p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex items-center gap-4">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 border-2 border-dark-900 flex items-center justify-center text-white text-sm font-bold">H</div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 border-2 border-dark-900 flex items-center justify-center text-white text-sm font-bold">A</div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 border-2 border-dark-900 flex items-center justify-center text-white text-sm font-bold">M</div>
            </div>
            <p className="text-dark-400 text-sm">Mais de <span className="text-white font-semibold">1000+</span> usuários confiam</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl mb-4 shadow-lg shadow-primary-500/20">
              <ArrowDownUp className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">FinanceFlow</h1>
            <p className="text-dark-400 mt-2">Gestão Financeira</p>
          </div>

          <div className="card">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white">Bem-vindo de volta</h2>
              <p className="text-dark-400 mt-2">Entre com suas credenciais para acessar</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Usuário</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input
                    className="input pl-11"
                    placeholder="Digite seu usuário"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="label">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input
                    className="input pl-11 pr-11"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  'Entrar'
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-dark-500 text-xs mt-6">
            FinanceFlow v1.0.0 - Seus dados estão seguros
          </p>
        </div>
      </div>
    </div>
  );
}
