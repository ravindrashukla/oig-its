import { prisma } from "@/lib/prisma";
import { levenshtein } from "@/lib/ai/entity-resolution";

// ─── Complaint Deduplication (EF15, HWC1) ──────────────────

interface DuplicateMatch {
  type: "inquiry" | "case";
  id: string;
  title: string;
  similarity: number;
  matchedKeywords: string[];
}

/**
 * Tokenize text into lowercase keywords, removing stop words and short tokens.
 */
function tokenize(text: string): Set<string> {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "shall",
    "should", "may", "might", "must", "can", "could", "of", "in", "to",
    "for", "with", "on", "at", "from", "by", "about", "as", "into",
    "through", "during", "before", "after", "and", "but", "or", "nor",
    "not", "so", "yet", "both", "either", "neither", "each", "every",
    "this", "that", "these", "those", "it", "its", "i", "we", "they",
    "he", "she", "my", "your", "his", "her", "our", "their",
  ]);

  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/);
  const tokens = new Set<string>();
  for (const w of words) {
    if (w.length >= 3 && !stopWords.has(w)) {
      tokens.add(w);
    }
  }
  return tokens;
}

/**
 * Jaccard similarity between two token sets.
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Normalized Levenshtein similarity (0-1, where 1 = exact match).
 */
function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Find complaints (inquiries and cases) that are potential duplicates
 * of a new complaint based on subject line and description similarity.
 */
export async function findDuplicateComplaints(
  subject: string,
  description: string,
): Promise<{ duplicates: DuplicateMatch[] }> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Query recent inquiries
  const inquiries = await prisma.preliminaryInquiry.findMany({
    where: {
      createdAt: { gte: ninetyDaysAgo },
      status: { not: "CLOSED" },
    },
    select: {
      id: true,
      subject: true,
      description: true,
    },
  });

  // Query open cases
  const cases = await prisma.case.findMany({
    where: {
      status: { in: ["INTAKE", "OPEN", "ACTIVE", "UNDER_REVIEW", "PENDING_ACTION"] },
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      description: true,
    },
  });

  const inputTokens = tokenize(`${subject} ${description}`);
  const duplicates: DuplicateMatch[] = [];

  // Compare against inquiries
  for (const inq of inquiries) {
    const subjectSim = levenshteinSimilarity(subject, inq.subject);
    const descTokens = tokenize(`${inq.subject} ${inq.description}`);
    const keywordSim = jaccardSimilarity(inputTokens, descTokens);

    // Combined similarity: weight subject match higher
    const combined = subjectSim * 0.6 + keywordSim * 0.4;

    if (combined >= 0.3) {
      const matchedKeywords: string[] = [];
      for (const token of inputTokens) {
        if (descTokens.has(token)) matchedKeywords.push(token);
      }

      duplicates.push({
        type: "inquiry",
        id: inq.id,
        title: inq.subject,
        similarity: Math.round(combined * 100) / 100,
        matchedKeywords,
      });
    }
  }

  // Compare against cases
  for (const c of cases) {
    const subjectSim = levenshteinSimilarity(subject, c.title);
    const caseText = `${c.title} ${c.description || ""}`;
    const caseTokens = tokenize(caseText);
    const keywordSim = jaccardSimilarity(inputTokens, caseTokens);

    const combined = subjectSim * 0.6 + keywordSim * 0.4;

    if (combined >= 0.3) {
      const matchedKeywords: string[] = [];
      for (const token of inputTokens) {
        if (caseTokens.has(token)) matchedKeywords.push(token);
      }

      duplicates.push({
        type: "case",
        id: c.id,
        title: c.title,
        similarity: Math.round(combined * 100) / 100,
        matchedKeywords,
      });
    }
  }

  // Sort by similarity descending
  duplicates.sort((a, b) => b.similarity - a.similarity);

  return { duplicates };
}
