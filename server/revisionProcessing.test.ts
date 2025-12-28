import { describe, it, expect, vi, beforeEach } from "vitest";

const llmMocks = vi.hoisted(() => ({
  invokeLLM: vi.fn(async (params: any) => {
    const schemaName = params?.response_format?.json_schema?.name;
    if (schemaName === "quality_assessment") {
      return {
        id: "x",
        created: Date.now(),
        model: "mock",
        choices: [{ index: 0, message: { role: "assistant", content: "{\"score\":90,\"feedback\":\"ok\"}" }, finish_reason: "stop" }],
      };
    }
    return {
      id: "x",
      created: Date.now(),
      model: "mock",
      choices: [{ index: 0, message: { role: "assistant", content: "## Abstract\n\nRevised.\n\n## Introduction\n\nBody [ref1]\n" }, finish_reason: "stop" }],
    };
  }),
}));
vi.mock("./_core/llm", () => llmMocks);

const dbMocks = vi.hoisted(() => ({
  updateRevisionRequestStatus: vi.fn(async () => undefined),
  getRevisionRequestById: vi.fn(async () => ({
    id: 1,
    documentId: 10,
    userId: 1,
    revisionType: "global_revision",
    instructions: "Improve clarity",
    preserveArgument: 1,
    preserveFigures: 1,
    preserveWordCount: 0,
    preserveCitations: 1,
    status: "pending",
    newDocumentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
  })),
  getDocumentById: vi.fn(async () => ({
    id: 10,
    jobId: 5,
    title: "T",
    abstract: "A",
    content: "## Abstract\n\nOld.\n",
    keywords: ["k"],
    documentType: "journal_article",
    wordCount: 3,
    citationStyle: "APA7",
    noveltyScore: 0.7,
    qualityScore: 80,
    noveltyClassification: "moderate",
    markdownUrl: null,
    docxUrl: null,
    pdfUrl: null,
    latexUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  getDocumentAuthors: vi.fn(async () => [
    { id: 1, documentId: 10, name: "A", affiliation: "B", email: null, orcid: null, isCorresponding: 1, orderIndex: 1, createdAt: new Date() },
  ]),
  getDocumentCitations: vi.fn(async () => [
    { id: 1, documentId: 10, doi: null, title: "C", authorsText: "A", journal: null, year: 2020, volume: null, pages: null, url: null, citationKey: "ref1", formattedCitations: {}, orderIndex: 1, createdAt: new Date() },
  ]),
  createDocument: vi.fn(async () => 99),
  createAuthors: vi.fn(async () => undefined),
  createCitations: vi.fn(async () => undefined),
}));

vi.mock("./db", () => dbMocks);

import { processRevisionRequest } from "./services/revisionProcessing";

describe("revision processing", () => {
  beforeEach(() => {
    Object.values(dbMocks).forEach((fn: any) => typeof fn?.mockClear === "function" && fn.mockClear());
    llmMocks.invokeLLM.mockClear();
  });

  it("creates a new document and marks request completed", async () => {
    await processRevisionRequest(1);

    expect(dbMocks.updateRevisionRequestStatus).toHaveBeenCalledWith(1, { status: "processing" });
    expect(dbMocks.createDocument).toHaveBeenCalled();
    expect(dbMocks.createAuthors).toHaveBeenCalled();
    expect(dbMocks.createCitations).toHaveBeenCalled();
    expect(dbMocks.updateRevisionRequestStatus).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: "completed", newDocumentId: 99 })
    );
  });
});

