import { useBoard } from '../context/BoardContext';

export function BoardSelector({ collapsed }: { collapsed: boolean }) {
  const { boards, selectedBoard, selectBoard, loading } = useBoard();

  if (collapsed) return null;

  if (loading) {
    return <div className="sidebar-project-selector sidebar-project-selector--loading">Carregando quadros...</div>;
  }

  if (boards.length === 0) {
    return <div className="sidebar-project-selector sidebar-project-selector--empty">Nenhum quadro encontrado</div>;
  }

  return (
    <div className="sidebar-project-selector">
      <select
        value={selectedBoard?.id ?? ''}
        onChange={(e) => {
          const board = boards.find(b => b.id === e.target.value);
          if (board) selectBoard(board);
        }}
      >
        {boards.map(board => (
          <option key={board.id} value={board.id}>
            {board.name}
          </option>
        ))}
      </select>
    </div>
  );
}
