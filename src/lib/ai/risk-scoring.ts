// ─── Risk Scoring for Complaints ────────────────────────

export interface RiskFactor {
  factor: string;
  points: number;
  description: string;
}

export interface RiskScore {
  score: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  factors: RiskFactor[];
}

interface InquiryInput {
  subject: string;
  description: string;
  source?: string;
  category?: string;
  isAnonymous?: boolean;
  complainantEmail?: string | null;
  complainantPhone?: string | null;
  complainantName?: string | null;
}

// ─── Keyword weights ────────────────────────────────────

const KEYWORD_WEIGHTS: [RegExp, number, string][] = [
  [/\bfraud\b/i, 20, "Fraud-related keyword detected"],
  [/\btheft\b/i, 15, "Theft-related keyword detected"],
  [/\bsteal(ing)?\b/i, 15, "Theft-related keyword detected"],
  [/\bretali(ation|ated|ating)\b/i, 15, "Retaliation-related keyword detected"],
  [/\bsafety\b/i, 10, "Safety concern detected"],
  [/\bbilling\b/i, 10, "Billing-related keyword detected"],
  [/\bembezzl/i, 20, "Embezzlement keyword detected"],
  [/\bbrib(e|ery|ing)\b/i, 20, "Bribery keyword detected"],
  [/\bcorrupt(ion)?\b/i, 15, "Corruption keyword detected"],
  [/\bkickback/i, 15, "Kickback keyword detected"],
  [/\bfalsif(y|ied|ication)\b/i, 15, "Falsification keyword detected"],
  [/\bwhistleblower\b/i, 10, "Whistleblower reference detected"],
  [/\bthreat(en|s|ened)?\b/i, 10, "Threat-related keyword detected"],
  [/\bweapon\b/i, 10, "Weapon-related keyword detected"],
  [/\bviolat(e|ion|ing)\b/i, 10, "Violation keyword detected"],
  [/\bmisconduct\b/i, 10, "Misconduct keyword detected"],
  [/\bwaste\b/i, 5, "Waste keyword detected"],
  [/\babuse\b/i, 10, "Abuse keyword detected"],
  [/\bnegligen(ce|t)\b/i, 10, "Negligence keyword detected"],
];

const SOURCE_WEIGHTS: Record<string, number> = {
  WHISTLEBLOWER: 15,
  CONGRESSIONAL: 10,
  HOTLINE: 5,
  REFERRAL: 5,
  MANAGEMENT: 5,
  AUDIT: 5,
};

const HIGH_PRIORITY_CATEGORIES = new Set([
  "FRAUD",
  "CRIMINAL",
  "SAFETY",
  "WHISTLEBLOWER_RETALIATION",
  "PUBLIC_SAFETY",
  "EMBEZZLEMENT",
]);

// ─── Main scoring function ──────────────────────────────

export function scoreInquiry(inquiry: InquiryInput): RiskScore {
  const factors: RiskFactor[] = [];
  let totalPoints = 0;

  // 1. Keyword analysis on subject + description
  const text = `${inquiry.subject} ${inquiry.description}`;
  const matchedKeywords = new Set<string>();

  for (const [pattern, points, desc] of KEYWORD_WEIGHTS) {
    if (pattern.test(text) && !matchedKeywords.has(desc)) {
      matchedKeywords.add(desc);
      factors.push({ factor: "keyword", points, description: desc });
      totalPoints += points;
    }
  }

  // 2. Source weight
  if (inquiry.source) {
    const sourcePoints = SOURCE_WEIGHTS[inquiry.source] ?? 0;
    if (sourcePoints > 0) {
      factors.push({
        factor: "source",
        points: sourcePoints,
        description: `Source: ${inquiry.source} (+${sourcePoints})`,
      });
      totalPoints += sourcePoints;
    }
  }

  // 3. Contact info availability
  if (!inquiry.isAnonymous) {
    factors.push({ factor: "contact", points: 10, description: "Non-anonymous complaint (+10)" });
    totalPoints += 10;

    if (inquiry.complainantEmail) {
      factors.push({ factor: "contact", points: 5, description: "Email provided (+5)" });
      totalPoints += 5;
    }
    if (inquiry.complainantPhone) {
      factors.push({ factor: "contact", points: 5, description: "Phone provided (+5)" });
      totalPoints += 5;
    }
  }

  // 4. Description length (detail level)
  const descLen = inquiry.description?.length ?? 0;
  if (descLen > 1000) {
    factors.push({ factor: "detail", points: 15, description: "Highly detailed description (>1000 chars)" });
    totalPoints += 15;
  } else if (descLen > 500) {
    factors.push({ factor: "detail", points: 10, description: "Detailed description (>500 chars)" });
    totalPoints += 10;
  } else if (descLen > 200) {
    factors.push({ factor: "detail", points: 5, description: "Moderate description length (>200 chars)" });
    totalPoints += 5;
  }

  // 5. Category match
  if (inquiry.category && HIGH_PRIORITY_CATEGORIES.has(inquiry.category.toUpperCase())) {
    factors.push({
      factor: "category",
      points: 10,
      description: `High-priority category: ${inquiry.category} (+10)`,
    });
    totalPoints += 10;
  }

  // Clamp to 0-100
  const score = Math.max(0, Math.min(100, totalPoints));

  let riskLevel: RiskScore["riskLevel"];
  if (score >= 75) riskLevel = "CRITICAL";
  else if (score >= 50) riskLevel = "HIGH";
  else if (score >= 25) riskLevel = "MEDIUM";
  else riskLevel = "LOW";

  return { score, riskLevel, factors };
}
