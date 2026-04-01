import { Router } from "express";
import { erpFetch } from "../lib/erp";

const router = Router();

// ── Auth helper ───────────────────────────────────────────────────────────────
// ERP uses: Authorization: token {ERP_API_KEY}:{ERP_API_SECRET}
// erp.ts already builds that header — we just call erpFetch with the method path.

// ── Field normalisers ─────────────────────────────────────────────────────────

function normaliseStd(r: any, dateKey: string) {
  return {
    date:        r[dateKey] || r.date || "—",
    company:     r.company_name   || r.company     || "—",
    capacity:    r.plant_capacity_m3day || r.capacity || "—",
    requirement: r.plant_requirement   || r.requirement || "—",
    age:         r.age_days ?? r.age ?? "—",
  };
}

function normaliseYest(r: any) {
  return {
    company:     r.company_name   || r.company     || "—",
    capacity:    r.plant_capacity_m3day || r.capacity || "—",
    requirement: r.plant_requirement   || r.requirement || "—",
  };
}

function normalisePropProject(r: any) {
  return {
    proposal_request: r.proposal_request || r.name || "—",
    company:          r.company_name     || r.company || "—",
    capacity:         r.plant_capacity_m3day || r.capacity || "—",
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ok(res: any, data: any)          { return res.json({ message: data }); }
function fallback(res: any, data: any, e: any) {
  console.warn("[process-proposal] ERP:", e?.message ?? e);
  return res.json({ message: data, _source: "sample" });
}

// ── Sample Data ───────────────────────────────────────────────────────────────

const S_PROC_TODAY: any[] = [
  { date: "01-04-2026", company: "Aryan Textile Mills",     capacity: "500 KLD",  requirement: "ETP",   age: 1 },
  { date: "01-04-2026", company: "Sunrise Hotels Pvt Ltd",  capacity: "200 KLD",  requirement: "STP",   age: 1 },
  { date: "01-04-2026", company: "Bharat Dairy Products",   capacity: "300 KLD",  requirement: "ETP",   age: 2 },
  { date: "01-04-2026", company: "Green Valley Resorts",    capacity: "150 KLD",  requirement: "FSSAI", age: 1 },
];
const S_PROC_YEST: any[] = [
  { company: "Metro Pharma Ltd",     capacity: "1000 KLD", requirement: "ETP" },
  { company: "Vishnu Builders",      capacity: "250 KLD",  requirement: "STP" },
  { company: "Pacific Steel Works",  capacity: "800 KLD",  requirement: "ETP" },
];
const S_PROC_MKT: any[] = [
  { date: "30-03-2026", company: "Lotus Fabrics",    capacity: "400 KLD", requirement: "ETP", age: 5 },
  { date: "29-03-2026", company: "Amara Hospitals",  capacity: "175 KLD", requirement: "STP", age: 6 },
];
const S_PROC_RD: any[] = [
  { date: "28-03-2026", company: "NovaChem Industries",    capacity: "600 KLD", requirement: "ETP", age: 8  },
  { date: "27-03-2026", company: "BioTech Research Park",  capacity: "100 KLD", requirement: "ZLD", age: 9  },
  { date: "26-03-2026", company: "Sigma Polymers",         capacity: "750 KLD", requirement: "ETP", age: 10 },
];
const S_PROC_CIVIL: any[] = [
  { date: "25-03-2026", company: "Urban Infra Projects", capacity: "2000 KLD", requirement: "STP", age: 11 },
  { date: "24-03-2026", company: "Heritage Township",    capacity: "350 KLD",  requirement: "STP", age: 12 },
];
const S_PROP_TODAY: any[] = [
  { date: "01-04-2026", company: "Kalyan City Corp",     capacity: "1500 KLD", requirement: "STP", age: 1 },
  { date: "01-04-2026", company: "Reliance Agro Farms",  capacity: "300 KLD",  requirement: "ETP", age: 1 },
  { date: "01-04-2026", company: "Prestige Residency",   capacity: "400 KLD",  requirement: "STP", age: 2 },
];
const S_PROP_YEST: any[] = [
  { company: "Coastal Fish Processing", capacity: "500 KLD",  requirement: "ETP" },
  { company: "Sun City Hospital",       capacity: "200 KLD",  requirement: "STP" },
  { company: "Pearl Cotton Mills",      capacity: "600 KLD",  requirement: "ETP" },
];
const S_PROP_LAST_WEEK: any[]  = [
  { proposal_request: "PR-2026-0314", company: "Omega Chemicals",        capacity: "800 KLD"  },
  { proposal_request: "PR-2026-0315", company: "Excel Textiles",         capacity: "450 KLD"  },
  { proposal_request: "PR-2026-0316", company: "Prime Pharma",           capacity: "300 KLD"  },
  { proposal_request: "PR-2026-0317", company: "Royal Hotels & Resorts", capacity: "600 KLD"  },
];
const S_PROP_THIS_WEEK: any[]  = [
  { proposal_request: "PR-2026-0318", company: "Star Ceramics",         capacity: "500 KLD" },
  { proposal_request: "PR-2026-0319", company: "Golden Gate Towers",    capacity: "700 KLD" },
  { proposal_request: "PR-2026-0320", company: "Indus Food Processing", capacity: "900 KLD" },
];
const S_PROP_LAST_MONTH: any[] = [
  { proposal_request: "PR-2026-0290", company: "Sunrise Breweries",   capacity: "1000 KLD" },
  { proposal_request: "PR-2026-0291", company: "Nile Textiles",       capacity: "350 KLD"  },
  { proposal_request: "PR-2026-0292", company: "Crystal Clear Water", capacity: "200 KLD"  },
];
const S_PROP_THIS_MONTH: any[] = [
  { proposal_request: "PR-2026-0310", company: "Kalyan City Corp",      capacity: "1500 KLD" },
  { proposal_request: "PR-2026-0311", company: "Prestige Residency",    capacity: "400 KLD"  },
  { proposal_request: "PR-2026-0312", company: "Pearl Cotton Mills",    capacity: "600 KLD"  },
  { proposal_request: "PR-2026-0313", company: "Indus Food Processing", capacity: "900 KLD"  },
];

// ── Counts / KPIs ─────────────────────────────────────────────────────────────
//  ERP method: wtt_module.customization.custom.rfq.get_process_details
//  Returns:    message[0] = { pending, yesterday_elevated, clarification, r_and_d, civil, … }

router.get("/process-proposal/counts", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_process_details");
    const d = Array.isArray(data?.message) ? data.message[0] : (data?.message ?? {});
    return ok(res, {
      proc_today:      d.pending             ?? 0,
      proc_yest:       d.yesterday_elevated  ?? 0,
      proc_mkt:        d.clarification       ?? 0,
      proc_rd:         d.r_and_d             ?? 0,
      proc_civil:      d.civil               ?? 0,
      prop_today:      d.prop_pending        ?? d.proposal_pending        ?? 0,
      prop_yest:       d.prop_yesterday      ?? d.proposal_yesterday      ?? 0,
      prop_last_week:  d.prop_last_week      ?? d.proposal_last_week      ?? 0,
      prop_this_week:  d.prop_this_week      ?? d.proposal_this_week      ?? 0,
      prop_last_month: d.prop_last_month     ?? d.proposal_last_month     ?? 0,
      prop_this_month: d.prop_this_month     ?? d.proposal_this_month     ?? 0,
    });
  } catch (e: any) {
    return ok(res, {
      proc_today:  S_PROC_TODAY.length,  proc_yest:  S_PROC_YEST.length,
      proc_mkt:    S_PROC_MKT.length,    proc_rd:    S_PROC_RD.length,
      proc_civil:  S_PROC_CIVIL.length,
      prop_today:  S_PROP_TODAY.length,  prop_yest:  S_PROP_YEST.length,
      prop_last_week:  S_PROP_LAST_WEEK.length,  prop_this_week:  S_PROP_THIS_WEEK.length,
      prop_last_month: S_PROP_LAST_MONTH.length, prop_this_month: S_PROP_THIS_MONTH.length,
      _source: "sample",
    });
  }
});

