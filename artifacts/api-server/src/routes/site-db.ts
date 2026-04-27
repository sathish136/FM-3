import { Router } from "express";
import sql from "mssql";

const router = Router();

const SYSTEM_DBS = new Set([
  "master", "tempdb", "model", "msdb",
  "ReportServer", "ReportServerTempDB",
]);

// Always-hidden user databases (operational / non-plant data the team doesn't want exposed).
// Compared case-insensitively because SQL Server identifiers are case-insensitive.
const HIDDEN_DBS = new Set([
  "brine_scada",
  "report_data",
  "server_uptime",
]);
function isHiddenDb(name: string): boolean {
  return HIDDEN_DBS.has((name || "").toLowerCase());
}

export function buildConfig(database?: string): sql.config {
  const host = process.env.SITE_DB_HOST;
  const user = process.env.SITE_DB_USER;
  const password = process.env.SITE_DB_PASSWORD;
  const port = parseInt(process.env.SITE_DB_PORT || "1433", 10);
  const defaultDb = process.env.SITE_DB_DATABASE;

  if (!host || !user || !password) {
    throw new Error(
      "Missing MSSQL credentials. Set SITE_DB_HOST, SITE_DB_USER, SITE_DB_PASSWORD in Replit Secrets.",
    );
  }

  return {
    server: host,
    user,
    password,
    port,
    database: database || defaultDb || "master",
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    connectionTimeout: 15000,
    requestTimeout: 60000,
  };
}

const poolCache = new Map<string, sql.ConnectionPool>();

export async function getPool(database?: string): Promise<sql.ConnectionPool> {
  const key = database || "__default__";
  let pool = poolCache.get(key);
  if (pool && pool.connected) return pool;
  if (pool) {
    try { await pool.close(); } catch {}
    poolCache.delete(key);
  }
  pool = new sql.ConnectionPool(buildConfig(database));
  pool.on("error", (e) => console.error("[site-db] pool error:", e?.message || e));
  await pool.connect();
  poolCache.set(key, pool);
  return pool;
}

export function safeIdent(name: string): string {
  // Allow only [A-Za-z0-9_] then wrap in brackets
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error(`Invalid identifier: ${name}`);
  }
  return `[${name}]`;
}

function isReadOnlyQuery(q: string): boolean {
  const stripped = q
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .trim()
    .toLowerCase();
  if (!stripped) return false;
  // Must start with select or with(common table expression) leading to select
  if (!/^(select|with)\b/.test(stripped)) return false;
  // Reject any forbidden keywords as standalone tokens
  const banned = [
    "insert", "update", "delete", "drop", "alter", "create",
    "truncate", "exec", "execute", "merge", "grant", "revoke",
    "deny", "shutdown", "backup", "restore", "bulk", "openrowset",
  ];
  for (const b of banned) {
    const re = new RegExp(`\\b${b}\\b`, "i");
    if (re.test(stripped)) return false;
  }
  return true;
}

