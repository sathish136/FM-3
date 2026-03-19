import { Router } from "express";
import {
  fetchErpNextProjectBoard,
  fetchErpNextProjectList,
  fetchErpNextMrRemarks,
} from "../lib/erpnext";

const router = Router();

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

const BOARD_TTL_MS = 2 * 60 * 1000;
const PROJECTS_TTL_MS = 5 * 60 * 1000;
const REMARKS_TTL_MS = 2 * 60 * 1000;

router.get("/project-board", async (req, res) => {
  try {
    const { project, mr_remarks, refresh } = req.query as Record<string, string>;
    const cacheKey = `board:${project || ""}:${mr_remarks || ""}`;

    if (refresh !== "1") {
      const cached = getCached<unknown>(cacheKey);
      if (cached) {
        res.setHeader("X-Cache", "HIT");
        return res.json(cached);
      }
    }

    const data = await fetchErpNextProjectBoard({
      project: project || undefined,
      mr_remarks: mr_remarks || undefined,
    });
    setCached(cacheKey, data, BOARD_TTL_MS);
    res.setHeader("X-Cache", "MISS");
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/project-board/projects", async (req, res) => {
  try {
    const { refresh } = req.query as Record<string, string>;
    const cacheKey = "projects";

    if (refresh !== "1") {
      const cached = getCached<unknown>(cacheKey);
      if (cached) {
        res.setHeader("X-Cache", "HIT");
        return res.json(cached);
      }
    }

    const data = await fetchErpNextProjectList();
    setCached(cacheKey, data, PROJECTS_TTL_MS);
    res.setHeader("X-Cache", "MISS");
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/project-board/mr-remarks", async (req, res) => {
  try {
    const { project, refresh } = req.query as Record<string, string>;
    const cacheKey = `remarks:${project || ""}`;

    if (refresh !== "1") {
      const cached = getCached<unknown>(cacheKey);
      if (cached) {
        res.setHeader("X-Cache", "HIT");
        return res.json(cached);
      }
    }

    const data = await fetchErpNextMrRemarks(project || undefined);
    setCached(cacheKey, data, REMARKS_TTL_MS);
    res.setHeader("X-Cache", "MISS");
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/project-board/cache/clear", (_req, res) => {
  cache.clear();
  res.json({ message: "Cache cleared" });
});

export default router;
