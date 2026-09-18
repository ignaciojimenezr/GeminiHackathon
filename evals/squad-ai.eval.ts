import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  HostRunner,
  MCPClientManager,
  detectCiMetadata,
  promptsToEvalResult,
  releaseMcpjamModelLeases,
  reportEvalResults,
  type EvalResultInput,
} from "@mcpjam/sdk";

const manager = new MCPClientManager();
const results: EvalResultInput[] = [];

// `mcpjam/` runs the model on MCPJam credits, so MCPJAM_API_KEY is the only
// secret this eval needs — no Anthropic or Google key in CI.
const model = "mcpjam/anthropic/claude-haiku-4.5";
const provider = "mcpjam";

const SYSTEM_PROMPT = [
  "You manage a UEFA Champions League squad viewer.",
  "Call show-squad to display a team. Pass the team the user asked for.",
  "Only state facts present in the tool response.",
].join(" ");

async function conversation(
  query: string,
  options: { maxSteps?: number; systemPrompt?: string } = {},
) {
  const tools = await manager.getToolsForAiSdk(["squad"]);
  const runner = new HostRunner({
    model,
    apiKey: process.env.MCPJAM_API_KEY!,
    tools,
    mcpClientManager: manager,
    maxSteps: options.maxSteps ?? 3,
    systemPrompt: options.systemPrompt ?? SYSTEM_PROMPT,
  });
  return runner.run(query, { abortSignal: AbortSignal.timeout(90_000) });
}

// Every case reports the same way: the real conversation becomes the trace the
// MCPJam run page shows, whether the assertions passed or not.
async function evalCase(
  caseTitle: string,
  query: string,
  assert: (prompt: Awaited<ReturnType<typeof conversation>>) => void,
  options: { maxSteps?: number; systemPrompt?: string; expectedToolCalls?: EvalResultInput["expectedToolCalls"] } = {},
) {
  const prompt = await conversation(query, options);
  let failure: unknown;
  try {
    expect(prompt.getError()).toBeUndefined();
    assert(prompt);
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    results.push(
      promptsToEvalResult([prompt], {
        caseTitle,
        query,
        passed: failure === undefined,
        provider,
        model,
        expectedToolCalls: options.expectedToolCalls,
        error: failure instanceof Error ? failure.message : undefined,
      }),
    );
  }
}

