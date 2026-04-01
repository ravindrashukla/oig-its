// ─── Document Classification (DMR1, EF5, EF7) ──────────────

export type DocumentCategory =
  | "LEGAL_SUBPOENA"
  | "INTERVIEW_MEMO"
  | "INVESTIGATION_REPORT"
  | "FINANCIAL_RECORD"
  | "PHOTOGRAPHIC_EVIDENCE"
  | "CORRESPONDENCE"
  | "CONTRACT"
  | "COURT_DOCUMENT"
  | "AUDIO_EVIDENCE"
  | "VIDEO_EVIDENCE"
  | "GENERAL_DOCUMENT";

interface ClassificationResult {
  category: DocumentCategory;
  confidence: number;
  suggestedTags: string[];
}

interface KeywordRule {
  patterns: RegExp[];
  category: DocumentCategory;
  weight: number;
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    patterns: [/subpoena/i, /\bsubp\b/i],
    category: "LEGAL_SUBPOENA",
    weight: 0.9,
  },
  {
    patterns: [/interview/i, /\bMOI\b/, /memorandum\s+of\s+interview/i],
    category: "INTERVIEW_MEMO",
    weight: 0.85,
  },
  {
    patterns: [/\breport\b/i, /\bROI\b/, /report\s+of\s+investigation/i],
    category: "INVESTIGATION_REPORT",
    weight: 0.8,
  },
  {
    patterns: [/invoice/i, /receipt/i, /billing/i, /expenditure/i],
    category: "FINANCIAL_RECORD",
    weight: 0.85,
  },
  {
    patterns: [/photo/i, /image/i, /screenshot/i, /photograph/i],
    category: "PHOTOGRAPHIC_EVIDENCE",
    weight: 0.8,
  },
  {
    patterns: [/email/i, /correspondence/i, /letter/i, /memo(?!randum)/i],
    category: "CORRESPONDENCE",
    weight: 0.75,
  },
  {
    patterns: [/contract/i, /agreement/i, /MOU/i],
    category: "CONTRACT",
    weight: 0.85,
  },
  {
    patterns: [/warrant/i, /affidavit/i, /court\s+order/i, /motion/i],
    category: "COURT_DOCUMENT",
    weight: 0.9,
  },
];

const MIME_CATEGORY_BOOST: Record<string, { category: DocumentCategory; boost: number }> = {
  "image/png": { category: "PHOTOGRAPHIC_EVIDENCE", boost: 0.3 },
  "image/jpeg": { category: "PHOTOGRAPHIC_EVIDENCE", boost: 0.3 },
  "image/gif": { category: "PHOTOGRAPHIC_EVIDENCE", boost: 0.3 },
  "image/webp": { category: "PHOTOGRAPHIC_EVIDENCE", boost: 0.3 },
  "image/tiff": { category: "PHOTOGRAPHIC_EVIDENCE", boost: 0.3 },
  "image/bmp": { category: "PHOTOGRAPHIC_EVIDENCE", boost: 0.3 },
  "audio/mpeg": { category: "AUDIO_EVIDENCE", boost: 0.4 },
  "audio/wav": { category: "AUDIO_EVIDENCE", boost: 0.4 },
  "audio/ogg": { category: "AUDIO_EVIDENCE", boost: 0.4 },
  "audio/mp4": { category: "AUDIO_EVIDENCE", boost: 0.4 },
  "video/mp4": { category: "VIDEO_EVIDENCE", boost: 0.4 },
  "video/mpeg": { category: "VIDEO_EVIDENCE", boost: 0.4 },
  "video/quicktime": { category: "VIDEO_EVIDENCE", boost: 0.4 },
  "video/x-msvideo": { category: "VIDEO_EVIDENCE", boost: 0.4 },
};

export function classifyDocument(
  title: string,
  fileName: string,
  mimeType: string,
  fileSize: number,
): ClassificationResult {
  const text = `${title} ${fileName}`.toLowerCase();
  const tags: string[] = [];

  // Score each category via keyword rules
  const scores = new Map<DocumentCategory, number>();

  for (const rule of KEYWORD_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        const current = scores.get(rule.category) || 0;
        scores.set(rule.category, Math.max(current, rule.weight));
        break; // Only count first matching pattern per rule
      }
    }
  }

  // Apply MIME type boost
  const mimeBoost = MIME_CATEGORY_BOOST[mimeType];
  if (mimeBoost) {
    const current = scores.get(mimeBoost.category) || 0;
    scores.set(mimeBoost.category, current + mimeBoost.boost);
  }

  // Find winning category
  let bestCategory: DocumentCategory = "GENERAL_DOCUMENT";
  let bestScore = 0;

  for (const [cat, score] of scores.entries()) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }

  const confidence = bestScore > 0 ? Math.min(Math.round(bestScore * 100) / 100, 1) : 0.5;

  // Auto-generate tags based on category
  tags.push(bestCategory.toLowerCase().replace(/_/g, "-"));

  if (mimeType.startsWith("image/")) tags.push("image");
  if (mimeType.startsWith("audio/")) tags.push("audio");
  if (mimeType.startsWith("video/")) tags.push("video");
  if (mimeType === "application/pdf") tags.push("pdf");
  if (fileSize > 10 * 1024 * 1024) tags.push("large-file");

  // Extract additional tags from title
  const additionalTags = autoTagDocument(title, "");
  for (const t of additionalTags) {
    if (!tags.includes(t)) tags.push(t);
  }

  return { category: bestCategory, confidence, suggestedTags: tags };
}

/**
 * Extract key entities and topics from text for auto-tagging.
 */
export function autoTagDocument(title: string, description: string): string[] {
  const text = `${title} ${description}`;
  const tags: string[] = [];

  // Dollar amounts
  if (/\$[\d,]+(\.\d{2})?/i.test(text)) tags.push("financial");

  // Dates (various formats)
  if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(text)) tags.push("dated");

  // Case numbers
  if (/\b(case|OIG|INV)[- ]?\d+/i.test(text)) tags.push("case-referenced");

  // Agency names
  const agencies = [
    "FBI",
    "DOJ",
    "HHS",
    "OIG",
    "GAO",
    "SEC",
    "IRS",
    "DOD",
    "VA",
    "EPA",
  ];
  for (const agency of agencies) {
    if (new RegExp(`\\b${agency}\\b`, "i").test(text)) {
      tags.push(`agency-${agency.toLowerCase()}`);
      break; // Only add first match
    }
  }

  // Confidentiality markers
  if (/\b(confidential|sensitive|classified|FOUO)\b/i.test(text)) {
    tags.push("sensitive");
  }

  // PII indicators
  if (/\b(SSN|social\s+security|DOB|date\s+of\s+birth)\b/i.test(text)) {
    tags.push("contains-pii");
  }

  return tags;
}
