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
    salarySlips,
    leads,
    tasks,
    timesheetDetails,
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
    erpGet("Salary Slip", {
      fields: JSON.stringify(["name", "employee", "employee_name", "department", "posting_date", "gross_pay", "net_pay", "total_deduction", "status", "start_date", "end_date"]),
      filters: JSON.stringify([["Salary Slip", "posting_date", ">=", yearStart]]),
      limit_page_length: "500",
      order_by: "posting_date desc",
    }),
    erpGet("Lead", {
      fields: JSON.stringify(["name", "lead_name", "company_name", "status", "source", "email_id", "mobile_no", "lead_owner", "creation", "modified", "expected_revenue", "notes"]),
      limit_page_length: "300",
      order_by: "modified desc",
    }),
    erpGet("Task", {
      fields: JSON.stringify(["name", "subject", "status", "priority", "project", "exp_start_date", "exp_end_date", "completed_on", "description", "_assign", "is_group", "actual_time"]),
      limit_page_length: "1000",
      order_by: "modified desc",
    }),
    erpGet("Timesheet Detail", {
      fields: JSON.stringify(["name", "parent", "employee", "employee_name", "from_time", "to_time", "hours", "project", "task", "description"]),
      limit_page_length: "2000",
      order_by: "from_time desc",
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

  // ── Leads ─────────────────────────────────────────────────────────────────
  const openLeads = leads.filter((l: any) => !["Converted", "Do Not Contact"].includes(l.status));
  const convertedLeads = leads.filter((l: any) => l.status === "Converted");
  const leadsThisMonth = leads.filter((l: any) => (l.creation || "").substring(0, 10) >= monthStart);
  const totalLeadRevenue = leads.reduce((a: number, l: any) => a + (l.expected_revenue || 0), 0);

  // ── Task Allocation & Productivity ────────────────────────────────────────
  // Build employee → department lookup
  const empDeptMap: Record<string, string> = {};
  const empNameMap: Record<string, string> = {};
  for (const e of employees) {
    empDeptMap[e.name] = e.department || "Other";
    empNameMap[e.name] = e.employee_name || e.name;
    // also map by email / full name patterns
    if (e.employee_name) empDeptMap[e.employee_name] = e.department || "Other";
  }

  // Parse _assign JSON (ERPNext stores it as a JSON array string of emails)
  function parseAssign(raw: any): string[] {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  }

  // Per-employee task stats
  const empTaskMap: Record<string, { name: string; dept: string; total: number; completed: number; overdue: number; open: number; hours: number; tasks: any[] }> = {};
  const deptTaskMap: Record<string, { total: number; completed: number; overdue: number; open: number; hours: number }> = {};

  for (const t of tasks) {
    if (t.is_group) continue;
    const assignees = parseAssign(t._assign);
    const isCompleted = t.status === "Completed" || t.status === "Closed";
    const isOverdue = !isCompleted && t.exp_end_date && new Date(t.exp_end_date) < new Date();
    const isOpen = !isCompleted;
    const hours = t.actual_time || 0;

    const targets = assignees.length > 0 ? assignees : ["unassigned"];
    for (const assignee of targets) {
      if (!empTaskMap[assignee]) {
        const dept = empDeptMap[assignee] || "Other";
        empTaskMap[assignee] = { name: empNameMap[assignee] || assignee, dept, total: 0, completed: 0, overdue: 0, open: 0, hours: 0, tasks: [] };
      }
      empTaskMap[assignee].total++;
      if (isCompleted) empTaskMap[assignee].completed++;
      if (isOverdue) empTaskMap[assignee].overdue++;
      if (isOpen) empTaskMap[assignee].open++;
      empTaskMap[assignee].hours += hours;
      empTaskMap[assignee].tasks.push({ id: t.name, subject: t.subject, status: t.status, priority: t.priority, project: t.project, due: t.exp_end_date, completed_on: t.completed_on });
    }

    // Dept rollup (from project or assignee dept)
    const dept = assignees.length > 0 ? (empDeptMap[assignees[0]] || "Other") : "Other";
    if (!deptTaskMap[dept]) deptTaskMap[dept] = { total: 0, completed: 0, overdue: 0, open: 0, hours: 0 };
    deptTaskMap[dept].total++;
    if (isCompleted) deptTaskMap[dept].completed++;
    if (isOverdue) deptTaskMap[dept].overdue++;
    if (isOpen) deptTaskMap[dept].open++;
    deptTaskMap[dept].hours += hours;
  }

  // Per-employee timesheet hours
  const empHoursMap: Record<string, number> = {};
  for (const td of timesheetDetails) {
    const emp = td.employee_name || td.employee || "";
    if (!emp) continue;
    empHoursMap[emp] = (empHoursMap[emp] || 0) + (td.hours || 0);
  }
  // Per-dept timesheet hours
  const deptHoursMap: Record<string, number> = {};
  for (const td of timesheetDetails) {
    const emp = td.employee_name || td.employee || "";
    const dept = empDeptMap[emp] || empDeptMap[td.employee] || "Other";
    deptHoursMap[dept] = (deptHoursMap[dept] || 0) + (td.hours || 0);
  }

  const employeeProductivity = Object.entries(empTaskMap)
    .filter(([k]) => k !== "unassigned")
    .map(([assignee, s]) => ({
      assignee,
      name: s.name,
      dept: s.dept,
      total: s.total,
      completed: s.completed,
      overdue: s.overdue,
      open: s.open,
      completion_rate: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
      hours_logged: Math.round((empHoursMap[s.name] || empHoursMap[assignee] || 0) * 10) / 10,
      tasks: s.tasks.slice(0, 20),
    }))
    .sort((a, b) => b.total - a.total);

  const deptProductivity = Object.entries(deptTaskMap).map(([dept, s]) => ({
    dept,
    employees: employees.filter((e: any) => e.department === dept).length,
    total: s.total,
    completed: s.completed,
    overdue: s.overdue,
    open: s.open,
    completion_rate: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
    hours_logged: Math.round((deptHoursMap[dept] || 0) * 10) / 10,
  })).sort((a, b) => b.total - a.total);

  // Task status breakdown
  const taskStatusMap: Record<string, number> = {};
  for (const t of tasks) { if (!t.is_group) taskStatusMap[t.status || "Unknown"] = (taskStatusMap[t.status || "Unknown"] || 0) + 1; }
  const taskPriorityMap: Record<string, number> = {};
  for (const t of tasks) { if (!t.is_group) taskPriorityMap[t.priority || "Medium"] = (taskPriorityMap[t.priority || "Medium"] || 0) + 1; }

  const allTasks = tasks.filter((t: any) => !t.is_group);
  const completedTasks = allTasks.filter((t: any) => t.status === "Completed");
  const overdueTasks = allTasks.filter((t: any) => !["Completed","Closed"].includes(t.status) && t.exp_end_date && new Date(t.exp_end_date) < new Date());
  const openTasks = allTasks.filter((t: any) => !["Completed","Closed","Cancelled"].includes(t.status));

  // ── All Sales Invoices ────────────────────────────────────────────────────
  const paidSalesInvoices = salesInvoices.filter((i: any) => i.status === "Paid");
  const unpaidSalesInvoices = salesInvoices.filter((i: any) => i.status === "Unpaid" || i.status === "Overdue" || i.outstanding_amount > 0);
  const siThisMonth = salesInvoices.filter((i: any) => (i.posting_date || "") >= monthStart);
  const totalSIValue = salesInvoices.reduce((a: number, i: any) => a + (i.grand_total || 0), 0);
  const totalSIThisMonth = siThisMonth.reduce((a: number, i: any) => a + (i.grand_total || 0), 0);

  // ── All Purchase Invoices (Outgoing Bills) ────────────────────────────────
  const piThisMonth = purchaseInvoices.filter((i: any) => (i.posting_date || "") >= monthStart);
  const totalPIValue = purchaseInvoices.reduce((a: number, i: any) => a + (i.grand_total || 0), 0);
  const totalPIThisMonth = piThisMonth.reduce((a: number, i: any) => a + (i.grand_total || 0), 0);

  // ── Expense Claims ────────────────────────────────────────────────────────
  const pendingExpenses = expenseClaims.filter((e: any) => e.approval_status === "Draft" || e.approval_status === "Submitted");
  const approvedExpenses = expenseClaims.filter((e: any) => e.approval_status === "Approved");
  const totalClaimedPending = pendingExpenses.reduce((a: number, e: any) => a + (e.total_claimed_amount || 0), 0);
  const totalApproved = approvedExpenses.reduce((a: number, e: any) => a + (e.total_sanctioned_amount || 0), 0);

  // ── Salary Slips ──────────────────────────────────────────────────────────
  const submittedSlips = salarySlips.filter((s: any) => s.status === "Submitted");
  const slipsThisMonth = salarySlips.filter((s: any) => s.posting_date >= monthStart);
  const totalGrossThisMonth = slipsThisMonth.reduce((a: number, s: any) => a + (s.gross_pay || 0), 0);
  const totalNetThisMonth = slipsThisMonth.reduce((a: number, s: any) => a + (s.net_pay || 0), 0);
  const totalDeductionThisMonth = slipsThisMonth.reduce((a: number, s: any) => a + (s.total_deduction || 0), 0);
  const totalGrossYTD = submittedSlips.reduce((a: number, s: any) => a + (s.gross_pay || 0), 0);
  const totalNetYTD = submittedSlips.reduce((a: number, s: any) => a + (s.net_pay || 0), 0);
  // Monthly salary trend (last 6 months)
  const monthlyPayroll: Record<string, { gross: number; net: number; count: number }> = {};
  for (const s of submittedSlips) {
    const m = (s.posting_date || "").substring(0, 7);
    if (!m) continue;
    if (!monthlyPayroll[m]) monthlyPayroll[m] = { gross: 0, net: 0, count: 0 };
    monthlyPayroll[m].gross += s.gross_pay || 0;
    monthlyPayroll[m].net += s.net_pay || 0;
    monthlyPayroll[m].count++;
  }
  const payrollMonths = Object.entries(monthlyPayroll)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([month, v]) => ({ month, ...v }));
  // Dept cost breakdown
  const deptCostMap: Record<string, number> = {};
  for (const s of submittedSlips) {
    const d = s.department || "Other";
    deptCostMap[d] = (deptCostMap[d] || 0) + (s.gross_pay || 0);
  }
  const deptCostBreakdown = Object.entries(deptCostMap)
    .map(([dept, gross]) => ({ dept, gross }))
    .sort((a, b) => b.gross - a.gross);

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
      salary: {
        total_slips: salarySlips.length,
        slips_this_month: slipsThisMonth.length,
        gross_this_month: totalGrossThisMonth,
        net_this_month: totalNetThisMonth,
        deduction_this_month: totalDeductionThisMonth,
        gross_ytd: totalGrossYTD,
        net_ytd: totalNetYTD,
        monthly_trend: payrollMonths,
        dept_cost: deptCostBreakdown,
        list: salarySlips.slice(0, 50).map((s: any) => ({
          id: s.name,
          employee: s.employee_name,
          emp_id: s.employee,
          department: s.department || "",
          month: (s.posting_date || "").substring(0, 7),
          gross: s.gross_pay || 0,
          net: s.net_pay || 0,
          deduction: s.total_deduction || 0,
          status: s.status,
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
        list: quotations.slice(0, 50).map((q: any) => ({
          id: q.name,
          party: q.party_name,
          amount: q.grand_total || 0,
          status: q.status,
          date: q.transaction_date,
          valid_till: q.valid_till,
        })),
      },
      invoices: {
        total: salesInvoices.length,
        paid: paidSalesInvoices.length,
        unpaid: unpaidSalesInvoices.length,
        this_month: siThisMonth.length,
        total_value: totalSIValue,
        this_month_value: totalSIThisMonth,
        list: salesInvoices.slice(0, 100).map((i: any) => ({
          id: i.name,
          customer: i.customer,
          amount: i.grand_total || 0,
          outstanding: i.outstanding_amount || 0,
          status: i.status,
          posted: i.posting_date,
          due: i.due_date,
          overdue: !!(i.due_date && new Date(i.due_date) < new Date() && i.outstanding_amount > 0),
          project: i.project || "",
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

    leads: {
      total: leads.length,
      open: openLeads.length,
      converted: convertedLeads.length,
      this_month: leadsThisMonth.length,
      total_expected_revenue: totalLeadRevenue,
      list: leads.slice(0, 100).map((l: any) => ({
        id: l.name,
        name: l.lead_name || l.name,
        company: l.company_name || "",
        status: l.status || "Open",
        source: l.source || "",
        email: l.email_id || "",
        mobile: l.mobile_no || "",
        owner: l.lead_owner || "",
        revenue: l.expected_revenue || 0,
        created: (l.creation || "").substring(0, 10),
        modified: (l.modified || "").substring(0, 10),
      })),
    },

    accounting: {
      total_incoming_bills: totalSIValue,
      total_outgoing_bills: totalPIValue,
      total_incoming_payment: totalReceived,
      total_outgoing_payment: totalPaid,
      this_month_incoming_bills: totalSIThisMonth,
      this_month_outgoing_bills: totalPIThisMonth,
      purchase_invoices: {
        total: purchaseInvoices.length,
        this_month: piThisMonth.length,
        total_value: totalPIValue,
        list: purchaseInvoices.slice(0, 100).map((i: any) => ({
          id: i.name,
          supplier: i.supplier,
          amount: i.grand_total || 0,
          outstanding: i.outstanding_amount || 0,
          status: i.status,
          posted: i.posting_date,
          due: i.due_date,
          overdue: !!(i.due_date && new Date(i.due_date) < new Date() && i.outstanding_amount > 0),
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

    productivity: {
      summary: {
        total_tasks: allTasks.length,
        completed: completedTasks.length,
        overdue: overdueTasks.length,
        open: openTasks.length,
        completion_rate: allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0,
        total_hours_logged: Math.round(timesheetDetails.reduce((a: number, t: any) => a + (t.hours || 0), 0) * 10) / 10,
      },
      status_breakdown: Object.entries(taskStatusMap).map(([status, count]) => ({ status, count })).sort((a, b) => (b.count as number) - (a.count as number)),
      priority_breakdown: Object.entries(taskPriorityMap).map(([priority, count]) => ({ priority, count })).sort((a, b) => (b.count as number) - (a.count as number)),
      by_department: deptProductivity,
      by_employee: employeeProductivity,
      overdue_tasks: overdueTasks.slice(0, 30).map((t: any) => ({
        id: t.name,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        project: t.project || "",
        due: t.exp_end_date,
        assignees: parseAssign(t._assign),
      })),
      recent_tasks: allTasks.slice(0, 50).map((t: any) => ({
        id: t.name,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        project: t.project || "",
        due: t.exp_end_date,
        completed_on: t.completed_on,
        assignees: parseAssign(t._assign),
        hours: t.actual_time || 0,
      })),
    },
  });
});

export default router;
