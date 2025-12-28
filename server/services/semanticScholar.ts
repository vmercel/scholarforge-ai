/**
 * Semantic Scholar API integration for literature search and citation retrieval
 * API Documentation: https://api.semanticscholar.org/api-docs/
 */

const SEMANTIC_SCHOLAR_API_BASE = "https://api.semanticscholar.org/graph/v1";

const DEFAULT_MIN_REQUEST_INTERVAL_MS = 1100;
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_MAX_RETRIES = 5;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const getNumberEnv = (key: string, fallback: number) => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

type CacheEntry<T> = { expiresAt: number; value: T };
const responseCache = new Map<string, CacheEntry<unknown>>();

const getCached = <T>(key: string): T | null => {
  const hit = responseCache.get(key);
  if (!hit) return null;
  if (Date.now() >= hit.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return hit.value as T;
};

const setCached = <T>(key: string, value: T, ttlMs: number) => {
  responseCache.set(key, { expiresAt: Date.now() + ttlMs, value });
};

let requestChain: Promise<void> = Promise.resolve();
let lastRequestAt = 0;

async function enqueueRequest<T>(fn: () => Promise<T>): Promise<T> {
  const run = async () => {
    const minIntervalMs = getNumberEnv(
      "SEMANTIC_SCHOLAR_MIN_REQUEST_INTERVAL_MS",
      DEFAULT_MIN_REQUEST_INTERVAL_MS
    );
    const elapsed = Date.now() - lastRequestAt;
    if (elapsed < minIntervalMs) await sleep(minIntervalMs - elapsed);
    lastRequestAt = Date.now();
    return fn();
  };

  const result = requestChain.then(run, run);
  requestChain = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, Math.floor(seconds * 1000));
  const dateMs = Date.parse(value);
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
  return null;
}

async function semanticScholarFetchJson<T>(url: string): Promise<T> {
  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
  if (!apiKey) {
    throw new Error("SEMANTIC_SCHOLAR_API_KEY not configured");
  }

  const cacheTtlMs = getNumberEnv("SEMANTIC_SCHOLAR_CACHE_TTL_MS", DEFAULT_CACHE_TTL_MS);
  const cacheKey = `GET ${url}`;
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  const maxRetries = getNumberEnv("SEMANTIC_SCHOLAR_MAX_RETRIES", DEFAULT_MAX_RETRIES);

  const data = await enqueueRequest(async () => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const response = await fetch(url, {
        headers: {
          "x-api-key": apiKey,
          accept: "application/json",
          "user-agent": "scholarforge-ai (local dev)",
        },
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      const isRetryable = response.status === 429 || response.status >= 500;
      if (!isRetryable || attempt === maxRetries) {
        const body = await response.text().catch(() => "");
        const suffix = body ? ` - ${body.slice(0, 500)}` : "";
        throw new Error(
          `Semantic Scholar API error: ${response.status} ${response.statusText}${suffix}`
        );
      }

      const retryAfterMs =
        response.status === 429 ? parseRetryAfterMs(response.headers.get("retry-after")) : null;

      const backoffBase = 500 * 2 ** attempt;
      const jitter = Math.floor(Math.random() * 250);
      const waitMs = Math.min(30_000, retryAfterMs ?? backoffBase + jitter);
      await sleep(waitMs);
    }

    throw new Error("Semantic Scholar API error: retry loop exited unexpectedly");
  });

  setCached(cacheKey, data, cacheTtlMs);
  return data;
}

export interface SemanticScholarPaper {
  paperId: string;
  title: string;
  abstract?: string;
  year?: number;
  authors: Array<{
    authorId: string;
    name: string;
  }>;
  venue?: string;
  citationCount?: number;
  influentialCitationCount?: number;
  fieldsOfStudy?: string[];
  externalIds?: {
    DOI?: string;
    ArXiv?: string;
    PubMed?: string;
  };
  url?: string;
}

interface SearchResult {
  total: number;
  offset: number;
  next?: number;
  data: SemanticScholarPaper[];
}

/**
 * Search for papers by query
 */
export async function searchPapers(
  query: string,
  options: {
    limit?: number;
    offset?: number;
    year?: string; // e.g., "2020-2023"
    fieldsOfStudy?: string[]; // e.g., ["Computer Science"]
  } = {}
): Promise<SearchResult> {
  const params = new URLSearchParams({
    query,
    limit: (options.limit || 10).toString(),
    offset: (options.offset || 0).toString(),
    fields: "paperId,title,abstract,year,authors,venue,citationCount,influentialCitationCount,fieldsOfStudy,externalIds,url",
  });

  if (options.year) {
    params.append("year", options.year);
  }

  if (options.fieldsOfStudy && options.fieldsOfStudy.length > 0) {
    params.append("fieldsOfStudy", options.fieldsOfStudy.join(","));
  }

  return semanticScholarFetchJson(
    `${SEMANTIC_SCHOLAR_API_BASE}/paper/search?${params.toString()}`
  );
}

