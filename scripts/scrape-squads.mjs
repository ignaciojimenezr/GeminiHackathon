import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const BU = 'uvx "browser-use[cli]"';
const env = { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` };

function bu(cmd) {
  return execSync(`${BU} ${cmd}`, { env, encoding: 'utf-8', timeout: 60000 }).trim();
}

const teams = {
  // Round of 16
  'Arsenal': '52280--arsenal',
  'Barcelona': '50080--barcelona',
  'Bayern München': '50037--bayern-munchen',
  'Chelsea': '52914--chelsea',
  'Liverpool': '7889--liverpool',
  'Man City': '52919--man-city',
  'Sporting CP': '50149--sporting-cp',
  'Tottenham': '1652--tottenham',
  // KO Playoffs
  'Atalanta': '52816--atalanta',
  'Atlético Madrid': '50124--atleti',
  'Borussia Dortmund': '52758--b-dortmund',
  'Benfica': '50147--benfica',
  'Bodø/Glimt': '59333--bodo-glimt',
  'Club Brugge': '50043--club-brugge',
  'Galatasaray': '50067--galatasaray',
  'Inter': '50138--inter',
  'Juventus': '50139--juventus',
  'Leverkusen': '50109--leverkusen',
  'Monaco': '50023--monaco',
  'Newcastle': '59324--newcastle',
  'Olympiacos': '2610--olympiacos',
  'Paris Saint-Germain': '52747--paris',
  'Qarabağ': '60609--qarabag',
  'Real Madrid': '50051--real-madrid',
};

function parseSquadText(text) {
  const posMap = { 'Goalkeepers': 'GK', 'Defenders': 'DEF', 'Midfielders': 'MID', 'Forwards': 'FWD' };
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const result = [];
  let currentPos = '';
  const seen = new Set();

  for (let i = 0; i < lines.length; i++) {
    if (posMap[lines[i]]) {
      currentPos = posMap[lines[i]];
      continue;
    }
    if (!currentPos) continue;
    if (lines[i] === 'Coach') break;

    // Look for pattern: number on its own line, then player name on next line
    const numMatch = lines[i].match(/^(\d{1,2})$/);
    if (numMatch && i + 1 < lines.length) {
      const rawName = lines[i + 1].trim();
      // Skip List B (youth) players marked with *
      if (rawName.endsWith('*')) continue;
      const name = rawName;
      const num = parseInt(numMatch[1]);
      const key = `${num}-${currentPos}`;

      // Skip non-name lines (nationalities are 2-3 uppercase letters, stats headers, etc.)
      if (name && name.length > 3 && !/^[A-Z]{2,3}$/.test(name) &&
          !name.includes('Nationality') && !name.includes('Matches') &&
          !name.includes('Goals') && !name.includes('Age') && !seen.has(key)) {
        seen.add(key);
        result.push({ name, num, pos: currentPos });
      }
    }
  }
  return result;
}

async function main() {
  const squads = {};
  const teamEntries = Object.entries(teams);
  let cookieAccepted = false;

  for (let t = 0; t < teamEntries.length; t++) {
    const [teamName, slug] = teamEntries[t];
    const url = `https://www.uefa.com/uefachampionsleague/clubs/${slug}/squad/`;
    console.log(`[${t + 1}/${teamEntries.length}] Scraping ${teamName}...`);

    try {
      bu(`open "${url}"`);

      // Accept cookies on first visit
      if (!cookieAccepted) {
        await new Promise(r => setTimeout(r, 2000));
        try {
          bu(`eval "document.querySelector('.cmpboxbtnyes')?.click(); 'ok'"`);
          await new Promise(r => setTimeout(r, 1500));
          cookieAccepted = true;
        } catch (e) { /* already accepted or not present */ }
      }

      await new Promise(r => setTimeout(r, 2000));

      const raw = bu(`eval "document.body.innerText"`);
      // The result line starts with "result: "
      const text = raw.replace(/^result:\s*/, '');
      const players = parseSquadText(text);

      if (players.length > 0) {
        squads[teamName] = players;
        console.log(`  ✓ Found ${players.length} players`);
      } else {
        console.log(`  ⚠ No players found, retrying with scroll...`);
        bu('scroll down');
        await new Promise(r => setTimeout(r, 2000));
        const raw2 = bu(`eval "document.body.innerText"`);
        const text2 = raw2.replace(/^result:\s*/, '');
        const players2 = parseSquadText(text2);
        squads[teamName] = players2;
        console.log(`  ✓ Found ${players2.length} players on retry`);
      }
    } catch (err) {
      console.error(`  ✗ Error scraping ${teamName}: ${err.message}`);
      squads[teamName] = [];
    }
  }

  const outPath = '/Users/nacho/Documents/GeminiHackathon/public/data/squads.json';
  writeFileSync(outPath, JSON.stringify(squads, null, 2));
  console.log(`\nDone! Saved to ${outPath}`);
  console.log(`Teams scraped: ${Object.keys(squads).length}`);

  // Close browser
  try { bu('close'); } catch (e) {}
}

main();
