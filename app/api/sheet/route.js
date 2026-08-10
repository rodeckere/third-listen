export async function POST(request) {
  const { prompt, maxTokens, useSearch, model } = await request.json();

  const body = {
    model: model || "claude-sonnet-4-6",
    max_tokens: maxTokens || 4000,
    messages: [{ role: "user", content: prompt }],
  };

  if (useSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  return Response.json(await res.json());
}