import { Router } from "express";
import { erpFetch } from "../lib/erp";

const router = Router();

// ── Helpers ────────────────────────────────────────────────────────────────────

function ok(res: any, data: any) { return res.json({ message: data }); }

function num(v: any): number {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v ?? 0));
  return isNaN(n) ? 0 : n;
}

function buildParams(project?: string, from_date?: string, to_date?: string): Record<string, string> {
  const p: Record<string, string> = {};
  if (project?.trim()) p.project = project;
  if (from_date)       p.from_date = from_date;
  if (to_date)         p.to_date   = to_date;
  return p;
}

// ── GET /api/finance-dashboard/kpis ────────────────────────────────────────────
// ERP: wtt_module.customization.custom.rfq.get_project_financials
router.get("/finance-dashboard/kpis", async (req, res) => {
  const { project = "WTT-0528", from_date, to_date } = req.query as Record<string, string>;
  try {
    const data = await erpFetch(
      "wtt_module.customization.custom.rfq.get_project_financials",
      buildParams(project, from_date, to_date),
    );
    const m = data?.message ?? {};
    return ok(res, {
      project_budget:  0,
      po_cost:         num(m.po_cost),
      pr_cost:         num(m.pr_cost),
      other_expenses:  num(m.cash_request) + num(m.request_for_payment) + num(m.ticket_booking) + num(m.operational_loss),
      extra_expenses:  num(m.operational_loss),
      salary:          num(m.salary),
      cash_request:    num(m.cash_request),
      req_payment:     num(m.request_for_payment),
      ticket_booking:  num(m.ticket_booking),
      claim:           num(m.claim),
      advance:         num(m.advance),
    });
  } catch (e: any) {
    console.warn("[finance-dashboard/kpis]", e?.message ?? e);
    return ok(res, { project_budget: 0, po_cost: 0, pr_cost: 0, other_expenses: 0, extra_expenses: 0, salary: 0, cash_request: 0, req_payment: 0, ticket_booking: 0, claim: 0, advance: 0 });
  }
});

// ── GET /api/finance-dashboard/po-cost ─────────────────────────────────────────
// ERPs: get_po_wise / get_supplier_wise / get_item_group_wise
router.get("/finance-dashboard/po-cost", async (req, res) => {
  const { project = "WTT-0528" } = req.query as Record<string, string>;
  const pp = buildParams(project);
  try {
    const [poWise, supWise, igWise] = await Promise.allSettled([
      erpFetch("wtt_module.customization.custom.rfq.get_po_wise",         pp),
      erpFetch("wtt_module.customization.custom.rfq.get_supplier_wise",   pp),
      erpFetch("wtt_module.customization.custom.rfq.get_item_group_wise", pp),
    ]);
    const msg = (r: PromiseSettledResult<any>) =>
      r.status === "fulfilled" && Array.isArray(r.value?.message) ? r.value.message : [];

    return ok(res, {
      po_wise: msg(poWise).map((i: any) => ({
        po_no:     i.po_name   ?? "",
        supplier:  i.supplier  ?? "",
        po_amount: num(i.total_po_cost),
      })),
      supplier_wise: msg(supWise).map((i: any) => ({
        supplier:  i.supplier    ?? "",
        no_of_pos: num(i.no_of_pos),
        po_amount: num(i.total_amount),
      })),
      item_group_wise: msg(igWise).map((i: any) => ({
        item_group:  i.item_group  ?? "",
        no_of_items: num(i.no_of_items),
        po_amount:   num(i.total_amount),
      })),
    });
  } catch (e: any) {
    console.warn("[finance-dashboard/po-cost]", e?.message ?? e);
    return ok(res, { po_wise: [], supplier_wise: [], item_group_wise: [] });
  }
});

