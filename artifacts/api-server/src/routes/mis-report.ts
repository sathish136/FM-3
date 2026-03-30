import { Router } from "express";

const router = Router();

const ERPNEXT_URL = process.env.ERPNEXT_URL?.replace(/\/$/, "");
const ERPNEXT_API_KEY = process.env.ERPNEXT_API_KEY;
const ERPNEXT_API_SECRET = process.env.ERPNEXT_API_SECRET;

function authHeader() {
  return `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;
}

async function erpGet(resource: string, params: Record<string, string> = {}): Promise<any[]> {
  if (!ERPNEXT_URL || !ERPNEXT_API_KEY || !ERPNEXT_API_SECRET) return [];
  try {
    const p = new URLSearchParams({ limit_page_length: "500", ...params });
    const res = await fetch(`${ERPNEXT_URL}/api/resource/${resource}?${p}`, {
      headers: { Authorization: authHeader() },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

async function erpGetSingle(resource: string, name: string, fields: string[]): Promise<any> {
  if (!ERPNEXT_URL || !ERPNEXT_API_KEY || !ERPNEXT_API_SECRET) return null;
  try {
    const p = new URLSearchParams({ fields: JSON.stringify(fields) });
    const res = await fetch(`${ERPNEXT_URL}/api/resource/${resource}/${encodeURIComponent(name)}?${p}`, {
      headers: { Authorization: authHeader() },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

router.get("/api/admin/mis-report", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split("T")[0];
  const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split("T")[0];

  const [
    projects,
    purchaseOrders,
    materialRequests,
    employees,
    leaveApps,
    salesOrders,
    salesInvoices,
    purchaseInvoices,
    quotations,
  ] = await Promise.all([
    erpGet("Project", {
      fields: JSON.stringify(["name", "project_name", "status", "percent_complete", "expected_end_date", "estimated_costing", "actual_expense", "modified"]),
      limit_page_length: "1000",
      order_by: "modified desc",
    }),
    erpGet("Purchase Order", {
      fields: JSON.stringify(["name", "status", "grand_total", "transaction_date", "supplier", "schedule_date"]),
      limit_page_length: "500",
      order_by: "transaction_date desc",
    }),
    erpGet("Material Request", {
      fields: JSON.stringify(["name", "status", "transaction_date", "material_request_type", "project"]),
      limit_page_length: "500",
      order_by: "transaction_date desc",
    }),
    erpGet("Employee", {
      fields: JSON.stringify(["name", "employee_name", "department", "designation", "status", "date_of_joining"]),
      filters: JSON.stringify([["Employee", "status", "=", "Active"]]),
      limit_page_length: "1000",
    }),
    erpGet("Leave Application", {
      fields: JSON.stringify(["name", "employee_name", "leave_type", "from_date", "to_date", "total_leave_days", "status"]),
      limit_page_length: "500",
      order_by: "from_date desc",
    }),
    erpGet("Sales Order", {
      fields: JSON.stringify(["name", "status", "grand_total", "transaction_date", "customer", "delivery_date"]),
      limit_page_length: "500",
      order_by: "transaction_date desc",
    }),
    erpGet("Sales Invoice", {
      fields: JSON.stringify(["name", "status", "grand_total", "outstanding_amount", "posting_date", "customer", "due_date"]),
      limit_page_length: "500",
      order_by: "posting_date desc",
    }),
    erpGet("Purchase Invoice", {
      fields: JSON.stringify(["name", "status", "grand_total", "outstanding_amount", "posting_date", "supplier", "due_date"]),
      limit_page_length: "500",
      order_by: "posting_date desc",
    }),
    erpGet("Quotation", {
      fields: JSON.stringify(["name", "status", "grand_total", "transaction_date", "quotation_to", "party_name"]),
      limit_page_length: "500",
      order_by: "transaction_date desc",
    }),
  ]);

  // ── Projects ──────────────────────────────────────────────────────────────
  const activeProjects = projects.filter((p: any) => p.status === "On going" || p.status === "Open");
  const completedProjects = projects.filter((p: any) => p.status === "Completed");
  const overdueProjects = activeProjects.filter((p: any) =>
    p.expected_end_date && new Date(p.expected_end_date) < new Date()
  );
  const totalEstimated = projects.reduce((a: number, p: any) => a + (p.estimated_costing || 0), 0);
  const totalActualExpense = projects.reduce((a: number, p: any) => a + (p.actual_expense || 0), 0);
  const avgProgress = activeProjects.length
    ? Math.round(activeProjects.reduce((a: number, p: any) => a + (p.percent_complete || 0), 0) / activeProjects.length)
    : 0;

  // ── Purchase Orders ───────────────────────────────────────────────────────
  const pendingPOs = purchaseOrders.filter((p: any) => ["Draft", "To Receive and Bill", "To Bill", "To Receive"].includes(p.status));
  const poThisMonth = purchaseOrders.filter((p: any) => p.transaction_date >= monthStart);
  const totalPOValue = purchaseOrders.reduce((a: number, p: any) => a + (p.grand_total || 0), 0);
  const pendingPOValue = pendingPOs.reduce((a: number, p: any) => a + (p.grand_total || 0), 0);

  // ── Material Requests ─────────────────────────────────────────────────────
  const pendingMRs = materialRequests.filter((p: any) => ["Draft", "Submitted", "Partially Ordered"].includes(p.status));
  const mrThisMonth = materialRequests.filter((p: any) => p.transaction_date >= monthStart);

  // ── HR ────────────────────────────────────────────────────────────────────
  const deptMap: Record<string, number> = {};
  for (const e of employees) {
    const d = e.department || "Other";
    deptMap[d] = (deptMap[d] || 0) + 1;
  }
  const deptBreakdown = Object.entries(deptMap)
    .map(([dept, count]) => ({ dept, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const pendingLeaves = leaveApps.filter((l: any) => l.status === "Open");
  const approvedLeavesToday = leaveApps.filter((l: any) =>
    l.status === "Approved" && l.from_date <= today && l.to_date >= today
  );

  // ── Sales ─────────────────────────────────────────────────────────────────
  const activeSOs = salesOrders.filter((s: any) => ["To Deliver and Bill", "To Bill", "To Deliver", "Submitted"].includes(s.status));
  const soThisMonth = salesOrders.filter((s: any) => s.transaction_date >= monthStart);
  const totalSOValue = salesOrders.reduce((a: number, s: any) => a + (s.grand_total || 0), 0);
  const soThisMonthValue = soThisMonth.reduce((a: number, s: any) => a + (s.grand_total || 0), 0);

  // ── Invoices ──────────────────────────────────────────────────────────────
  const outstandingSalesInvoices = salesInvoices.filter((i: any) => i.outstanding_amount > 0);
  const overdueSalesInvoices = outstandingSalesInvoices.filter((i: any) =>
    i.due_date && new Date(i.due_date) < new Date()
  );
  const totalReceivable = outstandingSalesInvoices.reduce((a: number, i: any) => a + (i.outstanding_amount || 0), 0);
  const overdueReceivable = overdueSalesInvoices.reduce((a: number, i: any) => a + (i.outstanding_amount || 0), 0);

  const outstandingPurchaseInvoices = purchaseInvoices.filter((i: any) => i.outstanding_amount > 0);
  const overduePurchaseInvoices = outstandingPurchaseInvoices.filter((i: any) =>
    i.due_date && new Date(i.due_date) < new Date()
  );
  const totalPayable = outstandingPurchaseInvoices.reduce((a: number, i: any) => a + (i.outstanding_amount || 0), 0);

  // ── Quotations ────────────────────────────────────────────────────────────
  const openQuotations = quotations.filter((q: any) => q.status === "Open" || q.status === "Draft");
  const totalQuotationValue = openQuotations.reduce((a: number, q: any) => a + (q.grand_total || 0), 0);

  res.json({
    generated_at: new Date().toISOString(),
    period: { today, month_start: monthStart, year_start: yearStart },

    projects: {
      total: projects.length,
      active: activeProjects.length,
      completed: completedProjects.length,
      overdue: overdueProjects.length,
      avg_progress: avgProgress,
      total_estimated_value: totalEstimated,
      total_actual_expense: totalActualExpense,
      recent: activeProjects.slice(0, 10).map((p: any) => ({
        name: p.project_name || p.name,
        status: p.status,
        progress: Math.round(p.percent_complete || 0),
        due: p.expected_end_date,
        estimated: p.estimated_costing || 0,
        expense: p.actual_expense || 0,
      })),
    },

    procurement: {
      purchase_orders: {
        total: purchaseOrders.length,
        pending: pendingPOs.length,
        this_month: poThisMonth.length,
        total_value: totalPOValue,
        pending_value: pendingPOValue,
      },
      material_requests: {
        total: materialRequests.length,
        pending: pendingMRs.length,
        this_month: mrThisMonth.length,
      },
    },

    hr: {
      total_employees: employees.length,
      on_leave_today: approvedLeavesToday.length,
      pending_leave_approvals: pendingLeaves.length,
      department_breakdown: deptBreakdown,
      recent_leaves: leaveApps.slice(0, 8).map((l: any) => ({
        employee: l.employee_name,
        type: l.leave_type,
        from: l.from_date,
        to: l.to_date,
        days: l.total_leave_days,
        status: l.status,
      })),
    },

    sales: {
      orders: {
        total: salesOrders.length,
        active: activeSOs.length,
        this_month: soThisMonth.length,
        total_value: totalSOValue,
        this_month_value: soThisMonthValue,
      },
      quotations: {
        open: openQuotations.length,
        total_value: totalQuotationValue,
      },
      receivables: {
        outstanding_invoices: outstandingSalesInvoices.length,
        overdue_invoices: overdueSalesInvoices.length,
        total_receivable: totalReceivable,
        overdue_receivable: overdueReceivable,
      },
    },

    payables: {
      outstanding_invoices: outstandingPurchaseInvoices.length,
      overdue_invoices: overduePurchaseInvoices.length,
      total_payable: totalPayable,
    },
  });
});

export default router;
