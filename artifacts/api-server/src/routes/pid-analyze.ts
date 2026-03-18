import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Fix #1: Use gpt-5.2 (supports image inputs, not legacy)
const MODEL = "gpt-5.2";
const ANALYZE_TIMEOUT_MS = 60_000;

// Fix #9: System message carries role/instructions; user message carries image + context
const SYSTEM_PROMPT = `You are an expert process engineer specializing in P&ID (Piping and Instrumentation Diagram) interpretation and BOM generation.

Your task is to visually inspect a P&ID image and extract every identifiable component.

Return a JSON object with this EXACT structure — no markdown, no extra text, only valid JSON:
{
  "summary": "1-2 sentence description of what this P&ID represents",
  "items": [
    {
      "tag": "Equipment tag (e.g. P-101, V-201, FT-301) — empty string if not labeled",
      "type": "One of: Pump | Compressor | Vessel | Tank | Heat Exchanger | Filter | Valve | Control Valve | Safety Valve | Check Valve | Gate Valve | Ball Valve | Globe Valve | Butterfly Valve | Instrument | Flow Meter | Pressure Gauge | Temperature Sensor | Level Indicator | Analyzer | Pipe | Other",
      "description": "Brief function description",
      "quantity": 1,
      "specifications": "Size, rating, material, class visible on drawing — empty string if none"
    }
  ]
}

Rules:
- List EVERY component visible, even if unlabeled
- Group identical unnamed items with quantity > 1
- Distinguish valve sub-types precisely (gate, ball, check, control, safety, etc.)
- Include all instruments: FT, PT, TT, LT, AT, FIC, PIC, TIC, LIC, etc.
- Do NOT invent data — only report what is visible`;

router.post("/pid/analyze", async (req, res) => {
  try {
    const { imageBase64, pidName, projectName, revision } = req.body as {
      imageBase64: string;
      pidName?: string;
      projectName?: string;
      revision?: string;
    };

    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 is required" });
    }

    const contextParts = [
      pidName ? `P&ID Document: ${pidName}` : null,
      projectName ? `Project: ${projectName}` : null,
      revision ? `Revision: ${revision}` : null,
    ].filter(Boolean);

    const userText = contextParts.length > 0
      ? `Context: ${contextParts.join(" | ")}\n\nAnalyze this P&ID and return the BOM JSON.`
      : "Analyze this P&ID and return the BOM JSON.";

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text" as const, text: userText },
          {
            type: "image_url" as const,
            image_url: {
              url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`,
              detail: "high",
            },
          },
        ],
      },
    ];

    // Fix #8: 60-second abort timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);

    let response: OpenAI.Chat.Completions.ChatCompletion;
    try {
      response = await openai.chat.completions.create(
        { model: MODEL, max_completion_tokens: 8192, messages },
        { signal: controller.signal },
      );
    } finally {
      clearTimeout(timeoutId);
    }

    const raw = response.choices[0]?.message?.content ?? "{}";

    // Fix JSON parsing — strip markdown fences and any stray leading text
    let parsed: { summary?: string; items?: unknown[] };
    try {
      const fenceStripped = raw.replace(/^```(?:json)?\s*/im, "").replace(/```\s*$/im, "").trim();
      const jsonStart = fenceStripped.indexOf("{");
      const cleaned = jsonStart >= 0 ? fenceStripped.slice(jsonStart) : fenceStripped;
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: "AI returned invalid JSON", raw });
    }

    // Fix #7: Coerce quantity to number
    const rawItems: unknown[] = Array.isArray(parsed.items) ? parsed.items : [];
    const items = rawItems.map((item: any) => ({
      tag: String(item.tag ?? ""),
      type: String(item.type ?? "Other"),
      description: String(item.description ?? ""),
      quantity: Number(item.quantity) || 1,
      specifications: String(item.specifications ?? ""),
    }));

    res.json({ summary: parsed.summary ?? "", items });
  } catch (e: any) {
    console.error("P&ID analyze error:", e);
    if (e?.name === "AbortError" || e?.code === "ERR_CANCELED") {
      return res.status(504).json({ error: "Analysis timed out. Please try again." });
    }
    res.status(500).json({ error: e?.message ?? String(e) });
  }
});

export default router;
