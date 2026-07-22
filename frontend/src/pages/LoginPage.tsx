import { motion } from 'framer-motion';
import { WarningCircle } from '@phosphor-icons/react';
import { ThemeToggle } from '../components/ThemeToggle';
import { BrandLogo } from '../components/BrandLogo';
import { fadeInUp } from '../utils/motion';

const BACKEND_URL = 'http://localhost:3000';

export default function LoginPage() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');

  const handleLogin = () => {
    window.location.href = `${BACKEND_URL}/auth/login`;
  };

  return (
    <div className="login-page">
      <div className="login-theme-toggle">
        <ThemeToggle />
      </div>
      <motion.div className="login-card" variants={fadeInUp} initial="hidden" animate="visible">
        <BrandLogo style={{ height: 40, margin: '0 auto 1.5rem' }} />
        <h1 className="page-title" style={{ marginBottom: '0.5rem' }}>Bem-vindo ao TestRun</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Entre com sua conta Atlassian para gerenciar suítes e execuções de teste.
        </p>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '1rem', textAlign: 'left', alignItems: 'center' }}>
            <WarningCircle size={16} /> Não foi possível concluir o login. Tente novamente.
          </div>
        )}

        <motion.button
          type="button"
          className="btn btn-primary"
          onClick={handleLogin}
          style={{ width: '100%', justifyContent: 'center' }}
          whileTap={{ scale: 0.97 }}
        >
          Entrar com Atlassian
        </motion.button>
      </motion.div>
    </div>
  );
}
