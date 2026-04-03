import { Router } from "express";
import OpenAI from "openai";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return _openai;
}

const router = Router();

// ─── Layout Generation Prompt ─────────────────────────────────────────────────
function buildLayoutPrompt(plantType: string): string {
  const isZLD = plantType === "ZLD";
  const isSTP = plantType === "STP";

  const specialNotes = isZLD
    ? `ZLD-SPECIFIC RULES:
- Include underground/RCC tanks (negative levels like -1.50m, -4.00m)
- Include elevated platforms (Lvl: +2.65m, +3.15m) above structures
- Include sludge collection pits with small footprints (0.5m×0.5m to 1m×1.8m)
- Include slope annotations on sloped floors (e.g., -2.50 to -4.00m)
- Include manholes (Ø750mm × 750mm or as noted) on top of buried tanks
- Include DAF/Lamella Clarifloculator units
- Include chemical dosing area and bulk storage
- Include multi-effect evaporator / RO / ATFD / agitated thin-film dryer if ZLD
- Mark underground structures with negative level (lvlBelow: true)
- Each component can have "level" field (e.g. -4.0) for the base slab level
- Each component can have "platform" field (e.g. +2.65) for top platform level`
    : isSTP
    ? `STP-SPECIFIC RULES:
- Include screening chamber, grit trap, SBR/MBR/FAB tanks
- Include sludge digester and drying beds
- Include treated water storage and reuse tanks
- Color: blue for water, teal for biological treatment, green for storage`
    : `ETP-SPECIFIC RULES:
- Include inlet chamber, equalization, biological treatment
- Include chemical dosing, clarifier, and treated water storage`;

  return `You are a senior civil engineer specializing in ${plantType} (${
    isZLD ? "Zero Liquid Discharge" : isSTP ? "Sewage Treatment Plant" : "Effluent Treatment Plant"
  }) design and layout.

Generate a detailed ${plantType} layout plan for the given parameters. Arrange all components within the site boundary following standard ${plantType} design principles.

Return ONLY a valid JSON object with this EXACT structure (no markdown, no extra text):
{
  "components": [
    {
      "id": "unique_snake_case_id",
      "label": "Component Full Name",
      "sublabel": "Capacity / Size info (e.g. V=150 m³, HRT=8h)",
      "x": 0.0,
      "y": 0.0,
      "w": 0.0,
      "h": 0.0,
      "type": "tank|chamber|pump_station|building|clarifier|filter|storage|pit|evaporator",
      "color": "blue|teal|green|amber|orange|red|purple|gray",
      "level": -3.5,
      "platform": 2.65,
      "isUnderground": false,
      "hasManholes": false,
      "manholeCount": 0,
      "hasSlope": false,
      "slopeFrom": null,
      "slopeTo": null
    }
  ],
  "flowArrows": [
    { "from": "id1", "to": "id2", "label": "optional flow label" }
  ],
  "inlet": { "x": 0.0, "y": 0.0, "side": "left|top|right|bottom" },
  "outlet": { "x": 0.0, "y": 0.0, "side": "left|top|right|bottom" },
  "summary": "2-3 sentence technical summary of the layout design",
  "capacity": "Design capacity / flow rate description",
  "designNotes": [
    "Key design note 1",
    "Key design note 2",
    "Key design note 3"
  ]
}

Rules:
- ALL component coordinates (x, y, w, h) MUST be in METERS
- ALL components must fit INSIDE the site boundary (site is 0,0 to siteLength, siteWidth)
- Leave 2m clearance from each site boundary edge for access road
- Leave minimum 1.5m gap between adjacent structures
- Arrange components in logical process flow sequence
- Size each component proportionally — larger tanks for bigger processes
- Use colors: blue=water/tanks, teal=biological, green=treated/storage, amber=sludge, orange=chemical, red=emergency, gray=buildings
- Include ALL selected process stages in the layout
- The outlet should be the final treated water storage or outlet structure
- "level" field: negative = underground slab level (e.g. -4.0m), positive = top of structure above ground
- "isUnderground": true if tank slab is below ground level
- "hasManholes": true for buried tanks that need access manholes
- "manholeCount": number of manholes needed (1 per 50m² typically)
- "hasSlope": true if floor is sloped
- "slopeFrom" / "slopeTo": start and end levels of sloped floor (e.g. -2.5, -4.0)

${specialNotes}`;
}

