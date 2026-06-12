import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FloppyDisk, Eye, EyeSlash, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { configApi } from '../api/client';
import type { JiraConfig } from '../api/client';

export default function ConfigPage() {
  const [form, setForm] = useState<JiraConfig>({ url: '', email: '', token: '' });
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    configApi.get()
      .then(r => setForm(r.data))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    if (!form.url || !form.email || !form.token) {
      setError('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    try {
      await configApi.save(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Jira Cloud
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  As credenciais são salvas localmente no arquivo <code>config.json</code> da aplicação.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">URL do Jira *</label>
                <input
                  type="url"
                  placeholder="https://sua-empresa.atlassian.net"
                  value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">E-mail da conta *</label>
                <input
                  type="email"
                  placeholder="voce@empresa.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">API Token *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showToken ? 'text' : 'password'}
                    placeholder="Seu token da API do Jira"
                    value={form.token}
                    onChange={e => setForm(f => ({ ...f, token: e.target.value }))}
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

              {saved && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--status-passed)' }}>
                  <CheckCircle size={16} /> Configurações salvas com sucesso!
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Salvando...</> : <><FloppyDisk size={16} /> Salvar configurações</>}
              </button>
            </form>
          </div>

          <div className="card" style={{ marginTop: '1rem' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-secondary)' }}>Como obter o token:</strong><br />
              1. Acesse seu Jira Cloud<br />
              2. Clique no avatar → <strong>Manage account</strong><br />
              3. Vá em <strong>Security → API tokens → Create API token</strong><br />
              4. Copie e cole o token aqui
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
