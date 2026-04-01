import { askClaude } from "@/lib/ai/claude-client";

const SYSTEM_PROMPT = `You are a document analyst for OPM Office of Inspector General investigations. Analyze this document and extract: 1) Key facts (dates, names, amounts), 2) Relevant entities (people, organizations), 3) Potential red flags or indicators of fraud/waste/abuse, 4) Document classification (legal, financial, interview, correspondence, etc.), 5) Recommended follow-up actions. Return as JSON with fields: keyFacts, entities, redFlags, classification, recommendedActions, summary.`;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, content } = body as { title?: string; content?: string };
  if (!content || typeof content !== "string") {
    return Response.json(
      { error: "content is required" },
      { status: 422 },
    );
  }

  try {
    const userMessage = `Document Title: ${title || "Untitled"}\n\nDocument Content:\n${content}`;
    const raw = await askClaude(SYSTEM_PROMPT, userMessage, 2048);

    // Extract JSON from response
    const jsonStr = raw.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    let analysis;
    try {
      analysis = JSON.parse(jsonStr);
    } catch {
      // If Claude didn't return valid JSON, wrap the text response
      analysis = {
        summary: raw,
        keyFacts: [],
        entities: [],
        redFlags: [],
        classification: "unknown",
        recommendedActions: [],
      };
    }

    return Response.json({ title: title || "Untitled", analysis });
  } catch (err) {
    console.error("Claude analyze-document error:", err);
    const message =
      err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")
        ? "AI service is not configured"
        : "Document analysis failed. Please try again.";
    return Response.json({ error: message }, { status: 503 });
  }
}
