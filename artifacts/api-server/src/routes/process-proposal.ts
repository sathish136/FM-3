import { Router } from "express";
import { erpFetch } from "../lib/erp";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function ok(res: any, data: any) { return res.json({ message: data }); }

function fallback(res: any, data: any, e: any) {
  console.warn("[process-proposal] ERP error:", e?.message ?? e);
  return res.json({ message: data, _source: "sample" });
}

// ── Field normalisers (ERP → dashboard format) ────────────────────────────────

function normaliseStd(r: any, ...dateKeys: string[]) {
  const dateVal = dateKeys.reduce((v, k) => v || r[k], "") || r.date || r.creation || "—";
  return {
    date:        dateVal,
    company:     r.company_name   || r.customer  || r.company     || "—",
    capacity:    r.plant_capacity_m3day || r.plant_capacity || r.capacity || "—",
    requirement: r.plant_requirement   || r.requirement    || r.requirement_type || "—",
    age:         r.age_days ?? r.age ?? "—",
  };
}

function normaliseYest(r: any) {
  return {
    company:     r.company_name   || r.customer  || r.company  || "—",
    capacity:    r.plant_capacity_m3day || r.plant_capacity || r.capacity || "—",
    requirement: r.plant_requirement   || r.requirement    || "—",
  };
}

function normalisePropProject(r: any) {
  return {
    proposal_request: r.proposal_request || r.name || r.rfq_name || "—",
    company:          r.company_name     || r.customer || r.company || "—",
    capacity:         r.plant_capacity_m3day || r.plant_capacity || r.capacity || "—",
  };
}

// ── Sample Data (fallback only) ───────────────────────────────────────────────

const S_PROC_TODAY: any[] = [
  { date:"01-04-2026", company:"Aryan Textile Mills",    capacity:"500 KLD",  requirement:"ETP",   age:1 },
  { date:"01-04-2026", company:"Sunrise Hotels Pvt Ltd", capacity:"200 KLD",  requirement:"STP",   age:1 },
  { date:"01-04-2026", company:"Bharat Dairy Products",  capacity:"300 KLD",  requirement:"ETP",   age:2 },
];
const S_PROC_YEST: any[] = [
  { company:"Metro Pharma Ltd",    capacity:"1000 KLD", requirement:"ETP" },
  { company:"Vishnu Builders",     capacity:"250 KLD",  requirement:"STP" },
  { company:"Pacific Steel Works", capacity:"800 KLD",  requirement:"ETP" },
];
const S_PROC_MKT: any[]   = [{ date:"30-03-2026", company:"Lotus Fabrics",    capacity:"400 KLD", requirement:"ETP", age:5 }];
const S_PROC_RD: any[]    = [{ date:"28-03-2026", company:"NovaChem Industries", capacity:"600 KLD", requirement:"ETP", age:8 }];
const S_PROC_CIVIL: any[] = [{ date:"25-03-2026", company:"Urban Infra Projects", capacity:"2000 KLD", requirement:"STP", age:11 }];
const S_PROP_TODAY: any[] = [{ date:"01-04-2026", company:"Kalyan City Corp",  capacity:"1500 KLD", requirement:"STP", age:1 }];
const S_PROP_YEST: any[]  = [{ company:"Coastal Fish Processing", capacity:"500 KLD", requirement:"ETP" }];
const S_PROP_LW: any[]    = [{ proposal_request:"PR-2026-0314", company:"Omega Chemicals",  capacity:"800 KLD" }];
const S_PROP_TW: any[]    = [{ proposal_request:"PR-2026-0318", company:"Star Ceramics",    capacity:"500 KLD" }];
const S_PROP_LM: any[]    = [{ proposal_request:"PR-2026-0290", company:"Sunrise Breweries",capacity:"1000 KLD"}];
const S_PROP_TM: any[]    = [{ proposal_request:"PR-2026-0310", company:"Kalyan City Corp", capacity:"1500 KLD"}];

