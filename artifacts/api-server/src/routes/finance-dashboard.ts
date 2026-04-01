import { Router } from "express";
import { erpFetch, projectParams } from "../lib/erp";

const router = Router();

function ok(res: any, data: any) { return res.json({ message: data }); }

function errFallback(res: any, fallback: any, e: any) {
  console.warn("[finance-dashboard] ERP error:", e?.message ?? e);
  return res.json({ message: fallback, _source: "sample" });
}

// ── Date params helper ──────────────────────────────────────────────────────────
function dateParams(project?: string, from_date?: string, to_date?: string, quick?: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (project && project.trim()) params.project = project;
  if (quick === "today") {
    const today = new Date().toISOString().split("T")[0];
    params.from_date = today;
    params.to_date = today;
  } else if (quick === "yesterday") {
    const d = new Date(); d.setDate(d.getDate() - 1);
    const yest = d.toISOString().split("T")[0];
    params.from_date = yest;
    params.to_date = yest;
  } else {
    if (from_date) params.from_date = from_date;
    if (to_date)   params.to_date   = to_date;
  }
  return params;
}

// ── Sample / fallback data ──────────────────────────────────────────────────────

const SAMPLE_KPIS = {
  project_budget: 92705110,
  po_cost: 34705110,
  pr_cost: 20181640,
  other_expenses: 354000,
  extra_expenses: 5000,
  salary: 86135095,
  cash_request: 4000,
  req_payment: 350000,
  ticket_booking: 0,
  claim: 2115,
  advance: 940199,
};

const SAMPLE_PO = {
  po_wise: [
    { po_no: "PO-2024-001", supplier: "ABC Corp",        po_amount: 15000000 },
    { po_no: "PO-2024-002", supplier: "XYZ Ltd",         po_amount: 25000000 },
    { po_no: "PO-2024-003", supplier: "Tech Solutions",  po_amount: 18000000 },
    { po_no: "PO-2024-004", supplier: "Engineering Co",  po_amount: 34705110 },
  ],
  supplier_wise: [
    { supplier: "ABC Corp",        no_of_pos: 2, po_amount: 20000000 },
    { supplier: "XYZ Ltd",         no_of_pos: 3, po_amount: 30000000 },
    { supplier: "Tech Solutions",  no_of_pos: 1, po_amount: 25000000 },
    { supplier: "Engineering Co",  no_of_pos: 1, po_amount: 17705110 },
  ],
  item_group_wise: [
    { item_group: "Equipment",  no_of_items: 5, po_amount: 45000000 },
    { item_group: "Materials",  no_of_items: 8, po_amount: 30000000 },
    { item_group: "Services",   no_of_items: 3, po_amount: 17705110 },
  ],
};

const SAMPLE_PR = {
  pr_wise: [
    { pr_no: "PR-2024-001", supplier: "ABC Corp", pr_amount: 12000000 },
    { pr_no: "PR-2024-002", supplier: "XYZ Ltd",  pr_amount: 20181640 },
  ],
  supplier_wise: [
    { supplier: "ABC Corp", no_of_prs: 2, pr_amount: 15000000 },
    { supplier: "XYZ Ltd",  no_of_prs: 3, pr_amount: 17181640 },
  ],
  item_group_wise: [
    { item_group: "Equipment", no_of_items: 5, pr_amount: 20000000 },
    { item_group: "Materials", no_of_items: 8, pr_amount: 12181640 },
  ],
};

const SAMPLE_CASH_REQUEST = [
  { date: "2026-03-31", entry_no: "CR-001", remarks: "Medicine for MD Sir", created_by: "Admin",   amount: 1500,   approved_by: "Approved" },
  { date: "2026-03-30", entry_no: "CR-002", remarks: "Office supplies",      created_by: "HR",      amount: 2500,   approved_by: "Pending" },
];

const SAMPLE_REQ_PAYMENT = [
  { date: "2026-03-30", entry_no: "RFP-001", remarks: "Advance for shipment", created_by: "Finance", amount: 350000, approved_by: "Approved" },
];

const SAMPLE_TICKET_BOOKING = [
  { date: "2026-03-23", entry_no: "TBD-00253", employee_name: "RAGHUL RAJ D", amount: 0, reason: "Customer visit — GT Process" },
];

const SAMPLE_EXTRA_EXPENSES = [
  { date: "2026-04-01", entry_no: "LT-26-00001", employee_name: "WTT1441", amount: 5000, reason: "Salary Rework" },
];

const SAMPLE_SALARY = [
  { employee: "Engineering Team", salary: 35000000 },
  { employee: "Management",       salary: 25000000 },
  { employee: "Support Staff",    salary: 15000000 },
  { employee: "Consultants",      salary: 11135095 },
];

