import { findDuplicateComplaints } from "@/lib/ai/complaint-dedup";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = body as { subject?: string; description?: string };

  if (!data.subject || !data.description) {
    return Response.json(
      { error: "subject and description are required" },
      { status: 422 },
    );
  }

  try {
    const result = await findDuplicateComplaints(data.subject, data.description);
    return Response.json(result);
  } catch (error) {
    console.error("[ai/complaint-dedup] Error:", error);
    return Response.json(
      { error: "Failed to check for duplicate complaints" },
      { status: 500 },
    );
  }
}
