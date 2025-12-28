import type { Document, Citation, Author } from "../../drizzle/schema";

export type ExportFormat = "markdown" | "latex";

function escapeLatex(text: string): string {
  return text
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function markdownToLatex(markdown: string): string {
  const lines = markdown.split("\n");
  const out: string[] = [];
  let inItemize = false;

  const closeList = () => {
    if (inItemize) {
      out.push("\\end{itemize}");
      inItemize = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      const title = escapeLatex(heading[2].trim());
      const cmd =
        level === 1 ? "\\section" : level === 2 ? "\\subsection" : "\\subsubsection";
      out.push(`${cmd}{${title}}`);
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      if (!inItemize) {
        out.push("\\begin{itemize}");
        inItemize = true;
      }
      const text = escapeLatex(bullet[1]);
      out.push(`\\item ${text}`);
      continue;
    }

    if (line.length === 0) {
      closeList();
      out.push("");
      continue;
    }

    closeList();

    const escaped = escapeLatex(line);
    // citations: [ref1] -> \cite{ref1}
    const withCites = escaped.replace(/\[(ref\d+)\]/g, (_m, key) => `\\cite{${key}}`);
    out.push(withCites);
  }

  closeList();
  return out.join("\n");
}

export function exportDocument(
  format: ExportFormat,
  document: Document,
  options: { authors?: Author[]; citations?: Citation[] } = {}
): { filename: string; mimeType: string; content: string } {
  if (format === "markdown") {
    const filename = `${document.title.replace(/[^a-z0-9-_]+/gi, "_")}.md`;
    return { filename, mimeType: "text/markdown; charset=utf-8", content: document.content };
  }

  const title = escapeLatex(document.title);
  const authorLine = (options.authors ?? []).map(a => escapeLatex(a.name)).join(" \\and ");

  const body = markdownToLatex(document.content);

  const bib = (options.citations ?? [])
    .map((c) => {
      const key = c.citationKey;
      const year = c.year ?? "";
      const title = escapeLatex(c.title);
      const authors = escapeLatex(c.authorsText ?? "");
      return `\\bibitem{${key}} ${authors}. ${title}. ${year}.`;
    })
    .join("\n");

  const latex = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{hyperref}
\\begin{document}
\\title{${title}}
${authorLine ? `\\author{${authorLine}}` : ""}
\\date{}
\\maketitle

${body}

\\begin{thebibliography}{99}
${bib}
\\end{thebibliography}
\\end{document}
`;

  const filename = `${document.title.replace(/[^a-z0-9-_]+/gi, "_")}.tex`;
  return { filename, mimeType: "application/x-tex; charset=utf-8", content: latex };
}
