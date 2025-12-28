import { invokeLLM } from "../_core/llm";
import * as db from "../db";

type RevisionType =
  | "targeted_edit"
  | "global_revision"
  | "expansion"
  | "reduction"
  | "style_adjustment";

function extractAbstract(markdown: string): string {
  const match = markdown.match(/(^|\n)##\s+Abstract\s*\n([\s\S]*?)(\n##\s+|\n#\s+|$)/i);
  if (!match) return "";
  return match[2].trim();
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function computeWordCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

function noveltyClassification(score: number | null | undefined): string | null {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  if (score >= 0.8) return "substantial";
  if (score >= 0.6) return "moderate";
  return "incremental";
}

async function assessQuality(markdown: string): Promise<number | null> {
  const prompt = `Review this academic document and provide a quality score (0-100) based on:
- Clarity and coherence
- Logical flow
- Academic rigor
- Citation appropriateness

Document excerpt (first 2000 chars):
${markdown.substring(0, 2000)}

Respond in JSON format: {"score": 85, "feedback": "..."}`;

  const response = await invokeLLM({
    messages: [{ role: "user", content: prompt }],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "quality_assessment",
        strict: true,
        schema: {
          type: "object",
          properties: { score: { type: "number" }, feedback: { type: "string" } },
          required: ["score", "feedback"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (typeof content !== "string") return null;
  try {
    const parsed = JSON.parse(content) as { score?: unknown };
    const score = typeof parsed.score === "number" ? parsed.score : null;
    if (score === null || !Number.isFinite(score)) return null;
    return Math.min(100, Math.max(0, score));
  } catch {
    return null;
  }
}

export async function processRevisionRequest(requestId: number): Promise<void> {
  await db.updateRevisionRequestStatus(requestId, { status: "processing" });

  const request = await db.getRevisionRequestById(requestId);
  if (!request) {
    await db.updateRevisionRequestStatus(requestId, { status: "failed" });
    return;
  }

  const revisionType = request.revisionType as RevisionType;
  const instructions = request.instructions;

  const originalDocument = await db.getDocumentById(request.documentId);
  if (!originalDocument) {
    await db.updateRevisionRequestStatus(requestId, { status: "failed" });
    return;
  }

  const authors = await db.getDocumentAuthors(originalDocument.id);
  const citations = await db.getDocumentCitations(originalDocument.id);

  const preserveArgument = request.preserveArgument === 1;
  const preserveFigures = request.preserveFigures === 1;
  const preserveWordCount = request.preserveWordCount === 1;
  const preserveCitations = request.preserveCitations === 1;

  const wordCount = originalDocument.wordCount ?? computeWordCount(originalDocument.content);

  const preserveNotes = [
    preserveArgument ? "- Preserve the main argument structure and section ordering." : "- You may restructure the argument if needed.",
    preserveFigures ? "- Preserve figure/table references and numbering." : "- You may modify figure/table references.",
    preserveCitations ? "- Preserve the existing citation keys and selection; keep [refX] markers consistent." : "- You may adjust citations.",
    preserveWordCount ? `- Keep total length within ±10% of ~${wordCount} words.` : "- You may change overall length as needed.",
  ].join("\n");

  const citationsContext = preserveCitations
    ? citations
        .slice(0, 100)
        .map(c => `[${c.citationKey}] ${c.title}${c.year ? ` (${c.year})` : ""}`)
        .join("\n")
    : "";

  const authorLine = authors.map(a => a.name).join(", ");

  const prompt = `You are a senior academic editor.

Task: apply a document revision request.

Revision type: ${revisionType}
Instructions:
${instructions}

Constraints:
${preserveNotes}

${citationsContext ? `Available citations (keep keys if preserving citations):\n${citationsContext}\n` : ""}

Output requirements:
- Return a single markdown document.
- Use '##' section headings.
- Include an '## Abstract' section.
- Use [refX] citations where appropriate.

Original document:
${safeString(originalDocument.content)}
`;

  try {
    const response = await invokeLLM({ messages: [{ role: "user", content: prompt }] });
    const content = response.choices[0]?.message?.content;
    const revisedMarkdown = typeof content === "string" && content.trim().length > 0 ? content : null;

    if (!revisedMarkdown) {
      await db.updateRevisionRequestStatus(requestId, { status: "failed" });
      return;
    }

    const newAbstract = extractAbstract(revisedMarkdown) || originalDocument.abstract || "";
    const newWordCount = computeWordCount(revisedMarkdown);

    const qualityScore = (await assessQuality(revisedMarkdown)) ?? originalDocument.qualityScore ?? null;

    const newDocumentId = await db.createDocument({
      jobId: originalDocument.jobId,
      title: originalDocument.title,
      abstract: newAbstract,
      content: revisedMarkdown,
      keywords: originalDocument.keywords ?? null,
      documentType: originalDocument.documentType,
      wordCount: newWordCount,
      citationStyle: originalDocument.citationStyle,
      noveltyScore: originalDocument.noveltyScore,
      qualityScore: qualityScore ?? undefined,
      noveltyClassification: noveltyClassification(originalDocument.noveltyScore ?? undefined),
    });

    await db.createAuthors(
      authors.map((author, index) => ({
        documentId: newDocumentId,
        name: author.name,
        affiliation: author.affiliation,
        email: author.email ?? null,
        orcid: author.orcid ?? null,
        isCorresponding: author.isCorresponding,
        orderIndex: index + 1,
      }))
    );

    if (preserveCitations) {
      await db.createCitations(
        citations.map((c, index) => ({
          documentId: newDocumentId,
          doi: c.doi ?? null,
          title: c.title,
          authorsText: c.authorsText,
          journal: c.journal ?? null,
          year: c.year ?? null,
          volume: c.volume ?? null,
          pages: c.pages ?? null,
          url: c.url ?? null,
          citationKey: c.citationKey,
          formattedCitations: c.formattedCitations as any,
          orderIndex: index + 1,
        }))
      );
    }

    await db.updateRevisionRequestStatus(requestId, {
      status: "completed",
      newDocumentId,
    });
  } catch (error) {
    console.error("[Revisions] Processing failed", { requestId, error });
    await db.updateRevisionRequestStatus(requestId, { status: "failed" });
  }
}

