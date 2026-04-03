import { Router } from "express";
import { erpFetch, projectParams } from "../lib/erp";
import https from "https";

const router = Router();

const ERP_BASE = "https://erp.wttint.com";
const ERP_API_KEY = process.env.ERPNEXT_API_KEY || "";
const ERP_API_SECRET = process.env.ERPNEXT_API_SECRET || "";

function erpResource(doctype: string, params: Record<string, string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const query = "?" + new URLSearchParams(params).toString();
    const fullPath = `/api/resource/${encodeURIComponent(doctype)}${query}`;
    const options = {
      hostname: new URL(ERP_BASE).hostname,
      path: fullPath,
      method: "GET",
      headers: {
        Authorization: `token ${ERP_API_KEY}:${ERP_API_SECRET}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      rejectUnauthorized: false,
      timeout: 30000,
    };
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (c) => { body += c; });
      res.on("end", () => {
        try { resolve(JSON.parse(body)); } catch { resolve({}); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("ERP timeout")); });
    req.end();
  });
}

// GET /api/stock-reports/summary?project=
// Project-level stock summary using existing WTT custom function
router.get("/stock-reports/summary", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch(
      "wtt_module.customization.custom.rfq.get_stock_summary",
      projectParams(project),
    );
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/stock-reports/bin?warehouse=&item_group=&search=
// Current stock across all warehouses (Bin doctype)
router.get("/stock-reports/bin", async (req, res) => {
  const warehouse = req.query.warehouse as string | undefined;
  const item_group = req.query.item_group as string | undefined;
  const search = req.query.search as string | undefined;

  const fields = JSON.stringify([
    "item_code", "item_name", "warehouse",
    "actual_qty", "projected_qty", "reserved_qty",
    "stock_uom", "valuation_rate", "stock_value",
  ]);

  const filters: any[] = [["Bin", "actual_qty", ">", 0]];
  if (warehouse) filters.push(["Bin", "warehouse", "like", `%${warehouse}%`]);
  if (item_group) filters.push(["Bin", "item_group", "=", item_group]);
  if (search) {
    filters.push(["Bin", "item_code", "like", `%${search}%`]);
  }

  try {
    const data = await erpResource("Bin", {
      fields,
      filters: JSON.stringify(filters),
      limit_page_length: "2000",
      order_by: "item_code asc",
    });
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/stock-reports/warehouses
// List warehouses for filter dropdown
router.get("/stock-reports/warehouses", async (req, res) => {
  try {
    const data = await erpResource("Warehouse", {
      fields: JSON.stringify(["name", "warehouse_name", "warehouse_type", "is_group"]),
      filters: JSON.stringify([["Warehouse", "is_group", "=", 0]]),
      limit_page_length: "500",
      order_by: "name asc",
    });
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/stock-reports/item-groups
// List item groups for filter dropdown
router.get("/stock-reports/item-groups", async (req, res) => {
  try {
    const data = await erpResource("Item Group", {
      fields: JSON.stringify(["name"]),
      filters: JSON.stringify([["Item Group", "is_group", "=", 0]]),
      limit_page_length: "200",
      order_by: "name asc",
    });
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/stock-reports/projects
// List all projects for filter dropdown
router.get("/stock-reports/projects", async (req, res) => {
  try {
    const data = await erpResource("Project", {
      fields: JSON.stringify(["name", "project_name", "status"]),
      filters: JSON.stringify([["Project", "status", "=", "On going"]]),
      limit_page_length: "500",
      order_by: "name asc",
    });
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/stock-reports/stock-summary?from_date=&to_date=
// Warehouse-wise closing qty + closing amount (runs ERPNext "Stock Summary" report in Summary mode)
router.get("/stock-reports/stock-summary", async (req, res) => {
  const from_date = (req.query.from_date as string) || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const to_date = (req.query.to_date as string) || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

  try {
    const filters = {
      company: "WTT INTERNATIONAL PVT LTD",
      from_date,
      to_date,
      view_mode: "Summary",
      include_child_warehouses: 1,
    };

    const data = await erpFetch("frappe.desk.query_report.run", {
      report_name: "Stock Summary",
      filters: JSON.stringify(filters),
      ignore_prepared_report: "1",
    });

    const result = data?.message?.result ?? data?.result ?? [];
    const columns = data?.message?.columns ?? data?.columns ?? [];

    if (Array.isArray(result) && result.length > 0) {
      const rows: Record<string, any>[] = result
        .filter((r: any) => Array.isArray(r) ? r.length >= 2 : typeof r === "object")
        .map((r: any) => {
          if (Array.isArray(r)) {
            return { warehouse: r[0], closing_qty: r[1], closing_amount: r[2] ?? 0 };
          }
          return r;
        });
      return res.json({ data: rows, columns });
    }

    return res.json({ data: result, columns });
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/stock-reports/ledger?from_date=&to_date=&item_code=&warehouse=
// Stock Ledger Entries for movement history
router.get("/stock-reports/ledger", async (req, res) => {
  const from_date = req.query.from_date as string | undefined;
  const to_date = req.query.to_date as string | undefined;
  const item_code = req.query.item_code as string | undefined;
  const warehouse = req.query.warehouse as string | undefined;

  const fields = JSON.stringify([
    "item_code", "item_name", "warehouse",
    "posting_date", "posting_time", "actual_qty",
    "qty_after_transaction", "stock_uom",
    "valuation_rate", "stock_value_difference",
    "voucher_type", "voucher_no",
  ]);

  const filters: any[] = [];
  if (from_date) filters.push(["Stock Ledger Entry", "posting_date", ">=", from_date]);
  if (to_date) filters.push(["Stock Ledger Entry", "posting_date", "<=", to_date]);
  if (item_code) filters.push(["Stock Ledger Entry", "item_code", "like", `%${item_code}%`]);
  if (warehouse) filters.push(["Stock Ledger Entry", "warehouse", "like", `%${warehouse}%`]);

  try {
    const data = await erpResource("Stock Ledger Entry", {
      fields,
      filters: filters.length ? JSON.stringify(filters) : "[]",
      limit_page_length: "1000",
      order_by: "posting_date desc, posting_time desc",
    });
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

export default router;
