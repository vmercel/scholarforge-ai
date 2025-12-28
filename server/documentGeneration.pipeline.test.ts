import { describe, it, expect, vi, beforeEach } from "vitest";

const llmMocks = vi.hoisted(() => ({
  invokeLLM: vi.fn(async (params: any) => {
    const schemaName = params?.response_format?.json_schema?.name;
    if (schemaName === "novelty_assessment") {
      return {
        id: "x",
        created: Date.now(),
        model: "mock",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "{\"score\":0.7,\"classification\":\"moderate\",\"reasoning\":\"ok\"}",
            },
            finish_reason: "stop",
          },
        ],
      };
    }
    if (schemaName === "quality_assessment") {
      return {
        id: "x",
        created: Date.now(),
        model: "mock",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: "{\"score\":85,\"feedback\":\"ok\"}" },
            finish_reason: "stop",
          },
        ],
      };
    }

    const last = params?.messages?.[0]?.content ?? "";
    return {
      id: "x",
      created: Date.now(),
      model: "mock",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: `OK: ${String(last).slice(0, 24)}` },
          finish_reason: "stop",
        },
      ],
    };
  }),
}));

vi.mock("./_core/llm", () => llmMocks);

vi.mock("./services/semanticScholar", () => {
  return {
    extractKeyPapers: vi.fn(async () => {
      const paper = {
        paperId: "p1",
        title: "Sample Paper",
        year: 2021,
        authors: [{ authorId: "a1", name: "A. Author" }],
        venue: "Venue",
        citationCount: 10,
        influentialCitationCount: 5,
        externalIds: { DOI: "10.0000/test" },
        url: "https://example.com",
      };
      return { foundational: [paper], recent: [paper], highImpact: [paper] };
    }),
    formatCitation: vi.fn(() => "Citation"),
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

vi.mock("./db", () => {
  return {
    updateGenerationJobProgress: dbMocks.updateGenerationJobProgress,
    completeGenerationJob: dbMocks.completeGenerationJob,
    createDocument: dbMocks.createDocument,
    createAuthors: dbMocks.createAuthors,
    createCitations: dbMocks.createCitations,
    createFigures: dbMocks.createFigures,
    createTables: dbMocks.createTables,
  };
});

import { generateDocument } from "./services/documentGeneration";

describe("document generation pipeline", () => {
  beforeEach(() => {
    dbMocks.updateGenerationJobProgress.mockClear();
    dbMocks.completeGenerationJob.mockClear();
    dbMocks.createDocument.mockClear();
    dbMocks.createAuthors.mockClear();
    dbMocks.createCitations.mockClear();
    dbMocks.createFigures.mockClear();
    dbMocks.createTables.mockClear();
  });

  it("runs all stages and completes the job", async () => {
    await generateDocument({
      jobId: 1,
      documentType: "journal_article",
      title: "Test Title",
      researchDomain: "Computer Science",
      subdomain: "ML",
      targetWordCount: 1200,
      numFigures: 0,
      numTables: 0,
      numReferences: 5,
      citationStyle: "APA7",
      targetJournal: "",
      abstractProvided: "",
      keyHypotheses: [],
      methodologyConstraints: [],
      authors: [
        {
          name: "Dev User",
          affiliation: "Lab",
          email: "",
          orcid: "",
          isCorresponding: true,
        },
      ],
    });

    expect(dbMocks.updateGenerationJobProgress).toHaveBeenCalled();
    const progressCalls = dbMocks.updateGenerationJobProgress.mock.calls.map(args => args[1]);
    expect(progressCalls.some((c: any) => c?.progressPercentage === 100)).toBe(false);
    expect(dbMocks.createDocument).toHaveBeenCalled();
    expect(dbMocks.createAuthors).toHaveBeenCalled();
    expect(dbMocks.createCitations).toHaveBeenCalled();
    expect(dbMocks.createFigures).toHaveBeenCalled();
    expect(dbMocks.createTables).toHaveBeenCalled();
    expect(dbMocks.completeGenerationJob).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: "completed" })
    );
  });
});