// ── GET /api/finance-dashboard/pr-cost ─────────────────────────────────────────
// ERPs: get_pr_wise / get_pr_supplier_wise / get_pr_item_group_wise
router.get("/finance-dashboard/pr-cost", async (req, res) => {
  const { project = "WTT-0528" } = req.query as Record<string, string>;
  const pp = buildParams(project);
  try {
    const [prWise, supWise, igWise] = await Promise.allSettled([
      erpFetch("wtt_module.customization.custom.rfq.get_pr_wise",            pp),
      erpFetch("wtt_module.customization.custom.rfq.get_pr_supplier_wise",   pp),
      erpFetch("wtt_module.customization.custom.rfq.get_pr_item_group_wise", pp),
    ]);
    const msg = (r: PromiseSettledResult<any>) =>
      r.status === "fulfilled" && Array.isArray(r.value?.message) ? r.value.message : [];

    return ok(res, {
      pr_wise: msg(prWise).map((i: any) => ({
        pr_no:     i.pr_name       ?? "",
        supplier:  i.supplier      ?? "",
        pr_amount: num(i.total_pr_cost),
      })),
      supplier_wise: msg(supWise).map((i: any) => ({
        supplier:  i.supplier   ?? "",
        no_of_prs: num(i.no_of_prs),
        pr_amount: num(i.total_amount),
      })),
      item_group_wise: msg(igWise).map((i: any) => ({
        item_group:  i.item_group  ?? "",
        no_of_items: num(i.no_of_items),
        pr_amount:   num(i.total_amount),
      })),
    });
  } catch (e: any) {
    console.warn("[finance-dashboard/pr-cost]", e?.message ?? e);
    return ok(res, { pr_wise: [], supplier_wise: [], item_group_wise: [] });
  }
});

// ── GET /api/finance-dashboard/cash-request ────────────────────────────────────
// ERP: wtt_module.customization.custom.rfq.get_cash_request
router.get("/finance-dashboard/cash-request", async (req, res) => {
  const { project = "WTT-0528", from_date, to_date } = req.query as Record<string, string>;
  try {
    const data = await erpFetch(
      "wtt_module.customization.custom.rfq.get_cash_request",
      buildParams(project, from_date, to_date),
    );
    const items: any[] = Array.isArray(data?.message) ? data.message : [];
    return ok(res, items.map(i => ({
      date:        i.transaction_date ?? i.date ?? i.posting_date ?? i.creation ?? "",
      entry_no:    i.name ?? i.entry_no ?? i.document_no ?? "",
      remarks:     i.remarks ?? i.description ?? i.purpose ?? i.cash_purpose ?? "",
      created_by:  i.created_by ?? i.owner ?? i.employee ?? i.employee_name ?? "System",
      amount:      num(i.total ?? i.amount ?? i.grand_total ?? i.net_total),
      approved_by: i.workflow_state ?? i.approved_by ?? i.status ?? String(i.docstatus ?? "") ?? "",
    })));
  } catch (e: any) {
    console.warn("[finance-dashboard/cash-request]", e?.message ?? e);
    return ok(res, []);
  }
});

// ── GET /api/finance-dashboard/req-payment ─────────────────────────────────────
// ERP: wtt_module.customization.custom.rfq.get_request_for_payment
router.get("/finance-dashboard/req-payment", async (req, res) => {
  const { project = "WTT-0528", from_date, to_date } = req.query as Record<string, string>;
  try {
    const data = await erpFetch(
      "wtt_module.customization.custom.rfq.get_request_for_payment",
      buildParams(project, from_date, to_date),
    );
    const items: any[] = Array.isArray(data?.message) ? data.message : [];
    return ok(res, items.map(i => ({
      date:        i.date ?? "",
      entry_no:    i.name ?? "",
      remarks:     i.remarks ?? "",
      created_by:  "Finance",
      amount:      num(i.total),
      approved_by: i.workflow_state ?? "",
    })));
  } catch (e: any) {
    console.warn("[finance-dashboard/req-payment]", e?.message ?? e);
    return ok(res, []);
  }
});

