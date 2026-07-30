import { useState, useEffect } from 'react';
import { Shield, ShieldOff, Smartphone, Copy, Check, KeyRound } from 'lucide-react';
import { api } from '../api';

export default function Settings({ currentUser }) {
  const [twofaEnabled, setTwofaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState(null);
  const [enableCode, setEnableCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.twofa.status().then(d => setTwofaEnabled(d.enabled)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSetup = async () => {
    setError(''); setMessage('');
    try {
      const data = await api.twofa.setup();
      setSetupData(data);
    } catch (err) { setError(err.message); }
  };

  const handleEnable = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      await api.twofa.enable(enableCode);
      setTwofaEnabled(true);
      setSetupData(null);
      setEnableCode('');
      setMessage('2FA ativado com sucesso!');
    } catch (err) { setError(err.message); }
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      await api.twofa.disable(disableCode, password);
      setTwofaEnabled(false);
      setDisableCode('');
      setPassword('');
      setMessage('2FA desativado');
    } catch (err) { setError(err.message); }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(setupData.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="text-dark-400 mt-1">Gerencie suas preferências de segurança</p>
      </div>

      {message && <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm text-center">{message}</div>}
      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">{error}</div>}

      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center">
            {twofaEnabled ? <Shield className="w-6 h-6 text-green-400" /> : <ShieldOff className="w-6 h-6 text-dark-400" />}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Autenticação em Dois Fatores</h2>
            <p className="text-sm text-dark-400">{twofaEnabled ? 'Protegido com 2FA' : 'Adicione uma camada extra de segurança'}</p>
          </div>
          {twofaEnabled ? (
            <span className="ml-auto px-3 py-1 bg-green-500/10 text-green-400 text-xs font-medium rounded-full">Ativo</span>
          ) : (
            <span className="ml-auto px-3 py-1 bg-dark-700 text-dark-400 text-xs font-medium rounded-full">Inativo</span>
          )}
        </div>

        {!twofaEnabled && !setupData && (
          <button onClick={handleSetup} className="btn-primary w-full justify-center">
            <Smartphone className="w-5 h-5" /> Configurar 2FA
          </button>
        )}

        {setupData && (
          <div className="space-y-5">
            <div className="flex justify-center">
              <img src={setupData.qrCode} alt="QR Code 2FA" className="w-48 h-48 rounded-xl bg-white p-2" />
            </div>

            <div>
              <label className="label">Ou digite manualmente a chave secreta</label>
              <div className="flex gap-2">
                <code className="flex-1 bg-dark-900 px-4 py-3 rounded-xl text-sm text-primary-300 font-mono truncate">
                  {setupData.secret}
                </code>
                <button onClick={copySecret} className="p-3 bg-dark-700 hover:bg-dark-600 rounded-xl transition-colors" title="Copiar">
                  {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-dark-400" />}
                </button>
              </div>
            </div>

            <form onSubmit={handleEnable} className="space-y-4">
              <div>
                <label className="label">Digite o código gerado pelo aplicativo</label>
                <input className="input text-center text-2xl tracking-[0.5em] font-mono" type="text" inputMode="numeric" placeholder="000000" maxLength={6} value={enableCode} onChange={e => setEnableCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required />
              </div>
              <button type="submit" disabled={enableCode.length < 6} className="btn-primary w-full justify-center disabled:opacity-50">
                <KeyRound className="w-5 h-5" /> Ativar 2FA
              </button>
            </form>
          </div>
        )}

        {twofaEnabled && (
          <form onSubmit={handleDisable} className="space-y-4 mt-4 border-t border-dark-700/50 pt-4">
            <p className="text-sm text-dark-400">Para desativar o 2FA, confirme sua senha e um código do autenticador:</p>
            <div>
              <label className="label">Senha</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div>
              <label className="label">Código 2FA</label>
              <input className="input text-center text-xl tracking-[0.5em] font-mono" type="text" inputMode="numeric" placeholder="000000" maxLength={6} value={disableCode} onChange={e => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required />
            </div>
            <button type="submit" disabled={password.length < 3 || disableCode.length < 6} className="btn-secondary w-full justify-center text-red-400 border-red-500/20 hover:bg-red-500/10 disabled:opacity-50">
              <ShieldOff className="w-5 h-5" /> Desativar 2FA
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