// ── PROCESS: Today's pending ──────────────────────────────────────────────────
//  ERP method: wtt_module.customization.custom.rfq.get_proc_today
//  Row fields: company_name, plant_capacity_m3day, plant_requirement, age_days, recent_process_date

router.get("/process-proposal/proc-today", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_proc_today");
    if (Array.isArray(data?.message)) return ok(res, data.message.map((r: any) => normaliseStd(r, "recent_process_date")));
    throw new Error("no data");
  } catch (e: any) { return fallback(res, S_PROC_TODAY, e); }
});

// ── PROCESS: Yesterday's elevated ────────────────────────────────────────────
//  ERP method: wtt_module.customization.custom.rfq.get_proc_yest
//  Row fields: company_name, plant_capacity_m3day, plant_requirement  (no date/age)

router.get("/process-proposal/proc-yest", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_proc_yest");
    if (Array.isArray(data?.message)) return ok(res, data.message.map((r: any) => normaliseYest(r)));
    throw new Error("no data");
  } catch (e: any) { return fallback(res, S_PROC_YEST, e); }
});

// ── PROCESS: Clarification (Marketing) ───────────────────────────────────────
//  ERP method: wtt_module.customization.custom.rfq.get_proc_mkt
//  Row fields: company_name, plant_capacity_m3day, plant_requirement, age_days, recent_clarification_date