router.post("/civil-drawing/generate", async (req, res) => {
  try {
    const { projectName, siteLength, siteWidth, tankHeight, processSteps, inletFlow, additionalNotes, plantType } = req.body as {
      projectName: string; siteLength: number; siteWidth: number; tankHeight: number;
      processSteps: string[]; inletFlow?: string; additionalNotes?: string; plantType?: string;
    };

    if (!siteLength || !siteWidth || !processSteps?.length) {
      return res.status(400).json({ error: "siteLength, siteWidth and processSteps are required" });
    }

    const pType = plantType || "ETP";

    const userContext = [
      `Plant Type: ${pType}`,
      `Project Name: ${projectName || `${pType} Project`}`,
      `Site Dimensions: ${siteLength}m (length) × ${siteWidth}m (width)`,
      `Tank / Structure Height: ${tankHeight || 3}m (typical above-ground wall height)`,
      `Design Flow Rate: ${inletFlow || "Not specified"}`,
      `Required Process Stages (in order): ${processSteps.join(" → ")}`,
      additionalNotes ? `Additional Requirements: ${additionalNotes}` : null,
    ].filter(Boolean).join("\n");

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 6000,
      messages: [{ role: "user", content: `${userContext}\n\n${buildLayoutPrompt(pType)}` }],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    let layout: any;
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      layout = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: "AI returned invalid JSON", raw });
    }
    return res.json({ layout, params: { projectName, siteLength, siteWidth, tankHeight, processSteps, inletFlow, additionalNotes, plantType: pType } });
  } catch (e: any) {
    console.error("Civil drawing generate error:", e);
    return res.status(500).json({ error: e?.message ?? String(e) });
  }
});

// ─── Drawing Analysis (Vision) ────────────────────────────────────────────────
const ANALYSIS_SYSTEM = `You are an expert civil/structural/MEP engineer and quantity surveyor with 20+ years experience analyzing engineering drawings including ETP, STP, ZLD, and water treatment plant civil drawings.
Analyze the provided engineering drawing image based on the user's instruction.
Return ONLY a valid JSON object (no markdown, no extra text):
{
  "measurements": [
    {
      "item": "Element name",
      "type": "area|length|count|volume|dimension",
      "value": 0.0,
      "unit": "m²|m|nos|m³|mm",
      "notes": "optional clarification"
    }
  ],
  "summary": "2-3 sentence technical summary of findings",
  "keyFindings": [
    "Finding 1",
    "Finding 2"
  ],
  "drawingType": "plan|section|elevation|detail|schematic|unknown",
  "scale": "detected scale if visible or 'Not detected'",
  "disclaimer": "Note any assumptions made due to image resolution or missing information"
}`;

router.post("/civil-drawing/analyze", async (req, res) => {
  try {
    const { imageBase64, mimeType, instruction, projectName } = req.body as {
      imageBase64: string;
      mimeType: string;
      instruction: string;
      projectName?: string;
    };

    if (!imageBase64 || !instruction) {
      return res.status(400).json({ error: "imageBase64 and instruction are required" });
    }

    const validMime = mimeType?.startsWith("image/") ? mimeType : "image/jpeg";

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: ANALYSIS_SYSTEM },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Project: ${projectName || "Engineering Drawing"}\nInstruction: ${instruction}\n\nAnalyze the drawing above and return the JSON result.`,
            },
            {
              type: "image_url",
              image_url: { url: `data:${validMime};base64,${imageBase64}`, detail: "high" },
            },
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    let analysis: any;
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: "AI returned invalid JSON", raw });
    }

    return res.json({ analysis, projectName, instruction });
  } catch (e: any) {
    console.error("Civil drawing analyze error:", e);
    return res.status(500).json({ error: e?.message ?? String(e) });
  }
});

export default router;
