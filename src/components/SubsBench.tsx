import { PlayerData } from '../types';
import { SubCard } from './SubCard';

interface Props {
  subs: PlayerData[];
  draggingIdx: number | null;
  draggingType: string | null;
  dropTargetIdx: number | null;
  dropTargetType: string | null;
  onMouseDown: (e: React.MouseEvent, index: number, type: 'sub') => void;
  onTouchStart: (e: React.TouchEvent, index: number, type: 'sub') => void;
}

export function SubsBench({ subs, draggingIdx, draggingType, dropTargetIdx, dropTargetType, onMouseDown, onTouchStart }: Props) {
  return (
    <div className="subs-section">
      <div className="subs-title">Substitutes</div>
      <div className="subs-row">
        {subs.map((s, i) => (
          <SubCard
            key={i}
            player={s}
            index={i}
            isDragging={draggingType === 'sub' && draggingIdx === i}
            isDropTarget={dropTargetType === 'sub' && dropTargetIdx === i}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
          />
        ))}
      </div>
    </div>
  );
}
