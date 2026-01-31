import { PitchPlayer } from '../types';

const jerseySVG = (color: string) => `
<svg viewBox="0 0 60 58" xmlns="http://www.w3.org/2000/svg">
  <path d="M15 2 L5 14 L12 18 L12 54 L48 54 L48 18 L55 14 L45 2 L38 8 C35 10 25 10 22 8 Z"
    fill="${color}" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
</svg>`;

interface Props {
  player: PitchPlayer;
  index: number;
  isDragging: boolean;
  isDropTarget: boolean;
  onMouseDown: (e: React.MouseEvent, index: number, type: 'player') => void;
  onTouchStart: (e: React.TouchEvent, index: number, type: 'player') => void;
}

export function Player({ player, index, isDragging, isDropTarget, onMouseDown, onTouchStart }: Props) {
  const color = player.pos === 'GK' ? '#f4c542' : '#4fc3f7';

  let className = 'player';
  if (isDragging) className += ' dragging';
  if (isDropTarget) className += ' drop-target';

  return (
    <div
      className={className}
      style={{ left: `${player.x}%`, top: `${player.y}%` }}
      data-idx={index}
      data-type="player"
      onMouseDown={(e) => onMouseDown(e, index, 'player')}
      onTouchStart={(e) => onTouchStart(e, index, 'player')}
    >
      <div className="jersey">
        <div dangerouslySetInnerHTML={{ __html: jerseySVG(color) }} />
        <span className="jersey-number">{player.num}</span>
      </div>
      <span className="player-name">{player.name}</span>
    </div>
  );
}