// ──────────────────────────────────────────────────────────────────────
// GET /api/site-db/health — connection test + server info
router.get("/site-db/health", async (_req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT
        @@VERSION AS version,
        SERVERPROPERTY('MachineName') AS machineName,
        SERVERPROPERTY('Edition') AS edition,
        SERVERPROPERTY('ProductVersion') AS productVersion,
        DB_NAME() AS currentDb
    `);
    return res.json({
      ok: true,
      host: process.env.SITE_DB_HOST,
      info: r.recordset[0] || {},
    });
  } catch (e: any) {
    return res.status(502).json({ ok: false, error: e.message });
  }
});

// GET /api/site-db/databases?includeSystem=true
router.get("/site-db/databases", async (req, res) => {
  const includeSystem = req.query.includeSystem === "true";
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT
        d.name AS name,
        d.database_id AS id,
        d.create_date AS createdAt,
        d.state_desc AS state,
        d.collation_name AS collation,
        SUSER_SNAME(d.owner_sid) AS owner,
        CAST(SUM(mf.size) * 8.0 / 1024 AS DECIMAL(18,2)) AS sizeMB
      FROM sys.databases d
      LEFT JOIN sys.master_files mf ON mf.database_id = d.database_id
      GROUP BY d.name, d.database_id, d.create_date, d.state_desc, d.collation_name, d.owner_sid
      ORDER BY d.name ASC
    `);
    const rows = (r.recordset || []).filter((x: any) => {
      if (isHiddenDb(x.name)) return false;
      return includeSystem ? true : !SYSTEM_DBS.has(x.name);
    });
    return res.json({ databases: rows });
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/site-db/tables?db=
router.get("/site-db/tables", async (req, res) => {
  const db = String(req.query.db || "");
  if (!db) return res.status(400).json({ error: "db required" });
  try {
    const pool = await getPool(db);
    const r = await pool.request().query(`
      SELECT
        s.name AS [schema],
        t.name AS [name],
        p.[rows] AS [rowCount],
        CAST(SUM(a.total_pages) * 8.0 / 1024 AS DECIMAL(18,2)) AS sizeMB,
        t.create_date AS createdAt,
        t.modify_date AS modifiedAt
      FROM sys.tables t
      INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
      INNER JOIN sys.indexes i ON i.object_id = t.object_id
      INNER JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id = i.index_id
      INNER JOIN sys.allocation_units a ON a.container_id = p.partition_id
      WHERE i.index_id IN (0, 1) AND t.is_ms_shipped = 0
      GROUP BY s.name, t.name, p.[rows], t.create_date, t.modify_date
      ORDER BY s.name, t.name
    `);
    return res.json({ tables: r.recordset || [] });
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/site-db/views?db=
router.get("/site-db/views", async (req, res) => {
  const db = String(req.query.db || "");
  if (!db) return res.status(400).json({ error: "db required" });
  try {
    const pool = await getPool(db);
    const r = await pool.request().query(`
      SELECT s.name AS [schema], v.name AS [name], v.create_date AS createdAt, v.modify_date AS modifiedAt
      FROM sys.views v
      INNER JOIN sys.schemas s ON s.schema_id = v.schema_id
      WHERE v.is_ms_shipped = 0
      ORDER BY s.name, v.name
    `);
    return res.json({ views: r.recordset || [] });
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/site-db/columns?db=&schema=&table=
router.get("/site-db/columns", async (req, res) => {
  const db = String(req.query.db || "");
  const schema = String(req.query.schema || "dbo");
  const table = String(req.query.table || "");
  if (!db || !table) return res.status(400).json({ error: "db, table required" });
  try {
    const pool = await getPool(db);
    const r = await pool.request()
      .input("schema", sql.NVarChar, schema)
      .input("table", sql.NVarChar, table)
      .query(`
        SELECT
          c.COLUMN_NAME AS [name],
          c.DATA_TYPE AS [dataType],
          c.CHARACTER_MAXIMUM_LENGTH AS [maxLength],
          c.NUMERIC_PRECISION AS [precision],
          c.NUMERIC_SCALE AS [scale],
          c.IS_NULLABLE AS [nullable],
          c.COLUMN_DEFAULT AS [default],
          c.ORDINAL_POSITION AS [position],
          CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS [isPk]
        FROM INFORMATION_SCHEMA.COLUMNS c
        LEFT JOIN (
          SELECT ku.TABLE_SCHEMA, ku.TABLE_NAME, ku.COLUMN_NAME
          FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
          JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
            ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
          WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
        ) pk
          ON pk.TABLE_SCHEMA = c.TABLE_SCHEMA
         AND pk.TABLE_NAME   = c.TABLE_NAME
         AND pk.COLUMN_NAME  = c.COLUMN_NAME
        WHERE c.TABLE_SCHEMA = @schema AND c.TABLE_NAME = @table
        ORDER BY c.ORDINAL_POSITION
      `);
    return res.json({ columns: r.recordset || [] });
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// GET /api/site-db/data?db=&schema=&table=&page=&limit=&search=&sort=&dir=
router.get("/site-db/data", async (req, res) => {
  const db = String(req.query.db || "");
  const schema = safeIdent(String(req.query.schema || "dbo"));
  const table = safeIdent(String(req.query.table || ""));
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
  const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || "50"), 10)));
  const offset = (page - 1) * limit;
  const search = String(req.query.search || "").trim();
  const sortRaw = String(req.query.sort || "").trim();
  const dir = String(req.query.dir || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";

  if (!db || !req.query.table) return res.status(400).json({ error: "db, table required" });

  try {
    const pool = await getPool(db);

    // Get text/char columns for search
    const colInfo = await pool.request()
      .input("schema", sql.NVarChar, String(req.query.schema || "dbo"))
      .input("table", sql.NVarChar, String(req.query.table))
      .query(`
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
        ORDER BY ORDINAL_POSITION
      `);
    const allCols: { COLUMN_NAME: string; DATA_TYPE: string }[] = colInfo.recordset || [];

    let whereClause = "";
    if (search) {
      const textCols = allCols.filter(c =>
        ["nvarchar", "varchar", "text", "ntext", "char", "nchar"].includes(
          (c.DATA_TYPE || "").toLowerCase(),
        ),
      );
      if (textCols.length) {
        const ors = textCols.map(c => `${safeIdent(c.COLUMN_NAME)} LIKE @search`).join(" OR ");
        whereClause = `WHERE (${ors})`;
      }
    }

    let orderBy = "";
    if (sortRaw && /^[A-Za-z0-9_]+$/.test(sortRaw)) {
      orderBy = `ORDER BY ${safeIdent(sortRaw)} ${dir}`;
    } else if (allCols[0]) {
      orderBy = `ORDER BY ${safeIdent(allCols[0].COLUMN_NAME)} ${dir}`;
    } else {
      orderBy = `ORDER BY (SELECT NULL)`;
    }

    const dataReq = pool.request();
    if (search) dataReq.input("search", sql.NVarChar, `%${search}%`);
    dataReq.input("offset", sql.Int, offset);
    dataReq.input("limit", sql.Int, limit);

    const dataR = await dataReq.query(`
      SELECT * FROM ${schema}.${table}
      ${whereClause}
      ${orderBy}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    const countReq = pool.request();
    if (search) countReq.input("search", sql.NVarChar, `%${search}%`);
    const countR = await countReq.query(`
      SELECT COUNT(*) AS total FROM ${schema}.${table} ${whereClause}
    `);

    return res.json({
      rows: dataR.recordset || [],
      total: countR.recordset?.[0]?.total ?? 0,
      page,
      limit,
      columns: allCols.map(c => c.COLUMN_NAME),
    });
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

// POST /api/site-db/query  { db, sql, limit }
router.post("/site-db/query", async (req, res) => {
  const db = String(req.body?.db || "");
  const q = String(req.body?.sql || "").trim();
  const limit = Math.min(5000, Math.max(1, parseInt(String(req.body?.limit || "1000"), 10)));
  if (!db || !q) return res.status(400).json({ error: "db and sql required" });
  if (!isReadOnlyQuery(q)) {
    return res.status(400).json({ error: "Only read-only SELECT statements are allowed." });
  }

  try {
    const pool = await getPool(db);
    const r = await pool.request().query(`SELECT TOP (${limit}) * FROM (${q}) AS __wrapped`);
    return res.json({
      rows: r.recordset || [],
      rowsAffected: r.rowsAffected,
      columns: Object.keys(r.recordset?.[0] || {}),
    });
  } catch (e: any) {
    // Fallback: try executing directly (works for queries that can't be wrapped, e.g. CTE/ORDER BY at top level)
    try {
      const pool = await getPool(db);
      const r2 = await pool.request().query(q);
      const rows = (r2.recordset || []).slice(0, limit);
      return res.json({
        rows,
        rowsAffected: r2.rowsAffected,
        columns: Object.keys(rows[0] || {}),
      });
    } catch (e2: any) {
      return res.status(400).json({ error: e2.message || e.message });
    }
  }
});

// GET /api/site-db/stats?db= — top tables by row count + totals
router.get("/site-db/stats", async (req, res) => {
  const db = String(req.query.db || "");
  if (!db) return res.status(400).json({ error: "db required" });
  try {
    const pool = await getPool(db);
    const r = await pool.request().query(`
      SELECT
        s.name AS [schema],
        t.name AS [name],
        p.[rows] AS [rowCount],
        CAST(SUM(a.total_pages) * 8.0 / 1024 AS DECIMAL(18,2)) AS sizeMB
      FROM sys.tables t
      INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
      INNER JOIN sys.indexes i ON i.object_id = t.object_id
      INNER JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id = i.index_id
      INNER JOIN sys.allocation_units a ON a.container_id = p.partition_id
      WHERE i.index_id IN (0, 1) AND t.is_ms_shipped = 0
      GROUP BY s.name, t.name, p.[rows]
      ORDER BY p.[rows] DESC
    `);
    const rows = r.recordset || [];
    const totalRows = rows.reduce((s: number, x: any) => s + (Number(x.rowCount) || 0), 0);
    const totalSizeMB = rows.reduce((s: number, x: any) => s + (Number(x.sizeMB) || 0), 0);
    return res.json({
      totals: { tables: rows.length, rows: totalRows, sizeMB: Number(totalSizeMB.toFixed(2)) },
      topByRows: rows.slice(0, 15),
      topBySize: [...rows].sort((a: any, b: any) => Number(b.sizeMB || 0) - Number(a.sizeMB || 0)).slice(0, 15),
    });
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

export default router;
