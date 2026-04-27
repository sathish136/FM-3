import { Router } from "express";
import sql from "mssql";
import { getPool, safeIdent } from "./site-db";

const router = Router();

const NUMERIC_TYPES = new Set([
  "int", "bigint", "smallint", "tinyint",
  "decimal", "numeric", "money", "smallmoney",
  "float", "real",
]);
const DATE_TYPES = new Set([
  "datetime", "datetime2", "smalldatetime", "datetimeoffset", "date",
]);

interface ColMeta { name: string; dataType: string }

async function loadColumns(db: string, schema: string, table: string): Promise<ColMeta[]> {
  const pool = await getPool(db);
  const r = await pool.request()
    .input("schema", sql.NVarChar, schema)
    .input("table", sql.NVarChar, table)
    .query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
      ORDER BY ORDINAL_POSITION
    `);
  return (r.recordset || []).map((c: any) => ({
    name: c.COLUMN_NAME,
    dataType: (c.DATA_TYPE || "").toLowerCase(),
  }));
}

function pickTimeCol(cols: ColMeta[]): ColMeta | null {
  const dateCols = cols.filter(c => DATE_TYPES.has(c.dataType));
  if (!dateCols.length) return null;
  const preferred = ["date_time", "datetime", "timestamp", "ts", "log_time", "logtime", "created_at", "created", "time"];
  for (const p of preferred) {
    const m = dateCols.find(c => c.name.toLowerCase() === p);
    if (m) return m;
  }
  return dateCols[0];
}

function numericTags(cols: ColMeta[]): ColMeta[] {
  return cols.filter(c => NUMERIC_TYPES.has(c.dataType));
}

function bucketExpr(timeCol: string, bucket: string): string {
  const t = safeIdent(timeCol);
  switch (bucket) {
    case "1m": return `DATEADD(minute, DATEDIFF(minute, 0, ${t}), 0)`;
    case "5m": return `DATEADD(minute, (DATEDIFF(minute, 0, ${t})/5)*5, 0)`;
    case "15m": return `DATEADD(minute, (DATEDIFF(minute, 0, ${t})/15)*15, 0)`;
    case "30m": return `DATEADD(minute, (DATEDIFF(minute, 0, ${t})/30)*30, 0)`;
    case "1h": return `DATEADD(hour, DATEDIFF(hour, 0, ${t}), 0)`;
    case "6h": return `DATEADD(hour, (DATEDIFF(hour, 0, ${t})/6)*6, 0)`;
    case "1d": return `CAST(${t} AS DATETIME2)`;  // we'll group by date below
    default: return `DATEADD(hour, DATEDIFF(hour, 0, ${t}), 0)`;
  }
}

function dateGroupExpr(timeCol: string, bucket: string): string {
  if (bucket === "1d") return `CAST(${safeIdent(timeCol)} AS DATE)`;
  return bucketExpr(timeCol, bucket);
}

function timeFilter(timeCol: string): string {
  return `${safeIdent(timeCol)} >= @from AND ${safeIdent(timeCol)} < @to`;
}

function ensureDate(s: any, fallback: Date): Date {
  if (!s) return fallback;
  const d = new Date(s);
  return isNaN(d.getTime()) ? fallback : d;
}

// ───────────────────────────────────────────────────────────
// GET /api/site-db/analytics/profile?db=&schema=&table=
// Detect time col, list numeric tags, return overall date range
// ───────────────────────────────────────────────────────────
router.get("/site-db/analytics/profile", async (req, res) => {
  const db = String(req.query.db || "");
  const schema = String(req.query.schema || "dbo");
  const table = String(req.query.table || "");
  if (!db || !table) return res.status(400).json({ error: "db, table required" });

  try {
    const pool = await getPool(db);
    const cols = await loadColumns(db, schema, table);
    const timeCol = pickTimeCol(cols);
    const tags = numericTags(cols);

    let dateRange: any = null;
    let totalRows = 0;
    let intervalSec: number | null = null;

    if (timeCol) {
      const r = await pool.request().query(`
        SELECT
          MIN(${safeIdent(timeCol.name)}) AS minT,
          MAX(${safeIdent(timeCol.name)}) AS maxT,
          COUNT(*) AS cnt
        FROM ${safeIdent(schema)}.${safeIdent(table)}
      `);
      const row = r.recordset?.[0];
      if (row) {
        dateRange = { min: row.minT, max: row.maxT };
        totalRows = Number(row.cnt) || 0;
        if (row.minT && row.maxT && totalRows > 1) {
          const span = (new Date(row.maxT).getTime() - new Date(row.minT).getTime()) / 1000;
          intervalSec = +(span / (totalRows - 1)).toFixed(2);
        }
      }
    } else {
      const r = await pool.request().query(`SELECT COUNT(*) AS cnt FROM ${safeIdent(schema)}.${safeIdent(table)}`);
      totalRows = Number(r.recordset?.[0]?.cnt) || 0;
    }

    // Group tags by common prefix (e.g. ro_1st_stg_*, stg1_*, brine_*)
    const groups: Record<string, string[]> = {};
    for (const t of tags) {
      const parts = t.name.split(/[_\-\.]/);
      const key = parts.length > 1 ? parts.slice(0, parts.length === 2 ? 1 : 2).join("_") : "other";
      (groups[key] ||= []).push(t.name);
    }

    return res.json({
      timeCol: timeCol?.name || null,
      timeColType: timeCol?.dataType || null,
      tags: tags.map(t => ({ name: t.name, type: t.dataType })),
      groups,
      dateRange,
      totalRows,
      intervalSec,
      allColumns: cols,
    });
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// POST /api/site-db/analytics/series
// body: { db, schema, table, timeCol, tags[], from, to, bucket, agg }
router.post("/site-db/analytics/series", async (req, res) => {
  try {
    const { db, schema = "dbo", table, timeCol, tags = [], from, to, bucket = "1h", agg = "avg" } =
      req.body || {};
    if (!db || !table || !timeCol) return res.status(400).json({ error: "db, table, timeCol required" });
    if (!Array.isArray(tags) || !tags.length) return res.status(400).json({ error: "tags required" });

    const tagList = tags.filter((t: any) => typeof t === "string" && /^[A-Za-z0-9_]+$/.test(t));
    if (!tagList.length) return res.status(400).json({ error: "no valid tags" });

    const fromD = ensureDate(from, new Date(Date.now() - 7 * 24 * 3600 * 1000));
    const toD = ensureDate(to, new Date());

    const pool = await getPool(db);
    const aggFn = ({ avg: "AVG", min: "MIN", max: "MAX", sum: "SUM" } as any)[agg] || "AVG";
    const cols = tagList
      .map((t: string) => `${aggFn}(CAST(${safeIdent(t)} AS FLOAT)) AS ${safeIdent(t)}`)
      .join(", ");
    const bucketCol = dateGroupExpr(timeCol, bucket);

    const r = await pool.request()
      .input("from", sql.DateTime2, fromD)
      .input("to", sql.DateTime2, toD)
      .query(`
        SELECT TOP 5000 ${bucketCol} AS bucket, ${cols}
        FROM ${safeIdent(schema)}.${safeIdent(table)}
        WHERE ${timeFilter(timeCol)}
        GROUP BY ${bucketCol}
        ORDER BY bucket ASC
      `);
    return res.json({ rows: r.recordset || [], bucket, agg, tags: tagList });
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// POST /api/site-db/analytics/stats
// body: { db, schema, table, timeCol, tags[], from, to }
router.post("/site-db/analytics/stats", async (req, res) => {
  try {
    const { db, schema = "dbo", table, timeCol, tags = [], from, to } = req.body || {};
    if (!db || !table) return res.status(400).json({ error: "db, table required" });
    const tagList = (Array.isArray(tags) ? tags : []).filter((t: any) =>
      typeof t === "string" && /^[A-Za-z0-9_]+$/.test(t),
    );
    if (!tagList.length) return res.status(400).json({ error: "tags required" });

    const fromD = ensureDate(from, new Date(Date.now() - 7 * 24 * 3600 * 1000));
    const toD = ensureDate(to, new Date());
    const pool = await getPool(db);

    const where = timeCol ? `WHERE ${timeFilter(timeCol)}` : "";
    const reqQ = pool.request();
    if (timeCol) {
      reqQ.input("from", sql.DateTime2, fromD);
      reqQ.input("to", sql.DateTime2, toD);
    }

    const stats: Record<string, any> = {};
    // Process in chunks of 6 tags to avoid hitting tempdb limits with PERCENTILE_CONT
    const chunks: string[][] = [];
    for (let i = 0; i < tagList.length; i += 6) chunks.push(tagList.slice(i, i + 6));

    for (const chunk of chunks) {
      const selects = chunk.map(t => {
        const tt = safeIdent(t);
        const f = `CAST(${tt} AS FLOAT)`;
        return `
          COUNT(${tt}) AS [${t}__cnt],
          SUM(CASE WHEN ${tt} IS NULL THEN 1 ELSE 0 END) AS [${t}__null],
          SUM(CASE WHEN ${tt} = 0 THEN 1 ELSE 0 END) AS [${t}__zero],
          MIN(${f}) AS [${t}__min],
          MAX(${f}) AS [${t}__max],
          AVG(${f}) AS [${t}__avg],
          STDEV(${f}) AS [${t}__std],
          (SELECT TOP 1 ${tt} FROM ${safeIdent(schema)}.${safeIdent(table)} WHERE ${tt} IS NOT NULL ${where ? "AND" : "WHERE"} ${timeCol ? `${safeIdent(timeCol)} >= @from AND ${safeIdent(timeCol)} < @to` : "1=1"} ORDER BY ${timeCol ? safeIdent(timeCol) : tt} DESC) AS [${t}__last],
          (SELECT TOP 1 ${tt} FROM ${safeIdent(schema)}.${safeIdent(table)} WHERE ${tt} IS NOT NULL ${where ? "AND" : "WHERE"} ${timeCol ? `${safeIdent(timeCol)} >= @from AND ${safeIdent(timeCol)} < @to` : "1=1"} ORDER BY ${timeCol ? safeIdent(timeCol) : tt} ASC) AS [${t}__first]
        `;
      }).join(",\n");

      const baseR = await reqQ.query(`
        SELECT ${selects}
        FROM ${safeIdent(schema)}.${safeIdent(table)}
        ${where}
      `);
      const row = baseR.recordset?.[0] || {};

      // Percentiles per tag with PERCENTILE_CONT (one query per tag, but bounded)
      for (const t of chunk) {
        const tt = safeIdent(t);
        const pReq = pool.request();
        if (timeCol) {
          pReq.input("from", sql.DateTime2, fromD);
          pReq.input("to", sql.DateTime2, toD);
        }
        try {
          const pR = await pReq.query(`
            SELECT DISTINCT TOP 1
              PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY CAST(${tt} AS FLOAT)) OVER () AS p25,
              PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY CAST(${tt} AS FLOAT)) OVER () AS p50,
              PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY CAST(${tt} AS FLOAT)) OVER () AS p75,
              PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY CAST(${tt} AS FLOAT)) OVER () AS p95,
              PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY CAST(${tt} AS FLOAT)) OVER () AS p99
            FROM ${safeIdent(schema)}.${safeIdent(table)}
            ${where}
          `);
          const pRow = pR.recordset?.[0] || {};
          stats[t] = {
            count: Number(row[`${t}__cnt`] || 0),
            nulls: Number(row[`${t}__null`] || 0),
            zeros: Number(row[`${t}__zero`] || 0),
            min: row[`${t}__min`],
            max: row[`${t}__max`],
            avg: row[`${t}__avg`],
            std: row[`${t}__std`],
            first: row[`${t}__first`],
            last: row[`${t}__last`],
            p25: pRow.p25,
            p50: pRow.p50,
            p75: pRow.p75,
            p95: pRow.p95,
            p99: pRow.p99,
          };
        } catch {
          stats[t] = {
            count: Number(row[`${t}__cnt`] || 0),
            nulls: Number(row[`${t}__null`] || 0),
            zeros: Number(row[`${t}__zero`] || 0),
            min: row[`${t}__min`],
            max: row[`${t}__max`],
            avg: row[`${t}__avg`],
            std: row[`${t}__std`],
            first: row[`${t}__first`],
            last: row[`${t}__last`],
          };
        }
      }
    }

    return res.json({ stats });
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// POST /api/site-db/analytics/distribution
// body: { db, schema, table, tag, from, to, timeCol, bins }
router.post("/site-db/analytics/distribution", async (req, res) => {
  try {
    const { db, schema = "dbo", table, tag, from, to, timeCol, bins = 30 } = req.body || {};
    if (!db || !table || !tag) return res.status(400).json({ error: "db, table, tag required" });
    if (!/^[A-Za-z0-9_]+$/.test(tag)) return res.status(400).json({ error: "invalid tag" });

    const fromD = ensureDate(from, new Date(Date.now() - 7 * 24 * 3600 * 1000));
    const toD = ensureDate(to, new Date());
    const binCount = Math.max(5, Math.min(100, Number(bins) || 30));

    const pool = await getPool(db);
    const tt = safeIdent(tag);
    const where = timeCol ? `WHERE ${timeFilter(timeCol)} AND ${tt} IS NOT NULL` : `WHERE ${tt} IS NOT NULL`;
    const reqBase = pool.request();
    if (timeCol) {
      reqBase.input("from", sql.DateTime2, fromD);
      reqBase.input("to", sql.DateTime2, toD);
    }

    const mm = await reqBase.query(`
      SELECT MIN(CAST(${tt} AS FLOAT)) AS mn, MAX(CAST(${tt} AS FLOAT)) AS mx, COUNT(*) AS cnt
      FROM ${safeIdent(schema)}.${safeIdent(table)} ${where}
    `);
    const mn = Number(mm.recordset?.[0]?.mn);
    const mx = Number(mm.recordset?.[0]?.mx);
    const total = Number(mm.recordset?.[0]?.cnt || 0);
    if (!isFinite(mn) || !isFinite(mx) || mx === mn || total === 0) {
      return res.json({ bins: [], min: mn, max: mx, total });
    }
    const width = (mx - mn) / binCount;

    const reqQ = pool.request();
    if (timeCol) {
      reqQ.input("from", sql.DateTime2, fromD);
      reqQ.input("to", sql.DateTime2, toD);
    }
    reqQ.input("mn", sql.Float, mn);
    reqQ.input("w", sql.Float, width);
    reqQ.input("bc", sql.Int, binCount);

    const r = await reqQ.query(`
      SELECT
        CASE WHEN bin >= @bc THEN @bc - 1 ELSE bin END AS bin,
        COUNT(*) AS cnt
      FROM (
        SELECT CAST(FLOOR((CAST(${tt} AS FLOAT) - @mn) / @w) AS INT) AS bin
        FROM ${safeIdent(schema)}.${safeIdent(table)} ${where}
      ) x
      GROUP BY CASE WHEN bin >= @bc THEN @bc - 1 ELSE bin END
      ORDER BY bin
    `);
    const counts = new Array(binCount).fill(0);
    for (const row of (r.recordset || [])) {
      const b = Number(row.bin);
      if (b >= 0 && b < binCount) counts[b] = Number(row.cnt);
    }
    const out = counts.map((c, i) => ({
      bin: i,
      from: mn + i * width,
      to: mn + (i + 1) * width,
      label: `${(mn + i * width).toFixed(2)}`,
      count: c,
    }));
    return res.json({ bins: out, min: mn, max: mx, total, width });
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// POST /api/site-db/analytics/heatmap
// body: { db, schema, table, timeCol, tag, from, to } -> hour-of-day x day-of-week
router.post("/site-db/analytics/heatmap", async (req, res) => {
  try {
    const { db, schema = "dbo", table, timeCol, tag, from, to } = req.body || {};
    if (!db || !table || !timeCol || !tag) return res.status(400).json({ error: "db, table, timeCol, tag required" });
    if (!/^[A-Za-z0-9_]+$/.test(tag)) return res.status(400).json({ error: "invalid tag" });

    const fromD = ensureDate(from, new Date(Date.now() - 30 * 24 * 3600 * 1000));
    const toD = ensureDate(to, new Date());
    const pool = await getPool(db);
    const tt = safeIdent(tag);
    const tcol = safeIdent(timeCol);

    const r = await pool.request()
      .input("from", sql.DateTime2, fromD)
      .input("to", sql.DateTime2, toD)
      .query(`
        SELECT
          DATEPART(weekday, ${tcol}) AS dow,
          DATEPART(hour, ${tcol}) AS hr,
          AVG(CAST(${tt} AS FLOAT)) AS avg,
          COUNT(*) AS cnt
        FROM ${safeIdent(schema)}.${safeIdent(table)}
        WHERE ${timeFilter(timeCol)} AND ${tt} IS NOT NULL
        GROUP BY DATEPART(weekday, ${tcol}), DATEPART(hour, ${tcol})
        ORDER BY dow, hr
      `);
    return res.json({ cells: r.recordset || [] });
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// POST /api/site-db/analytics/correlation
// body: { db, schema, table, timeCol, tags[], from, to }
router.post("/site-db/analytics/correlation", async (req, res) => {
  try {
    const { db, schema = "dbo", table, timeCol, tags = [], from, to } = req.body || {};
    if (!db || !table) return res.status(400).json({ error: "db, table required" });
    const tagList = (Array.isArray(tags) ? tags : []).filter((t: any) =>
      typeof t === "string" && /^[A-Za-z0-9_]+$/.test(t),
    );
    if (tagList.length < 2) return res.status(400).json({ error: "at least 2 tags required" });

    const fromD = ensureDate(from, new Date(Date.now() - 7 * 24 * 3600 * 1000));
    const toD = ensureDate(to, new Date());
    const pool = await getPool(db);
    const where = timeCol ? `WHERE ${timeFilter(timeCol)}` : "";
    const reqQ = pool.request();
    if (timeCol) {
      reqQ.input("from", sql.DateTime2, fromD);
      reqQ.input("to", sql.DateTime2, toD);
    }

    // Sample up to 5000 rows uniformly via NEWID()
    const cols = tagList.map(t => `CAST(${safeIdent(t)} AS FLOAT) AS ${safeIdent(t)}`).join(", ");
    const r = await reqQ.query(`
      SELECT TOP 5000 ${cols}
      FROM ${safeIdent(schema)}.${safeIdent(table)}
      ${where}
      ORDER BY NEWID()
    `);
    const rows: Record<string, number>[] = (r.recordset || []) as any;

    // Compute Pearson correlation matrix
    const n = rows.length;
    const matrix: number[][] = [];
    const valid = (x: any) => isFinite(Number(x));
    for (let i = 0; i < tagList.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < tagList.length; j++) {
        if (i === j) { matrix[i][j] = 1; continue; }
        if (j < i) { matrix[i][j] = matrix[j][i]; continue; }
        const a = tagList[i], b = tagList[j];
        let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, k = 0;
        for (let r2 = 0; r2 < n; r2++) {
          const x = Number(rows[r2][a]), y = Number(rows[r2][b]);
          if (!valid(x) || !valid(y)) continue;
          sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; k++;
        }
        if (k < 3) { matrix[i][j] = 0; continue; }
        const num = k * sxy - sx * sy;
        const den = Math.sqrt((k * sxx - sx * sx) * (k * syy - sy * sy));
        matrix[i][j] = den === 0 ? 0 : +(num / den).toFixed(4);
      }
    }
    return res.json({ tags: tagList, matrix, samples: n });
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// POST /api/site-db/analytics/anomalies
// body: { db, schema, table, timeCol, tag, from, to, sigma }
router.post("/site-db/analytics/anomalies", async (req, res) => {
  try {
    const { db, schema = "dbo", table, timeCol, tag, from, to, sigma = 3 } = req.body || {};
    if (!db || !table || !timeCol || !tag) return res.status(400).json({ error: "db, table, timeCol, tag required" });
    if (!/^[A-Za-z0-9_]+$/.test(tag)) return res.status(400).json({ error: "invalid tag" });

    const fromD = ensureDate(from, new Date(Date.now() - 7 * 24 * 3600 * 1000));
    const toD = ensureDate(to, new Date());
    const sg = Math.max(1, Math.min(6, Number(sigma) || 3));

    const pool = await getPool(db);
    const tt = safeIdent(tag);
    const tcol = safeIdent(timeCol);

    const r = await pool.request()
      .input("from", sql.DateTime2, fromD)
      .input("to", sql.DateTime2, toD)
      .input("sg", sql.Float, sg)
      .query(`
        WITH base AS (
          SELECT ${tcol} AS t, CAST(${tt} AS FLOAT) AS v
          FROM ${safeIdent(schema)}.${safeIdent(table)}
          WHERE ${timeFilter(timeCol)} AND ${tt} IS NOT NULL
        ),
        stats AS (
          SELECT AVG(v) AS mu, STDEV(v) AS sd FROM base
        )
        SELECT TOP 500 b.t AS time, b.v AS value, s.mu AS mean, s.sd AS std,
          (b.v - s.mu) / NULLIF(s.sd, 0) AS zscore
        FROM base b CROSS JOIN stats s
        WHERE s.sd IS NOT NULL AND s.sd > 0 AND ABS((b.v - s.mu) / s.sd) >= @sg
        ORDER BY ABS((b.v - s.mu) / NULLIF(s.sd, 0)) DESC
      `);
    return res.json({ anomalies: r.recordset || [], sigma: sg });
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// POST /api/site-db/analytics/uptime
// body: { db, schema, table, timeCol, tag, from, to, threshold }
// Computes "running" % when tag value > threshold (e.g., flow > 0)
router.post("/site-db/analytics/uptime", async (req, res) => {
  try {
    const { db, schema = "dbo", table, timeCol, tag, from, to, threshold = 0 } = req.body || {};
    if (!db || !table || !timeCol || !tag) return res.status(400).json({ error: "db, table, timeCol, tag required" });
    if (!/^[A-Za-z0-9_]+$/.test(tag)) return res.status(400).json({ error: "invalid tag" });
    const fromD = ensureDate(from, new Date(Date.now() - 7 * 24 * 3600 * 1000));
    const toD = ensureDate(to, new Date());
    const th = Number(threshold) || 0;
    const pool = await getPool(db);
    const tt = safeIdent(tag);

    const r = await pool.request()
      .input("from", sql.DateTime2, fromD)
      .input("to", sql.DateTime2, toD)
      .input("th", sql.Float, th)
      .query(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN CAST(${tt} AS FLOAT) > @th THEN 1 ELSE 0 END) AS runCnt,
          SUM(CASE WHEN ${tt} IS NULL OR CAST(${tt} AS FLOAT) <= @th THEN 1 ELSE 0 END) AS idleCnt
        FROM ${safeIdent(schema)}.${safeIdent(table)}
        WHERE ${timeFilter(timeCol)}
      `);
    const row = r.recordset?.[0] || {};
    const total = Number(row.total || 0);
    const run = Number(row.runCnt || 0);
    return res.json({
      total,
      running: run,
      idle: Number(row.idleCnt || 0),
      uptimePct: total ? +(100 * run / total).toFixed(2) : 0,
      threshold: th,
    });
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

export default router;
