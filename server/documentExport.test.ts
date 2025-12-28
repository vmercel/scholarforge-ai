import { describe, it, expect } from "vitest";
import { exportDocument } from "./services/documentExport";

describe("document export", () => {
  it("exports markdown as-is", () => {
    const result = exportDocument("markdown", {
      id: 1,
      jobId: 1,
      title: "My Paper",
      abstract: "A",
      content: "## Abstract\n\nHello [ref1]\n",
      keywords: ["x"],
      documentType: "journal_article",
      wordCount: 3,
      citationStyle: "APA7",
      noveltyScore: null,
      qualityScore: null,
      noveltyClassification: null,
      markdownUrl: null,
      docxUrl: null,
      pdfUrl: null,
      latexUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    expect(result.filename.endsWith(".md")).toBe(true);
    expect(result.content).toContain("## Abstract");
  });

  it("exports latex with cite markers", () => {
    const result = exportDocument(
      "latex",
      {
        id: 1,
        jobId: 1,
        title: "My Paper",
        abstract: "A",
        content: "## Abstract\n\nHello [ref1]\n\n- Item\n",
        keywords: ["x"],
        documentType: "journal_article",
        wordCount: 3,
        citationStyle: "APA7",
        noveltyScore: null,
        qualityScore: null,
        noveltyClassification: null,
        markdownUrl: null,
        docxUrl: null,
        pdfUrl: null,
        latexUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
      {
        authors: [{ id: 1, documentId: 1, name: "A", affiliation: "B", email: null, orcid: null, isCorresponding: 1, orderIndex: 1, createdAt: new Date() }] as any,
        citations: [{ id: 1, documentId: 1, doi: null, title: "T", authorsText: "A", journal: null, year: 2020, volume: null, pages: null, url: null, citationKey: "ref1", formattedCitations: {}, orderIndex: 1, createdAt: new Date() }] as any,
      }
    );

    expect(result.filename.endsWith(".tex")).toBe(true);
    expect(result.content).toContain("\\documentclass");
    expect(result.content).toContain("\\cite{ref1}");
    expect(result.content).toContain("\\begin{thebibliography}");
  });
});

