import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play } from '@phosphor-icons/react';
import { suitesApi, executionsApi } from '../api/client';
import type { Suite } from '../api/client';
import { ExecutionList } from '../components/ExecutionList';
import { TestCaseList } from '../components/TestCaseList';
import { PageHeader } from '../components/PageHeader';
import { ExecutionFormModal } from '../components/ExecutionFormModal';

export default function SuiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [suite, setSuite] = useState<Suite | null>(null);
  const [loading, setLoading] = useState(true);
  const [newExecOpen, setNewExecOpen] = useState(false);

  const fetchSuite = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await suitesApi.get(id);
      setSuite(data);
    } catch { navigate('/'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchSuite(); }, [fetchSuite]);

  useEffect(() => {
    const executions = suite?.executions ?? [];
    if (!executions.some(e => e.status === 'IN_PROGRESS')) return;
    const interval = setInterval(fetchSuite, 15_000);
    return () => clearInterval(interval);
  }, [suite?.executions, fetchSuite]);

  const handleDeleteTestCase = async (tcId: string) => {
    await suitesApi.deleteTestCase(tcId);
    setSuite(prev => prev ? { ...prev, testCases: prev.testCases!.filter(t => t.id !== tcId) } : prev);
  };

  if (loading) return <div className="page"><div className="loading-page"><div className="spinner" /> Carregando...</div></div>;
  if (!suite) return null;

  const executions = suite.executions ?? [];
  const testCases = suite.testCases ?? [];

  return (
    <div className="page">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <PageHeader
          backLabel="Suites de Teste"
          onBack={() => navigate('/')}
          eyebrow={suite.jiraKey}
          title={suite.title}
        />

        <div style={{ marginTop: '32px', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Execuções</h2>
            <span className="badge">{executions.length}</span>
            <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setNewExecOpen(true)} disabled={testCases.length === 0}>
              <Play size={15} /> Nova Execução
            </button>
          </div>
          <ExecutionList
            executions={executions}
            onExecutionClick={exec => navigate(`/execution/${exec.id}`)}
          />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Casos de Teste</h2>
            <span className="badge">{testCases.length}</span>
          </div>
          <TestCaseList testCases={testCases} onDelete={handleDeleteTestCase} />
        </div>
      </motion.div>

      <ExecutionFormModal
        open={newExecOpen}
        onClose={() => setNewExecOpen(false)}
        onSubmit={async (form) => {
          const { data } = await executionsApi.create({ suiteId: suite.id, ...form });
          navigate(`/execution/${data.id}`);
        }}
      />
    </div>
  );
}
