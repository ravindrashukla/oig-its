import { analyzeWorkload } from "@/lib/ai/workload-balancing";

export async function GET() {
  try {
    const result = await analyzeWorkload();
    return Response.json(result);
  } catch (error) {
    console.error("[ai/workload] Error:", error);
    return Response.json(
      { error: "Failed to analyze workload" },
      { status: 500 },
    );
  }
}
