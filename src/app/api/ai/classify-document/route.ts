import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkPermission } from "@/lib/rbac";
import { classifyDocument } from "@/lib/ai/document-classifier";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role } = session.user;

  if (!checkPermission(role, "document:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    title?: string;
    fileName?: string;
    mimeType?: string;
    fileSize?: number;
    description?: string;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, fileName, mimeType, fileSize } = body;

  if (!title || !fileName || !mimeType) {
    return Response.json(
      { error: "title, fileName, and mimeType are required" },
      { status: 400 },
    );
  }

  try {
    const result = classifyDocument(
      title,
      fileName,
      mimeType,
      fileSize || 0,
    );

    return Response.json({
      category: result.category,
      confidence: result.confidence,
      suggestedTags: result.suggestedTags,
    });
  } catch (err) {
    console.error("[ai/classify-document] Error:", err);
    return Response.json(
      { error: "Failed to classify document" },
      { status: 500 },
    );
  }
}
