import { afterAll, beforeAll, describe, it } from "vitest";
import { EvalSuite, EvalTest, MCPClientManager } from "@mcpjam/sdk";

const manager = new MCPClientManager();

// The saved MCPJam client supplies the model, system prompt and temperature,
// so nothing about the model is configured here. It runs on MCPJam credits.
const clientName = process.env.MCPJAM_CLIENT ?? "Claude";
const projectId = process.env.MCPJAM_PROJECT_ID ?? "v97c9m21azjew0mzk47xxr55b5869qz8";

const suite = new EvalSuite({ name: "Squad Manager saved client" });

// `stopAfterToolCall` ends the turn at the first tool call. It keeps each case
// to one widget snapshot, which is what keeps the upload under the 1MB limit
// for this ~570KB app.
const STOP_AT_TOOL = { stopAfterToolCall: "show-squad" } as const;

suite.add(
  new EvalTest({
    id: "c_QrMj1v-_x_UGt6re0gvu1",
    name: "Shows the squad for a team named exactly",
    expectedToolCalls: [{ toolName: "show-squad", arguments: { team: "Barcelona" } }],
    test: async (client) => {
      const result = await client.run("Show me the Barcelona squad.", STOP_AT_TOOL);
      const calls = result.getToolCalls();
      return (
        calls.length > 0 &&
        calls.every(
          (call) =>
            /show-squad$/.test(call.toolName) &&
            (call.arguments as { team?: string }).team === "Barcelona",
        )
      );
    },
  }),
);

suite.add(
  new EvalTest({
    id: "c_8893DJAU_wbeIY39fB0kg",
    name: "Resolves a nickname to the real team",
    expectedToolCalls: [{ toolName: "show-squad", arguments: { team: "PSG" } }],
    test: async (client) => {
      const result = await client.run("Pull up PSG.", STOP_AT_TOOL);
      const calls = result.getToolCalls();
      return calls.length === 1 && /show-squad$/.test(calls[0].toolName);
    },
  }),
);

suite.add(
  new EvalTest({
    id: "c_LI4h_Xwc51YNAOOLfH6Tu",
    name: "Answers a question about itself without calling a tool",
    expectedToolCalls: [],
    test: async (client) => {
      const result = await client.run(
        "In one sentence, what can you help me with? Do not call any tools.",
      );
      return result.getToolCalls().length === 0 && /squad|team/i.test(result.text);
    },
  }),
);

describe("Squad Manager saved client", () => {
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
      { runTimeoutMs: 180_000 },
    );
    const failed = [...result.tests.entries()]
      .filter(([, run]) => run.failures > 0)
      .map(([name]) => name);
    if (failed.length) {
      throw new Error(`Failed with ${clientName}: ${failed.join(", ")}`);
    }
  }, 240_000);
});
