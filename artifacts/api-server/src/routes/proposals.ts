import { Router, raw } from "express";
import { db, proposalsTable } from "@workspace/db";
import { desc, eq, sql, ilike, or } from "drizzle-orm";
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync, createReadStream } from "fs";
import { dirname, join, basename, resolve as pathResolve } from "path";
import { fileURLToPath } from "url";

const router: Router = Router();

const __filename_ = fileURLToPath(import.meta.url);
const __dirname_ = dirname(__filename_);

// ── Where uploaded PDFs are stored on the FlowMatrix server ────────────────
const STORAGE_DIR = pathResolve(
  process.env.PROPOSAL_STORAGE_DIR ||
    join(process.cwd(), ".proposal-files"),
);
try { mkdirSync(STORAGE_DIR, { recursive: true }); } catch { /* ignore */ }

function safeFilename(name: string): string | null {
  const base = basename(name);
  if (!base || base === "." || base === ".." || base.includes("/") || base.includes("\\")) return null;
  return base;
}

function storedPathFor(filename: string): string {
  return join(STORAGE_DIR, filename);
}

// ── Sync-client downloads ──────────────────────────────────────────────────
// The Python sync client lives in /clients/proposal-sync. Expose its files
// so users can grab them straight from the Proposal Library page.
const CLIENT_DIR = join(process.cwd(), "..", "..", "clients", "proposal-sync");
const CLIENT_FILES: Record<string, string> = {
  "sync_client.py":   "text/x-python; charset=utf-8",
  "pdf_analyzer.py":  "text/x-python; charset=utf-8",
  "requirements.txt": "text/plain; charset=utf-8",
  "README.md":        "text/markdown; charset=utf-8",
};

function loadClientFile(name: string): string | null {
  // try a couple of likely roots in case cwd differs in dev / prod
  const roots = [
    CLIENT_DIR,
    join(process.cwd(), "clients", "proposal-sync"),
    join(__dirname_, "..", "..", "..", "..", "clients", "proposal-sync"),
  ];
  for (const root of roots) {
    const p = join(root, name);
    if (existsSync(p)) {
      try { return readFileSync(p, "utf8"); } catch { /* try next */ }
    }
  }
  return null;
}

// GET /api/proposals/client            -> list of available files
router.get("/proposals/client", (_req, res) => {
  const files = Object.keys(CLIENT_FILES).map((name) => {
    const body = loadClientFile(name);
    return { name, available: body !== null, size: body?.length ?? 0 };
  });
  res.json({ files });
});

// GET /api/proposals/client/:filename  -> serve / download a single file
router.get("/proposals/client/:filename", (req, res) => {
  const filename = req.params.filename;
  const mime = CLIENT_FILES[filename];
  if (!mime) return res.status(404).json({ error: "unknown client file" });
  const body = loadClientFile(filename);
  if (body === null) return res.status(404).json({ error: "file not found on server" });
  if (req.query.download === "1") {
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  }
  res.setHeader("Content-Type", mime);
  res.send(body);
});


const SYNC_API_KEY = process.env.PROPOSAL_SYNC_API_KEY || "wtt-proposal-sync-2026";

function requireSyncKey(req: any, res: any, next: any) {
  const provided =
    req.header("x-api-key") ||
    (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!provided || provided !== SYNC_API_KEY) {
    return res.status(401).json({ error: "Invalid or missing API key" });
  }
  next();
}

// POST /api/proposals/upload  (called by the local Python client)
// Body: { filename, customer_name, revision, number, proposal_date, country,
//         file_size, file_mtime, source_host, source_path, raw_text, page_count }
router.post("/proposals/upload", requireSyncKey, async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.filename || typeof b.filename !== "string") {
      return res.status(400).json({ error: "filename is required" });
    }

    const row = {
      filename: b.filename,
      customerName: b.customer_name ?? null,
      revision: b.revision ?? null,
      number: b.number ?? null,
      proposalDate: b.proposal_date ?? null,
      country: b.country ?? null,
      fileSize: b.file_size != null ? Number(b.file_size) : null,
      fileMtime: b.file_mtime ?? null,
      sourceHost: b.source_host ?? null,
      sourcePath: b.source_path ?? null,
      rawText: typeof b.raw_text === "string" ? b.raw_text.slice(0, 50000) : null,
      pageCount: b.page_count != null ? Number(b.page_count) : null,
      updatedAt: new Date(),
    };

    const result = await db
      .insert(proposalsTable)
      .values(row)
      .onConflictDoUpdate({
        target: proposalsTable.filename,
        set: {
          customerName: row.customerName,
          revision: row.revision,
          number: row.number,
          proposalDate: row.proposalDate,
          country: row.country,
          fileSize: row.fileSize,
          fileMtime: row.fileMtime,
          sourceHost: row.sourceHost,
          sourcePath: row.sourcePath,
          rawText: row.rawText,
          pageCount: row.pageCount,
          updatedAt: new Date(),
        },
      })
      .returning();

    return res.json({ ok: true, proposal: result[0] });
  } catch (err: any) {
    console.error("proposals/upload error:", err);
    return res.status(500).json({ error: err?.message || "upload failed" });
  }
});

