import { withSupabase } from "npm:@supabase/server";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(
  withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) return json({ error: "AI service is not configured" }, 503);

    try {
      const body = await req.json();
      const mode = body?.mode;

      if (mode === "chat") {
        const text = String(body?.text || "").trim();
        if (!text) return json({ error: "Message is required" }, 400);
        if (text.length > 4000) return json({ error: "Message is too long" }, 400);

        const response = await fetch(GROQ_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
              {
                role: "system",
                content:
                  "あなたはTimePilotの学習コーチです。高校生にも分かりやすく、短く実行しやすい学習アドバイスを日本語で返してください。",
              },
              { role: "user", content: text },
            ],
            temperature: 0.4,
            max_tokens: 500,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          console.error("Groq chat error", response.status, data?.error?.message || "unknown");
          return json({ error: "AI service error" }, 502);
        }

        return json({ reply: data?.choices?.[0]?.message?.content || "" });
      }

      if (mode === "plan") {
        const prompt = String(body?.prompt || "").trim();
        if (!prompt) return json({ error: "Prompt is required" }, 400);
        if (prompt.length > 6000) return json({ error: "Prompt is too long" }, 400);

        const response = await fetch(GROQ_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
              {
                role: "system",
                content:
                  "あなたはTimePilotの学習戦略アドバイザーです。ユーザーの条件をもとに、指定されたJSON配列だけを返してください。duration_minsは正の整数にしてください。typeはfocus、break、prepのいずれかです。",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 1200,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          console.error("Groq plan error", response.status, data?.error?.message || "unknown");
          return json({ error: "AI service error" }, 502);
        }

        return json({ content: data?.choices?.[0]?.message?.content || "" });
      }

      return json({ error: "Unknown mode" }, 400);
    } catch (error) {
      console.error("TimePilot AI function error", error);
      return json({ error: "Invalid request" }, 400);
    }
  }),
);
