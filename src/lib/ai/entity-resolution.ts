import { prisma } from "@/lib/prisma";

// ─── Duplicate Entity Resolution (EF15, WPN16) ──────────────

/**
 * Levenshtein edit distance between two strings.
 */
export function levenshtein(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;

  if (la === 0) return lb;
  if (lb === 0) return la;

  // Use single-row optimisation
  let prev = new Array(lb + 1);
  let curr = new Array(lb + 1);

  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[lb];
}

/**
 * Simple Soundex implementation for phonetic matching.
 * Returns a 4-character code: first letter + 3 digits.
 */
export function soundex(name: string): string {
  if (!name) return "";

  const upper = name.toUpperCase().replace(/[^A-Z]/g, "");
  if (upper.length === 0) return "";

  const map: Record<string, string> = {
    B: "1", F: "1", P: "1", V: "1",
    C: "2", G: "2", J: "2", K: "2", Q: "2", S: "2", X: "2", Z: "2",
    D: "3", T: "3",
    L: "4",
    M: "5", N: "5",
    R: "6",
  };

  let code = upper[0];
  let prevDigit = map[upper[0]] || "0";

  for (let i = 1; i < upper.length && code.length < 4; i++) {
    const ch = upper[i];
    if (ch === "H" || ch === "W") continue;
    const digit = map[ch];
    if (digit && digit !== prevDigit) {
      code += digit;
      prevDigit = digit;
    } else if (!digit) {
      prevDigit = "0";
    }
  }

  return code.padEnd(4, "0");
}

function emailDomain(email: string | null): string | null {
  if (!email) return null;
  const at = email.indexOf("@");
  return at >= 0 ? email.substring(at + 1).toLowerCase() : null;
}

function addressSimilarity(a: string | null, b: string | null): number {
  if (!a || !b) return 0;
  const na = a.toLowerCase().replace(/[^a-z0-9]/g, "");
  const nb = b.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (na === nb) return 1;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 0;
  return Math.max(0, 1 - dist / maxLen);
}

interface SubjectRecord {
  id: string;
  type: string;
  firstName: string | null;
  lastName: string | null;
  orgName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

interface DuplicatePair {
  subject1: SubjectRecord;
  subject2: SubjectRecord;
  confidence: number;
  matchReasons: string[];
}

export async function findDuplicateSubjects(): Promise<DuplicatePair[]> {
  const subjects = await prisma.subject.findMany({
    select: {
      id: true,
      type: true,
      firstName: true,
      lastName: true,
      orgName: true,
      email: true,
      phone: true,
      address: true,
    },
  });

  const duplicates: DuplicatePair[] = [];

  for (let i = 0; i < subjects.length; i++) {
    for (let j = i + 1; j < subjects.length; j++) {
      const a = subjects[i];
      const b = subjects[j];
      const reasons: string[] = [];
      let score = 0;

      // Name matching — for individuals
      if (a.firstName && b.firstName && a.lastName && b.lastName) {
        const fullA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const fullB = `${b.firstName} ${b.lastName}`.toLowerCase();
        const dist = levenshtein(fullA, fullB);

        if (dist === 0) {
          reasons.push("Exact name match");
          score += 0.5;
        } else if (dist <= 3) {
          reasons.push(`Similar name (edit distance: ${dist})`);
          score += 0.3;
        }

        // Soundex on last name
        const sxA = soundex(a.lastName);
        const sxB = soundex(b.lastName);
        if (sxA && sxB && sxA === sxB && dist > 0) {
          reasons.push(`Phonetic last name match (Soundex: ${sxA})`);
          score += 0.15;
        }
      }

      // Org name matching
      if (a.orgName && b.orgName) {
        const dist = levenshtein(
          a.orgName.toLowerCase(),
          b.orgName.toLowerCase(),
        );
        if (dist === 0) {
          reasons.push("Exact organization name match");
          score += 0.5;
        } else if (dist <= 3) {
          reasons.push(`Similar organization name (edit distance: ${dist})`);
          score += 0.3;
        }
      }

      // Email domain matching
      const domA = emailDomain(a.email);
      const domB = emailDomain(b.email);
      if (a.email && b.email) {
        if (a.email.toLowerCase() === b.email.toLowerCase()) {
          reasons.push("Exact email match");
          score += 0.3;
        } else if (domA && domB && domA === domB) {
          reasons.push(`Same email domain: ${domA}`);
          score += 0.1;
        }
      }

      // Address similarity
      if (a.address && b.address) {
        const addrSim = addressSimilarity(a.address, b.address);
        if (addrSim >= 0.8) {
          reasons.push(`Address similarity: ${Math.round(addrSim * 100)}%`);
          score += 0.15;
        }
      }

      // Phone match
      if (a.phone && b.phone) {
        const pA = a.phone.replace(/\D/g, "");
        const pB = b.phone.replace(/\D/g, "");
        if (pA && pB && pA === pB) {
          reasons.push("Exact phone match");
          score += 0.2;
        }
      }

      // Only report if there are reasons and confidence >= 0.3
      if (reasons.length > 0 && score >= 0.3) {
        duplicates.push({
          subject1: a,
          subject2: b,
          confidence: Math.min(Math.round(score * 100) / 100, 1),
          matchReasons: reasons,
        });
      }
    }
  }

  // Sort by confidence descending
  duplicates.sort((a, b) => b.confidence - a.confidence);

  return duplicates;
}