describe("Squad Manager AI conversation", () => {
  beforeAll(async () => {
    if (!process.env.MCPJAM_API_KEY) {
      throw new Error("Set MCPJAM_API_KEY before running this eval.");
    }
    await manager.connectToServer("squad", {
      url: process.env.MCP_SERVER_URL ?? "http://localhost:3001/mcp",
    });
  });

  afterAll(async () => {
    try {
      if (!results.length) return;
      const ci = detectCiMetadata();
      const report = await reportEvalResults({
        suiteName: "Squad Manager AI conversation",
        framework: "vitest",
        mcpClientManager: manager,
        ci: ci
          ? {
              provider: ci.provider,
              commitSha: ci.commitSha,
              branch: process.env.GITHUB_HEAD_REF || ci.branch,
              runUrl: ci.runUrl,
              pipelineId: ci.runId,
              jobId: ci.job,
            }
          : undefined,
        results,
      });
      const origin = process.env.MCPJAM_APP_ORIGIN ?? "https://app.mcpjam.com";
      console.log(
        `AI conversation saved: ${origin}/evals/suite/${report.suiteId}/runs/${report.runId}?project=${report.projectId}`,
      );
    } finally {
      // Hand back the model leases this run minted, then drop the connections.
      await releaseMcpjamModelLeases();
      await manager.disconnectAllServers();
    }
  });

  const squadCalls = (prompt: Awaited<ReturnType<typeof conversation>>) =>
    prompt.getToolCalls().filter((call) => /show-squad$/.test(call.toolName));

  const teamCase = (title: string, query: string, team: string) =>
    evalCase(
      title,
      query,
      (prompt) => {
        const calls = squadCalls(prompt);
        expect(calls.length).toBeGreaterThan(0);
        // The model sometimes repeats the call; every one must ask for the same team.
        for (const call of calls) {
          expect((call.arguments as { team?: string }).team).toBe(team);
        }
      },
      { expectedToolCalls: [{ toolName: "show-squad", arguments: { team } }] },
    );

  it("shows the squad for a team named exactly", async () => {
    await teamCase(
      "Shows the squad for a team named exactly",
      "Show me the Barcelona squad.",
      "Barcelona",
    );
  });

  it("shows Real Madrid", async () => {
    await teamCase("Shows Real Madrid", "Show me Real Madrid.", "Real Madrid");
  });

  it("shows Liverpool", async () => {
    await teamCase("Shows Liverpool", "Let me see Liverpool.", "Liverpool");
  });

  it("shows Inter", async () => {
    await teamCase("Shows Inter", "Open the Inter squad.", "Inter");
  });

  it("passes a nickname through to the server", async () => {
    await evalCase(
      "Passes a nickname through to the server",
      "Pull up PSG.",
      (prompt) => {
        const calls = squadCalls(prompt);
        expect(calls.length).toBeGreaterThan(0);
        // The server does the fuzzy match, so it answers with the full name.
        expect(prompt.text).toMatch(/paris saint-germain/i);
      },
      { expectedToolCalls: [{ toolName: "show-squad", arguments: { team: "PSG" } }] },
    );
  });

  it("resolves the Barca alias", async () => {
    await evalCase(
      "Resolves the Barca alias",
      "Show me Barca.",
      (prompt) => {
        expect(squadCalls(prompt).length).toBeGreaterThan(0);
        expect(prompt.text).toMatch(/barcelona/i);
      },
      { expectedToolCalls: [{ toolName: "show-squad", arguments: { team: "Barca" } }] },
    );
  });

  it("answers a question about itself without calling a tool", async () => {
    await evalCase(
      "Answers a question about itself without calling a tool",
      "In one sentence, what can you help me with? Do not call any tools.",
      (prompt) => {
        expect(prompt.getToolCalls()).toEqual([]);
        expect(prompt.text).toMatch(/squad|team/i);
      },
      { maxSteps: 1, expectedToolCalls: [] },
    );
  });

  // The three cases below are expected to fail. They pin behaviour the server
  // does not have yet, so a red row in the PR comment is the point.

  it("FAILS: normalizes a nickname before calling the tool", async () => {
    await evalCase(
      "Normalizes a nickname before calling the tool",
      "Pull up PSG.",
      (prompt) => {
        const calls = squadCalls(prompt);
        expect(calls.length).toBeGreaterThan(0);
        // The server owns the fuzzy match, so the model passes "PSG" unchanged.
        expect((calls[0].arguments as { team?: string }).team).toBe(
          "Paris Saint-Germain",
        );
      },
      {
        expectedToolCalls: [
          { toolName: "show-squad", arguments: { team: "Paris Saint-Germain" } },
        ],
      },
    );
  });

  it("FAILS: filters the squad by formation", async () => {
    await evalCase(
      "Filters the squad by formation",
      "Show me Barcelona in a 4-3-3.",
      (prompt) => {
        const calls = squadCalls(prompt);
        expect(calls.length).toBeGreaterThan(0);
        // show-squad takes only `team`, so the model cannot pass a formation
        // however the user asks for it.
        expect((calls[0].arguments as { formation?: string }).formation).toBe("4-3-3");
      },
      {
        expectedToolCalls: [
          { toolName: "show-squad", arguments: { team: "Barcelona", formation: "4-3-3" } },
        ],
      },
    );
  });

  it("FAILS: looks players up with a dedicated tool", async () => {
    await evalCase(
      "Looks players up with a dedicated tool",
      "List the Barcelona players.",
      (prompt) => {
        // The server exposes only show-squad. Asked for players, the model
        // answers from its own memory instead, which is the failure worth
        // seeing: there is no list-players tool to ground it.
        expect(
          prompt.getToolCalls().some((call) => /list-players$/.test(call.toolName)),
        ).toBe(true);
      },
      { expectedToolCalls: [{ toolName: "list-players", arguments: { team: "Barcelona" } }] },
    );
  });
});
