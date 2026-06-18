import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FloppyDisk, Eye, EyeSlash, CheckCircle, WarningCircle, WifiHigh } from '@phosphor-icons/react';
import { configApi } from '../api/client';
import type { JiraConfig } from '../api/client';

const EMPTY: JiraConfig = { url: '', email: '', token: '' };

function isEqual(a: JiraConfig, b: JiraConfig) {
  return a.url === b.url && a.email === b.email && a.token === b.token;
}

export default function ConfigPage() {
  const [form, setForm] = useState<JiraConfig>(EMPTY);
  const [savedForm, setSavedForm] = useState<JiraConfig | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(true);

  const isConfigured = savedForm !== null && (savedForm.url || savedForm.email || savedForm.token);
  const isDirty = savedForm === null || !isEqual(form, savedForm);

  useEffect(() => {
    configApi.get()
      .then(r => {
        setForm(r.data);
        setSavedForm(r.data);
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.url || !form.email || !form.token) {
      setError('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    try {
      await configApi.save(form);
      setSavedForm({ ...form });
      setSaved(true);
    } catch {
      setError('Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof JiraConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaved(false);
    setForm(f => ({ ...f, [field]: e.target.value }));
  };

  if (fetching) {
    return (
      <div className="page">
        <div className="loading-page"><div className="spinner" /> Carregando...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Configurações</h1>
            <p className="page-subtitle">Credenciais de integração com o Jira</p>
          </div>
        </div>

        <div style={{ maxWidth: 560 }}>
          <div className="card">
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Credenciais
                    </span>
                  </div>
                  {isConfigured && !isDirty && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--status-passed)', fontWeight: 500 }}>
                      <WifiHigh size={14} weight="bold" /> Conectado
                    </div>
                  )}
                  {isDirty && savedForm !== null && isConfigured && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)' }} /> Alterações não salvas
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Conecte sua conta do Jira para importar projetos e suítes de testes.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">URL do Jira *</label>
                <input
                  type="url"
                  placeholder="https://sua-empresa.atlassian.net"
                  value={form.url}
                  onChange={handleChange('url')}
                />
              </div>

              <div className="form-group">
                <label className="form-label">E-mail da conta *</label>
                <input
                  type="email"
                  placeholder="voce@empresa.com"
                  value={form.email}
                  onChange={handleChange('email')}
                />
              </div>

              <div className="form-group">
                <label className="form-label">API Token *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showToken ? 'text' : 'password'}
                    placeholder="Seu token da API do Jira"
                    value={form.token}
                    onChange={handleChange('token')}
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(s => !s)}
                    style={{
                      position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showToken ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Gere em: Jira → Profile → Security → API tokens
                </p>
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--status-failed)' }}>
                  <WarningCircle size={16} /> {error}
                </div>
              )}

              {saved && !isDirty && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--status-passed)' }}>
                  <CheckCircle size={16} /> Configurações salvas com sucesso!
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading || !isDirty} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Salvando...</> : <><FloppyDisk size={16} /> Salvar configurações</>}
              </button>
            </form>
          </div>

          <div className="card" style={{ marginTop: '1rem' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-secondary)' }}>Como obter o token:</strong><br />
              1. Acesse a página de <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Tokens de API da Atlassian</a><br />
              2. Clique em <strong>Criar token de API</strong> (Create API token)<br />
              3. Dê um nome para identificar o token (ex: <em>Exportador de Testes</em>) e clique em <strong>Criar</strong><br />
              4. Copie o código gerado e salve-o em um local seguro — a Atlassian só exibe esse código uma vez!
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
