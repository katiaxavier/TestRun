export const PRIORITY_COLORS: Record<string, string> = {
  Gravíssima: '#991B1B',
  Crítica:    '#DC2626',
  Alta:       '#F97316',
  Média:      '#F59E0B',
  Normal:     '#6B7280',
  Trivial:    '#9CA3AF',
};

export const SEVERITY_COLORS: Record<string, { color: string; bg: string }> = {
  Trivial:      { color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
  Normal:       { color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
  Média:        { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  Alta:         { color: '#F97316', bg: 'rgba(249,115,22,0.12)'  },
  Crítica:      { color: '#DC2626', bg: 'rgba(220,38,38,0.12)'   },
  'Gravíssima': { color: '#991B1B', bg: 'rgba(153,27,27,0.12)'   },
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
