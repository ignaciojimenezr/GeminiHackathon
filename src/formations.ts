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

export const FORMATION_442: FormationSlot[] = [
  { label: 'GK',  x: 50, y: 92, category: 'GK' },
  { label: 'RB',  x: 15, y: 74, category: 'DEF' },
  { label: 'CB',  x: 38, y: 76, category: 'DEF' },
  { label: 'CB',  x: 62, y: 76, category: 'DEF' },
  { label: 'LB',  x: 85, y: 74, category: 'DEF' },
  { label: 'RM',  x: 15, y: 50, category: 'MID' },
  { label: 'CM',  x: 38, y: 52, category: 'MID' },
  { label: 'CM',  x: 62, y: 52, category: 'MID' },
  { label: 'LM',  x: 85, y: 50, category: 'MID' },
  { label: 'ST',  x: 38, y: 24, category: 'FWD' },
  { label: 'ST',  x: 62, y: 24, category: 'FWD' },
];

export const FORMATION_352: FormationSlot[] = [
  { label: 'GK',  x: 50, y: 92, category: 'GK' },
  { label: 'CB',  x: 25, y: 76, category: 'DEF' },
  { label: 'CB',  x: 50, y: 78, category: 'DEF' },
  { label: 'CB',  x: 75, y: 76, category: 'DEF' },
  { label: 'RWB', x: 10, y: 55, category: 'MID' },
  { label: 'CM',  x: 35, y: 52, category: 'MID' },
  { label: 'CDM', x: 50, y: 58, category: 'MID' },
  { label: 'CM',  x: 65, y: 52, category: 'MID' },
  { label: 'LWB', x: 90, y: 55, category: 'MID' },
  { label: 'ST',  x: 38, y: 24, category: 'FWD' },
  { label: 'ST',  x: 62, y: 24, category: 'FWD' },
];

export const FORMATION_4231: FormationSlot[] = [
  { label: 'GK',  x: 50, y: 92, category: 'GK' },
  { label: 'RB',  x: 15, y: 74, category: 'DEF' },
  { label: 'CB',  x: 38, y: 76, category: 'DEF' },
  { label: 'CB',  x: 62, y: 76, category: 'DEF' },
  { label: 'LB',  x: 85, y: 74, category: 'DEF' },
  { label: 'CDM', x: 38, y: 56, category: 'MID' },
  { label: 'CDM', x: 62, y: 56, category: 'MID' },
  { label: 'RW',  x: 20, y: 38, category: 'FWD' },
  { label: 'CAM', x: 50, y: 40, category: 'MID' },
  { label: 'LW',  x: 80, y: 38, category: 'FWD' },
  { label: 'ST',  x: 50, y: 20, category: 'FWD' },
];

export const FORMATIONS: Record<string, FormationSlot[]> = {
  '4-3-3': FORMATION_433,
  '4-4-2': FORMATION_442,
  '3-5-2': FORMATION_352,
  '4-2-3-1': FORMATION_4231,
};
