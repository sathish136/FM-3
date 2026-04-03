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
CRITICAL RULES — follow exactly:

1. ALL coordinates (x, y, w, h) are in METRES. Origin is top-left corner of site (0,0).
2. Site boundary: x from 0 to siteLength, y from 0 to siteWidth. ALL components must stay INSIDE.
3. Keep 2m clearance from every site boundary edge (access road). So usable area: x from 2 to (siteLength-2), y from 2 to (siteWidth-2).
4. NO OVERLAPPING: Two components must not share any area. For any two components A and B, at least ONE of these must be true:
   A.x + A.w + 2 <= B.x   (A is left of B)
   B.x + B.w + 2 <= A.x   (B is left of A)
   A.y + A.h + 2 <= B.y   (A is above B)
   B.y + B.h + 2 <= A.y   (B is above A)
   The "2" means at least 2m gap in every direction.
5. GRID PLACEMENT STRATEGY — divide usable area into rows and columns, place one component per cell:
   - Calculate usable width = siteLength - 4, usable height = siteWidth - 4
   - Decide on columns (typically 3-5) and rows (typically 2-4) based on component count
   - Each cell has padding: component starts at cell_x + 0.5, cell_y + 0.5; width = cell_w - 1, height = cell_h - 1
   - Fill cells left-to-right, top-to-bottom, in process flow order
   - Large tanks (biological, equalization, clarifier) occupy 2 cells wide or 2 cells tall
6. SIZING — size components realistically based on flow rate and HRT:
   - Equalization tank: 4-12m wide, 4-10m tall (depending on flow)
   - Biological/Aeration: typically the LARGEST tank, 8-18m wide
   - Secondary clarifier: 4-8m diameter (use square footprint)
   - Pump room / blower room: 4-6m × 3-5m (building)
   - Collection pits: 0.5-2m × 0.5-2m (small)
7. Colors: blue=water/liquid tanks, teal=biological treatment, green=treated water storage, amber=sludge handling, orange=chemical dosing, purple=advanced treatment (RO/MEE/ATFD), gray=buildings/rooms
8. Level annotations: "level" = base slab level (negative = below ground, e.g. -4.0; positive = above ground structure top)
9. isUnderground: true for tanks with negative slab levels
10. hasManholes: true for buried tanks; manholeCount = 1 per 50m² floor area
11. hasSlope / slopeFrom / slopeTo: for sloped-floor collection pits`;

// Post-process: fix any remaining overlaps by spreading components apart
function fixOverlaps(components: any[], siteL: number, siteW: number): any[] {
  const MARGIN = 2;
  const BOUNDARY = 2;
  const result = components.map(c => ({ ...c }));

  for (let pass = 0; pass < 30; pass++) {
    let changed = false;
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i], b = result[j];
        const overlapX = Math.min(a.x + a.w + MARGIN, b.x + b.w + MARGIN) - Math.max(a.x, b.x);
        const overlapY = Math.min(a.y + a.h + MARGIN, b.y + b.h + MARGIN) - Math.max(a.y, b.y);
        if (overlapX > 0 && overlapY > 0) {
          // Push the second component in the direction of least resistance
          if (overlapX < overlapY) {
            b.x = a.x + a.w + MARGIN;
          } else {
            b.y = a.y + a.h + MARGIN;
          }
          // Clamp to boundary
          b.x = Math.max(BOUNDARY, Math.min(b.x, siteL - BOUNDARY - b.w));
          b.y = Math.max(BOUNDARY, Math.min(b.y, siteW - BOUNDARY - b.h));
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return result;
}

function buildLayoutPrompt(plantType: string, siteL: number, siteW: number, count: number): string {
  const isZLD = plantType === "ZLD";
  const isSTP = plantType === "STP";

  const cols = count <= 4 ? 2 : count <= 9 ? 3 : 4;
  const rows = Math.ceil(count / cols);
  const cellW = ((siteL - 4) / cols).toFixed(1);
  const cellH = ((siteW - 4) / rows).toFixed(1);

  const gridExample = `GRID EXAMPLE for this site (${siteL}m × ${siteW}m, ${cols} columns × ${rows} rows):
Each cell is approximately ${cellW}m wide × ${cellH}m tall.
Cell positions (top-left corners):
${Array.from({ length: Math.min(count, cols * rows) }, (_, i) => {
  const col = i % cols;
  const row = Math.floor(i / cols);
  const cx = (2 + col * (siteL - 4) / cols).toFixed(1);
  const cy = (2 + row * (siteW - 4) / rows).toFixed(1);
  return `  Cell ${i + 1}: x=${cx}, y=${cy} (component occupies ~${(parseFloat(cellW) - 1).toFixed(1)}m × ${(parseFloat(cellH) - 1).toFixed(1)}m)`;
}).join("\n")}`;

  const specialNotes = isZLD
    ? `ZLD-SPECIFIC:
- Underground tanks (level: -4.00, isUnderground: true, hasManholes: true)
- Elevated platforms (platform: 2.65 or 3.15 on distribution and blower room)
- Collection pits: very small (w=0.5-1m, h=0.5-1.8m), place near edges
- Slope on collection pit floors (hasSlope:true, slopeFrom:-2.50, slopeTo:-4.00)
- DAF, Lamella Clarifloculator, MEE (color:purple), ATFD (color:purple), RO (color:purple)
- Chemical bulk storage (color:orange), Biological Blower Room (color:gray), Electrical Panel Room (color:gray)`
    : isSTP
    ? `STP-SPECIFIC: Screening, grit trap, SBR/FAB tanks (teal), sludge drying beds (amber), treated UGT (green), pump room (gray)`
    : `ETP-SPECIFIC: Inlet chamber, equalization (blue), aeration/biological (teal), clarifier (blue), treated storage (green), pump/blower rooms (gray)`;

  return `You are a senior civil engineer designing a ${plantType} plant layout.
Your output is fed directly into a CAD renderer — coordinate accuracy and NO OVERLAPPING is critical.

${LAYOUT_JSON_SCHEMA}

${LAYOUT_RULES}

${gridExample}

${specialNotes}

VERIFICATION STEP: After placing all components, check every pair for overlap using rule #4. If any overlap exists, adjust coordinates before returning JSON.`;
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
      messages: [{ role: "user", content: `${userContext}\n\n${buildLayoutPrompt(pType, siteLength, siteWidth, processSteps.length)}` }],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    let layout: any;
    try { layout = extractJSON(raw); }
    catch (parseErr: any) {
      console.error("Generate parse error. Raw:", raw.slice(0, 500));
      return res.status(500).json({ error: parseErr.message ?? "AI returned invalid JSON" });
    }
    // Post-process: fix any AI-generated overlaps
    if (Array.isArray(layout?.components)) {
      layout.components = fixOverlaps(layout.components, siteLength, siteWidth);
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
    if (Array.isArray(layout?.components)) {
      layout.components = fixOverlaps(layout.components, params.siteLength, params.siteWidth);
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
