import { useState, useEffect, useRef } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { jiraIssuesApi, type JiraIssue } from '../api/client';
import { typeColor } from '../utils/priority';

export interface JiraItemPickerValue {
  key: string;
  summary: string;
}

interface JiraItemPickerProps {
  projectId: string;
  type: 'Bug' | 'Improvement';
  value: JiraItemPickerValue | null;
  onChange: (issue: JiraIssue | null) => void;
  placeholder?: string;
}

// Combobox de busca/seleção de issue real do Jira — reaproveita o mesmo padrão de
// debounce (400ms) de JiraIssuesPage.tsx. Usado para vincular bug/melhoria a uma issue
// real (ExecutionRunPage.tsx), em vez do antigo input de texto livre.
export function JiraItemPicker({ projectId, type, value, onChange, placeholder }: JiraItemPickerProps) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<JiraIssue[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (search.length < 2 || !projectId) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    jiraIssuesApi
      .searchPicker(projectId, { type, search })
      .then(({ data }) => {
        if (!cancelled) setResults(data.data);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, type, search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (value) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span
          className="tag"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', maxWidth: '100%' }}
        >
          <span style={{ fontFamily: 'monospace' }}>{value.key}</span>
          <span
            style={{
              color: 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {value.summary}
          </span>
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm"
          onClick={() => onChange(null)}
          aria-label="Limpar seleção"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <MagnifyingGlass
          size={14}
          style={{
            position: 'absolute',
            left: '0.65rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}
        />
        <input
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? 'Buscar issue no Jira...'}
          style={{ width: '100%', paddingLeft: '2.1rem' }}
        />
      </div>
      {open && search.length >= 2 && (
        <div
          className="card"
          style={{
            position: 'absolute',
            zIndex: 20,
            top: 'calc(100% + 0.25rem)',
            left: 0,
            right: 0,
            padding: '0.25rem',
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {loading ? (
            <div style={{ padding: '0.6rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Buscando...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '0.6rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Nenhuma issue encontrada.
            </div>
          ) : (
            results.map((issue) => {
              const c = typeColor(issue.issuetype);
              return (
                <button
                  type="button"
                  key={issue.key}
                  onClick={() => {
                    onChange(issue);
                    setOpen(false);
                    setSearchInput('');
                  }}
                  style={{
                    display: 'flex',
                    width: '100%',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                  className="picker-option"
                >
                  <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--accent)' }}>
                    {issue.key}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {issue.summary}
                  </span>
                  {c && (
                    <span className="tag" style={{ background: c.bg, color: c.color, fontSize: '0.7rem' }}>
                      {issue.issuetype}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
