import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { executionsApi, reportsApi, suitesApi } from '../api/client';
import { ArrowLeft, MicrosoftExcelLogo, FilePdf, Funnel } from '@phosphor-icons/react';
import type { Suite } from '../api/client';

interface BatchReport {
  batch: {
    id: string;
    name?: string;
    sprint: string;
    version: string;
    startDate: string;
    endDate: string;
    testedFeature: string;
    responsible: string;
    status: string;
  };
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    blocked: number;
    inProgress: number;
    pending: number;
  };
  executions: any[];
}

export default function BatchExecutionPage() {
   const { id } = useParams();
   const [batch, setBatch] = useState<any>(null);
   const [report, setReport] = useState<BatchReport | null>(null);
   const [suites, setSuites] = useState<Suite[]>([]);
   const [loading, setLoading] = useState(true);
   const [statusFilter, setStatusFilter] = useState<string>('all');

   useEffect(() => {
     if (!id) return;
     (async () => {
       setLoading(true);
       try {
         const [{ data: batchData }, { data: reportData }] = await Promise.all([
           executionsApi.getBatch(id),
           reportsApi.getBatchReport(id),
         ]);
         setBatch(batchData);
         setReport(reportData);
         const suiteIds: string[] = batchData.suiteIds ?? [];
         if (suiteIds.length > 0) {
           const suitesData = await Promise.all(
             suiteIds.map(async (suiteId) => {
               try {
                 const { data } = await suitesApi.get(suiteId);
                 return data;
               } catch {
                 return null;
               }
             })
           );
           setSuites(suitesData.filter((s): s is Suite => !!s));
         }
       } catch (err) {}
       setLoading(false);
     })();
   }, [id]);

  const handleExportXlsx = async () => {
    if (!id) return;
    const { data } = await reportsApi.downloadBatchXlsx(id);
    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_batch_${id}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    if (!id) return;
    const { data } = await reportsApi.downloadBatchPdf(id);
    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_batch_${id}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) return <div className="page"><div className="loading-page"><div className="spinner" /> Carregando batch...</div></div>;
  if (!batch || !report) return <div className="page">Batch não encontrado.</div>;

  const { summary } = report;
  const filteredExecutions = statusFilter === 'all'
    ? report.executions
    : report.executions.map(ex => ({
        ...ex,
        testCases: ex.testCases.filter((tc: any) => tc.status === statusFilter),
      })).filter((ex: any) => ex.testCases.length > 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span className="tag" style={{ fontFamily: 'var(--font-inter)' }}>LOTE</span>
            {batch.name ? (
              <h1 className="page-title">{batch.name}</h1>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {suites.map((suite) => (
                  <h1 key={suite.id} className="page-title" style={{ margin: 0 }}>{suite.title}</h1>
                ))}
              </div>
            )}
          </div>
          <p className="page-subtitle">{suites.length} {suites.length === 1 ? 'suite' : 'suites'}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Funnel size={15} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ paddingLeft: '2rem', width: 160 }}
            >
              <option value="all">Todos os status</option>
              <option value="PENDING">Pendente</option>
              <option value="IN_PROGRESS">Em Execução</option>
              <option value="PASSED">Passou</option>
              <option value="FAILED">Falhou</option>
              <option value="BLOCKED">Bloqueado</option>
            </select>
          </div>
          <button className="btn btn-outline" onClick={handleExportXlsx}>
            <MicrosoftExcelLogo size={16} /> Exportar XLSX
          </button>
          <button className="btn btn-primary" onClick={handleExportPdf}>
            <FilePdf size={16} /> Exportar PDF
          </button>
          <Link to="/" className="btn btn-outline"><ArrowLeft size={14} /> Voltar</Link>
        </div>
      </div>

      <div style={{ padding: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total de Testes</div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{summary.totalTests}</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Passou</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--status-passed)' }}>{summary.passed}</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Falhou</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--status-failed)' }}>{summary.failed}</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Bloqueado</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--status-blocked)' }}>{summary.blocked}</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pendente</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--status-pending)' }}>{summary.pending}</div>
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <strong>{batch.executions.length}</strong> execuções — <strong>{summary.totalTests}</strong> casos no total
        </div>

        <div style={{ display: 'grid', gap: '0.6rem' }}>
          {filteredExecutions.map((ex: any) => (
            <div key={ex.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {ex.suite ? `${ex.suite.jiraKey} — ${ex.suite.title}` : 'Execução do Lote'}
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{ex.testCases.length} casos</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link to={`/executions/${ex.id}`} className="btn btn-primary">Abrir execução</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
