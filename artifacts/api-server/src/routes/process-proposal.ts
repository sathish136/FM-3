import { Router } from "express";
import { erpFetch, projectParams } from "../lib/erp";

const router = Router();

function ok(res: any, data: any) {
  return res.json({ message: data });
}

function fallback(res: any, data: any, e: any) {
  console.warn("[process-proposal] ERP error:", e?.message ?? e);
  return res.json({ message: data, _source: "sample" });
}

// ── Sample Data ───────────────────────────────────────────────────────────────

const SAMPLE_PROC_TODAY = [
  { date: "01-04-2026", company: "Aryan Textile Mills",     capacity: "500 KLD",  requirement: "ETP",  age: 1 },
  { date: "01-04-2026", company: "Sunrise Hotels Pvt Ltd",  capacity: "200 KLD",  requirement: "STP",  age: 1 },
  { date: "01-04-2026", company: "Bharat Dairy Products",   capacity: "300 KLD",  requirement: "ETP",  age: 2 },
  { date: "01-04-2026", company: "Green Valley Resorts",    capacity: "150 KLD",  requirement: "FSSAI",age: 1 },
];
const SAMPLE_PROC_YEST = [
  { date: "31-03-2026", company: "Metro Pharma Ltd",        capacity: "1000 KLD", requirement: "ETP",  age: 3 },
  { date: "31-03-2026", company: "Vishnu Builders",         capacity: "250 KLD",  requirement: "STP",  age: 2 },
  { date: "31-03-2026", company: "Pacific Steel Works",     capacity: "800 KLD",  requirement: "ETP",  age: 4 },
];
const SAMPLE_PROC_MKT = [
  { date: "30-03-2026", company: "Lotus Fabrics",           capacity: "400 KLD",  requirement: "ETP",  age: 5 },
  { date: "29-03-2026", company: "Amara Hospitals",         capacity: "175 KLD",  requirement: "STP",  age: 6 },
];
const SAMPLE_PROC_RD = [
  { date: "28-03-2026", company: "NovaChem Industries",     capacity: "600 KLD",  requirement: "ETP",  age: 8 },
  { date: "27-03-2026", company: "BioTech Research Park",   capacity: "100 KLD",  requirement: "ZLD",  age: 9 },
  { date: "26-03-2026", company: "Sigma Polymers",          capacity: "750 KLD",  requirement: "ETP",  age: 10 },
];
const SAMPLE_PROC_CIVIL = [
  { date: "25-03-2026", company: "Urban Infra Projects",    capacity: "2000 KLD", requirement: "STP",  age: 11 },
  { date: "24-03-2026", company: "Heritage Township",       capacity: "350 KLD",  requirement: "STP",  age: 12 },
];

const SAMPLE_PROP_TODAY = [
  { date: "01-04-2026", company: "Kalyan City Corp",        capacity: "1500 KLD", requirement: "STP",  age: 1 },
  { date: "01-04-2026", company: "Reliance Agro Farms",     capacity: "300 KLD",  requirement: "ETP",  age: 1 },
  { date: "01-04-2026", company: "Prestige Residency",      capacity: "400 KLD",  requirement: "STP",  age: 2 },
];
const SAMPLE_PROP_YEST = [
  { date: "31-03-2026", company: "Coastal Fish Processing", capacity: "500 KLD",  requirement: "ETP",  age: 3 },
  { date: "31-03-2026", company: "Sun City Hospital",       capacity: "200 KLD",  requirement: "STP",  age: 2 },
  { date: "31-03-2026", company: "Pearl Cotton Mills",      capacity: "600 KLD",  requirement: "ETP",  age: 4 },
];
const SAMPLE_PROP_HELP = [
  { date: "29-03-2026", company: "Delta Sugar Factory",     capacity: "1200 KLD", requirement: "ETP",  age: 6 },
  { date: "28-03-2026", company: "Atlas Paints Ltd",        capacity: "250 KLD",  requirement: "ETP",  age: 7 },
];
const SAMPLE_PROP_LAST_WEEK = [
  { date: "24-03-2026", company: "Omega Chemicals",         capacity: "800 KLD",  requirement: "ETP",  age: 8 },
  { date: "25-03-2026", company: "Excel Textiles",          capacity: "450 KLD",  requirement: "ETP",  age: 7 },
  { date: "26-03-2026", company: "Prime Pharma",            capacity: "300 KLD",  requirement: "STP",  age: 6 },
  { date: "27-03-2026", company: "Royal Hotels & Resorts",  capacity: "600 KLD",  requirement: "STP",  age: 5 },
];
const SAMPLE_PROP_THIS_WEEK = [
  { date: "28-03-2026", company: "Star Ceramics",           capacity: "500 KLD",  requirement: "ETP",  age: 4 },
  { date: "29-03-2026", company: "Golden Gate Towers",      capacity: "700 KLD",  requirement: "STP",  age: 3 },
  { date: "30-03-2026", company: "Indus Food Processing",   capacity: "900 KLD",  requirement: "ETP",  age: 2 },
];
const SAMPLE_PROP_LAST_MONTH = [
  { date: "02-03-2026", company: "Sunrise Breweries",       capacity: "1000 KLD", requirement: "ETP",  age: 30 },
  { date: "05-03-2026", company: "Nile Textiles",           capacity: "350 KLD",  requirement: "ETP",  age: 27 },
  { date: "10-03-2026", company: "Crystal Clear Water",     capacity: "200 KLD",  requirement: "WTP",  age: 22 },
];
const SAMPLE_PROP_THIS_MONTH = [
  { date: "01-04-2026", company: "Kalyan City Corp",        capacity: "1500 KLD", requirement: "STP",  age: 1 },
  { date: "01-04-2026", company: "Prestige Residency",      capacity: "400 KLD",  requirement: "STP",  age: 2 },
  { date: "31-03-2026", company: "Pearl Cotton Mills",      capacity: "600 KLD",  requirement: "ETP",  age: 2 },
  { date: "30-03-2026", company: "Indus Food Processing",   capacity: "900 KLD",  requirement: "ETP",  age: 2 },
  { date: "29-03-2026", company: "Golden Gate Towers",      capacity: "700 KLD",  requirement: "STP",  age: 3 },
];