// ── Counts / KPIs ─────────────────────────────────────────────────────────────
// Process counts: wtt_module.customization.custom.rfq.get_process_details
//   message[0] → { pending, yesterday_elevated, clarification, r_and_d, civil }
// Proposal counts: wtt_module.customization.custom.rfq.get_proposal_details
//   message[0] → { pending, yesterday_elevated, this_week_completed,
//                  last_week_completed, this_month_completed, last_month_completed }

router.get("/process-proposal/counts", async (_req, res) => {
  try {
    const [procRes, propRes] = await Promise.allSettled([
      erpFetch("wtt_module.customization.custom.rfq.get_process_details"),
      erpFetch("wtt_module.customization.custom.rfq.get_proposal_details"),
    ]);

    const proc = procRes.status === "fulfilled"
      ? (Array.isArray(procRes.value?.message) ? procRes.value.message[0] : procRes.value?.message) ?? {}
      : {};
    const prop = propRes.status === "fulfilled"
      ? (Array.isArray(propRes.value?.message) ? propRes.value.message[0] : propRes.value?.message) ?? {}
      : {};

    return ok(res, {
      proc_today:      proc.pending              ?? 0,
      proc_yest:       proc.yesterday_elevated   ?? 0,
      proc_mkt:        proc.clarification        ?? 0,
      proc_rd:         proc.r_and_d              ?? 0,
      proc_civil:      proc.civil                ?? 0,
      prop_today:      prop.pending              ?? 0,
      prop_yest:       prop.yesterday_elevated   ?? 0,
      prop_last_week:  prop.last_week_completed  ?? 0,
      prop_this_week:  prop.this_week_completed  ?? 0,
      prop_last_month: prop.last_month_completed ?? 0,
      prop_this_month: prop.this_month_completed ?? 0,
    });
  } catch (e: any) {
    return res.json({
      message: {
        proc_today: S_PROC_TODAY.length, proc_yest: S_PROC_YEST.length,
        proc_mkt: S_PROC_MKT.length,    proc_rd:   S_PROC_RD.length,
        proc_civil: S_PROC_CIVIL.length,
        prop_today: S_PROP_TODAY.length, prop_yest: S_PROP_YEST.length,
        prop_last_week: S_PROP_LW.length, prop_this_week: S_PROP_TW.length,
        prop_last_month: S_PROP_LM.length, prop_this_month: S_PROP_TM.length,
      },
      _source: "sample",
    });
  }
});

// ── PROCESS: Today's pending ──────────────────────────────────────────────────
// ERP: wtt_module.customization.custom.rfq.get_process_details_table
// Fields: proposal_request, company_name, plant_capacity_m3day, plant_requirement, recent_process_date, age_days

router.get("/process-proposal/proc-today", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_process_details_table");
    if (Array.isArray(data?.message)) return ok(res, data.message.map((r: any) => normaliseStd(r, "recent_process_date", "date")));
    throw new Error("no array");
  } catch (e: any) { return fallback(res, S_PROC_TODAY, e); }
});

// ── PROCESS: Yesterday's elevated ────────────────────────────────────────────
// ERP: wtt_module.customization.custom.rfq.get_yesterday_elevated_details
// Fields: proposal_request, company_name, plant_capacity_m3day, plant_requirement

router.get("/process-proposal/proc-yest", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_yesterday_elevated_details");
    if (Array.isArray(data?.message)) return ok(res, data.message.map((r: any) => normaliseYest(r)));
    throw new Error("no array");
  } catch (e: any) { return fallback(res, S_PROC_YEST, e); }
});

// ── PROCESS: Clarification (Marketing) ───────────────────────────────────────
// ERP: wtt_module.customization.custom.rfq.get_process_clarification_details_table

router.get("/process-proposal/proc-mkt", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_process_clarification_details_table");
    if (Array.isArray(data?.message)) return ok(res, data.message.map((r: any) => normaliseStd(r, "recent_clarification_date", "date")));
    throw new Error("no array");
  } catch (e: any) { return fallback(res, S_PROC_MKT, e); }
});

