import { DotsThreeVertical, Flask, Play, Trash } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu } from './DropdownMenu';
import type { Suite } from '../api/client';

function CustomCheckbox({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 18, height: 18, borderRadius: 'var(--radius-sm)',
      border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
      background: checked ? 'var(--accent)' : 'transparent',
      cursor: 'pointer', transition: 'all 0.15s',
    }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ display: 'none' }} />
      {checked && <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--on-accent)' }} />}
    </label>
  );
}

function formatDate(date: string | Date | undefined) {
  if (!date) return '—';
  return new Date(typeof date === 'string' ? date.slice(0, 10) + 'T00:00:00' : date).toLocaleDateString('pt-BR');
}

type CombinedItem = { type: 'suite'; data: Suite } | { type: 'batch'; data: any };

interface SuiteBatchTableProps {
  items: CombinedItem[];
  selectedSuites: string[];
  onSelectSuite: (id: string, checked: boolean) => void;
  onDeleteSuite: (s: Suite) => void;
  onDeleteBatch: (b: any) => void;
}

export function SuiteBatchTable({ items, selectedSuites, onSelectSuite, onDeleteSuite, onDeleteBatch }: SuiteBatchTableProps) {
  const navigate = useNavigate();

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }} />
              <th style={{ width: 90, whiteSpace: 'nowrap' }}>Tipo</th>
              <th style={{ width: 160, whiteSpace: 'nowrap' }}>Chave(s)</th>
              <th>Título / Nome</th>
              <th style={{ width: 90, whiteSpace: 'nowrap' }}>Casos</th>
              <th style={{ width: 110, whiteSpace: 'nowrap' }}>Execuções</th>
              <th style={{ width: 130, whiteSpace: 'nowrap' }}>Criado em</th>
              <th style={{ width: 60 }} />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Nenhum item encontrado.
                </td>
              </tr>
            ) : items.map(item => {
              if (item.type === 'suite') {
                const suite = item.data;
                const key = suite.jiraKey ?? suite.manualKey ?? '—';
                return (
                  <tr
                    key={`suite-${suite.id}`}
                    onClick={() => navigate(`/suite/${suite.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td onClick={e => e.stopPropagation()}>
                      <CustomCheckbox
                        checked={selectedSuites.includes(suite.id)}
                        onChange={checked => onSelectSuite(suite.id, checked)}
                      />
                    </td>
                    <td>
                      <span className="tag" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                        SUITE
                      </span>
                    </td>
                    <td><code>{key}</code></td>
                    <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{suite.title}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                        <Flask size={14} style={{ color: 'var(--accent)' }} /> {suite._count?.testCases ?? 0}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                        <Play size={14} style={{ color: 'var(--status-inprogress)' }} /> {suite._count?.executions ?? 0}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(suite.createdAt)}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <DropdownMenu
                        trigger={<DotsThreeVertical size={18} style={{ color: 'var(--text-secondary)' }} />}
                        items={[{ label: 'Excluir', icon: <Trash size={14} />, danger: true, onClick: () => onDeleteSuite(suite) }]}
                      />
                    </td>
                  </tr>
                );
              }

              const batch = item.data;
              const totalCases = (batch.suites ?? []).reduce(
                (s: number, suite: any) => s + (suite._count?.testCases ?? 0),
                0,
              ) - ((batch.excludedTestCaseIds as string[] | undefined)?.length ?? 0);
              const suiteKeys: string[] = (batch.suites ?? [])
                .map((s: any) => s.jiraKey ?? s.manualKey)
                .filter(Boolean);

              return (
                <tr
                  key={`batch-${batch.id}`}
                  onClick={() => navigate(`/batch/${batch.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td />
                  <td>
                    <span className="tag" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', background: 'var(--warning-bg)', color: 'var(--tertiary)' }}>
                      LOTE
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>
                    <code>{suiteKeys.join(', ') || '—'}</code>
                  </td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {batch.name || 'Batch ' + batch.id.substring(0, 8)}
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                      <Flask size={14} style={{ color: 'var(--accent)' }} /> {totalCases}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                      <Play size={14} style={{ color: 'var(--status-inprogress)' }} /> {batch.executions?.length ?? 0}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {formatDate(batch.createdAt)}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <DropdownMenu
                      trigger={<DotsThreeVertical size={18} style={{ color: 'var(--text-secondary)' }} />}
                      items={[{ label: 'Excluir', icon: <Trash size={14} />, danger: true, onClick: () => onDeleteBatch(batch) }]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
