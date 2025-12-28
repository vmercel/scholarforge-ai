import { describe, expect, it } from "vitest";
import { invokeLLM } from "./_core/llm";

const integrationEnabled = process.env.RUN_INTEGRATION_TESTS === "1";
const describeIntegration = integrationEnabled ? describe : describe.skip;

describeIntegration("API Keys Validation (integration)", () => {
  it("validates LLM API key with a simple request", async () => {
    if (!process.env.BUILT_IN_FORGE_API_KEY) {
      throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
    }

    const response = await invokeLLM({
      messages: [
        { role: "user", content: "Say 'test successful' if you can read this." },
      ],
    });

    expect(response).toBeDefined();
    expect(response.choices).toBeDefined();
    expect(response.choices.length).toBeGreaterThan(0);
    expect(response.choices[0].message.content).toBeDefined();
  }, 30000); // 30 second timeout for API call

  it("validates Semantic Scholar API key", async () => {
    const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
    if (!apiKey) {
      throw new Error("SEMANTIC_SCHOLAR_API_KEY is not configured");
    }

    // Test with a simple paper lookup
    const response = await fetch(
      "https://api.semanticscholar.org/graph/v1/paper/search?query=machine+learning&limit=1",
      {
        headers: {
          "x-api-key": apiKey!,
        },
      }
    );

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data.data).toBeDefined();
  }, 30000);
});
