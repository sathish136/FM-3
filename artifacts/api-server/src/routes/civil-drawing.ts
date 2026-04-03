import { Router } from "express";
import OpenAI from "openai";

// Always create a fresh client — env vars may be refreshed between restarts
function getOpenAI(): OpenAI {
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

// Robust JSON extractor — handles markdown fences, leading/trailing prose, etc.
function extractJSON(raw: string): any {
  if (!raw?.trim()) throw new Error("AI returned an empty response.");

  // 1. Direct parse
  try { return JSON.parse(raw.trim()); } catch {}

  // 2. Strip ```json ... ``` or ``` ... ``` fences
  const fenceStrip = raw.replace(/^```(?:json)?\s*/i, "").replace(/```[\s\S]*$/i, "").trim();
  try { return JSON.parse(fenceStrip); } catch {}

  // 3. Extract the LARGEST {...} block from anywhere in the text
  let depth = 0, start = -1, best = "";
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === "{") { if (depth === 0) start = i; depth++; }
    else if (raw[i] === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        const candidate = raw.slice(start, i + 1);
        if (candidate.length > best.length) best = candidate;
      }
    }
  }
  if (best) { try { return JSON.parse(best); } catch {} }

  throw new Error("AI returned an unreadable response — please try again.");
}

const router = Router();

// ─── Shared JSON schema description ──────────────────────────────────────────
const LAYOUT_JSON_SCHEMA = `
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
}`;

const LAYOUT_RULES = `
Rules:
- ALL component coordinates (x, y, w, h) MUST be in METERS
- ALL components must fit INSIDE the site boundary (site is 0,0 to siteLength, siteWidth)
- Leave 2m clearance from each site boundary edge for access road
- Leave minimum 1.5m gap between adjacent structures
- Arrange components in logical process flow sequence
- Size each component proportionally — larger tanks for bigger processes
- Use colors: blue=water/tanks, teal=biological, green=treated/storage, amber=sludge, orange=chemical, red=emergency, gray=buildings, purple=advanced treatment (RO/MEE/ATFD)
- Include ALL selected process stages in the layout
- The outlet should be the final treated water storage or outlet structure
- "level" field: negative = underground slab level (e.g. -4.0m), positive = top of structure above ground
- "isUnderground": true if tank slab is below ground level
- "hasManholes": true for buried tanks that need access manholes
- "manholeCount": number of manholes on top of buried tank (1 per 50m²)
- "hasSlope": true if floor is sloped (common in ZLD collection pits)
- "slopeFrom" / "slopeTo": start and end levels of sloped floor`;

function buildLayoutPrompt(plantType: string): string {
  const isZLD = plantType === "ZLD";
  const isSTP = plantType === "STP";

  const specialNotes = isZLD
    ? `ZLD-SPECIFIC RULES:
- Include underground/RCC tanks (negative levels like -1.50m, -4.00m)
- Include elevated platforms (Lvl: +2.65m, +3.15m) above structures
- Include sludge collection pits with small footprints (0.5m×0.5m to 1m×1.8m)
- Include slope annotations on sloped floors (e.g., -2.50 to -4.00m)
- Include manholes (Ø750×750mm) on top of buried tanks — set hasManholes:true, manholeCount appropriately
- Include DAF/Lamella Clarifloculator units
- Include chemical dosing area and bulk storage
- Include multi-effect evaporator / RO / ATFD / agitated thin-film dryer (color: purple)
- Mark underground structures with isUnderground:true and negative level (e.g. level: -4.0)
- Each component should have "level" field for base slab level
- Each component with platform access should have "platform" field for top platform level`
    : isSTP
    ? `STP-SPECIFIC RULES:
- Include screening chamber, grit trap, SBR/MBR/FAB tanks
- Include sludge digester and drying beds
- Include treated water storage and reuse tanks
- color: blue=water, teal=biological treatment, green=storage`
    : `ETP-SPECIFIC RULES:
- Include inlet chamber, equalization, biological treatment
- Include chemical dosing, clarifier, and treated water storage`;

  return `You are a senior civil engineer specializing in ${plantType} (${
    isZLD ? "Zero Liquid Discharge" : isSTP ? "Sewage Treatment Plant" : "Effluent Treatment Plant"
  }) design and layout.

Generate a detailed ${plantType} layout plan for the given parameters. Arrange all components within the site boundary following standard ${plantType} civil engineering design principles.

${LAYOUT_JSON_SCHEMA}
${LAYOUT_RULES}
${specialNotes}`;
}

