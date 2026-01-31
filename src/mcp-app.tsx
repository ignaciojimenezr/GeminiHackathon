import type { App as McpApp } from '@modelcontextprotocol/ext-apps';
import { useApp } from '@modelcontextprotocol/ext-apps/react';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import type { SquadsData } from './types';
import squadsJson from '../public/data/squads.json';

function McpSquadApp() {
  const [squads] = useState<SquadsData>(squadsJson as SquadsData);
  const [team, setTeam] = useState<string>(() => Object.keys(squadsJson)[0] || '');

  const { app, error } = useApp({
    appInfo: { name: 'Squad Manager', version: '1.0.0' },
    capabilities: {},
    onAppCreated: (app: McpApp) => {
      app.ontoolresult = async (result: CallToolResult) => {
        try {
          const text = result.content?.find((c) => c.type === 'text');
          if (text && 'text' in text) {
            const parsed = JSON.parse(text.text);
            if (parsed.team) setTeam(parsed.team);
          }
        } catch { /* ignore parse errors */ }
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

  if (error) return <div>Error: {error.message}</div>;
  if (!app) return <div>Connecting...</div>;

  return <App initialSquads={squads} initialTeam={team} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <McpSquadApp />
  </StrictMode>,
);
