import { Router } from "express";
import { db, pool } from "@workspace/db";
import { visitingCardsTable } from "@workspace/db/schema";
import { eq, desc, and, ilike, or, sql } from "drizzle-orm";
import OpenAI from "openai";

// Idempotent table creation on startup (matches the rest of this server)
pool.query(`
  CREATE TABLE IF NOT EXISTS visiting_cards (
    id SERIAL PRIMARY KEY,
    name TEXT, designation TEXT, company TEXT, department TEXT,
    email TEXT, phones TEXT, website TEXT,
    address TEXT, city TEXT, country TEXT,
    notes TEXT, tags TEXT,
    category TEXT NOT NULL DEFAULT 'lead',
    source  TEXT NOT NULL DEFAULT 'scan',
    meeting_context TEXT,
    front_image TEXT, back_image TEXT,
    raw_text TEXT, meta JSONB,
    created_by TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  ALTER TABLE visiting_cards ADD COLUMN IF NOT EXISTS city TEXT;
  ALTER TABLE visiting_cards ADD COLUMN IF NOT EXISTS country TEXT;
  ALTER TABLE visiting_cards ADD COLUMN IF NOT EXISTS meeting_context TEXT;
  CREATE INDEX IF NOT EXISTS visiting_cards_company_idx ON visiting_cards(company);
  CREATE INDEX IF NOT EXISTS visiting_cards_category_idx ON visiting_cards(category);
  CREATE INDEX IF NOT EXISTS visiting_cards_created_at_idx ON visiting_cards(created_at DESC);
`).then(() => console.log("visiting_cards table ready"))
  .catch((e: any) => console.error("visiting_cards migration error:", e.message));

const router = Router();

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
    });
  }
  return _openai;
}

// ─── List with optional search/filter ──────────────────────────────────────
router.get("/visiting-cards", async (req, res) => {
  try {
    const { q, category } = req.query as { q?: string; category?: string };
    const conds: any[] = [];
    if (q && q.trim()) {
      const like = `%${q.trim()}%`;
      conds.push(or(
        ilike(visitingCardsTable.name, like),
        ilike(visitingCardsTable.company, like),
        ilike(visitingCardsTable.email, like),
        ilike(visitingCardsTable.phones, like),
        ilike(visitingCardsTable.designation, like),
        ilike(visitingCardsTable.tags, like),
      ));
    }
    if (category && category !== "all") conds.push(eq(visitingCardsTable.category, category));
    const where = conds.length ? (conds.length === 1 ? conds[0] : and(...conds)) : undefined;
    const rows = where
      ? await db.select().from(visitingCardsTable).where(where).orderBy(desc(visitingCardsTable.createdAt)).limit(500)
      : await db.select().from(visitingCardsTable).orderBy(desc(visitingCardsTable.createdAt)).limit(500);
    res.json(rows);
  } catch (e: any) {
    console.error("GET /visiting-cards error:", e);
    res.status(500).json({ error: String(e) });
  }
});

