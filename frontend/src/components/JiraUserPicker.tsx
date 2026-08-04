import { useState, useEffect, useRef } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { jiraUsersApi } from '../api/client';
import type { JiraAssignableUser } from '../api/client';

interface JiraUserPickerProps {
  projectId: string;
  value: string;
  onChange: (value: string) => void;
  // Disparado ao clicar numa sugestão e ao sair do campo (blur) com valor alterado — usado
  // pelos pontos que salvam automaticamente (ex: célula da tabela). Quem só salva no submit
  // do formulário (ex: ExecutionFormModal) pode ignorar esta prop.
  onCommit?: (value: string) => void;
  placeholder?: string;
}

// Combobox de busca de pessoas atribuíveis do projeto Jira, com fallback pra texto livre.
// Ao contrário de JiraItemPicker (valor = issue real, obrigatório existir no Jira), aqui o
// valor É a própria string digitada — a busca só oferece sugestões por cima; se a API do
// Jira falhar (escopo insuficiente, rede, projeto manual sem Jira) o campo continua
// funcionando como um <input> comum, sem nunca bloquear o preenchimento/salvamento.
export function JiraUserPicker({ projectId, value, onChange, onCommit, placeholder }: JiraUserPickerProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<JiraAssignableUser[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(value.trim()), 400);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    if (search.length < 2 || !projectId) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    jiraUsersApi
      .searchPicker(projectId, search)
      .then(({ data }) => { if (!cancelled) setResults(data.data); })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId, search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (open && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const showDropdown = open && search.length >= 2 && (loading || results.length > 0);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <MagnifyingGlass size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onBlur={() => { if (onCommit) onCommit(value); }}
          placeholder={placeholder ?? 'Nome do responsável'}
          style={{ width: '100%', paddingLeft: '2.1rem' }}
        />
      </div>
      {showDropdown && (
        <div className="card" style={{ position: 'absolute', zIndex: 20, top: 'calc(100% + 0.25rem)', left: 0, right: 0, padding: '0.25rem', maxHeight: 240, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '0.6rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Buscando...</div>
          ) : (
            results.map((u) => (
              <button
                type="button"
                key={u.accountId}
                // preventDefault no mousedown evita que o input perca foco (blur) antes do
                // clique ser processado — sem isso, o onBlur dispararia onCommit com o valor
                // antigo antes deste onClick gravar o novo, causando um PATCH duplicado/stale.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(u.displayName); onCommit?.(u.displayName); setOpen(false); }}
                className="picker-option"
                style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', textAlign: 'left', background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                {u.avatarUrl && <img src={u.avatarUrl} alt="" style={{ width: 20, height: 20, borderRadius: '50%' }} />}
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{u.displayName}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
