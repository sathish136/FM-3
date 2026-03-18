import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const BOM_PROMPT = `You are an expert process engineer analyzing a P&ID (Piping and Instrumentation Diagram).

Carefully examine this P&ID image and extract ALL equipment, instruments, valves, and components visible.

Return a JSON object with this exact structure:
{
  "summary": "Brief 1-2 sentence summary of what this P&ID shows",
  "items": [
    {
      "tag": "Equipment tag number (e.g. P-101, V-201, FT-301, or leave blank if not labeled)",
      "type": "Category: Pump | Valve | Vessel | Tank | Heat Exchanger | Instrument | Pipe | Compressor | Filter | Sensor | Control Valve | Safety Valve | Check Valve | Gate Valve | Ball Valve | Other",
      "description": "Brief description of the item and its function",
      "quantity": 1,
      "specifications": "Any specifications visible (size, rating, material, etc.) or empty string"
    }
  ]
}

Rules:
- Include EVERY identifiable component — even if no tag is visible
- Group identical repeated items with quantity > 1 where sensible
- Be specific about valve types (gate, ball, check, control, safety, etc.)
- Include all instruments (flow meters, pressure gauges, temperature sensors, level indicators, etc.)
- Return ONLY valid JSON, no markdown, no extra text`;

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

    const systemMsg = [
      pidName ? `P&ID Document: ${pidName}` : null,
      projectName ? `Project: ${projectName}` : null,
      revision ? `Revision: ${revision}` : null,
    ].filter(Boolean).join(" | ");

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "user",
        content: [
          ...(systemMsg ? [{ type: "text" as const, text: systemMsg }] : []),
          { type: "text" as const, text: BOM_PROMPT },
          {
            type: "image_url" as const,
            image_url: {
              url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
              detail: "high",
            },
          },
        ],
      },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 8192,
      messages,
    });

    const raw = response.choices[0]?.message?.content ?? "{}";

    let parsed: { summary?: string; items?: unknown[] };
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: "AI returned invalid JSON", raw });
    }

    res.json({
      summary: parsed.summary ?? "",
      items: Array.isArray(parsed.items) ? parsed.items : [],
    });
  } catch (e: any) {
    console.error("P&ID analyze error:", e);
    res.status(500).json({ error: e?.message ?? String(e) });
  }
});

export default router;