// POST /api/proposals/bulk-upload  (batch: { items: [...] })
router.post("/proposals/bulk-upload", requireSyncKey, async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    let inserted = 0;
    for (const b of items) {
      if (!b?.filename) continue;
      await db
        .insert(proposalsTable)
        .values({
          filename: b.filename,
          customerName: b.customer_name ?? null,
          revision: b.revision ?? null,
          number: b.number ?? null,
          proposalDate: b.proposal_date ?? null,
          country: b.country ?? null,
          fileSize: b.file_size != null ? Number(b.file_size) : null,
          fileMtime: b.file_mtime ?? null,
          sourceHost: b.source_host ?? null,
          sourcePath: b.source_path ?? null,
          rawText: typeof b.raw_text === "string" ? b.raw_text.slice(0, 50000) : null,
          pageCount: b.page_count != null ? Number(b.page_count) : null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: proposalsTable.filename,
          set: {
            customerName: b.customer_name ?? null,
            revision: b.revision ?? null,
            number: b.number ?? null,
            proposalDate: b.proposal_date ?? null,
            country: b.country ?? null,
            fileSize: b.file_size != null ? Number(b.file_size) : null,
            fileMtime: b.file_mtime ?? null,
            sourceHost: b.source_host ?? null,
            sourcePath: b.source_path ?? null,
            pageCount: b.page_count != null ? Number(b.page_count) : null,
            updatedAt: new Date(),
          },
        });
      inserted++;
    }
    return res.json({ ok: true, count: inserted });
  } catch (err: any) {
    console.error("proposals/bulk-upload error:", err);
    return res.status(500).json({ error: err?.message || "bulk-upload failed" });
  }
});

// GET /api/proposals  (list for UI)
router.get("/proposals", async (req, res) => {
  try {
    const search = (req.query.search as string)?.trim();
    const country = (req.query.country as string)?.trim();
    const limit = Math.min(Number(req.query.limit) || 500, 2000);

    const conditions: any[] = [];
    if (search) {
      conditions.push(
        or(
          ilike(proposalsTable.filename, `%${search}%`),
          ilike(proposalsTable.customerName, `%${search}%`),
          ilike(proposalsTable.number, `%${search}%`),
        ),
      );
    }
    if (country && country !== "All") {
      conditions.push(eq(proposalsTable.country, country));
    }

    let q = db.select().from(proposalsTable).$dynamic();
    if (conditions.length) {
      // combine with AND
      const combined = conditions.reduce((acc: any, c: any) => (acc ? sql`${acc} AND ${c}` : c), null);
      q = q.where(combined);
    }
    const rows = await q.orderBy(desc(proposalsTable.updatedAt)).limit(limit);

    // Aggregate stats
    const countries: Record<string, number> = {};
    const customers: Record<string, number> = {};
    for (const r of rows) {
      const c = r.country || "Unknown";
      countries[c] = (countries[c] || 0) + 1;
      const cn = r.customerName || "Unknown";
      customers[cn] = (customers[cn] || 0) + 1;
    }

    const proposals = rows.map((r: any) => ({
      ...r,
      hasFile: !!(r.storagePath && existsSync(r.storagePath)),
    }));

    return res.json({
      proposals,
      total: proposals.length,
      countries,
      customers,
    });
  } catch (err: any) {
    console.error("proposals/list error:", err);
    return res.status(500).json({ error: err?.message || "list failed" });
  }
});

// GET /api/proposals/ping  -- lightweight reachability check for the sync client
router.get("/proposals/ping", (_req, res) => {
  res.json({
    ok: true,
    service: "FlowMatrix Proposal Library",
    server_time: new Date().toISOString(),
  });
});