const SAMPLE_CLAIM = [
  { employee: "HARIHARAN V",  claim_amount: 809 },
  { employee: "John Doe",     claim_amount: 850000 },
  { employee: "Jane Smith",   claim_amount: 1255385 },
];

const SAMPLE_ADVANCE = [
  { employee_name: "PREETHI RAJARAJESWARI S", advanced_amount: 0 },
  { employee_name: "Project Manager",          advanced_amount: 500000 },
  { employee_name: "Site Engineer",            advanced_amount: 440199 },
];

// ── Helpers to sum arrays ────────────────────────────────────────────────────────
function sumField(arr: any[], field: string): number {
  return Array.isArray(arr) ? arr.reduce((s, r) => s + (Number(r[field]) || 0), 0) : 0;
}

// ── GET /api/finance-dashboard/kpis ────────────────────────────────────────────
router.get("/finance-dashboard/kpis", async (req, res) => {
  const { project, from_date, to_date, quick } = req.query as Record<string, string>;
  const pp = dateParams(project, from_date, to_date, quick);
  try {
    const [poR, prR, crR, rpR, tbR, eeR, salR, clR, advR] = await Promise.allSettled([
      erpFetch("wtt_module.customization.custom.finance.get_po_cost",       pp),
      erpFetch("wtt_module.customization.custom.finance.get_pr_cost",       pp),
      erpFetch("wtt_module.customization.custom.finance.get_cash_request",  pp),
      erpFetch("wtt_module.customization.custom.finance.get_req_payment",   pp),
      erpFetch("wtt_module.customization.custom.finance.get_ticket_booking",pp),
      erpFetch("wtt_module.customization.custom.finance.get_extra_expenses",pp),
      erpFetch("wtt_module.customization.custom.finance.get_salary",        pp),
      erpFetch("wtt_module.customization.custom.finance.get_claim",         pp),
      erpFetch("wtt_module.customization.custom.finance.get_advance",       pp),
    ]);

    const msg = (r: PromiseSettledResult<any>, fb: any) =>
      r.status === "fulfilled" && r.value?.message ? r.value.message : fb;

    const po   = msg(poR, SAMPLE_PO.po_wise);
    const pr   = msg(prR, SAMPLE_PR.pr_wise);
    const cr   = msg(crR, SAMPLE_CASH_REQUEST);
    const rp   = msg(rpR, SAMPLE_REQ_PAYMENT);
    const tb   = msg(tbR, SAMPLE_TICKET_BOOKING);
    const ee   = msg(eeR, SAMPLE_EXTRA_EXPENSES);
    const sal  = msg(salR, SAMPLE_SALARY);
    const cl   = msg(clR, SAMPLE_CLAIM);
    const adv  = msg(advR, SAMPLE_ADVANCE);

    const poCost  = Array.isArray(po)  ? sumField(po,  "po_amount")       : (typeof po === "object" ? sumField(po?.po_wise || [], "po_amount") : 0);
    const prCost  = Array.isArray(pr)  ? sumField(pr,  "pr_amount")       : (typeof pr === "object" ? sumField(pr?.pr_wise || [], "pr_amount") : 0);
    const crTotal = Array.isArray(cr)  ? sumField(cr,  "amount")          : 0;
    const rpTotal = Array.isArray(rp)  ? sumField(rp,  "amount")          : 0;
    const tbTotal = Array.isArray(tb)  ? sumField(tb,  "amount")          : 0;
    const eeTotal = Array.isArray(ee)  ? sumField(ee,  "amount")          : 0;
    const salTotal= Array.isArray(sal) ? sumField(sal, "salary")          : 0;
    const clTotal = Array.isArray(cl)  ? sumField(cl,  "claim_amount")    : 0;
    const advTotal= Array.isArray(adv) ? sumField(adv, "advanced_amount") : 0;

    return ok(res, {
      project_budget: SAMPLE_KPIS.project_budget,
      po_cost:        poCost,
      pr_cost:        prCost,
      other_expenses: crTotal + rpTotal + tbTotal,
      extra_expenses: eeTotal,
      salary:         salTotal,
      cash_request:   crTotal,
      req_payment:    rpTotal,
      ticket_booking: tbTotal,
      claim:          clTotal,
      advance:        advTotal,
    });
  } catch (e: any) {
    return errFallback(res, SAMPLE_KPIS, e);
  }
});

// ── GET /api/finance-dashboard/po-cost ─────────────────────────────────────────
router.get("/finance-dashboard/po-cost", async (req, res) => {
  const { project } = req.query as Record<string, string>;
  try {
    const data = await erpFetch("wtt_module.customization.custom.finance.get_po_cost", projectParams(project));
    if (data?.message) return ok(res, data.message);
    throw new Error("no data");
  } catch (e: any) {
    return errFallback(res, SAMPLE_PO, e);
  }
});

