export const PRIORITY_COLORS: Record<string, string> = {
  Gravíssima: 'var(--sev-gravissima)',
  Crítica:    'var(--sev-critica)',
  Alta:       'var(--sev-alta)',
  Média:      'var(--sev-media)',
  Normal:     'var(--sev-normal)',
  Trivial:    'var(--sev-trivial)',
};

export const SEVERITY_COLORS: Record<string, { color: string; bg: string }> = {
  Trivial:      { color: 'var(--sev-trivial)',    bg: 'var(--sev-trivial-bg)'    },
  Normal:       { color: 'var(--sev-normal)',     bg: 'var(--sev-normal-bg)'     },
  Média:        { color: 'var(--sev-media)',      bg: 'var(--sev-media-bg)'      },
  Alta:         { color: 'var(--sev-alta)',       bg: 'var(--sev-alta-bg)'       },
  Crítica:      { color: 'var(--sev-critica)',    bg: 'var(--sev-critica-bg)'    },
  'Gravíssima': { color: 'var(--sev-gravissima)', bg: 'var(--sev-gravissima-bg)' },
};

export function normalize(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function priorityLabel(priority?: string | null): string {
  if (!priority) return '—';
  const n = normalize(priority);
  const map: Record<string, string> = {
    highest: 'Gravíssima', critical: 'Gravíssima', gravissima: 'Gravíssima',
    high: 'Crítica', critica: 'Crítica',
    alta: 'Alta',
    medium: 'Média', media: 'Média',
    low: 'Normal', normal: 'Normal',
    trivial: 'Trivial',
  };
  return map[n] ?? priority;
}

// O Jira pode devolver "issuetype.name" já traduzido pro idioma da conta (ex.: "Melhoria" em
// vez de "Improvement"), então a checagem aceita as duas grafias em vez de comparar só
// com o nome usado no JQL.
export function typeColor(issuetype: string): { color: string; bg: string } | undefined {
  if (issuetype === 'Bug') return { color: 'var(--status-failed)', bg: 'var(--status-failed-bg)' };
  if (issuetype === 'Improvement' || issuetype === 'Melhoria') {
    return { color: 'var(--status-inprogress)', bg: 'var(--status-inprogress-bg)' };
  }
  return undefined;
}
