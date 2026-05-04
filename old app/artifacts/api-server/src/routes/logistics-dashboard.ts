import { Router } from "express";
import { erpFetch, projectParams } from "../lib/erp";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function ok(res: any, data: any) {
  return res.json({ message: data });
}

function errFallback(res: any, fallback: any, e: any) {
  console.warn("[logistics-dashboard] ERP error:", e?.message ?? e);
  return res.json({ message: fallback, _source: "sample" });
}

// ── Sample data (shown when ERP is unavailable) ────────────────────────────────

const SAMPLE_PO_PENDING = [
  { po_no: "PO-2026001", supplier: "Kirloskar Brothers Ltd", delivery_date: "01-04-2026", received_date: "—", tracking: "—" },
  { po_no: "PO-2026002", supplier: "Thermax Limited", delivery_date: "03-04-2026", received_date: "—", tracking: "—" },
  { po_no: "PO-2026007", supplier: "Ion Exchange India", delivery_date: "05-04-2026", received_date: "—", tracking: "—" },
  { po_no: "PO-2026011", supplier: "Grundfos Pumps India", delivery_date: "08-04-2026", received_date: "—", tracking: "—" },
];

const SAMPLE_SUPPLIER_DELAY = [
  { supplier: "Thermax Limited",       po_no: "PO-2026002", delay_days: 5  },
  { supplier: "Ion Exchange India",    po_no: "PO-2026003", delay_days: 8  },
  { supplier: "Forbes Marshall",       po_no: "PO-2026009", delay_days: 3  },
  { supplier: "Precision Valves",      po_no: "PO-2026015", delay_days: 12 },
];

const SAMPLE_MATERIAL_DELAY = [
  { description: "HDPE Pipe 200mm",       po_no: "PO-2026003", supplier: "Ion Exchange India",  delay_days: 8  },
  { description: "Centrifugal Pump 15kW", po_no: "PO-2026004", supplier: "Kirloskar Brothers", delay_days: 4  },
  { description: "Control Valve DN80",    po_no: "PO-2026009", supplier: "Forbes Marshall",     delay_days: 3  },
  { description: "FRP Tank 10000L",       po_no: "PO-2026016", supplier: "Sintex Plastics",     delay_days: 11 },
  { description: "Dosing Pump Set",       po_no: "PO-2026018", supplier: "Milton Roy",          delay_days: 6  },
];

const SAMPLE_ON_TIME = [
  { po_no: "PO-2026004", tracking: "TRK1234567", expected_delivery: "02-04-2026" },
  { po_no: "PO-2026005", tracking: "TRK2345678", expected_delivery: "04-04-2026" },
  { po_no: "PO-2026006", tracking: "TRK3456789", expected_delivery: "06-04-2026" },
  { po_no: "PO-2026010", tracking: "TRK4567890", expected_delivery: "07-04-2026" },
  { po_no: "PO-2026013", tracking: "TRK5678901", expected_delivery: "09-04-2026" },
  { po_no: "PO-2026014", tracking: "TRK6789012", expected_delivery: "10-04-2026" },
];

const SAMPLE_GPRS_PENDING = [
  { po_no: "PO-2026005", tracking: "—", expected_delivery: "03-04-2026" },
  { po_no: "PO-2026008", tracking: "—", expected_delivery: "05-04-2026" },
  { po_no: "PO-2026012", tracking: "—", expected_delivery: "08-04-2026" },
];

// ── GET /api/logistics-dashboard/counts ───────────────────────────────────────
// Derives counts from the individual list endpoints in parallel

router.get("/logistics-dashboard/counts", async (req, res) => {
  const project = req.query.project as string | undefined;
  const pp = projectParams(project);
  try {
    const [poPend, supDel, matDel, onTime, gprs] = await Promise.allSettled([
      erpFetch("wtt_module.customization.custom.logistics.get_po_made_logistics_entry_pending", pp),
      erpFetch("wtt_module.customization.custom.logistics.get_supplier_delay", pp),
      erpFetch("wtt_module.customization.custom.logistics.get_material_delay", pp),
      erpFetch("wtt_module.customization.custom.logistics.get_on_time_deliveries", pp),
      erpFetch("wtt_module.customization.custom.logistics.get_gprs_tracking_not_entered", pp),
    ]);
    const len = (r: PromiseSettledResult<any>) =>
      r.status === "fulfilled" && Array.isArray(r.value?.message) ? r.value.message.length : 0;
    return ok(res, {
      po_pending:     len(poPend),
      supplier_delay: len(supDel),
      material_delay: len(matDel),
      on_time:        len(onTime),
      gprs_pending:   len(gprs),
    });
  } catch (e: any) {
    return ok(res, {
      po_pending:     SAMPLE_PO_PENDING.length,
      supplier_delay: SAMPLE_SUPPLIER_DELAY.length,
      material_delay: SAMPLE_MATERIAL_DELAY.length,
      on_time:        SAMPLE_ON_TIME.length,
      gprs_pending:   SAMPLE_GPRS_PENDING.length,
      _source:        "sample",
    });
  }
});

// ── GET /api/logistics-dashboard/po-pending ───────────────────────────────────

router.get("/logistics-dashboard/po-pending", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch(
      "wtt_module.customization.custom.logistics.get_po_made_logistics_entry_pending",
      projectParams(project),
    );
    if (Array.isArray(data?.message)) return ok(res, data.message);
    throw new Error("no data");
  } catch (e: any) {
    return errFallback(res, SAMPLE_PO_PENDING, e);
  }
});

// ── GET /api/logistics-dashboard/supplier-delay ────────────────────────────────

router.get("/logistics-dashboard/supplier-delay", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch(
      "wtt_module.customization.custom.logistics.get_supplier_delay",
      projectParams(project),
    );
    if (Array.isArray(data?.message)) return ok(res, data.message);
    throw new Error("no data");
  } catch (e: any) {
    return errFallback(res, SAMPLE_SUPPLIER_DELAY, e);
  }
});

// ── GET /api/logistics-dashboard/material-delay ────────────────────────────────

router.get("/logistics-dashboard/material-delay", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch(
      "wtt_module.customization.custom.logistics.get_material_delay",
      projectParams(project),
    );
    if (Array.isArray(data?.message)) return ok(res, data.message);
    throw new Error("no data");
  } catch (e: any) {
    return errFallback(res, SAMPLE_MATERIAL_DELAY, e);
  }
});

// ── GET /api/logistics-dashboard/on-time ──────────────────────────────────────

router.get("/logistics-dashboard/on-time", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch(
      "wtt_module.customization.custom.logistics.get_on_time_deliveries",
      projectParams(project),
    );
    if (Array.isArray(data?.message)) return ok(res, data.message);
    throw new Error("no data");
  } catch (e: any) {
    return errFallback(res, SAMPLE_ON_TIME, e);
  }
});

// ── GET /api/logistics-dashboard/gprs-pending ─────────────────────────────────

router.get("/logistics-dashboard/gprs-pending", async (req, res) => {
  const project = req.query.project as string | undefined;
  try {
    const data = await erpFetch(
      "wtt_module.customization.custom.logistics.get_gprs_tracking_not_entered",
      projectParams(project),
    );
    if (Array.isArray(data?.message)) return ok(res, data.message);
    throw new Error("no data");
  } catch (e: any) {
    return errFallback(res, SAMPLE_GPRS_PENDING, e);
  }
});

export default router;