// ─── Layout Generation ────────────────────────────────────────────────────────
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

    const raw = response.choices[0]?.message?.content ?? "";
    let layout: any;
    try { layout = extractJSON(raw); }
    catch (parseErr: any) {
      console.error("Generate parse error. Raw:", raw.slice(0, 500));
      return res.status(500).json({ error: parseErr.message ?? "AI returned invalid JSON" });
    }
    return res.json({ layout, params: { projectName, siteLength, siteWidth, tankHeight, processSteps, inletFlow, additionalNotes, plantType: pType } });
  } catch (e: any) {
    console.error("Civil drawing generate error:", e);
    return res.status(500).json({ error: e?.message ?? String(e) });
  }
});

// ─── Immediate Correction ─────────────────────────────────────────────────────
router.post("/civil-drawing/correct", async (req, res) => {
  try {
    const { existingLayout, correctionPrompt, params } = req.body as {
      existingLayout: any;
      correctionPrompt: string;
      params: {
        projectName: string; siteLength: number; siteWidth: number; tankHeight: number;
        inletFlow?: string; plantType?: string;
      };
    };

    if (!existingLayout || !correctionPrompt?.trim()) {
      return res.status(400).json({ error: "existingLayout and correctionPrompt are required" });
    }

    const pType = params?.plantType || "ETP";

    // Send a compact layout summary to stay within token budget
    const compactLayout = {
      components: (existingLayout.components ?? []).map((c: any) => ({
        id: c.id, label: c.label, x: c.x, y: c.y, w: c.w, h: c.h,
        type: c.type, color: c.color,
        ...(c.level !== undefined ? { level: c.level } : {}),
        ...(c.isUnderground ? { isUnderground: true } : {}),
        ...(c.hasManholes ? { hasManholes: true, manholeCount: c.manholeCount } : {}),
      })),
      flowArrows: existingLayout.flowArrows ?? [],
      summary: existingLayout.summary ?? "",
    };

    const prompt = `You are a senior civil engineer. Correct the ${pType} plant layout below.

EXISTING LAYOUT (compact):
${JSON.stringify(compactLayout)}

SITE: ${params.siteLength}m × ${params.siteWidth}m · Wall H: ${params.tankHeight}m · Flow: ${params.inletFlow || "N/A"}

CORRECTION REQUEST: "${correctionPrompt}"

Rules:
- Apply ONLY the requested change(s). Keep everything else identical.
- All coordinates in metres, all components inside the site boundary.
- Use colors: blue=water, teal=biological, green=storage, amber=sludge, orange=chemical, purple=RO/MEE/ATFD, gray=buildings.

${LAYOUT_JSON_SCHEMA}

Return COMPLETE corrected JSON only — no extra text.`;

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 6000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    let layout: any;
    try { layout = extractJSON(raw); }
    catch (parseErr: any) {
      console.error("Correct parse error. Raw:", raw.slice(0, 500));
      return res.status(500).json({ error: parseErr.message ?? "AI returned invalid JSON" });
    }
    return res.json({ layout, params });
  } catch (e: any) {
    console.error("Civil drawing correct error:", e);
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

    const raw = response.choices[0]?.message?.content ?? "";
    let analysis: any;
    try { analysis = extractJSON(raw); }
    catch (parseErr: any) {
      console.error("Analyze parse error. Raw:", raw.slice(0, 500));
      return res.status(500).json({ error: parseErr.message ?? "AI returned invalid JSON" });
    }

    return res.json({ analysis, projectName, instruction });
  } catch (e: any) {
    console.error("Civil drawing analyze error:", e);
    return res.status(500).json({ error: e?.message ?? String(e) });
  }
});

export default router;
