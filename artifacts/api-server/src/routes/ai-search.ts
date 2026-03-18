import { Router } from "express";
import OpenAI from "openai";

const router = Router();
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

router.post("/ai-search", async (req, res) => {
  try {
    const { query, history = [] } = req.body as {
      query: string;
      history?: { role: "user" | "assistant"; content: string }[];
    };

    if (!query?.trim()) {
      return res.status(400).json({ error: "Query is required" });
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          "You are a helpful AI assistant for WTT Project Management. You help users with questions about projects, tasks, deadlines, team management, engineering workflows, and general work topics. Be concise and practical in your responses.",
      },
      ...history.map((m) => ({ role: m.role, content: m.content } as OpenAI.Chat.ChatCompletionMessageParam)),
      { role: "user", content: query },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1024,
    });

    const answer = completion.choices[0]?.message?.content ?? "No response";
    res.json({ answer });
  } catch (e) {
    console.error("AI search error:", e);
    res.status(500).json({ error: String(e) });
  }
});

export default router;