// ── PDF binary upload / download ─────────────────────────────────────────────

// HEAD /api/proposals/file/:filename  -- "do you already have this file?"
router.head("/proposals/file/:filename", (req, res) => {
  const fn = safeFilename(req.params.filename);
  if (!fn) return res.status(400).end();
  const p = storedPathFor(fn);
  if (existsSync(p)) {
    const st = statSync(p);
    res.setHeader("Content-Length", String(st.size));
    return res.status(200).end();
  }
  return res.status(404).end();
});

// POST /api/proposals/file/:filename  -- raw PDF bytes (application/pdf)
router.post(
  "/proposals/file/:filename",
  requireSyncKey,
  raw({ type: ["application/pdf", "application/octet-stream"], limit: "100mb" }),
  async (req, res) => {
    try {
      const fn = safeFilename(req.params.filename);
      if (!fn) return res.status(400).json({ error: "invalid filename" });
      const buf: Buffer | undefined = req.body as any;
      if (!buf || !Buffer.isBuffer(buf) || buf.length === 0) {
        return res.status(400).json({ error: "empty body" });
      }
      const p = storedPathFor(fn);
      writeFileSync(p, buf);
      await db
        .update(proposalsTable)
        .set({ storagePath: p, updatedAt: new Date() })
        .where(eq(proposalsTable.filename, fn));
      return res.json({ ok: true, filename: fn, size: buf.length });
    } catch (err: any) {
      console.error("proposals/file upload error:", err);
      return res.status(500).json({ error: err?.message || "file upload failed" });
    }
  },
);

// GET /api/proposals/:id/file?download=1  -- view (inline) or download (attachment)
router.get("/proposals/:id/file", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });
    const rows = await db.select().from(proposalsTable).where(eq(proposalsTable.id, id)).limit(1);
    const row = rows[0];
    if (!row) return res.status(404).json({ error: "proposal not found" });

    const fn = safeFilename(row.filename) || row.filename;
    const p = (row as any).storagePath || storedPathFor(fn);
    if (!existsSync(p)) {
      return res.status(404).json({ error: "PDF file not yet uploaded for this proposal" });
    }

    const disp = req.query.download === "1" ? "attachment" : "inline";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${disp}; filename="${fn}"`);
    createReadStream(p).pipe(res);
  } catch (err: any) {
    console.error("proposals/:id/file error:", err);
    return res.status(500).json({ error: err?.message || "file read failed" });
  }
});


// GET /api/proposals/stats
router.get("/proposals/stats", async (_req, res) => {
  try {
    const rows = await db.select().from(proposalsTable);
    const byCountry: Record<string, number> = {};
    const byCustomer: Record<string, number> = {};
    const byRevision: Record<string, number> = {};
    let totalSize = 0;
    let lastSyncAt: Date | null = null;
    let lastSyncHost: string | null = null;
    for (const r of rows) {
      byCountry[r.country || "Unknown"] = (byCountry[r.country || "Unknown"] || 0) + 1;
      byCustomer[r.customerName || "Unknown"] = (byCustomer[r.customerName || "Unknown"] || 0) + 1;
      byRevision[r.revision || "?"] = (byRevision[r.revision || "?"] || 0) + 1;
      totalSize += Number(r.fileSize || 0);
      const ts = r.updatedAt ? new Date(r.updatedAt as any) : null;
      if (ts && (!lastSyncAt || ts > lastSyncAt)) {
        lastSyncAt = ts;
        lastSyncHost = (r as any).sourceHost || null;
      }
    }
    return res.json({
      total: rows.length,
      total_size: totalSize,
      by_country: byCountry,
      by_customer: byCustomer,
      by_revision: byRevision,
      last_sync_at: lastSyncAt ? lastSyncAt.toISOString() : null,
      last_sync_host: lastSyncHost,
      server_time: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("proposals/stats error:", err);
    return res.status(500).json({ error: err?.message || "stats failed" });
  }
});

// DELETE /api/proposals/:id
router.delete("/proposals/:id", requireSyncKey, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid id" });
    await db.delete(proposalsTable).where(eq(proposalsTable.id, id));
    return res.json({ ok: true });
  } catch (err: any) {
    console.error("proposals/delete error:", err);
    return res.status(500).json({ error: err?.message || "delete failed" });
  }
});

export default router;
