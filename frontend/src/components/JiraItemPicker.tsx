import { useState, useEffect, useRef } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { jiraIssuesApi, type JiraIssue } from '../api/client';
import { typeColor } from '../utils/priority';
import { Tooltip } from './Tooltip';

export interface JiraItemPickerValue {
  key: string;
  summary: string;
}

interface JiraItemPickerProps {
  projectId: string;
  // Sem `type`, busca todos os tipos aceitos pelo endpoint de picker (hoje Bug+Melhoria
  // juntos) — usado quando o Tipo ainda não é conhecido (derivado da issue escolhida).
  type?: 'Bug' | 'Improvement';
  value: JiraItemPickerValue | null;
  onChange: (issue: JiraIssue | null) => void;
  placeholder?: string;
}

// Combobox de busca/seleção de issue real do Jira — reaproveita o mesmo padrão de
// debounce (400ms) de JiraIssuesPage.tsx. Usado para vincular bug/melhoria a uma issue
// real (ExecutionRunPage.tsx), em vez do antigo input de texto livre.
//
// Continua sendo um <input> normal mesmo depois de selecionar (não vira uma "tag"/badge
// somente-leitura): ao focar de novo, reabre a busca prontа com a chave atual, deixando
// trocar a seleção sem precisar limpar primeiro — só o campo mostra o ID (o resumo já
// aparece no campo Título, preenchido a partir da mesma seleção).
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

  // Fecha a busca ao clicar fora. Só faz algo se a busca estava de fato aberta (senão
  // qualquer clique na página — inclusive no botão Salvar do formulário — dispararia
  // isso e apagaria uma seleção que a pessoa nunca tocou). Se o campo ficou vazio (a
  // pessoa apagou tudo), entende como "quero desvincular"; caso contrário, só volta a
  // mostrar a seleção existente (não descarta por engano só por ter digitado e clicado
  // fora sem escolher nada novo).
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!open) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (value && searchInput.trim() === '') onChange(null);
        setSearchInput('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, value, searchInput, onChange]);

  const displayValue = open ? searchInput : value ? value.key : searchInput;

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
          value={displayValue}
          onFocus={() => {
            setOpen(true);
            if (value) setSearchInput(value.key);
          }}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setOpen(true);
          }}
          placeholder={placeholder ?? 'Buscar issue no Jira...'}
          style={{ width: '100%', paddingLeft: '2.1rem', paddingRight: value && !open ? '2.1rem' : undefined }}
        />
        {value && !open && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setSearchInput('');
            }}
            style={{
              position: 'absolute',
              right: '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              color: 'var(--text-muted)',
            }}
            aria-label="Limpar seleção"
          >
            <X size={14} />
          </button>
        )}
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Tooltip content={issue.summary} placement="top" display="block">
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.85rem',
                          color: 'var(--text-secondary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {issue.summary}
                      </span>
                    </Tooltip>
                  </div>
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