// ── Counts ────────────────────────────────────────────────────────────────────

router.get("/process-proposal/counts", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch("wtt_module.customization.custom.process_proposal.get_counts", projectParams(project));
    return ok(res, data?.message ?? {});
  } catch (e: any) {
    return ok(res, {
      proc_today: SAMPLE_PROC_TODAY.length,     proc_yest: SAMPLE_PROC_YEST.length,
      proc_mkt:   SAMPLE_PROC_MKT.length,       proc_rd:   SAMPLE_PROC_RD.length,
      proc_civil: SAMPLE_PROC_CIVIL.length,
      prop_today: SAMPLE_PROP_TODAY.length,     prop_yest: SAMPLE_PROP_YEST.length,
      prop_help:  SAMPLE_PROP_HELP.length,
      prop_last_week:  SAMPLE_PROP_LAST_WEEK.length,
      prop_this_week:  SAMPLE_PROP_THIS_WEEK.length,
      prop_last_month: SAMPLE_PROP_LAST_MONTH.length,
      prop_this_month: SAMPLE_PROP_THIS_MONTH.length,
      _source: "sample",
    });
  }
});

// ── Process Endpoints ─────────────────────────────────────────────────────────

function makeRoute(path: string, erpKey: string, sample: any[]) {
  router.get(`/process-proposal/${path}`, async (req, res) => {
    const project = req.query.project as string | undefined;
    try {
      const data = await erpFetch(`wtt_module.customization.custom.process_proposal.${erpKey}`, projectParams(project));
      if (Array.isArray(data?.message)) return ok(res, data.message);
      throw new Error("no data");
    } catch (e: any) {
      return fallback(res, sample, e);
    }
  });
}

makeRoute("proc-today",      "get_proc_today",      SAMPLE_PROC_TODAY);
makeRoute("proc-yest",       "get_proc_yest",       SAMPLE_PROC_YEST);
makeRoute("proc-mkt",        "get_proc_mkt",        SAMPLE_PROC_MKT);
makeRoute("proc-rd",         "get_proc_rd",         SAMPLE_PROC_RD);
makeRoute("proc-civil",      "get_proc_civil",      SAMPLE_PROC_CIVIL);
makeRoute("prop-today",      "get_prop_today",      SAMPLE_PROP_TODAY);
makeRoute("prop-yest",       "get_prop_yest",       SAMPLE_PROP_YEST);
makeRoute("prop-help",       "get_prop_help",       SAMPLE_PROP_HELP);
makeRoute("prop-last-week",  "get_prop_last_week",  SAMPLE_PROP_LAST_WEEK);
makeRoute("prop-this-week",  "get_prop_this_week",  SAMPLE_PROP_THIS_WEEK);
makeRoute("prop-last-month", "get_prop_last_month", SAMPLE_PROP_LAST_MONTH);
makeRoute("prop-this-month", "get_prop_this_month", SAMPLE_PROP_THIS_MONTH);

export default router;
