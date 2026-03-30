import { Router } from "express";
import {
  fetchErpNextProjectList,
  fetchErpNextProjectDetail,
  fetchErpNextTasks,
  fetchErpNextMaterialRequests,
  fetchErpNextPurchaseOrders,
  fetchErpNextPOItems,
  fetchErpNextTaskAllocations,
  isErpNextConfigured,
} from "../lib/erpnext";
import { db } from "@workspace/db";
import { userPermissionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

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

router.get("/timeline/projects", async (req, res) => {
  try {
    if (!isErpNextConfigured()) return res.json([]);
    const { email } = req.query as { email?: string };
    let allowedProjects: string[] = [];
    if (email) {
      const [perm] = await db.select().from(userPermissionsTable).where(eq(userPermissionsTable.email, email));
      if (perm) { try { allowedProjects = JSON.parse(perm.allowedProjects || "[]"); } catch {} }
    }
    const cacheKey = email ? `tl:projects:${email}` : "tl:projects";
    const cached = getCached<unknown>(cacheKey);
    if (cached) return res.json(cached);
    let data = await fetchErpNextProjectList();
    if (allowedProjects.length > 0) data = data.filter(p => allowedProjects.includes(p.name));
    setCached(cacheKey, data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/timeline/project-detail", async (req, res) => {
  try {
    const { project } = req.query as Record<string, string>;
    if (!project || !isErpNextConfigured()) return res.json(null);
    const key = `tl:proj:${project}`;
    const cached = getCached<unknown>(key);
    if (cached) return res.json(cached);
    const detail = await fetchErpNextProjectDetail(project);
    if (detail) setCached(key, detail);
    res.json(detail);
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
      return res.json({ tasks: [], materialRequests: [], purchaseOrders: [], taskAllocations: [] });
    }

    // 6-month window for task allocations
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const fromDate = sixMonthsAgo.toISOString().split("T")[0];

    const [tasks, materialRequests, rawPOs, allAllocations] = await Promise.all([
      fetchErpNextTasks(project || undefined),
      fetchErpNextMaterialRequests(project ? { project } : undefined),
      fetchErpNextPurchaseOrders(project || undefined),
      fetchErpNextTaskAllocations({ fromDate }),
    ]);

    // Fetch items for all POs and merge them in
    const poNames = rawPOs.map(p => p.name);
    const poItemsList = await fetchErpNextPOItems(poNames);
    const poItemsMap = new Map<string, typeof poItemsList>();
    for (const item of poItemsList) {
      if (!poItemsMap.has(item.parent)) poItemsMap.set(item.parent, []);
      poItemsMap.get(item.parent)!.push(item);
    }
    const purchaseOrders = rawPOs.map(po => ({
      ...po,
      items: poItemsMap.get(po.name) || [],
    }));

    // Filter task allocations to those related to this project's tasks
    const projectTaskNames = new Set(tasks.map(t => t.name));
    const taskAllocations = project
      ? allAllocations.filter(a => a.tasks.some(t => projectTaskNames.has(t.task_name)))
      : allAllocations;

    const data = { tasks, materialRequests, purchaseOrders, taskAllocations };
    setCached(key, data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
