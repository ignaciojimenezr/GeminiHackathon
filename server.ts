import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

const DIST_DIR = import.meta.filename.endsWith('.ts')
  ? path.join(import.meta.dirname, 'dist')
  : import.meta.dirname;

const DATA_DIR = import.meta.filename.endsWith('.ts')
  ? path.join(import.meta.dirname, 'public', 'data')
  : path.join(import.meta.dirname, '..', 'public', 'data');

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'Squad Manager',
    version: '1.0.0',
  });

  const resourceUri = 'ui://squad-manager/mcp-app.html';

  registerAppTool(server,
    'show-squad',
    {
      title: 'Show Squad',
      description: 'Shows an interactive UEFA Champions League squad manager. Optionally specify a team name.',
      inputSchema: z.object({
        team: z.string().optional().describe('Team name (e.g. "Arsenal", "Barcelona"). If omitted, shows first team.'),
      }),
      _meta: { ui: { resourceUri } },
    },
    async (args: { team?: string }): Promise<CallToolResult> => {
      const squadsRaw = await fs.readFile(path.join(DATA_DIR, 'squads.json'), 'utf-8');
      const squads = JSON.parse(squadsRaw);
      const teamNames = Object.keys(squads);
      const team = args.team && teamNames.includes(args.team) ? args.team : teamNames[0];

      return {
        content: [
          { type: 'text', text: JSON.stringify({ team, teams: teamNames }) },
        ],
      };
    },
  );

  const cspMeta = {
    ui: {
      csp: {
        resourceDomains: [
          'https://img.uefa.com',
          'https://fonts.googleapis.com',
          'https://fonts.gstatic.com',
        ],
      },
    },
  };

  registerAppResource(server,
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(path.join(DIST_DIR, 'mcp-app.html'), 'utf-8');
      return {
        contents: [{
          uri: resourceUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: html,
          _meta: cspMeta,
        }],
      };
    },
  );

  return server;
}
