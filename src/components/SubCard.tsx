import { PlayerData } from '../types';

interface Props {
  player: PlayerData;
  index: number;
  isDragging: boolean;
  isDropTarget: boolean;
  onMouseDown: (e: React.MouseEvent, index: number, type: 'sub') => void;
  onTouchStart: (e: React.TouchEvent, index: number, type: 'sub') => void;
}

export function SubCard({ player, index, isDragging, isDropTarget, onMouseDown, onTouchStart }: Props) {
  let className = 'sub-card';
  if (isDragging) className += ' dragging';
  if (isDropTarget) className += ' drop-target';

  return (
    <div
      className={className}
      data-idx={index}
      data-type="sub"
      onMouseDown={(e) => onMouseDown(e, index, 'sub')}
      onTouchStart={(e) => onTouchStart(e, index, 'sub')}
    >
      <span className="sub-pos">{player.pos}</span>
      <span className="sub-name">{player.name}</span>
    </div>
  );
}
