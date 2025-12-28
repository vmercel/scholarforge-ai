# ScholarForge AI — Product Spec & Roadmap

`specs.md` was empty; this file defines the target “ultra-modern, fully functional scholarly work generator + peer reviewer” experience, and a staged plan to get there.

## Vision
ScholarForge AI helps researchers draft publication‑ready scholarly documents with:
- credible literature grounding (citations + verification),
- structured multi‑agent drafting and peer review,
- iterative revisions with traceability,
- exports for common submission formats.

## Core User Flows

### 1) Sign in
- Dev mode: “Dev Login” for local use.
- Production: external OAuth portal with callback.

### 2) Create a generation job
- Multi‑step “New Document” form captures: doc type, domain/subdomain, target length, references, authors, constraints.
- Job created → progress screen polling until completion/failure.

### 3) Generation pipeline (multi-stage)
Stages should be resilient: failures produce actionable error messages and allow “Try Again” (re-run with same parameters).

**Target stages**
1. Literature review (Semantic Scholar search + key paper selection)
2. Problem framing + novelty analysis
3. Argument architecture (outline + claims)
4. Section drafting (with citations)
5. Figures/tables plan (and optional generation)
6. Internal review (quality rubric + defect list)
7. Peer review simulation (multi‑reviewer reports)
8. Revision pass (apply peer review + consistency checks)
9. Final assembly + persistence (document, authors, citations, assets)

### 4) Document preview + history
- View latest version by job.
- View prior versions (revision history).
- Request revision (user instructions) → background processing → new version.

### 5) Exports
Minimum:
- Markdown source export (download)
- LaTeX export (download)
- HTML export (download/print)

Stretch:
- DOCX export
- PDF export

### 6) Admin
- Metrics + operational visibility (active jobs, success rate, latency, API errors).

## Data Model (Current + Extensions)

### Current tables
- `generation_jobs`: status/progress + parameters
- `documents`: content + metrics
- `authors`, `citations`, `figures`, `tables_data`
- `revision_requests`: user-initiated revisions (currently pending-only; needs processing)

### Planned extensions (later milestone)
- `document_versions` or “documents-as-versions” with explicit `parentDocumentId`
- `peer_reviews` storing reviewer reports + scores + recommendations
- `artifact_files` for exported binaries (DOCX/PDF) stored in S3 or local blob store

## Quality Bar
- Each stage reports a clear error with the stage name.
- Jobs cannot get “stuck” in a completed-progress state.
- Revisions create a new version and are discoverable via history.
- Exports are one-click and deterministic.

## Roadmap

### Milestone A (Stability + Completeness)
- LLM client reliability (timeouts/retries, OpenAI-compatible)
- Resilient pipeline fallbacks
- Fix “stuck final assembly” / status bugs
- Implement revision processing end-to-end
- Implement exports (MD/LaTeX/HTML)
- Add tests for pipeline + revision + exports

### Milestone B (Peer Review)
- Multi-reviewer rubric (2–3 reviewers + meta-editor)
- Persist peer review reports and show in UI
- “Apply peer review” revision automation + diffs

### Milestone C (Sophistication)
- Citation verification (DOI validation, quote-to-source matching)
- Novelty checks against literature summary
- Table/figure generation pipeline
- Structured agent orchestration (planner → writers → reviewers)

### Milestone D (Production Hardening)
- Job queue (durable background processing)
- Observability (structured logs + traces)
- Rate limiting, caching, cost controls
