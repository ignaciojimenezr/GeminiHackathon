import { readFileSync, writeFileSync } from 'fs';
const path = 'public/data/squads.json';
const d = JSON.parse(readFileSync(path, 'utf-8'));
const bad = ['Defenders', 'Midfielders', 'Forwards', 'Goalkeepers', 'Coach'];
let removed = 0;
for (const team of Object.keys(d)) {
  const before = d[team].length;
  d[team] = d[team].filter(p => !bad.includes(p.name));
  removed += before - d[team].length;
}
writeFileSync(path, JSON.stringify(d, null, 2));
console.log(`Removed ${removed} fake entries`);