// ── PROCESS: R&D ─────────────────────────────────────────────────────────────
// ERP: wtt_module.customization.custom.rfq.get_rd_details_table

router.get("/process-proposal/proc-rd", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_rd_details_table");
    if (Array.isArray(data?.message)) return ok(res, data.message.map((r: any) => normaliseStd(r, "recent_rd_date", "date")));
    throw new Error("no array");
  } catch (e: any) { return fallback(res, S_PROC_RD, e); }
});

// ── PROCESS: CIVIL ────────────────────────────────────────────────────────────
// ERP: wtt_module.customization.custom.rfq.get_civil_details_table

router.get("/process-proposal/proc-civil", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_civil_details_table");
    if (Array.isArray(data?.message)) return ok(res, data.message.map((r: any) => normaliseStd(r, "recent_civil_date", "date")));
    throw new Error("no array");
  } catch (e: any) { return fallback(res, S_PROC_CIVIL, e); }
});

// ── PROPOSAL: Today's pending ─────────────────────────────────────────────────
// ERP: wtt_module.customization.custom.rfq.get_proposal_details_table

router.get("/process-proposal/prop-today", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_proposal_details_table");
    if (Array.isArray(data?.message)) return ok(res, data.message.map((r: any) => normaliseStd(r, "recent_process_date", "date")));
    throw new Error("no array");
  } catch (e: any) { return fallback(res, S_PROP_TODAY, e); }
});

// ── PROPOSAL: Yesterday's elevated ───────────────────────────────────────────
// ERP: wtt_module.customization.custom.rfq.get_yesterday_elevated_details

router.get("/process-proposal/prop-yest", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_yesterday_elevated_details");
    if (Array.isArray(data?.message)) return ok(res, data.message.map((r: any) => normaliseYest(r)));
    throw new Error("no array");
  } catch (e: any) { return fallback(res, S_PROP_YEST, e); }
});

// ── PROPOSAL: Last Week ───────────────────────────────────────────────────────
// ERP: wtt_module.customization.custom.rfq.get_last_week_elevated_details

router.get("/process-proposal/prop-last-week", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_last_week_elevated_details");
    if (Array.isArray(data?.message)) return ok(res, data.message.map((r: any) => normalisePropProject(r)));
    throw new Error("no array");
  } catch (e: any) { return fallback(res, S_PROP_LW, e); }
});

// ── PROPOSAL: This Week ───────────────────────────────────────────────────────
// ERP: wtt_module.customization.custom.rfq.get_this_week_elevated_details

router.get("/process-proposal/prop-this-week", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_this_week_elevated_details");
    if (Array.isArray(data?.message)) return ok(res, data.message.map((r: any) => normalisePropProject(r)));
    throw new Error("no array");
  } catch (e: any) { return fallback(res, S_PROP_TW, e); }
});

// ── PROPOSAL: Last Month ──────────────────────────────────────────────────────
// ERP: wtt_module.customization.custom.rfq.get_last_month_elevated_details

router.get("/process-proposal/prop-last-month", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_last_month_elevated_details");
    if (Array.isArray(data?.message)) return ok(res, data.message.map((r: any) => normalisePropProject(r)));
    throw new Error("no array");
  } catch (e: any) { return fallback(res, S_PROP_LM, e); }
});

// ── PROPOSAL: This Month ──────────────────────────────────────────────────────
// ERP: wtt_module.customization.custom.rfq.get_this_month_elevated_details

router.get("/process-proposal/prop-this-month", async (_req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_this_month_elevated_details");
    if (Array.isArray(data?.message)) return ok(res, data.message.map((r: any) => normalisePropProject(r)));
    throw new Error("no array");
  } catch (e: any) { return fallback(res, S_PROP_TM, e); }
});

export default router;
