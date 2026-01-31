import { PitchPlayer } from '../types';
import { Player } from './Player';

interface Props {
  players: PitchPlayer[];
  draggingIdx: number | null;
  draggingType: string | null;
  dropTargetIdx: number | null;
  dropTargetType: string | null;
  onMouseDown: (e: React.MouseEvent, index: number, type: 'player') => void;
  onTouchStart: (e: React.TouchEvent, index: number, type: 'player') => void;
}

export function Pitch({ players, draggingIdx, draggingType, dropTargetIdx, dropTargetType, onMouseDown, onTouchStart }: Props) {
  return (
    <div className="pitch">
      <div className="center-dot" />
      <div className="box-top" />
      <div className="box-bottom" />
      {players.map((p, i) => (
        <Player
          key={i}
          player={p}
          index={i}
          isDragging={draggingType === 'player' && draggingIdx === i}
          isDropTarget={dropTargetType === 'player' && dropTargetIdx === i}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        />
      ))}
    </div>
  );
}
