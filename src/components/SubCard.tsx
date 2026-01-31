import { useState, useEffect } from 'react';
import { PlayerData } from '../types';

function playerImgUrl(imgId: string) {
  return `https://img.uefa.com/imgml/TP/players/1/2026/cutoff/${imgId}.webp`;
}

interface Props {
  player: PlayerData;
  index: number;
  isDragging: boolean;
  isDropTarget: boolean;
  onMouseDown: (e: React.MouseEvent, index: number, type: 'sub') => void;
  onTouchStart: (e: React.TouchEvent, index: number, type: 'sub') => void;
}

export function SubCard({ player, index, isDragging, isDropTarget, onMouseDown, onTouchStart }: Props) {
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [player.imgId]);

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
      {player.imgId && !imgError ? (
        <img
          className="sub-photo"
          src={playerImgUrl(player.imgId)}
          alt={player.name}
          onError={() => setImgError(true)}
          draggable={false}
        />
      ) : (
        <span className="sub-pos">{player.pos}</span>
      )}
      <span className="sub-name">{player.name}</span>
    </div>
  );
}
