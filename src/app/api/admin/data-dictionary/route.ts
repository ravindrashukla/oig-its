import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import * as fs from "fs";
import * as path from "path";

interface FieldInfo {
  name: string;
  type: string;
  isRequired: boolean;
  isRelation: boolean;
  description: string;
}

interface ModelInfo {
  model: string;
  fields: FieldInfo[];
}

function parsePrismaSchema(schemaContent: string): ModelInfo[] {
  const models: ModelInfo[] = [];
  const lines = schemaContent.split("\n");

  let currentModel: string | null = null;
  let currentFields: FieldInfo[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect model start
    const modelMatch = line.match(/^model\s+(\w+)\s*\{/);
    if (modelMatch) {
      currentModel = modelMatch[1];
      currentFields = [];
      continue;
    }

    // Detect model end
    if (currentModel && line === "}") {
      models.push({ model: currentModel, fields: currentFields });
      currentModel = null;
      currentFields = [];
      continue;
    }

    // Skip non-field lines inside a model
    if (!currentModel) continue;
    if (line.startsWith("//") || line.startsWith("@@") || line === "") continue;

    // Parse field line
    const fieldMatch = line.match(/^(\w+)\s+(\S+)/);
    if (!fieldMatch) continue;

    const fieldName = fieldMatch[1];
    const rawType = fieldMatch[2];

    // Skip relation-only fields (those that start with a capital and are model references)
    const isRelation = /^[A-Z]/.test(rawType.replace("?", "").replace("[]", ""));
    const isOptional = rawType.includes("?") || line.includes("@default");
    const isRequired = !rawType.includes("?") && !line.includes("@default") && !isRelation;

    // Clean the type
    const cleanType = rawType.replace("?", "").replace("[]", "");

    // Extract inline comment as description
    const commentMatch = line.match(/\/\/\s*(.+)$/);
    const description = commentMatch ? commentMatch[1].trim() : "";

    currentFields.push({
      name: fieldName,
      type: cleanType + (rawType.includes("[]") ? "[]" : "") + (rawType.includes("?") ? "?" : ""),
      isRequired,
      isRelation,
      description,
    });
  }

  return models;
}

function toCsv(models: ModelInfo[]): string {
  const header = "Model,Field,Type,Required,Relation,Description";
  const rows: string[] = [header];

  for (const model of models) {
    for (const field of model.fields) {
      const desc = field.description.replace(/"/g, '""');
      rows.push(
        `${model.model},${field.name},${field.type},${field.isRequired},${field.isRelation},"${desc}"`,
      );
    }
  }

  return rows.join("\n");
}

// ─── GET: Generate data dictionary from Prisma schema ───

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  // Admin only
  if (role !== "ADMIN") {
    return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  // Read the Prisma schema file from disk
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  let schemaContent: string;
  try {
    schemaContent = fs.readFileSync(schemaPath, "utf-8");
  } catch {
    return Response.json(
      { error: "Failed to read Prisma schema file" },
      { status: 500 },
    );
  }

  const models = parsePrismaSchema(schemaContent);

  void logAudit({
    userId,
    action: "READ",
    entityType: "DataDictionary",
    entityId: "schema",
  });

  const url = new URL(request.url);
  const format = url.searchParams.get("format");

  if (format === "csv") {
    const csv = toCsv(models);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="data-dictionary.csv"',
      },
    });
  }

  return Response.json(models);
}
