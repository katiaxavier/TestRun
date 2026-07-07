import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { boardsApi } from '../api/client';
import type { Board } from '../api/client';
import { useProject } from './ProjectContext';

// Pseudo-quadro "Sem quadro" — reúne suítes sem nenhum board real associado.
// Só aparece na lista quando o backend sinaliza que existe pelo menos uma.
export const UNASSIGNED_BOARD: Board = {
  id: 'none',
  jiraBoardId: 'none',
  name: 'Sem quadro',
  type: 'none',
  projectId: '',
};

interface BoardContextValue {
  boards: Board[];
  selectedBoard: Board | null;
  selectBoard: (board: Board) => void;
  loading: boolean;
}

const BoardContext = createContext<BoardContextValue | undefined>(undefined);

export function BoardProvider({ children }: { children: ReactNode }) {
  const { selectedProject } = useProject();
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);

  const selectBoard = useCallback((board: Board) => {
    setSelectedBoard(board);
    if (selectedProject) {
      localStorage.setItem(`selected-board-id:${selectedProject.id}`, board.id);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (!selectedProject) {
      setBoards([]);
      setSelectedBoard(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    boardsApi.list(selectedProject.id)
      .then(({ data }) => {
        const options = data.hasUnassignedSuites ? [...data.boards, UNASSIGNED_BOARD] : data.boards;
        setBoards(options);
        const storedId = localStorage.getItem(`selected-board-id:${selectedProject.id}`);
        const restored = options.find(b => b.id === storedId);
        setSelectedBoard(restored ?? options[0] ?? null);
      })
      .catch(() => {
        setBoards([]);
        setSelectedBoard(null);
      })
      .finally(() => setLoading(false));
  }, [selectedProject]);

  return (
    <BoardContext.Provider value={{ boards, selectedBoard, selectBoard, loading }}>
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error('useBoard deve ser usado dentro de um BoardProvider.');
  return ctx;
}
