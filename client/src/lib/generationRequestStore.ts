export type GenerationCreateInput = {
  documentType: string;
  title: string;
  researchDomain: string;
  subdomain?: string;
  targetWordCount: number;
  numFigures?: number;
  numTables?: number;
  numReferences?: number;
  citationStyle: string;
  targetJournal?: string;
  abstractProvided?: string;
  keyHypotheses?: string[];
  methodologyConstraints?: string[];
  authors: Array<{
    name: string;
    affiliation: string;
    email?: string;
    orcid?: string;
    isCorresponding: boolean;
  }>;
};

type StoredPayload = {
  v: 1;
  savedAt: number;
  payload: GenerationCreateInput;
};

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LAST_KEY = "sf:generationRequest:last";
const jobKey = (jobId: number) => `sf:generationRequest:job:${jobId}`;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeGet(key: string): StoredPayload | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPayload;
    if (!parsed || parsed.v !== 1 || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: StoredPayload): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota/security errors
  }
}

export function saveLastGenerationRequest(payload: GenerationCreateInput): void {
  safeSet(LAST_KEY, { v: 1, savedAt: Date.now(), payload });
}

export function saveGenerationRequestForJob(jobId: number, payload: GenerationCreateInput): void {
  safeSet(jobKey(jobId), { v: 1, savedAt: Date.now(), payload });
}

export function loadGenerationRequestForJob(jobId: number): GenerationCreateInput | null {
  return safeGet(jobKey(jobId))?.payload ?? null;
}

export function loadLastGenerationRequest(): GenerationCreateInput | null {
  return safeGet(LAST_KEY)?.payload ?? null;
}

