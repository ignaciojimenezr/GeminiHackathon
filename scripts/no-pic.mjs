import { readFileSync } from 'fs';
const d = JSON.parse(readFileSync('public/data/squads.json', 'utf-8'));
for (const [team, players] of Object.entries(d)) {
  for (const p of players) {
    if (!p.imgId) console.log(`${team} | ${p.num}. ${p.name}`);
  }
}
