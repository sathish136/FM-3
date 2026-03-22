import { Router } from "express";
import {
  fetchErpNextProjectList,
  fetchErpNextTasks,
  fetchErpNextMaterialRequests,
  fetchErpNextPurchaseOrders,
  isErpNextConfigured,
} from "../lib/erpnext";

const router = Router();

const cache = new Map<string, { data: unknown; expiresAt: number }>();
const TTL_MS = 3 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const e = cache.get(key) as { data: T; expiresAt: number } | undefined;
  if (!e || Date.now() > e.expiresAt) { cache.delete(key); return null; }
  return e.data;
}
function setCached(key: string, data: unknown) {
  cache.set(key, { data, expiresAt: Date.now() + TTL_MS });
}

router.get("/timeline/projects", async (_req, res) => {
  try {
    if (!isErpNextConfigured()) return res.json([]);
    const cached = getCached<unknown>("tl:projects");
    if (cached) return res.json(cached);
    const data = await fetchErpNextProjectList();
    setCached("tl:projects", data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/timeline", async (req, res) => {
  try {
    const { project, refresh } = req.query as Record<string, string>;
    const key = `tl:data:${project || "ALL"}`;

    if (refresh !== "1") {
      const cached = getCached<unknown>(key);
      if (cached) return res.json(cached);
    }

    if (!isErpNextConfigured()) {
      return res.json({ tasks: [], materialRequests: [], purchaseOrders: [] });
    }

    const [tasks, materialRequests, purchaseOrders] = await Promise.all([
      fetchErpNextTasks(project || undefined),
      fetchErpNextMaterialRequests(project ? { project } : undefined),
      fetchErpNextPurchaseOrders(project || undefined),
    ]);

    const data = { tasks, materialRequests, purchaseOrders };
    setCached(key, data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
