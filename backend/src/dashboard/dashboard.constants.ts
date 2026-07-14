// Mesma janela de "últimas N execuções concluídas" já usada no resto do dashboard
// (frontend/src/pages/HomePage.tsx, COMPLETED_EXECUTIONS_LIMIT) — mantida em sincronia
// manual entre os dois lados, não há uma fonte única compartilhada front/back neste repo.
export const COMPLETED_EXECUTIONS_LIMIT = 10;

// SLA por severidade (aba Eficiência). Cada usuário conecta o próprio site Jira, então
// o esquema de prioridade varia por projeto — cobre tanto o esquema em português
// (Gravíssima/Crítica/Alta/Média/Normal/Trivial, o mesmo usado em
// frontend/src/utils/priority.ts) quanto o esquema padrão em inglês do Jira
// (Highest/High/Medium/Low/Lowest). Prazos definidos com o usuário; bugs cuja
// prioridade real no Jira não bater com nenhuma destas chaves ficam sem SLA definido
// (não quebram o cálculo, só não entram na contagem de "acima do SLA").
export const SLA_DAYS_BY_PRIORITY: Record<string, number> = {
  // Português
  Gravíssima: 3,
  Crítica: 7,
  Alta: 15,
  Média: 21,
  Normal: 30,
  Trivial: 45,
  // Inglês (esquema padrão do Jira)
  Highest: 3,
  High: 7,
  Medium: 15,
  Low: 30,
  Lowest: 45,
};

// Fração do prazo de SLA a partir da qual um bug em aberto (ainda dentro do prazo) já conta
// como "próximo do SLA" em vez de "dentro do SLA" — ex. 0.8 = últimos 20% do prazo. Editável,
// mesmo padrão de constante ajustável de SLA_DAYS_BY_PRIORITY.
export const SLA_WARNING_THRESHOLD = 0.8;

// Meta de MTTR (aba Eficiência), em dias. Valor placeholder (mesmo exemplo do documento de
// proposta do stakeholder) — AINDA NÃO CONFIRMADO com o usuário/time; ajustar antes de
// considerar essa métrica validada, mesmo risco já assumido para SLA_DAYS_BY_PRIORITY.
export const MTTR_TARGET_DAYS = 20;
