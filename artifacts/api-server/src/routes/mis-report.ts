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

router.get("/admin/mis-report", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;

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
    deliveryNotes,
    paymentEntries,
    expenseClaims,
  ] = await Promise.all([
    erpGet("Project", {
      fields: JSON.stringify(["name", "project_name", "status", "percent_complete", "expected_end_date", "estimated_costing", "actual_expense", "customer", "modified", "project_type"]),
      limit_page_length: "1000",
      order_by: "modified desc",
    }),
    erpGet("Purchase Order", {
      fields: JSON.stringify(["name", "status", "grand_total", "transaction_date", "supplier", "schedule_date", "per_received", "per_billed", "project"]),
      limit_page_length: "500",
      order_by: "transaction_date desc",
    }),
    erpGet("Material Request", {
      fields: JSON.stringify(["name", "status", "transaction_date", "material_request_type", "project", "schedule_date", "requested_by"]),
      limit_page_length: "500",
      order_by: "transaction_date desc",
    }),
    erpGet("Employee", {
      fields: JSON.stringify(["name", "employee_name", "department", "designation", "status", "date_of_joining", "gender"]),
      filters: JSON.stringify([["Employee", "status", "=", "Active"]]),
      limit_page_length: "1000",
    }),
    erpGet("Leave Application", {
      fields: JSON.stringify(["name", "employee", "employee_name", "leave_type", "from_date", "to_date", "total_leave_days", "status", "description"]),
      limit_page_length: "200",
      order_by: "from_date desc",
    }),
    erpGet("Sales Order", {
      fields: JSON.stringify(["name", "status", "grand_total", "transaction_date", "customer", "delivery_date", "per_delivered", "per_billed", "project", "advance_payment_status"]),
      limit_page_length: "500",
      order_by: "transaction_date desc",
    }),
    erpGet("Sales Invoice", {
      fields: JSON.stringify(["name", "status", "grand_total", "outstanding_amount", "posting_date", "customer", "due_date", "project"]),
      limit_page_length: "500",
      order_by: "posting_date desc",
    }),
    erpGet("Purchase Invoice", {
      fields: JSON.stringify(["name", "status", "grand_total", "outstanding_amount", "posting_date", "supplier", "due_date", "project"]),
      limit_page_length: "500",
      order_by: "posting_date desc",
    }),
    erpGet("Quotation", {
      fields: JSON.stringify(["name", "status", "grand_total", "transaction_date", "quotation_to", "party_name", "valid_till"]),
      limit_page_length: "500",
      order_by: "transaction_date desc",
    }),
    erpGet("Delivery Note", {
      fields: JSON.stringify(["name", "status", "posting_date", "customer", "project", "grand_total", "lr_no", "lr_date", "transporter_name"]),
      limit_page_length: "300",
      order_by: "posting_date desc",
    }),
    erpGet("Payment Entry", {
      fields: JSON.stringify(["name", "payment_type", "posting_date", "party_type", "party", "paid_amount", "reference_no", "remarks", "mode_of_payment", "project"]),
      limit_page_length: "200",
      order_by: "posting_date desc",
    }),
    erpGet("Expense Claim", {
      fields: JSON.stringify(["name", "employee_name", "expense_date", "total_claimed_amount", "total_sanctioned_amount", "status", "approval_status", "department"]),
      limit_page_length: "200",
      order_by: "expense_date desc",
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
    .sort((a, b) => b.count - a.count);

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

  // ── Delivery Notes ────────────────────────────────────────────────────────
  const pendingDNs = deliveryNotes.filter((d: any) => d.status === "Draft" || d.status === "To Bill");
  const dnThisMonth = deliveryNotes.filter((d: any) => d.posting_date >= monthStart);
  const totalDNValue = deliveryNotes.reduce((a: number, d: any) => a + (d.grand_total || 0), 0);

  // ── Payment Entries ───────────────────────────────────────────────────────
  const receivedPayments = paymentEntries.filter((p: any) => p.payment_type === "Receive");
  const madePayments = paymentEntries.filter((p: any) => p.payment_type === "Pay");
  const paymentsThisMonth = paymentEntries.filter((p: any) => p.posting_date >= monthStart);
  const totalReceived = receivedPayments.reduce((a: number, p: any) => a + (p.paid_amount || 0), 0);
  const totalPaid = madePayments.reduce((a: number, p: any) => a + (p.paid_amount || 0), 0);

  // ── Expense Claims ────────────────────────────────────────────────────────
  const pendingExpenses = expenseClaims.filter((e: any) => e.approval_status === "Draft" || e.approval_status === "Submitted");
  const approvedExpenses = expenseClaims.filter((e: any) => e.approval_status === "Approved");
  const totalClaimedPending = pendingExpenses.reduce((a: number, e: any) => a + (e.total_claimed_amount || 0), 0);
  const totalApproved = approvedExpenses.reduce((a: number, e: any) => a + (e.total_sanctioned_amount || 0), 0);

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
      list: activeProjects.map((p: any) => ({
        name: p.project_name || p.name,
        id: p.name,
        status: p.status,
        progress: Math.round(p.percent_complete || 0),
        due: p.expected_end_date,
        customer: p.customer || "",
        type: p.project_type || "",
        estimated: p.estimated_costing || 0,
        expense: p.actual_expense || 0,
        overdue: !!(p.expected_end_date && new Date(p.expected_end_date) < new Date()),
      })),
    },

    procurement: {
      purchase_orders: {
        total: purchaseOrders.length,
        pending: pendingPOs.length,
        this_month: poThisMonth.length,
        total_value: totalPOValue,
        pending_value: pendingPOValue,
        list: purchaseOrders.slice(0, 50).map((p: any) => ({
          id: p.name,
          supplier: p.supplier,
          amount: p.grand_total || 0,
          status: p.status,
          date: p.transaction_date,
          due: p.schedule_date,
          received_pct: Math.round(p.per_received || 0),
          billed_pct: Math.round(p.per_billed || 0),
          project: p.project || "",
        })),
      },
      material_requests: {
        total: materialRequests.length,
        pending: pendingMRs.length,
        this_month: mrThisMonth.length,
        list: materialRequests.slice(0, 30).map((m: any) => ({
          id: m.name,
          type: m.material_request_type,
          status: m.status,
          date: m.transaction_date,
          due: m.schedule_date,
          project: m.project || "",
          requested_by: m.requested_by || "",
        })),
      },
      delivery_notes: {
        total: deliveryNotes.length,
        pending: pendingDNs.length,
        this_month: dnThisMonth.length,
        total_value: totalDNValue,
        list: deliveryNotes.slice(0, 30).map((d: any) => ({
          id: d.name,
          customer: d.customer,
          date: d.posting_date,
          amount: d.grand_total || 0,
          status: d.status,
          project: d.project || "",
          lr_no: d.lr_no || "",
          transporter: d.transporter_name || "",
        })),
      },
    },

    hr: {
      total_employees: employees.length,
      on_leave_today: approvedLeavesToday.length,
      pending_leave_approvals: pendingLeaves.length,
      department_breakdown: deptBreakdown,
      leave_applications: leaveApps.slice(0, 50).map((l: any) => ({
        id: l.name,
        employee: l.employee_name,
        emp_id: l.employee,
        type: l.leave_type,
        from: l.from_date,
        to: l.to_date,
        days: l.total_leave_days,
        status: l.status,
        note: l.description || "",
      })),
      expense_claims: {
        pending: pendingExpenses.length,
        approved: approvedExpenses.length,
        total_pending_amount: totalClaimedPending,
        total_approved_amount: totalApproved,
        list: expenseClaims.slice(0, 30).map((e: any) => ({
          id: e.name,
          employee: e.employee_name,
          date: e.expense_date,
          claimed: e.total_claimed_amount || 0,
          sanctioned: e.total_sanctioned_amount || 0,
          status: e.approval_status,
          department: e.department || "",
        })),
      },
    },

    sales: {
      orders: {
        total: salesOrders.length,
        active: activeSOs.length,
        this_month: soThisMonth.length,
        total_value: totalSOValue,
        this_month_value: soThisMonthValue,
        list: salesOrders.slice(0, 50).map((s: any) => ({
          id: s.name,
          customer: s.customer,
          amount: s.grand_total || 0,
          status: s.status,
          date: s.transaction_date,
          delivery: s.delivery_date,
          delivered_pct: Math.round(s.per_delivered || 0),
          billed_pct: Math.round(s.per_billed || 0),
          project: s.project || "",
        })),
      },
      quotations: {
        open: openQuotations.length,
        total_value: totalQuotationValue,
        list: openQuotations.slice(0, 30).map((q: any) => ({
          id: q.name,
          party: q.party_name,
          amount: q.grand_total || 0,
          status: q.status,
          date: q.transaction_date,
          valid_till: q.valid_till,
        })),
      },
      receivables: {
        outstanding_invoices: outstandingSalesInvoices.length,
        overdue_invoices: overdueSalesInvoices.length,
        total_receivable: totalReceivable,
        overdue_receivable: overdueReceivable,
        all_outstanding: outstandingSalesInvoices.slice(0, 50).map((i: any) => ({
          id: i.name,
          customer: i.customer,
          amount: i.grand_total || 0,
          outstanding: i.outstanding_amount || 0,
          posted: i.posting_date,
          due: i.due_date,
          overdue: !!(i.due_date && new Date(i.due_date) < new Date()),
          project: i.project || "",
        })),
      },
    },

    payables: {
      outstanding_invoices: outstandingPurchaseInvoices.length,
      overdue_invoices: overduePurchaseInvoices.length,
      total_payable: totalPayable,
      all_outstanding: outstandingPurchaseInvoices.slice(0, 50).map((i: any) => ({
        id: i.name,
        supplier: i.supplier,
        amount: i.grand_total || 0,
        outstanding: i.outstanding_amount || 0,
        posted: i.posting_date,
        due: i.due_date,
        overdue: !!(i.due_date && new Date(i.due_date) < new Date()),
        project: i.project || "",
      })),
    },

    payments: {
      total_received: totalReceived,
      total_paid: totalPaid,
      this_month: paymentsThisMonth.length,
      list: paymentEntries.slice(0, 50).map((p: any) => ({
        id: p.name,
        type: p.payment_type,
        date: p.posting_date,
        party_type: p.party_type,
        party: p.party,
        amount: p.paid_amount || 0,
        mode: p.mode_of_payment || "",
        ref: p.reference_no || "",
        project: p.project || "",
      })),
    },
  });
});

export default router;
