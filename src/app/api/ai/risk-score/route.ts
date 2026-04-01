import { scoreInquiry } from "@/lib/ai/risk-scoring";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = body as {
    subject?: string;
    description?: string;
    source?: string;
    category?: string;
    isAnonymous?: boolean;
  };

  if (!data.subject || !data.description) {
    return Response.json(
      { error: "subject and description are required" },
      { status: 422 },
    );
  }

  try {
    const result = scoreInquiry({
      subject: data.subject,
      description: data.description,
      source: data.source,
      category: data.category,
      isAnonymous: data.isAnonymous,
    });

    return Response.json(result);
  } catch (error) {
    console.error("[ai/risk-score] Error:", error);
    return Response.json({ error: "Failed to calculate risk score" }, { status: 500 });
  }
}
