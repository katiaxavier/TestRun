import { WarningCircle } from '@phosphor-icons/react';

const BACKEND_URL = 'http://localhost:3000';

export default function LoginPage() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');

  const handleLogin = () => {
    window.location.href = `${BACKEND_URL}/auth/login`;
  };

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="card" style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <img src="/tr-logo.svg" alt="Testrun" style={{ height: 40, margin: '0 auto 1.5rem' }} />
        <h1 className="page-title" style={{ marginBottom: '0.5rem' }}>Bem-vindo ao TestRun</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Entre com sua conta Atlassian para gerenciar suítes e execuções de teste.
        </p>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--status-failed)', textAlign: 'left' }}>
            <WarningCircle size={16} /> Não foi possível concluir o login. Tente novamente.
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleLogin}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          Entrar com Atlassian
        </button>
      </div>
    </div>
  );
}
