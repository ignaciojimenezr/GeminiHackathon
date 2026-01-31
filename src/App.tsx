import { useState, useEffect, useRef, useCallback } from 'react';
import { Pitch } from './components/Pitch';
import { SubsBench } from './components/SubsBench';
import { FORMATION_433 } from './formations';
import type { PlayerData, PitchPlayer, SquadsData } from './types';
import './App.css';

function pickStarting11(squad: PlayerData[]): { starters: PitchPlayer[]; subs: PlayerData[] } {
  const used = new Set<number>();
  const starters: PitchPlayer[] = [];

  for (const slot of FORMATION_433) {
    const player = squad.find((p, i) => p.pos === slot.category && !used.has(i));
    if (player) {
      const idx = squad.indexOf(player);
      used.add(idx);
      starters.push({ ...player, x: slot.x, y: slot.y, slotPos: slot.label });
    } else {
      // fallback: pick any unused player
      const fallback = squad.findIndex((_, i) => !used.has(i));
      if (fallback >= 0) {
        used.add(fallback);
        starters.push({ ...squad[fallback], x: slot.x, y: slot.y, slotPos: slot.label });
      }
    }
  }

  const subs = squad.filter((_, i) => !used.has(i));
  return { starters, subs };
}

export default function App() {
  const [squads, setSquads] = useState<SquadsData>({});
  const [selectedTeam, setSelectedTeam] = useState('');
  const [pitchPlayers, setPitchPlayers] = useState<PitchPlayer[]>([]);
  const [subPlayers, setSubPlayers] = useState<PlayerData[]>([]);

  // Drag state
  const [dragSrcType, setDragSrcType] = useState<string | null>(null);
  const [dragSrcIdx, setDragSrcIdx] = useState<number | null>(null);
  const [dropTargetType, setDropTargetType] = useState<string | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch('/data/squads.json')
      .then(r => r.json())
      .then((data: SquadsData) => {
        setSquads(data);
        const firstTeam = Object.keys(data)[0];
        if (firstTeam) setSelectedTeam(firstTeam);
      });
  }, []);

  useEffect(() => {
    if (!squads[selectedTeam]) return;
    const { starters, subs } = pickStarting11(squads[selectedTeam]);
    setPitchPlayers(starters);
    setSubPlayers(subs);
  }, [selectedTeam, squads]);

  const getClientPos = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      const t = (e as TouchEvent).touches?.[0] || (e as TouchEvent).changedTouches?.[0];
      return { x: t.clientX, y: t.clientY };
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  };

  const createGhost = (player: PlayerData, x: number, y: number) => {
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    const color = player.pos === 'GK' ? '#f4c542' : '#4fc3f7';
    ghost.innerHTML = `<div class="jersey"><svg viewBox="0 0 60 58" xmlns="http://www.w3.org/2000/svg"><path d="M15 2 L5 14 L12 18 L12 54 L48 54 L48 18 L55 14 L45 2 L38 8 C35 10 25 10 22 8 Z" fill="${color}" stroke="rgba(255,255,255,0.3)" stroke-width="1"/></svg><span class="jersey-number">${player.num}</span></div>`;
    ghost.style.left = x + 'px';
    ghost.style.top = y + 'px';
    document.body.appendChild(ghost);
    return ghost;
  };

  const findDropTarget = useCallback((cx: number, cy: number) => {
    const els = document.querySelectorAll<HTMLElement>('[data-type="player"], [data-type="sub"]');
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
        const type = el.dataset.type!;
        const idx = parseInt(el.dataset.idx!);
        if (type === dragSrcType && idx === dragSrcIdx) continue;
        return { type, idx };
      }
    }
    return null;
  }, [dragSrcType, dragSrcIdx]);

  const doSwap = useCallback((srcType: string, srcIdx: number, tgtType: string, tgtIdx: number) => {
    if (srcType === 'player' && tgtType === 'player') {
      setPitchPlayers(prev => {
        const next = [...prev];
        const a = { ...next[srcIdx] };
        const b = { ...next[tgtIdx] };
        // Keep positions, swap player data
        next[srcIdx] = { ...b, x: a.x, y: a.y, slotPos: a.slotPos };
        next[tgtIdx] = { ...a, x: b.x, y: b.y, slotPos: b.slotPos };
        return next;
      });
    } else if (srcType === 'sub' && tgtType === 'sub') {
      setSubPlayers(prev => {
        const next = [...prev];
        [next[srcIdx], next[tgtIdx]] = [next[tgtIdx], next[srcIdx]];
        return next;
      });
    } else {
      const pIdx = srcType === 'player' ? srcIdx : tgtIdx;
      const sIdx = srcType === 'sub' ? srcIdx : tgtIdx;
      setPitchPlayers(prev => {
        const nextPitch = [...prev];
        setSubPlayers(prevSubs => {
          const nextSubs = [...prevSubs];
          const pitchPlayer = nextPitch[pIdx];
          const subPlayer = nextSubs[sIdx];
          nextPitch[pIdx] = { ...subPlayer, x: pitchPlayer.x, y: pitchPlayer.y, slotPos: pitchPlayer.slotPos };
          nextSubs[sIdx] = { name: pitchPlayer.name, num: pitchPlayer.num, pos: pitchPlayer.pos };
          return nextSubs;
        });
        return nextPitch;
      });
    }
  }, []);

  const onDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, idx: number, type: 'player' | 'sub') => {
    e.preventDefault();
    const { x, y } = getClientPos(e);
    const player = type === 'player' ? pitchPlayers[idx] : subPlayers[idx];
    const ghost = createGhost(player, x, y);
    ghostRef.current = ghost;
    setDragSrcType(type);
    setDragSrcIdx(idx);

    const onMove = (ev: MouseEvent | TouchEvent) => {
      ev.preventDefault();
      const pos = getClientPos(ev);
      ghost.style.left = pos.x + 'px';
      ghost.style.top = pos.y + 'px';

      const target = (() => {
        const els = document.querySelectorAll<HTMLElement>('[data-type="player"], [data-type="sub"]');
        for (const el of els) {
          const r = el.getBoundingClientRect();
          if (pos.x >= r.left && pos.x <= r.right && pos.y >= r.top && pos.y <= r.bottom) {
            const t = el.dataset.type!;
            const i = parseInt(el.dataset.idx!);
            if (t === type && i === idx) continue;
            return { type: t, idx: i };
          }
        }
        return null;
      })();

      setDropTargetType(target?.type ?? null);
      setDropTargetIdx(target?.idx ?? null);
    };

    const onEnd = (ev: MouseEvent | TouchEvent) => {
      ghost.remove();
      ghostRef.current = null;

      const pos = getClientPos(ev);
      const target = (() => {
        const els = document.querySelectorAll<HTMLElement>('[data-type="player"], [data-type="sub"]');
        for (const el of els) {
          const r = el.getBoundingClientRect();
          if (pos.x >= r.left && pos.x <= r.right && pos.y >= r.top && pos.y <= r.bottom) {
            const t = el.dataset.type!;
            const i = parseInt(el.dataset.idx!);
            if (t === type && i === idx) continue;
            return { type: t, idx: i };
          }
        }
        return null;
      })();

      if (target) {
        doSwap(type, idx, target.type, target.idx);
      }

      setDragSrcType(null);
      setDragSrcIdx(null);
      setDropTargetType(null);
      setDropTargetIdx(null);

      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  }, [pitchPlayers, subPlayers, doSwap]);

  const teamNames = Object.keys(squads);

  return (
    <div className="app">
      <div className="header">
        <h1>Squad Management</h1>
        <select
          className="team-select"
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
        >
          {teamNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <div className="formation-label">4 — 3 — 3</div>
      </div>

      <Pitch
        players={pitchPlayers}
        draggingIdx={dragSrcIdx}
        draggingType={dragSrcType}
        dropTargetIdx={dropTargetIdx}
        dropTargetType={dropTargetType}
        onMouseDown={onDragStart as any}
        onTouchStart={onDragStart as any}
      />

      <SubsBench
        subs={subPlayers}
        draggingIdx={dragSrcIdx}
        draggingType={dragSrcType}
        dropTargetIdx={dropTargetIdx}
        dropTargetType={dropTargetType}
        onMouseDown={onDragStart as any}
        onTouchStart={onDragStart as any}
      />
    </div>
  );
}
