import { Router } from "express";
import { erpFetch, projectParams } from "../lib/erp";

const router = Router();

// GET /api/stores-dashboard/counts
router.get("/stores-dashboard/counts", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_dashboard_counts_store", projectParams(project));
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/stores-dashboard/gate-entry-pr-pending
router.get("/stores-dashboard/gate-entry-pr-pending", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_gate_entry_made_pr_pending", projectParams(project));
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/stores-dashboard/dc-gateout-pending
router.get("/stores-dashboard/dc-gateout-pending", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_dc_aging_data", projectParams(project));
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/stores-dashboard/pr-bill-pending
router.get("/stores-dashboard/pr-bill-pending", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_pr_made_to_bill_pending", projectParams(project));
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/stores-dashboard/stock-summary
router.get("/stores-dashboard/stock-summary", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_stock_summary", projectParams(project));
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/stores-dashboard/direct-site-delivery
router.get("/stores-dashboard/direct-site-delivery", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_direct_site_delivery", projectParams(project));
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/stores-dashboard/delivery-note-pending
router.get("/stores-dashboard/delivery-note-pending", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_delivery_note_pending", projectParams(project));
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/stores-dashboard/returnable-dc
router.get("/stores-dashboard/returnable-dc", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_dc_returns", projectParams(project));
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/stores-dashboard/petty-cash
router.get("/stores-dashboard/petty-cash", async (req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_petty_cash_entries");
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/stores-dashboard/stock-indent-pending
router.get("/stores-dashboard/stock-indent-pending", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_stock_indent_pending", projectParams(project));
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/stores-dashboard/material-issue-pending
router.get("/stores-dashboard/material-issue-pending", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.material_issue_request_made_issue_pending", projectParams(project));
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/stores-dashboard/project-dispute
router.get("/stores-dashboard/project-dispute", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_project_wise_dispute", projectParams(project));
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

export default router;