router.get("/visiting-cards/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(visitingCardsTable).where(eq(visitingCardsTable.id, Number(req.params.id)));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ─── Reports / aggregate stats ─────────────────────────────────────────────
router.get("/visiting-cards-report/stats", async (_req, res) => {
  try {
    const [totals] = await pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE category='customer')::int AS customers,
         COUNT(*) FILTER (WHERE category='vendor')::int AS vendors,
         COUNT(*) FILTER (WHERE category='partner')::int AS partners,
         COUNT(*) FILTER (WHERE category='lead')::int AS leads,
         COUNT(*) FILTER (WHERE category='other')::int AS others,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS last_7,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS last_30,
         COUNT(*) FILTER (WHERE back_image IS NOT NULL AND back_image <> '')::int AS with_back
       FROM visiting_cards`
    ).then((r: any) => r.rows);
    const byCompany = await pool.query(
      `SELECT COALESCE(NULLIF(company,''),'(unknown)') AS company, COUNT(*)::int AS count
       FROM visiting_cards GROUP BY 1 ORDER BY count DESC LIMIT 10`
    ).then((r: any) => r.rows);
    const byCity = await pool.query(
      `SELECT COALESCE(NULLIF(city,''),'(unknown)') AS city, COUNT(*)::int AS count
       FROM visiting_cards GROUP BY 1 ORDER BY count DESC LIMIT 10`
    ).then((r: any) => r.rows);
    const byMonth = await pool.query(
      `SELECT TO_CHAR(date_trunc('month', created_at),'YYYY-MM') AS month, COUNT(*)::int AS count
       FROM visiting_cards
       WHERE created_at >= NOW() - INTERVAL '12 months'
       GROUP BY 1 ORDER BY 1 ASC`
    ).then((r: any) => r.rows);
    const recent = await db.select().from(visitingCardsTable).orderBy(desc(visitingCardsTable.createdAt)).limit(10);
    res.json({ totals, byCompany, byCity, byMonth, recent });
  } catch (e: any) {
    console.error("GET /visiting-cards-report/stats error:", e);
    res.status(500).json({ error: String(e) });
  }
});

// ─── CSV export ────────────────────────────────────────────────────────────
router.get("/visiting-cards-report/export.csv", async (_req, res) => {
  try {
    const rows = await db.select().from(visitingCardsTable).orderBy(desc(visitingCardsTable.createdAt));
    const cols = ["id","name","designation","company","department","email","phones","website","address","city","country","category","tags","notes","created_by","created_at"];
    const esc = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/"/g, '""').replace(/\r?\n/g, " ");
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const out = [cols.join(",")];
    for (const r of rows as any[]) {
      out.push([
        r.id, r.name, r.designation, r.company, r.department, r.email, r.phones,
        r.website, r.address, r.city, r.country, r.category, r.tags, r.notes,
        r.createdBy, r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt
      ].map(esc).join(","));
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="visiting-cards-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(out.join("\n"));
  } catch (e: any) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── AI scan: extract structured fields from front + (optional) back ──────
router.post("/visiting-cards/scan", async (req, res) => {
  try {
    const { frontImage, backImage } = req.body as { frontImage?: string; backImage?: string };
    if (!frontImage) { res.status(400).json({ error: "frontImage is required" }); return; }

    const userContent: any[] = [
      {
        type: "text",
        text:
`You are a precise business-card OCR + parser. Read the visiting card image(s) and return structured contact details as STRICT JSON only — no markdown, no commentary.

Schema:
{
  "name": string|null,
  "designation": string|null,
  "company": string|null,
  "department": string|null,
  "email": string|null,
  "phones": string|null,            // comma-separated, keep international format
  "website": string|null,
  "address": string|null,
  "city": string|null,
  "country": string|null,
  "tags": string|null,              // comma-separated keywords (e.g. "manufacturing, ahmedabad, GM")
  "category": "customer"|"vendor"|"partner"|"lead"|"other",  // best guess
  "rawText": string                 // all visible text (front + back) joined
}

Rules:
- If a field is not visible, use null.
- If both front and back are provided, merge information. Back may contain QR codes, addresses, services, taglines.
- Always return JSON only — no \`\`\` fences.`
      },
      { type: "image_url", image_url: { url: frontImage } },
    ];
    if (backImage) userContent.push({ type: "image_url", image_url: { url: backImage } });

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-5-nano",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You return only valid JSON for visiting-card extraction." },
        { role: "user", content: userContent as any },
      ],
      max_completion_tokens: 1200,
    });

    const txt = completion.choices[0]?.message?.content?.trim() || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(txt); } catch { parsed = { rawText: txt }; }
    console.log("[/visiting-cards/scan] parsed:", JSON.stringify(parsed));
    res.json({ data: parsed });
  } catch (e: any) {
    console.error("POST /visiting-cards/scan error:", e);
    res.status(500).json({ error: String(e?.message ?? e) });
  }
});

// ─── Create / Update / Delete ──────────────────────────────────────────────
const ALLOWED = [
  "name","designation","company","department","email","phones","website",
  "address","city","country","notes","tags","category","source","meetingContext",
  "frontImage","backImage","rawText","meta","createdBy"
];

router.post("/visiting-cards", async (req, res) => {
  try {
    const clean: Record<string, any> = {};
    for (const k of ALLOWED) if (req.body[k] !== undefined) clean[k] = req.body[k] ?? null;
    if (!clean.category) clean.category = "lead";
    if (!clean.source) clean.source = "scan";
    const [row] = await db.insert(visitingCardsTable).values(clean as any).returning();
    res.status(201).json(row);
  } catch (e: any) {
    console.error("POST /visiting-cards error:", e?.cause ?? e);
    res.status(500).json({ error: String(e?.cause ?? e) });
  }
});

router.patch("/visiting-cards/:id", async (req, res) => {
  try {
    const updates: Record<string, any> = {};
    for (const k of ALLOWED) if (req.body[k] !== undefined) updates[k] = req.body[k];
    updates.updatedAt = new Date();
    const [row] = await db.update(visitingCardsTable).set(updates as any)
      .where(eq(visitingCardsTable.id, Number(req.params.id))).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/visiting-cards/:id", async (req, res) => {
  try {
    await db.delete(visitingCardsTable).where(eq(visitingCardsTable.id, Number(req.params.id)));
    res.status(204).end();
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// quiet sql import warning
void sql;

export default router;
