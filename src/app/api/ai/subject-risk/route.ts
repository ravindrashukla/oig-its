import { profileSubjectRisk, profileAllSubjects } from "@/lib/ai/subject-risk";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get("subjectId");

  try {
    if (subjectId) {
      const result = await profileSubjectRisk(subjectId);
      return Response.json(result);
    }

    const result = await profileAllSubjects();
    return Response.json({ subjects: result });
  } catch (error) {
    console.error("[ai/subject-risk] Error:", error);
    return Response.json(
      { error: "Failed to profile subject risk" },
      { status: 500 },
    );
  }
}
