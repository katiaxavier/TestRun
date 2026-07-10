// Mesma janela de "últimas N execuções concluídas" já usada no resto do dashboard
// (frontend/src/pages/HomePage.tsx, COMPLETED_EXECUTIONS_LIMIT) — mantida em sincronia
// manual entre os dois lados, não há uma fonte única compartilhada front/back neste repo.
export const COMPLETED_EXECUTIONS_LIMIT = 10;

// SLA por severidade (aba Eficiência) — esquema padrão de prioridade do Jira
// (Highest/High/Medium/Low/Lowest). Prazos sugeridos, editáveis aqui; bugs cuja
// prioridade real no Jira não bater com nenhuma destas chaves ficam sem SLA definido
// (não quebram o cálculo, só não entram na contagem de "acima do SLA").
export const SLA_DAYS_BY_PRIORITY: Record<string, number> = {
  Highest: 3,
  High: 7,
  Medium: 15,
  Low: 30,
  Lowest: 45,
};
