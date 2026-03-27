import { Router } from "express";
import { erpFetch, projectParams } from "../lib/erp";

const router = Router();

// GET /api/purchase-dashboard/projects
router.get("/purchase-dashboard/projects", async (req, res) => {
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_project");
    const raw: string = data?.message ?? "";
    const projects = raw.trim().split("\n")
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(" - ", 2);
        const code = parts[0].trim();
        const name = parts[1]?.trim() ?? code;
        return { code, name, label: `${code} - ${name}` };
      });
    return res.json({ projects });
  } catch (e: any) {
    return res.status(502).json({ error: e.message, projects: [] });
  }
});

// GET /api/purchase-dashboard/counts
router.get("/purchase-dashboard/counts", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_purchase_dashboard_counts", projectParams(project));
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/purchase-dashboard/mr-made-po-pending
router.get("/purchase-dashboard/mr-made-po-pending", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_mr_made_po_pending", projectParams(project));
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/purchase-dashboard/completed-purchase-orders
router.get("/purchase-dashboard/completed-purchase-orders", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_completed_purchase_orders", projectParams(project));
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/purchase-dashboard/po-pending
router.get("/purchase-dashboard/po-pending", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_pending_purchase_orders", projectParams(project));
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/purchase-dashboard/completed-mr-orders
router.get("/purchase-dashboard/completed-mr-orders", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_completed_mr_orders", projectParams(project));
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/purchase-dashboard/mr-pending
router.get("/purchase-dashboard/mr-pending", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_pending_mr_orders", projectParams(project));
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/purchase-dashboard/payment-pending
router.get("/purchase-dashboard/payment-pending", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_pending_payments", projectParams(project));
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/purchase-dashboard/po-on-transit
router.get("/purchase-dashboard/po-on-transit", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_po_on_transit", projectParams(project));
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/purchase-dashboard/po-delay-transit
router.get("/purchase-dashboard/po-delay-transit", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch("wtt_module.customization.custom.rfq.get_po_delay_transit", projectParams(project));
    return res.json(data);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

export default router;
