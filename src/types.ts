export interface PlayerData {
  name: string;
  num: number;
  pos: 'GK' | 'DEF' | 'MID' | 'FWD';
}

export interface PitchPlayer extends PlayerData {
  x: number;
  y: number;
  slotPos: string; // formation slot like 'GK', 'CB', 'RB', etc.
}

export type SquadsData = Record<string, PlayerData[]>;
