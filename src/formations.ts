// 4-3-3 formation slots with pitch coordinates (% based)
// Each slot maps to a position category from the scraped data
export interface FormationSlot {
  label: string;       // display label like 'GK', 'RB', 'CB', etc.
  x: number;           // % from left
  y: number;           // % from top
  category: 'GK' | 'DEF' | 'MID' | 'FWD';
}

export const FORMATION_433: FormationSlot[] = [
  { label: 'GK',  x: 50, y: 92, category: 'GK' },
  { label: 'RB',  x: 15, y: 74, category: 'DEF' },
  { label: 'CB',  x: 38, y: 76, category: 'DEF' },
  { label: 'CB',  x: 62, y: 76, category: 'DEF' },
  { label: 'LB',  x: 85, y: 74, category: 'DEF' },
  { label: 'CM',  x: 25, y: 52, category: 'MID' },
  { label: 'CDM', x: 50, y: 56, category: 'MID' },
  { label: 'CM',  x: 75, y: 52, category: 'MID' },
  { label: 'LW',  x: 20, y: 28, category: 'FWD' },
  { label: 'ST',  x: 50, y: 22, category: 'FWD' },
  { label: 'RW',  x: 80, y: 28, category: 'FWD' },
];