// ── GET /api/finance-dashboard/pr-cost ─────────────────────────────────────────
router.get("/finance-dashboard/pr-cost", async (req, res) => {
  const { project } = req.query as Record<string, string>;
  try {
    const data = await erpFetch("wtt_module.customization.custom.finance.get_pr_cost", projectParams(project));
    if (data?.message) return ok(res, data.message);
    throw new Error("no data");
  } catch (e: any) {
    return errFallback(res, SAMPLE_PR, e);
  }
});

// ── GET /api/finance-dashboard/cash-request ────────────────────────────────────
router.get("/finance-dashboard/cash-request", async (req, res) => {
  const { project, from_date, to_date, quick } = req.query as Record<string, string>;
  try {
    const data = await erpFetch("wtt_module.customization.custom.finance.get_cash_request", dateParams(project, from_date, to_date, quick));
    if (Array.isArray(data?.message)) return ok(res, data.message);
    throw new Error("no data");
  } catch (e: any) {
    return errFallback(res, SAMPLE_CASH_REQUEST, e);
  }
});

// ── GET /api/finance-dashboard/req-payment ─────────────────────────────────────
router.get("/finance-dashboard/req-payment", async (req, res) => {
  const { project, from_date, to_date, quick } = req.query as Record<string, string>;
  try {
    const data = await erpFetch("wtt_module.customization.custom.finance.get_req_payment", dateParams(project, from_date, to_date, quick));
    if (Array.isArray(data?.message)) return ok(res, data.message);
    throw new Error("no data");
  } catch (e: any) {
    return errFallback(res, SAMPLE_REQ_PAYMENT, e);
  }
});

// ── GET /api/finance-dashboard/ticket-booking ──────────────────────────────────
router.get("/finance-dashboard/ticket-booking", async (req, res) => {
  const { project, from_date, to_date, quick } = req.query as Record<string, string>;
  try {
    const data = await erpFetch("wtt_module.customization.custom.finance.get_ticket_booking", dateParams(project, from_date, to_date, quick));
    if (Array.isArray(data?.message)) return ok(res, data.message);
    throw new Error("no data");
  } catch (e: any) {
    return errFallback(res, SAMPLE_TICKET_BOOKING, e);
  }
});

// ── GET /api/finance-dashboard/extra-expenses ──────────────────────────────────
router.get("/finance-dashboard/extra-expenses", async (req, res) => {
  const { project, from_date, to_date, quick } = req.query as Record<string, string>;
  try {
    const data = await erpFetch("wtt_module.customization.custom.finance.get_extra_expenses", dateParams(project, from_date, to_date, quick));
    if (Array.isArray(data?.message)) return ok(res, data.message);
    throw new Error("no data");
  } catch (e: any) {
    return errFallback(res, SAMPLE_EXTRA_EXPENSES, e);
  }
});

// ── GET /api/finance-dashboard/salary ─────────────────────────────────────────
router.get("/finance-dashboard/salary", async (req, res) => {
  const { project, from_date, to_date, quick } = req.query as Record<string, string>;
  try {
    const data = await erpFetch("wtt_module.customization.custom.finance.get_salary", dateParams(project, from_date, to_date, quick));
    if (Array.isArray(data?.message)) return ok(res, data.message);
    throw new Error("no data");
  } catch (e: any) {
    return errFallback(res, SAMPLE_SALARY, e);
  }
});

// ── GET /api/finance-dashboard/claim ──────────────────────────────────────────
router.get("/finance-dashboard/claim", async (req, res) => {
  const { project, from_date, to_date, quick } = req.query as Record<string, string>;
  try {
    const data = await erpFetch("wtt_module.customization.custom.finance.get_claim", dateParams(project, from_date, to_date, quick));
    if (Array.isArray(data?.message)) return ok(res, data.message);
    throw new Error("no data");
  } catch (e: any) {
    return errFallback(res, SAMPLE_CLAIM, e);
  }
});

// ── GET /api/finance-dashboard/advance ────────────────────────────────────────
router.get("/finance-dashboard/advance", async (req, res) => {
  const { project, from_date, to_date, quick } = req.query as Record<string, string>;
  try {
    const data = await erpFetch("wtt_module.customization.custom.finance.get_advance", dateParams(project, from_date, to_date, quick));
    if (Array.isArray(data?.message)) return ok(res, data.message);
    throw new Error("no data");
  } catch (e: any) {
    return errFallback(res, SAMPLE_ADVANCE, e);
  }
});

export default router;
