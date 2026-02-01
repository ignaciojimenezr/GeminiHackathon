import type { App as McpApp } from '@modelcontextprotocol/ext-apps';
import { useApp } from '@modelcontextprotocol/ext-apps/react';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import type { SquadsData } from './types';
import squadsJson from '../public/data/squads.json';

const TEAM_NAMES = Object.keys(squadsJson);
const ALIASES: Record<string, string> = {
  barca: 'Barcelona', psg: 'Paris Saint-Germain', bayern: 'Bayern München',
  atletico: 'Atlético Madrid', dortmund: 'Borussia Dortmund', bodo: 'Bodø/Glimt',
  brugge: 'Club Brugge', sporting: 'Sporting CP', city: 'Man City',
  'man city': 'Man City', spurs: 'Tottenham', juve: 'Juventus',
};

function resolveTeam(input: string): string {
  const q = input.toLowerCase();
  return TEAM_NAMES.find(t => t === input)
    ?? ALIASES[q]
    ?? TEAM_NAMES.find(t => t.toLowerCase() === q)
    ?? TEAM_NAMES.find(t => t.toLowerCase().includes(q) || q.includes(t.toLowerCase()))
    ?? TEAM_NAMES[0];
}

function McpSquadApp() {
  const [squads] = useState<SquadsData>(squadsJson as SquadsData);
  const [team, setTeam] = useState<string>(TEAM_NAMES[0] || '');
  const [toolResult, setToolResult] = useState<CallToolResult | null>(null);

  const { app, error } = useApp({
    appInfo: { name: 'Squad Manager', version: '1.0.0' },
    capabilities: {},
    onAppCreated: (app: McpApp) => {
      app.ontoolinput = async (params) => {
        const args = (params as { arguments?: Record<string, unknown> }).arguments ?? {};
        if (args.team) setTeam(resolveTeam(args.team as string));
      };

      app.ontoolresult = async (result: CallToolResult) => {
        setToolResult(result);
      };

      app.onhostcontextchanged = (ctx) => {
        if (ctx.safeAreaInsets) {
          const { top, right, bottom, left } = ctx.safeAreaInsets;
          document.body.style.padding = `${top}px ${right}px ${bottom}px ${left}px`;
        }
      };

      app.onteardown = async () => ({});
      app.onerror = console.error;
    },
  });

  // Process tool result in a useEffect (matching SDK example pattern)
  useEffect(() => {
    if (!toolResult) return;
    try {
      const text = toolResult.content?.find((c) => c.type === 'text');
      if (text && 'text' in text) {
        const parsed = JSON.parse((text as { text: string }).text);
        if (parsed.team) setTeam(parsed.team);
      }
    } catch { /* ignore */ }
  }, [toolResult]);

  if (error) return <div>Error: {error.message}</div>;
  if (!app) return <div>Connecting...</div>;

  return <App initialSquads={squads} initialTeam={team} />;
}

createRoot(document.getElementById('root')!).render(
  <McpSquadApp />,
);
