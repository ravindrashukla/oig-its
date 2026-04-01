import { mineFinancialPatterns } from "@/lib/ai/financial-patterns";

export async function GET() {
  try {
    const result = await mineFinancialPatterns();
    return Response.json(result);
  } catch (error) {
    console.error("[ai/financial-patterns] Error:", error);
    return Response.json(
      { error: "Failed to mine financial patterns" },
      { status: 500 },
    );
  }
}
