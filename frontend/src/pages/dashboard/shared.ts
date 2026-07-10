import type { Execution } from '../../api/client';

// Mesma janela de "últimas N execuções concluídas" usada em todo o dashboard — mantida
// em sincronia manual com backend/src/dashboard/dashboard.constants.ts (não há uma fonte
// única compartilhada front/back neste repo).
export const COMPLETED_EXECUTIONS_LIMIT = 10;

export function progressOf(execution: Execution) {
  const tcs = execution.testCases ?? [];
  const effectiveItems = tcs.flatMap(tc =>
    (tc.scenarios ?? []).length > 0 ? (tc.scenarios ?? []) : [tc]
  );
  const total = effectiveItems.length;
  const passed = effectiveItems.filter(t => t.status === 'PASSED').length;
  const failed = effectiveItems.filter(t => t.status === 'FAILED').length;
  const blocked = effectiveItems.filter(t => t.status === 'BLOCKED').length;
  const executed = passed + failed + blocked;
  return { total, passed, failed, blocked, executed };
}

// Faixas reaproveitando os tokens de status já usados no resto do app — verde/amarelo/vermelho
// carregam o mesmo significado em toda parte, não é uma paleta nova.
export function bandColor(rate: number) {
  if (rate >= 80) return 'var(--status-passed)';
  if (rate >= 50) return 'var(--status-blocked)';
  return 'var(--status-failed)';
}

export function executionTitle(execution: Execution) {
  return execution.suite
    ? `${execution.suite.jiraKey ? `${execution.suite.jiraKey} — ` : ''}${execution.suite.title}`
    : execution.batch?.name
    ? `Lote — ${execution.batch.name}`
    : `Execução ${execution.id.slice(0, 8)}`;
}
