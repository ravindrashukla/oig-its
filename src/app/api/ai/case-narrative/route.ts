import { generateCaseNarrative } from "@/lib/ai/case-narrative";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get("caseId");

  if (!caseId) {
    return Response.json(
      { error: "caseId query parameter is required" },
      { status: 422 },
    );
  }

  try {
    const result = await generateCaseNarrative(caseId);
    return Response.json(result);
  } catch (error) {
    console.error("[ai/case-narrative] Error:", error);
    return Response.json(
      { error: "Failed to generate case narrative" },
      { status: 500 },
    );
  }
}
