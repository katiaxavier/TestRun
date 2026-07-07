import { useBoard } from '../context/BoardContext';
import { SidebarSelect } from './SidebarSelect';

export function BoardSelector({ collapsed }: { collapsed: boolean }) {
  const { boards, selectedBoard, selectBoard, loading } = useBoard();

  if (collapsed) return null;

  if (loading) {
    return <div className="sidebar-select sidebar-select--loading">Carregando quadros...</div>;
  }

  if (boards.length === 0) {
    return <div className="sidebar-select sidebar-select--empty">Nenhum quadro encontrado</div>;
  }

  return (
    <SidebarSelect
      label="Quadro"
      options={boards.map(b => ({ id: b.id, label: b.name }))}
      selectedId={selectedBoard?.id ?? null}
      onSelect={(id) => {
        const board = boards.find(b => b.id === id);
        if (board) selectBoard(board);
      }}
    />
  );
}
