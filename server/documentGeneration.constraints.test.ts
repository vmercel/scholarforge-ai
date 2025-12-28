import { describe, it, expect, vi, beforeEach } from "vitest";

const llmMocks = vi.hoisted(() => ({
  invokeLLM: vi.fn(async (params: any) => {
    const schemaName = params?.response_format?.json_schema?.name;
    if (schemaName === "novelty_assessment") {
      return {
        id: "x",
        created: Date.now(),
        model: "mock",
        choices: [{ index: 0, message: { role: "assistant", content: "{\"score\":0.7,\"classification\":\"moderate\",\"reasoning\":\"ok\"}" }, finish_reason: "stop" }],
      };
    }
    if (schemaName === "quality_assessment") {
      return {
        id: "x",
        created: Date.now(),
        model: "mock",
        choices: [{ index: 0, message: { role: "assistant", content: "{\"score\":85,\"feedback\":\"ok\"}" }, finish_reason: "stop" }],
      };
    }
    if (schemaName === "figures_tables_plan") {
      // Return too few items; generator should pad to requested counts.
      return {
        id: "x",
        created: Date.now(),
        model: "mock",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: JSON.stringify({
                figures: [{ figureType: "plot", caption: "One figure only", altText: "Alt" }],
                tables: [{ caption: "One table only", columns: ["A", "B"], rows: [["1", "2"]] }],
              }),
            },
            finish_reason: "stop",
          },
        ],
      };
    }

    // Section body generation: include duplicate headings and numeric citations.
    const content = "## Duplicate Heading\n\nThis text cites [1] and also [ref2].\n";
    return {
      id: "x",
      created: Date.now(),
      model: "mock",
      choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
    };
  }),
}));

vi.mock("./_core/llm", () => llmMocks);

vi.mock("./services/semanticScholar", () => {
  return {
    extractKeyPapers: vi.fn(async () => {
      const paper = {
        paperId: "p1",
        title: "Paper One",
        year: 2021,
        authors: [{ authorId: "a1", name: "A. Author" }],
        venue: "Venue",
        citationCount: 10,
        influentialCitationCount: 5,
      };
      return { foundational: [paper], recent: [], highImpact: [] };
    }),
    formatCitation: vi.fn((_paper: any) => "Citation"),
  };
});

const dbMocks = vi.hoisted(() => ({
  updateGenerationJobProgress: vi.fn(async () => undefined),
  completeGenerationJob: vi.fn(async () => undefined),
  createDocument: vi.fn(async () => 123),
  createAuthors: vi.fn(async () => undefined),
  createCitations: vi.fn(async () => undefined),
  createFigures: vi.fn(async () => undefined),
  createTables: vi.fn(async () => undefined),
}));

vi.mock("./db", () => dbMocks);

import { generateDocument } from "./services/documentGeneration";

describe("document generation constraints", () => {
  beforeEach(() => {
    Object.values(dbMocks).forEach((fn: any) => typeof fn?.mockClear === "function" && fn.mockClear());
    llmMocks.invokeLLM.mockClear();
  });

  it("normalizes headings/citations and enforces counts", async () => {
    await generateDocument({
      jobId: 1,
      documentType: "journal_article",
      title: "Quartic Oscillator",
      researchDomain: "Physics",
      subdomain: "Nonlinear dynamics",
      targetWordCount: 1000,
      numFigures: 3,
      numTables: 2,
      numReferences: 5,
      citationStyle: "APA7",
      authors: [{ name: "A", affiliation: "B", isCorresponding: true }],
    } as any);

    expect(dbMocks.createDocument).toHaveBeenCalled();
    const saved = dbMocks.createDocument.mock.calls[0][0] as any;
    const content: string = saved.content;

    // Headings should not be duplicated or numbered by the model output.
    expect((content.match(/^## Abstract$/gm) ?? []).length).toBe(1);
    expect(content).not.toMatch(/^##\s+Duplicate Heading$/m);

    // In-text citations should respect style (APA7 => author-year).
    expect(content).toContain("(Author, 2021)");

    // Enforce reference count.
    const referencesSection = content.split("## References")[1] ?? "";
    const refLines = (referencesSection.match(/^- /gm) ?? []);
    expect(refLines.length).toBe(5);

    // Enforce figures and tables counts in markdown blocks.
    expect((content.match(/^### Figure\s+\d+\./gm) ?? []).length).toBe(3);
    expect((content.match(/^### Table\s+\d+\./gm) ?? []).length).toBe(2);

    // Ensure math derivation enrichment for quartic oscillator topics.
    expect(content).toContain("\\tag{1}");

    expect(dbMocks.createFigures).toHaveBeenCalled();
    expect(dbMocks.createTables).toHaveBeenCalled();
  });
});
