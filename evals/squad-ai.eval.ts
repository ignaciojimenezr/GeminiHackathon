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

  it("shows the squad for a team named exactly", async () => {
    await evalCase(
      "Shows the squad for a team named exactly",
      "Show me the Barcelona squad.",
      (prompt) => {
        const calls = prompt.getToolCalls();
        expect(calls.length).toBeGreaterThan(0);
        // The model sometimes repeats the call; every one must still ask for Barcelona.
        for (const call of calls) {
          expect(call.toolName).toMatch(/show-squad$/);
          expect(call.arguments).toEqual({ team: "Barcelona" });
        }
        expect(prompt.text).toMatch(/barcelona/i);
      },
      { expectedToolCalls: [{ toolName: "show-squad", arguments: { team: "Barcelona" } }] },
    );
  });

  it("resolves a nickname to the real team", async () => {
    await evalCase(
      "Resolves a nickname to the real team",
      "Pull up PSG.",
      (prompt) => {
        const calls = prompt.getToolCalls();
        expect(calls).toHaveLength(1);
        expect(calls[0].toolName).toMatch(/show-squad$/);
        // The server does the fuzzy match, so it answers with the full name.
        expect(prompt.text).toMatch(/paris saint-germain/i);
      },
      { expectedToolCalls: [{ toolName: "show-squad", arguments: { team: "PSG" } }] },
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
});
