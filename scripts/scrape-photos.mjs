import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const BU = 'uvx "browser-use[cli]"';
const env = { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` };

function bu(cmd) {
  return execSync(`${BU} ${cmd}`, { env, encoding: 'utf-8', timeout: 60000 }).trim();
}

const teams = {
  'Arsenal': '52280--arsenal',
  'Barcelona': '50080--barcelona',
  'Bayern München': '50037--bayern-munchen',
  'Chelsea': '52914--chelsea',
  'Liverpool': '7889--liverpool',
  'Man City': '52919--man-city',
  'Sporting CP': '50149--sporting-cp',
  'Tottenham': '1652--tottenham',
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

// Extract player links from squad page: returns [{id, slug}]
function parsePlayerLinks(jsonStr) {
  try {
    const links = JSON.parse(jsonStr.replace(/^result:\s*/, ''));
    // links are like "/uefachampionsleague/clubs/players/250002096--robert-lewandowski/"
    return links.map(href => {
      const match = href.match(/players\/(\d+)--([^/]+)/);
      if (match) return { id: match[1], slug: match[2] };
      return null;
    }).filter(Boolean);
  } catch {
    return [];
  }
}

async function main() {
  // Load existing squads data
  const squadsPath = '/Users/nacho/Documents/GeminiHackathon/public/data/squads.json';
  const squads = JSON.parse(readFileSync(squadsPath, 'utf-8'));

  const teamEntries = Object.entries(teams);
  let cookieAccepted = false;

  for (let t = 0; t < teamEntries.length; t++) {
    const [teamName, slug] = teamEntries[t];
    const url = `https://www.uefa.com/uefachampionsleague/clubs/${slug}/squad/`;
    console.log(`[${t + 1}/${teamEntries.length}] ${teamName}...`);

    try {
      bu(`open "${url}"`);

      if (!cookieAccepted) {
        await new Promise(r => setTimeout(r, 2000));
        try {
          bu(`eval "document.querySelector('.cmpboxbtnyes')?.click(); 'ok'"`);
          await new Promise(r => setTimeout(r, 1500));
          cookieAccepted = true;
        } catch (e) { /* already accepted */ }
      }

      await new Promise(r => setTimeout(r, 2500));

      // Extract all player links from the page
      const raw = bu(`eval "JSON.stringify([...document.querySelectorAll('a[href*=\\\"/players/\\\"]')].map(a => a.getAttribute('href')))"`);
      const playerLinks = parsePlayerLinks(raw);

      // Also get the player names next to those links for matching
      const rawNames = bu(`eval "JSON.stringify([...document.querySelectorAll('a[href*=\\\"/players/\\\"]')].map(a => ({href: a.getAttribute('href'), text: a.textContent.trim()})))"`);
      let nameMap = [];
      try {
        nameMap = JSON.parse(rawNames.replace(/^result:\s*/, ''));
      } catch {}

      // Match player IDs to our squad data by name similarity
      if (squads[teamName]) {
        for (const player of squads[teamName]) {
          // Try to find matching link by name
          const nameLower = player.name.toLowerCase();
          const match = nameMap.find(n => {
            const linkText = n.text.toLowerCase();
            // Check if player name appears in the link text
            return linkText.includes(nameLower) || nameLower.includes(linkText) ||
              // Try last name match
              nameLower.split(' ').pop() === linkText.split(' ').pop();
          });

          if (match) {
            const idMatch = match.href.match(/players\/(\d+)/);
            if (idMatch) {
              player.imgId = idMatch[1];
            }
          }
        }

        // For any unmatched, try matching by slug similarity
        const unmatched = squads[teamName].filter(p => !p.imgId);
        const usedIds = new Set(squads[teamName].filter(p => p.imgId).map(p => p.imgId));
        const unusedLinks = playerLinks.filter(l => !usedIds.has(l.id));

        for (const player of unmatched) {
          const nameParts = player.name.toLowerCase().split(/[\s-]+/);
          const slugMatch = unusedLinks.find(l => {
            const slugParts = l.slug.split('-');
            // Check if any name part matches any slug part
            return nameParts.some(np => slugParts.some(sp => sp === np && np.length > 2));
          });
          if (slugMatch) {
            player.imgId = slugMatch.id;
            usedIds.add(slugMatch.id);
          }
        }

        const matched = squads[teamName].filter(p => p.imgId).length;
        console.log(`  ✓ ${matched}/${squads[teamName].length} players matched`);
      }
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`);
    }
  }

  writeFileSync(squadsPath, JSON.stringify(squads, null, 2));
  console.log(`\nDone! Updated ${squadsPath}`);

  try { bu('close'); } catch (e) {}
}

main();
