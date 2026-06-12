
type StatusKey = 'PASSED' | 'FAILED' | 'BLOCKED' | 'IN_PROGRESS' | 'PENDING' | string;

const labels: Record<string, string> = {
  PASSED: 'Passed',
  FAILED: 'Failed',
  BLOCKED: 'Blocked',
  IN_PROGRESS: 'In Progress',
  PENDING: 'Pending',
  IN_PROGRESS_EXEC: 'In Progress',
  COMPLETED: 'Concluído',
};

export function StatusBadge({ status }: { status: StatusKey }) {
  const key = status?.toUpperCase?.() ?? 'PENDING';
  const cssClass = `status-badge status-${key.toLowerCase()}`;
  const label = labels[key] ?? status;
  const dot = <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block', flexShrink: 0 }} />;
  return (
    <span className={cssClass}>
      {dot}
      {label}
    </span>
  );
}
