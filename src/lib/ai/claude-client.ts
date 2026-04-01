import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return client;
}

export async function askClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1024,
): Promise<string> {
  const anthropic = getClient();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await anthropic.messages.create(
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      },
      { signal: controller.signal },
    );
    return response.content[0].type === "text" ? response.content[0].text : "";
  } finally {
    clearTimeout(timeout);
  }
}
