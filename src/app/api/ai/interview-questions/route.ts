import { askClaude } from "@/lib/ai/claude-client";

const SYSTEM_PROMPT = `You are an experienced OIG investigator preparing for a formal interview. Generate targeted interview questions based on the case details. Consider the subject's role (complainant, respondent, witness) and the case type. Include: opening questions, substantive questions about the allegations, follow-up probes, and closing questions. Return as JSON with fields: openingQuestions (array), substantiveQuestions (array), probeQuestions (array), closingQuestions (array), interviewTips (array of strings).`;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { caseType, subjectRole, subjectName, caseDescription, knownFacts } =
    body as {
      caseType?: string;
      subjectRole?: string;
      subjectName?: string;
      caseDescription?: string;
      knownFacts?: string[];
    };

  if (!caseType || !subjectRole) {
    return Response.json(
      { error: "caseType and subjectRole are required" },
      { status: 422 },
    );
  }

  try {
    const parts = [
      `Case Type: ${caseType}`,
      `Subject Role: ${subjectRole}`,
    ];
    if (subjectName) parts.push(`Subject Name: ${subjectName}`);
    if (caseDescription) parts.push(`Case Description: ${caseDescription}`);
    if (knownFacts && knownFacts.length > 0) {
      parts.push(`Known Facts:\n${knownFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}`);
    }

    const raw = await askClaude(SYSTEM_PROMPT, parts.join("\n\n"), 2048);

    const jsonStr = raw.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    let questions;
    try {
      questions = JSON.parse(jsonStr);
    } catch {
      questions = {
        openingQuestions: [],
        substantiveQuestions: [],
        probeQuestions: [],
        closingQuestions: [],
        interviewTips: [raw],
      };
    }

    return Response.json({ caseType, subjectRole, questions });
  } catch (err) {
    console.error("Claude interview-questions error:", err);
    const message =
      err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")
        ? "AI service is not configured"
        : "Failed to generate interview questions. Please try again.";
    return Response.json({ error: message }, { status: 503 });
  }
}
