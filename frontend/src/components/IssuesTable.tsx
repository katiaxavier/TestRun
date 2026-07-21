import type { ReactNode } from 'react';
import { ArrowSquareOutIcon } from '@phosphor-icons/react';
import type { JiraIssue } from '../api/client';
import { typeColor, priorityLabel, PRIORITY_COLORS } from '../utils/priority';

export function IssueKeyLink({ issue }: { issue: JiraIssue }) {
  return (
    <a
      href={issue.link}
      target="_blank"
      rel="noreferrer"
      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}
    >
      {issue.key} <ArrowSquareOutIcon size={11} />
    </a>
  );
}

export function IssueTypeTag({ issue, label }: { issue: JiraIssue; label?: string }) {
  const c = typeColor(issue.issuetype);
  return (
    <span className="tag" style={c ? { background: c.bg, color: c.color } : undefined}>
      {label ?? issue.issuetype}
    </span>
  );
}

export function IssuePriorityTag({ issue }: { issue: JiraIssue }) {
  if (!issue.priority) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const label = priorityLabel(issue.priority);
  return (
    <span className="tag" style={{ background: `${PRIORITY_COLORS[label]}20`, color: PRIORITY_COLORS[label] }}>
      {label}
    </span>
  );
}

export interface IssuesTableColumn {
  header: string;
  width?: number;
  nowrap?: boolean;
  render: (issue: JiraIssue) => ReactNode;
}

interface IssuesTableProps {
  issues: JiraIssue[];
  columns: IssuesTableColumn[];
  /** Ativa scroll vertical com cabeçalho fixo (sticky), limitado a essa altura em px. */
  maxHeight?: number;
  /** Mensagem exibida em uma linha única (colSpan) quando `issues` está vazio. */
  emptyMessage?: ReactNode;
}

export function IssuesTable({ issues, columns, maxHeight, emptyMessage }: IssuesTableProps) {
  return (
    <div className="table-wrapper" style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
      <table>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.header} style={{ width: col.width, whiteSpace: col.nowrap ? 'nowrap' : undefined }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {issues.length === 0 && emptyMessage ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            issues.map(issue => (
              <tr key={issue.key}>
                {columns.map(col => <td key={col.header}>{col.render(issue)}</td>)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