// ── GET /api/finance-dashboard/ticket-booking ──────────────────────────────────
// ERP: wtt_module.customization.custom.rfq.get_ticket_booking_details
router.get("/finance-dashboard/ticket-booking", async (req, res) => {
  const { project = "WTT-0528", from_date, to_date } = req.query as Record<string, string>;
  try {
    const data = await erpFetch(
      "wtt_module.customization.custom.rfq.get_ticket_booking_details",
      buildParams(project, from_date, to_date),
    );
    const items: any[] = Array.isArray(data?.message) ? data.message : [];
    return ok(res, items.map(i => ({
      date:          i.travel_date   ?? "",
      entry_no:      i.name          ?? "",
      employee_name: i.employee_name ?? "",
      amount:        num(i.fare),
      reason:        i.other_details ?? "",
    })));
  } catch (e: any) {
    console.warn("[finance-dashboard/ticket-booking]", e?.message ?? e);
    return ok(res, []);
  }
});

// ── GET /api/finance-dashboard/extra-expenses ──────────────────────────────────
// ERP: wtt_module.customization.custom.rfq.get_operational_loss_details
router.get("/finance-dashboard/extra-expenses", async (req, res) => {
  const { project = "WTT-0528", from_date, to_date } = req.query as Record<string, string>;
  try {
    const data = await erpFetch(
      "wtt_module.customization.custom.rfq.get_operational_loss_details",
      buildParams(project, from_date, to_date),
    );
    const items: any[] = Array.isArray(data?.message) ? data.message : [];
    return ok(res, items.map(i => ({
      date:          i.date              ?? "",
      entry_no:      i.name              ?? "",
      employee_name: i.responsible_person ?? "",
      amount:        num(i.manpower_cost),
      reason:        i.title_short_summary ?? "",
    })));
  } catch (e: any) {
    console.warn("[finance-dashboard/extra-expenses]", e?.message ?? e);
    return ok(res, []);
  }
});

// ── GET /api/finance-dashboard/salary ─────────────────────────────────────────
// ERP: wtt_module.customization.custom.rfq.get_salary_details
router.get("/finance-dashboard/salary", async (req, res) => {
  const { project = "WTT-0528", from_date, to_date } = req.query as Record<string, string>;
  try {
    const data = await erpFetch(
      "wtt_module.customization.custom.rfq.get_salary_details",
      buildParams(project, from_date, to_date),
    );
    const items: any[] = Array.isArray(data?.message) ? data.message : [];
    return ok(res, items.map(i => ({
      employee: i.employee_name ?? "",
      salary:   num(i.rounded_total),
    })));
  } catch (e: any) {
    console.warn("[finance-dashboard/salary]", e?.message ?? e);
    return ok(res, []);
  }
});

// ── GET /api/finance-dashboard/claim ──────────────────────────────────────────
// ERP: wtt_module.customization.custom.rfq.get_claim_request_details
router.get("/finance-dashboard/claim", async (req, res) => {
  const { project = "WTT-0528", from_date, to_date } = req.query as Record<string, string>;
  try {
    const data = await erpFetch(
      "wtt_module.customization.custom.rfq.get_claim_request_details",
      buildParams(project, from_date, to_date),
    );
    const items: any[] = Array.isArray(data?.message) ? data.message : [];
    return ok(res, items.map(i => ({
      employee:     i.employee_name ?? "",
      claim_amount: num(i.grand_total),
    })));
  } catch (e: any) {
    console.warn("[finance-dashboard/claim]", e?.message ?? e);
    return ok(res, []);
  }
});

// ── GET /api/finance-dashboard/advance ────────────────────────────────────────
// ERP: wtt_module.customization.custom.rfq.get_employee_advance_details
router.get("/finance-dashboard/advance", async (req, res) => {
  const { project = "WTT-0528", from_date, to_date } = req.query as Record<string, string>;
  try {
    const data = await erpFetch(
      "wtt_module.customization.custom.rfq.get_employee_advance_details",
      buildParams(project, from_date, to_date),
    );
    const items: any[] = Array.isArray(data?.message) ? data.message : [];
    return ok(res, items.map(i => ({
      employee_name:   i.employee_name ?? "",
      advanced_amount: num(i.paid_amount),
    })));
  } catch (e: any) {
    console.warn("[finance-dashboard/advance]", e?.message ?? e);
    return ok(res, []);
  }
});

export default router;
