import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ListBullets } from '@phosphor-icons/react';
import { executionsApi, suitesApi } from '../api/client';
import type { Suite, Execution, TestCase } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { ExecutionList } from '../components/ExecutionList';
import { TestCaseList } from '../components/TestCaseList';
import { ExecutionFormModal } from '../components/ExecutionFormModal';

function ScenarioPreview({ tc }: { tc: TestCase }) {
  const [expanded, setExpanded] = useState(false);
  const templates = tc.scenarioTemplates ?? [];
  if (templates.length === 0) return null;

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <button
        className="btn btn-ghost btn-sm"
        style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
        onClick={() => setExpanded(e => !e)}
      >
        <ListBullets size={14} />
        {templates.length} cenário{templates.length !== 1 ? 's' : ''}
        <span style={{ fontSize: '0.7rem', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {templates.map(t => (
                <div key={t.id} style={{ padding: '0.3rem 0.5rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BatchExecutionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<any>(null);
  const [suites, setSuites] = useState<Suite[]>([]);
  const [loading, setLoading] = useState(true);
  const [newExecOpen, setNewExecOpen] = useState(false);

  const fetchBatch = useCallback(async () => {
    if (!id) return;
    try {
      const { data: batchData } = await executionsApi.getBatch(id);
      setBatch(batchData);
      const suiteIds: string[] = batchData.suiteIds ?? [];
      if (suiteIds.length > 0) {
        const results = await Promise.all(
          suiteIds.map(sid => suitesApi.get(sid).then(r => r.data).catch(() => null))
        );
        setSuites(results.filter((s): s is Suite => !!s));
      }
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchBatch(); }, [fetchBatch]);

  useEffect(() => {
    const executions: Execution[] = batch?.executions ?? [];
    if (!executions.some(e => e.status === 'IN_PROGRESS')) return;
    const interval = setInterval(fetchBatch, 15_000);
    return () => clearInterval(interval);
  }, [batch?.executions, fetchBatch]);

  if (loading) return <div className="page"><div className="loading-page"><div className="spinner" /> Carregando...</div></div>;
  if (!batch) return null;

  const executions: Execution[] = batch.executions ?? [];
  const excluded: string[] = batch.excludedTestCaseIds ?? [];
  const activeSuites = suites.filter(s => (s.testCases ?? []).some(tc => !excluded.includes(tc.id)));
  const allTestCases = suites.flatMap(s => s.testCases ?? []).filter(tc => !excluded.includes(tc.id));
  const suiteMap = Object.fromEntries(suites.map(s => [s.id, s]));
  const batchTitle = batch.name || `Lote de ${activeSuites.length} ${activeSuites.length === 1 ? 'suite' : 'suites'}`;

  const handleRemoveTestCase = async (tcId: string) => {
    if (!id) return;
    await executionsApi.removeTestCaseFromBatch(id, tcId);
    await fetchBatch();
  };

  return (
    <div className="page">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <PageHeader
          backLabel="Suítes de Teste"
          onBack={() => navigate('/')}
          eyebrow="LOTE"
          title={batchTitle}
        />

        {activeSuites.length > 0 && (
          <div style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5, marginBottom: '0.5rem' }}>Suítes</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {activeSuites.map(s => (
              <span key={s.id} style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {s.jiraKey ?? s.manualKey ?? s.title}
              </span>
            ))}
          </div>
          </div>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Execuções</h2>
            <span className="badge">{executions.length}</span>
            <button
              className="btn btn-primary btn-sm"
              style={{ marginLeft: 'auto' }}
              onClick={() => setNewExecOpen(true)}
              disabled={allTestCases.length === 0}
            >
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
            <span className="badge">{allTestCases.length}</span>
          </div>
          <TestCaseList
            testCases={allTestCases}
            suiteMap={suiteMap}
            onDelete={handleRemoveTestCase}
            renderExtra={tc => <ScenarioPreview tc={tc} />}
          />
        </div>
      </motion.div>

      {id && (
        <ExecutionFormModal
          open={newExecOpen}
          onClose={() => setNewExecOpen(false)}
          onSubmit={async (form) => {
            await executionsApi.createBatchExecution(id, form);
            await fetchBatch();
          }}
        />
      )}
    </div>
  );
}
