import type { Step } from "@/types/index";

// Words that carry no meaning about what the step is. Kept short on purpose:
// every word dropped here is a word two genuinely different steps can no longer
// be told apart by.
const STOPWORDS: ReadonlySet<string> = new Set([
  "a",
  "an",
  "the",
  "to",
  "for",
  "of",
  "on",
  "in",
  "and",
  "or",
  "my",
  "with",
  "at",
  "up",
]);

const SUFFIXES = ["ing", "ed", "es", "s"];

/** Minimum Dice score for a near match that is not an exact token match. */
const MIN_SCORE = 0.6;
/** Minimum shared words for a near match, so one common word is never enough. */
const MIN_SHARED = 2;

/** Crude stem so "file", "filing", "filed" and "files" compare equal. */
function stem(word: string): string {
  let out = word;
  for (const suffix of SUFFIXES) {
    if (out.endsWith(suffix) && out.length - suffix.length >= 3) {
      out = out.slice(0, -suffix.length);
      break;
    }
  }
  if (out.endsWith("e") && out.length - 1 >= 2) out = out.slice(0, -1);
  return out;
}

/** The comparable words of a title: lowercased, unpunctuated, stopwords out, stemmed. */
export function stepTokens(title: string): Set<string> {
  const tokens = new Set<string>();
  for (const word of title.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (word && !STOPWORDS.has(word)) tokens.add(stem(word));
  }
  return tokens;
}

type Candidate = Pick<Step, "title" | "completed" | "failed" | "archived" | "updatedAt">;

// Candidate tokens per steps array. The list is rebuilt whenever the data
// changes, so keying on its identity tokenises each step once per change
// rather than once per keystroke.
const tokenCache = new WeakMap<readonly Candidate[], Set<string>[]>();

function candidateTokens(steps: readonly Candidate[]): Set<string>[] {
  let cached = tokenCache.get(steps);
  if (!cached) {
    cached = steps.map((s) => stepTokens(s.title));
    tokenCache.set(steps, cached);
  }
  return cached;
}

/**
 * Open steps whose titles share most of their words with `title`, best first.
 * Completed and failed steps are skipped: a near match there is usually a
 * legitimate repeat, which is what routines are for. Deferred steps count.
 */
export function findSimilarSteps<T extends Candidate>(
  title: string,
  steps: readonly T[],
  limit = 3
): T[] {
  const query = stepTokens(title);
  if (query.size === 0) return [];

  const all = candidateTokens(steps);
  const scored: { step: T; score: number }[] = [];

  steps.forEach((step, i) => {
    if (step.completed || step.failed || step.archived) return;
    const tokens = all[i];
    if (tokens.size === 0) return;

    let shared = 0;
    for (const token of query) if (tokens.has(token)) shared += 1;
    const score = (2 * shared) / (query.size + tokens.size);
    const identical = shared === query.size && shared === tokens.size;

    if (identical || (score >= MIN_SCORE && shared >= MIN_SHARED)) scored.push({ step, score });
  });

  return scored
    .sort((a, b) => b.score - a.score || b.step.updatedAt - a.step.updatedAt)
    .slice(0, limit)
    .map((s) => s.step);
}
