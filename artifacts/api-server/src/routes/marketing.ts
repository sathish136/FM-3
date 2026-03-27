import { Router } from "express";
import https from "https";

const router = Router();

const ERP_BASE = "https://erp.wttint.com";
const ERP_API_KEY = process.env.ERPNEXT_API_KEY || "";
const ERP_API_SECRET = process.env.ERPNEXT_API_SECRET || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// Fetch ERP with SSL verification disabled (self-signed cert on ERP server)
function erpFetch(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      Authorization: `token ${ERP_API_KEY}:${ERP_API_SECRET}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers,
      rejectUnauthorized: false,
      timeout: 30000,
    };
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(body)); } catch { resolve({}); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("ERP request timeout")); });
    req.end();
  });
}

async function openaiChat(prompt: string, maxTokens = 2000): Promise<string> {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(60000),
  });
  const data = await resp.json() as any;
  return data.choices[0].message.content;
}

// GET /api/marketing/leads
router.get("/marketing/leads", async (req, res) => {
  const url = `${ERP_BASE}/api/method/wtt_module.customization.custom.rfq.get_all_lead_details`;
  try {
    const data = await erpFetch(url);
    const leads: any[] = data?.message ?? [];

    const countryStats: Record<string, Record<string, number>> = {};
    const globalStats: Record<string, number> = {
      Closed: 0, Converted: 0, "Do Not Contact": 0, Lead: 0,
      "Lost Quotation": 0, Open: 0, Opportunity: 0, Quotation: 0, Replied: 0, total: 0,
    };
    const sourceStats: Record<string, number> = {};
    const leadStatusStats: Record<string, number> = {};

    for (const lead of leads) {
      const country = lead.country || "Unknown";
      const status = lead.status || "Unknown";
      const source = lead.source || "Unknown";
      const leadStatus = lead.lead_status || "Unknown";

      if (!countryStats[country]) {
        countryStats[country] = {
          Closed: 0, Converted: 0, "Do Not Contact": 0, Lead: 0,
          "Lost Quotation": 0, Open: 0, Opportunity: 0, Quotation: 0, Replied: 0, total: 0,
        };
      }
      if (status in countryStats[country]) countryStats[country][status]++;
      countryStats[country].total++;
      if (status in globalStats) globalStats[status]++;
      globalStats.total++;
      sourceStats[source] = (sourceStats[source] || 0) + 1;
      leadStatusStats[leadStatus] = (leadStatusStats[leadStatus] || 0) + 1;
    }

    return res.json({ country_stats: countryStats, global_stats: globalStats, source_stats: sourceStats, lead_status_stats: leadStatusStats });
  } catch (err: any) {
    console.error("marketing/leads error:", err.message);
    return res.json({
      country_stats: {}, source_stats: {}, lead_status_stats: {},
      global_stats: { Closed: 0, Converted: 0, "Do Not Contact": 0, Lead: 0, "Lost Quotation": 0, Open: 0, Opportunity: 0, Quotation: 0, Replied: 0, total: 0 },
    });
  }
});

// GET /api/marketing/lead-details
router.get("/marketing/lead-details", async (req, res) => {
  const { country, status, source, industry_type } = req.query as Record<string, string>;
  const url = `${ERP_BASE}/api/method/wtt_module.customization.custom.rfq.get_all_lead_details`;
  try {
    const data = await erpFetch(url);
    let leads: any[] = data?.message ?? [];

    if (country) leads = leads.filter((l) => l.country === country);
    if (status) leads = leads.filter((l) => l.status === status);
    if (source) leads = leads.filter((l) => l.source === source);
    if (industry_type) {
      leads = leads.filter((l) => {
        const ind = (l.industry || "").trim().toLowerCase();
        if (industry_type === "Textile") return ind === "textile";
        if (industry_type === "Non Textile") return ind !== "textile";
        return true;
      });
    }

    return res.json({ leads });
  } catch (err: any) {
    console.error("marketing/lead-details error:", err.message);
    return res.json({ leads: [] });
  }
});

// GET /api/marketing/news?country=X
router.get("/marketing/news", async (req, res) => {
  const country = (req.query.country as string) || "Global";
  try {
    const prompt = `Generate 8-10 realistic water treatment industry news articles for ${country} in JSON format:
{
  "articles": [
    {
      "title": "News headline about water treatment in ${country}",
      "source": "News source name",
      "date": "2024-01-15",
      "link": "#"
    }
  ]
}
Focus on: desalination plants, wastewater treatment, water purification technology, government policies, environmental regulations, industrial water treatment, municipal water systems. Use realistic dates from the last 3 months. Set all links to "#". Return ONLY valid JSON.`;
    const raw = await openaiChat(prompt, 2000);
    const data = JSON.parse(raw);
    const articles = (data.articles || []).map((a: any) => ({
      title: a.title, source: a.source, date: a.date, link: a.link,
    }));
    return res.json({ news: articles, country });
  } catch (err: any) {
    console.error("marketing/news error:", err.message);
    return res.json({ news: [], country });
  }
});

// GET /api/marketing/state-news?state=X
router.get("/marketing/state-news", async (req, res) => {
  const state = (req.query.state as string) || "Tamil Nadu";
  try {
    const prompt = `Generate 6-8 realistic water treatment industry news articles for ${state} state in India in JSON format:
{
  "articles": [
    {
      "title": "News headline about water treatment in ${state}",
      "source": "Local/Regional news source",
      "date": "2024-01-15",
      "link": "#"
    }
  ]
}
Focus on: state government water policies, local water treatment projects, industrial water treatment in ${state}, municipal water systems, environmental regulations specific to ${state}. Use realistic dates from the last 2 months. Set all links to "#". Return ONLY valid JSON.`;
    const raw = await openaiChat(prompt, 1500);
    const data = JSON.parse(raw);
    const articles = (data.articles || []).map((a: any) => ({
      title: a.title, source: a.source, date: a.date, link: a.link,
    }));
    return res.json({ news: articles, state });
  } catch (err: any) {
    console.error("marketing/state-news error:", err.message);
    return res.json({ news: [], state });
  }
});

// GET /api/marketing/competitor-analysis?country=X
router.get("/marketing/competitor-analysis", async (req, res) => {
  const country = (req.query.country as string) || "Global";
  try {
    const prompt = `Generate competitor analysis for water treatment companies operating in ${country} in JSON format:
{
  "competitors": [
    {
      "name": "Real Company Name",
      "activities": "Recent business activities and projects",
      "technology": "Water treatment technologies they use",
      "campaign": "Marketing campaigns or business strategies",
      "website": "https://real-company-website.com",
      "ad_platform": "Primary advertising platform"
    }
  ]
}
Include 5-6 real water treatment companies that operate in ${country}. Focus on major players like Veolia, Suez, Xylem, Evoqua, or local companies. Use real websites. Return ONLY valid JSON.`;
    const raw = await openaiChat(prompt, 2000);
    const data = JSON.parse(raw);
    return res.json({ competitors: data.competitors || [], country });
  } catch (err: any) {
    console.error("marketing/competitor-analysis error:", err.message);
    return res.json({ competitors: [], country });
  }
});

// GET /api/marketing/state-competitor-analysis?state=X
router.get("/marketing/state-competitor-analysis", async (req, res) => {
  const state = (req.query.state as string) || "Tamil Nadu";
  try {
    const prompt = `Generate competitor analysis for water treatment companies operating in ${state} state, India in JSON format:
{
  "competitors": [
    {
      "name": "Company Name",
      "activities": "Recent activities in ${state}",
      "technology": "Water treatment technologies",
      "campaign": "Local marketing strategies",
      "website": "https://company-website.com",
      "ad_platform": "Primary advertising platform"
    }
  ]
}
Include 4-5 companies that operate in ${state} — mix of national companies (like Veolia, Suez, Ion Exchange) and local/regional players. Focus on their activities in ${state}. Return ONLY valid JSON.`;
    const raw = await openaiChat(prompt, 1500);
    const data = JSON.parse(raw);
    return res.json({ competitors: data.competitors || [], state });
  } catch (err: any) {
    console.error("marketing/state-competitor-analysis error:", err.message);
    return res.json({ competitors: [], state });
  }
});

export default router;
