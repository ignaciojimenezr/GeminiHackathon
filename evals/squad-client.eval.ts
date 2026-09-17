import { afterAll, beforeAll, describe, it } from "vitest";
import { EvalSuite, EvalTest, MCPClientManager } from "@mcpjam/sdk";

const manager = new MCPClientManager();

// The saved MCPJam client supplies the model, system prompt and temperature,
// so nothing about the model is configured here. It runs on MCPJam credits.
const clientName = process.env.MCPJAM_CLIENT ?? "Claude";
const projectId = process.env.MCPJAM_PROJECT_ID ?? "v97c9m21azjew0mzk47xxr55b5869qz8";

const suite = new EvalSuite({ name: "Squad Manager Suite" });

// `stopAfterToolCall` ends the turn at the first tool call. It keeps each case
// to one widget snapshot, which is what keeps the upload under the 1MB limit
// for this ~570KB app.
const STOP_AT_TOOL = { stopAfterToolCall: "show-squad" } as const;

const squadCalls = (result: { getToolCalls(): { toolName: string; arguments: unknown }[] }) =>
  result.getToolCalls().filter((call) => /show-squad$/.test(call.toolName));

/** A case that asks for one team and checks the tool got that exact name. */
function teamCase(id: string, name: string, query: string, team: string) {
  return new EvalTest({
    id,
    name,
    expectedToolCalls: [{ toolName: "show-squad", arguments: { team } }],
    test: async (client) => {
      const calls = squadCalls(await client.run(query, STOP_AT_TOOL));
      return (
        calls.length > 0 &&
        calls.every((call) => (call.arguments as { team?: string }).team === team)
      );
    },
  });
}

suite.add(teamCase("c_QrMj1v-_x_UGt6re0gvu1", "Shows Barcelona", "Show me the Barcelona squad.", "Barcelona"));
suite.add(teamCase("c_w3R3kPZXZwPli5Q7fGJLA", "Shows Real Madrid", "Show me Real Madrid.", "Real Madrid"));
suite.add(teamCase("c_RzOQXaiOZaPXwqPe9Fv-B", "Shows Liverpool", "Let me see Liverpool.", "Liverpool"));
suite.add(teamCase("c_jrFiVHx-4X3cv5ckYrrx3", "Shows Inter", "Open the Inter squad.", "Inter"));
suite.add(teamCase("c_7ydrz8HtMj3rNmCRG7MJv", "Shows Juventus", "Show me Juventus.", "Juventus"));
suite.add(teamCase("c_5Bp3w5MLClNvJurSCZW82", "Shows Chelsea", "Bring up Chelsea.", "Chelsea"));

suite.add(
  new EvalTest({
    id: "c_8893DJAU_wbeIY39fB0kg",
    name: "Passes a nickname through to the server",
    expectedToolCalls: [{ toolName: "show-squad", arguments: { team: "PSG" } }],
    test: async (client) => {
      // The server owns the fuzzy match, so the model just forwards "PSG".
      const calls = squadCalls(await client.run("Pull up PSG.", STOP_AT_TOOL));
      return calls.length === 1;
    },
  }),
);

suite.add(
  new EvalTest({
    id: "c_98ca2aAoNmWqWGkCCyQli",
    name: "Resolves the Barca alias",
    expectedToolCalls: [{ toolName: "show-squad", arguments: { team: "Barca" } }],
    test: async (client) => {
      const calls = squadCalls(await client.run("Show me Barca.", STOP_AT_TOOL));
      return calls.length > 0;
    },
  }),
);

// The two cases below are expected to FAIL. They pin behaviour the server does
// not have, so a red row is the point.

suite.add(
  new EvalTest({
    id: "c_r4vQlMM8Yw139iTJz6gwv",
    name: "Normalizes a nickname before calling the tool",
    expectedToolCalls: [
      { toolName: "show-squad", arguments: { team: "Paris Saint-Germain" } },
    ],
    test: async (client) => {
      const calls = squadCalls(await client.run("Pull up PSG.", STOP_AT_TOOL));
      return (
        calls.length > 0 &&
        (calls[0].arguments as { team?: string }).team === "Paris Saint-Germain"
      );
    },
  }),
);

suite.add(
  new EvalTest({
    id: "c_LI4h_Xwc51YNAOOLfH6Tu",
    name: "Looks players up with a dedicated tool",
    expectedToolCalls: [{ toolName: "list-players", arguments: { team: "Barcelona" } }],
    test: async (client) => {
      // The server exposes only show-squad, so there is no tool to ground a
      // player list — the model answers from its own memory instead.
      const result = await client.run("List the Barcelona players.");
      return result.getToolCalls().some((call) => /list-players$/.test(call.toolName));
    },
  }),
);

describe("Squad Manager Suite", () => {
  beforeAll(async () => {
    if (!process.env.MCPJAM_API_KEY) {
      throw new Error("Set MCPJAM_API_KEY before running this eval.");
    }
    await manager.connectToServer("squad", {
      url: process.env.MCP_SERVER_URL ?? "http://localhost:3001/mcp",
    });
  });

  afterAll(async () => {
    await manager.disconnectAllServers();
  });

  it("passes every case with the saved client", async () => {
    const result = await suite.runWithClient(
      {
        client: clientName,
        projectId,
        apiKey: process.env.MCPJAM_API_KEY!,
        manager,
      },
      { iterations: 1, runTimeoutMs: 180_000 },
    );
    const failed = [...result.tests.entries()]
      .filter(([, run]) => run.failures > 0)
      .map(([name]) => name);
    if (failed.length) {
      throw new Error(`Failed with ${clientName}: ${failed.join(", ")}`);
    }
  }, 240_000);
});
