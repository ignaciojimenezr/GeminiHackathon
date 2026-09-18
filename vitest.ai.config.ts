import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["evals/squad-ai.eval.ts"],
    testTimeout: 120_000,
    hookTimeout: 60_000,
    // The cases share one MCP connection and one squad server.
    fileParallelism: false,
  },
});