/**
 * Get paper details by ID
 */
export async function getPaperById(paperId: string): Promise<SemanticScholarPaper> {
  const fields = "paperId,title,abstract,year,authors,venue,citationCount,influentialCitationCount,fieldsOfStudy,externalIds,url";

  return semanticScholarFetchJson(
    `${SEMANTIC_SCHOLAR_API_BASE}/paper/${paperId}?fields=${fields}`
  );
}

/**
 * Get recommendations based on a paper
 */
export async function getRecommendations(
  paperId: string,
  limit: number = 10
): Promise<SemanticScholarPaper[]> {
  const fields = "paperId,title,abstract,year,authors,venue,citationCount,fieldsOfStudy,externalIds";

  const data = await semanticScholarFetchJson<{
    recommendedPapers?: SemanticScholarPaper[];
  }>(
    `${SEMANTIC_SCHOLAR_API_BASE}/paper/${paperId}/recommendations?limit=${limit}&fields=${fields}`
  );
  return data.recommendedPapers || [];
}

/**
 * Format paper as citation string
 */
export function formatCitation(
  paper: SemanticScholarPaper,
  style: "APA7" | "MLA9" | "Chicago" | "IEEE" = "APA7"
): string {
  const authors = paper.authors.map(a => a.name).join(", ");
  const year = paper.year || "n.d.";
  const title = paper.title;
  const venue = paper.venue || "Unpublished manuscript";

  switch (style) {
    case "APA7":
      return `${authors} (${year}). ${title}. ${venue}.`;
    case "MLA9":
      return `${authors}. "${title}." ${venue}, ${year}.`;
    case "Chicago":
      return `${authors}. "${title}." ${venue} (${year}).`;
    case "IEEE":
      return `${authors}, "${title}," ${venue}, ${year}.`;
    default:
      return `${authors} (${year}). ${title}. ${venue}.`;
  }
}

/**
 * Search for relevant papers in a research domain
 */
export async function findRelevantLiterature(
  researchDomain: string,
  subdomain?: string,
  options: {
    minCitationCount?: number;
    yearRange?: string;
    limit?: number;
  } = {}
): Promise<SemanticScholarPaper[]> {
  const query = subdomain ? `${researchDomain} ${subdomain}` : researchDomain;
  
  const result = await searchPapers(query, {
    limit: options.limit || 50,
    year: options.yearRange,
    fieldsOfStudy: [researchDomain],
  });

  // Filter by citation count if specified
  let papers = result.data;
  if (options.minCitationCount !== undefined) {
    papers = papers.filter(p => (p.citationCount || 0) >= options.minCitationCount!);
  }

  // Sort by citation count (descending)
  papers.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0));

  return papers;
}

/**
 * Extract key papers for a research topic
 */
export async function extractKeyPapers(
  topic: string,
  count: number = 20
): Promise<{
  foundational: SemanticScholarPaper[];
  recent: SemanticScholarPaper[];
  highImpact: SemanticScholarPaper[];
}> {
  // Get foundational papers (older, highly cited)
  const foundationalResult = await searchPapers(topic, {
    limit: count,
    year: "2010-2019",
  });
  const foundational = foundationalResult.data
    .filter(p => (p.citationCount || 0) > 100)
    .sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0))
    .slice(0, Math.floor(count / 3));

  // Get recent papers (last 3 years)
  const currentYear = new Date().getFullYear();
  const recentResult = await searchPapers(topic, {
    limit: count,
    year: `${currentYear - 3}-${currentYear}`,
  });
  const recent = recentResult.data
    .sort((a, b) => (b.year || 0) - (a.year || 0))
    .slice(0, Math.floor(count / 3));

  // High impact papers (influential citations) derived from the two searches above
  // to reduce API calls and mitigate rate limiting.
  const unique = new Map<string, SemanticScholarPaper>();
  for (const paper of [...foundationalResult.data, ...recentResult.data]) {
    if (!paper.paperId) continue;
    unique.set(paper.paperId, paper);
  }
  const highImpact = Array.from(unique.values())
    .filter(p => (p.influentialCitationCount || 0) > 10)
    .sort((a, b) => (b.influentialCitationCount || 0) - (a.influentialCitationCount || 0))
    .slice(0, Math.floor(count / 3));

  return {
    foundational,
    recent,
    highImpact,
  };
}