router.get("/process-proposal/proc-mkt", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_proc_mkt");
    if (Array.isArray(data?.message)) return ok(res, data.message.map((r: any) => normaliseStd(r, "recent_clarification_date")));
    throw new Error("no data");
  } catch (e: any) { return fallback(res, S_PROC_MKT, e); }
});

// ── PROCESS: R&D ─────────────────────────────────────────────────────────────
//  ERP method: wtt_module.customization.custom.rfq.get_proc_rd
//  Row fields: company_name, plant_capacity_m3day, plant_requirement, age_days, recent_rd_date

router.get("/process-proposal/proc-rd", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_proc_rd");
    if (Array.isArray(data?.message)) return ok(res, data.message.map((r: any) => normaliseStd(r, "recent_rd_date")));
    throw new Error("no data");
  } catch (e: any) { return fallback(res, S_PROC_RD, e); }
});

// ── PROCESS: CIVIL ────────────────────────────────────────────────────────────
//  ERP method: wtt_module.customization.custom.rfq.get_proc_civil
//  Row fields: company_name, plant_capacity_m3day, plant_requirement, age_days, recent_civil_date

router.get("/process-proposal/proc-civil", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_proc_civil");
    if (Array.isArray(data?.message)) return ok(res, data.message.map((r: any) => normaliseStd(r, "recent_civil_date")));
    throw new Error("no data");
  } catch (e: any) { return fallback(res, S_PROC_CIVIL, e); }
});

// ── PROPOSAL: Today's pending ─────────────────────────────────────────────────
//  ERP method: wtt_module.customization.custom.rfq.get_prop_today
//  Row fields: company_name, plant_capacity_m3day, plant_requirement, age_days, recent_process_date

router.get("/process-proposal/prop-today", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_prop_today");
    if (Array.isArray(data?.message)) return ok(res, data.message.map((r: any) => normaliseStd(r, "recent_process_date")));
    throw new Error("no data");
  } catch (e: any) { return fallback(res, S_PROP_TODAY, e); }
});

// ── PROPOSAL: Yesterday's pending ────────────────────────────────────────────
//  ERP method: wtt_module.customization.custom.rfq.get_prop_yest
//  Row fields: company_name, plant_capacity_m3day, plant_requirement  (no date/age)

router.get("/process-proposal/prop-yest", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_prop_yest");
    if (Array.isArray(data?.message)) return ok(res, data.message.map((r: any) => normaliseYest(r)));
    throw new Error("no data");
  } catch (e: any) { return fallback(res, S_PROP_YEST, e); }
});

// ── PROPOSAL: Last Week ───────────────────────────────────────────────────────
//  ERP method: wtt_module.customization.custom.rfq.get_prop_last_week
//  Row fields: proposal_request, company_name, plant_capacity_m3day

router.get("/process-proposal/prop-last-week", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_prop_last_week");
    if (Array.isArray(data?.message)) return ok(res, data.message.map((r: any) => normalisePropProject(r)));
    throw new Error("no data");
  } catch (e: any) { return fallback(res, S_PROP_LAST_WEEK, e); }
});

// ── PROPOSAL: This Week ───────────────────────────────────────────────────────
//  ERP method: wtt_module.customization.custom.rfq.get_prop_this_week

router.get("/process-proposal/prop-this-week", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_prop_this_week");
    if (Array.isArray(data?.message)) return ok(res, data.message.map((r: any) => normalisePropProject(r)));
    throw new Error("no data");
  } catch (e: any) { return fallback(res, S_PROP_THIS_WEEK, e); }
});

// ── PROPOSAL: Last Month ──────────────────────────────────────────────────────
//  ERP method: wtt_module.customization.custom.rfq.get_prop_last_month

router.get("/process-proposal/prop-last-month", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_prop_last_month");
    if (Array.isArray(data?.message)) return ok(res, data.message.map((r: any) => normalisePropProject(r)));
    throw new Error("no data");
  } catch (e: any) { return fallback(res, S_PROP_LAST_MONTH, e); }
});

// ── PROPOSAL: This Month ──────────────────────────────────────────────────────
//  ERP method: wtt_module.customization.custom.rfq.get_prop_this_month

router.get("/process-proposal/prop-this-month", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_prop_this_month");
    if (Array.isArray(data?.message)) return ok(res, data.message.map((r: any) => normalisePropProject(r)));
    throw new Error("no data");
  } catch (e: any) { return fallback(res, S_PROP_THIS_MONTH, e); }
});

export default router;
