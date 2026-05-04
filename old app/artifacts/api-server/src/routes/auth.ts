import { Router } from "express";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, readFile, unlink, mkdtemp, mkdir, access, readdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, extname } from "node:path";
import { createHash } from "node:crypto";
import { gzip } from "node:zlib";
import { createRequire } from "node:module";
import nodemailer from "nodemailer";
import { db } from "@workspace/db";
import { userPermissionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const execFileAsync = promisify(execFile);

const authRouter = Router();

const ERP_URL = process.env.ERPNEXT_URL || "https://erp.wttint.com";
const API_KEY = process.env.ERPNEXT_API_KEY || "";
const API_SECRET = process.env.ERPNEXT_API_SECRET || "";

// ── OTP store (in-memory, 5-minute TTL) ──────────────────────────────────────
interface OtpEntry {
  otp: string;
  expires: number;
  userData: { email: string; full_name: string; photo: string | null; username: string | null };
}
const otpStore = new Map<string, OtpEntry>();

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  const masked =
    local.length <= 2
      ? local[0] + "*"
      : local[0] + "*".repeat(local.length - 2) + local[local.length - 1];
  return `${masked}@${domain}`;
}

async function sendOtpEmail(
  to: string,
  otp: string,
  name: string,
): Promise<void> {
  const gmailUser = process.env.GMAIL_USER || "noreply@wttint.com";
  const gmailPass = process.env.GMAIL_APP_PASSWORD || "ejjjsfufipqmvpuh";

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: gmailUser, pass: gmailPass },
  });

  await transporter.sendMail({
    from: `"FlowMatriX" <${gmailUser}>`,
    to,
    subject: "Your FlowMatriX Login Code",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:16px;">
        <h2 style="color:#0a2463;margin:0 0 8px;">FlowMatri<span style="color:#0ea5e9">X</span></h2>
        <p style="color:#64748b;font-size:14px;margin:0 0 24px;">Two-Factor Authentication</p>
        <p style="color:#1e293b;font-size:15px;">Hi <strong>${name}</strong>,</p>
        <p style="color:#1e293b;font-size:15px;">Your one-time login code is:</p>
        <div style="background:#fff;border:2px solid #e2e8f0;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
          <span style="font-size:36px;font-weight:900;letter-spacing:12px;color:#0a2463;">${otp}</span>
        </div>
        <p style="color:#64748b;font-size:13px;">This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <p style="color:#94a3b8;font-size:12px;text-align:center;">© ${new Date().getFullYear()} WTT INTERNATIONAL INDIA</p>
      </div>
    `,
  });
}

async function safeJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const text = await response.text();
    if (!text || !text.trim()) return {};
    return JSON.parse(text);
  } catch {
    return {};
  }
}

const erpHeaders = () => ({
  Accept: "application/json",
  Authorization: `token ${API_KEY}:${API_SECRET}`,
});

// Resolve a login ID (username OR email) to the User document from ERPNext.
// ERPNext User docs are keyed by email. If the login ID is a username (no @),
// we search by the `username` field first to get the actual email.
async function resolveUserDoc(
  loginId: string,
  cookies?: string,
): Promise<Record<string, any>> {
  const fields = `["full_name","email","user_image","mobile_no","phone","username","creation","last_login","language","time_zone","enabled"]`;

  // Use session cookies if available, otherwise use API key/secret
  const headers = cookies
    ? { Cookie: cookies, Accept: "application/json" }
    : erpHeaders();

  // If it looks like an email, try direct lookup first
  if (loginId.includes("@")) {
    const r = await fetch(
      `${ERP_URL}/api/resource/User/${encodeURIComponent(loginId)}?fields=${encodeURIComponent(fields)}`,
      { headers },
    );
    if (r.ok) {
      const d = ((await safeJson(r)) as any)?.data;
      if (d?.email) return d;
    }
  }

  // Fall back: search by username field
  console.log("Searching for user by username:", loginId);
  const searchRes = await fetch(
    `${ERP_URL}/api/resource/User?filters=${encodeURIComponent(`[["username","=","${loginId}"]]`)}&fields=${encodeURIComponent(fields)}&limit=1`,
    { headers },
  );
  console.log("Username search response status:", searchRes.status);
  if (searchRes.ok) {
    const list = ((await safeJson(searchRes)) as any)?.data || [];
    console.log("Username search results:", list);
    if (list.length > 0) return list[0];
  }

  // Last fallback: try direct lookup with login ID as-is
  console.log("Trying direct lookup with login ID:", loginId);
  const r2 = await fetch(
    `${ERP_URL}/api/resource/User/${encodeURIComponent(loginId)}?fields=${encodeURIComponent(fields)}`,
    { headers },
  );
  console.log("Direct lookup response status:", r2.status);
  if (r2.ok) {
    const d = ((await safeJson(r2)) as any)?.data;
    console.log("Direct lookup result:", d);
    if (d) return d;
  }

  // Additional fallback: try searching by employee name (case insensitive)
  console.log("Trying employee name search:", loginId.toUpperCase());
  const empSearch = await fetch(
    `${ERP_URL}/api/resource/User?filters=${encodeURIComponent(`[["full_name","like","%${loginId}%"]]`)}&fields=${encodeURIComponent(fields)}&limit=5`,
    { headers },
  );
  console.log("Employee name search response status:", empSearch.status);
  if (empSearch.ok) {
    const list = ((await safeJson(empSearch)) as any)?.data || [];
    console.log("Employee name search results:", list);
    if (list.length > 0) return list[0];
  }

  console.log("User document resolution failed for:", loginId);
  return {};
}

// Fetch the linked Employee document — tries multiple strategies
async function resolveEmployeeDoc(
  actualEmail: string,
  username?: string,
): Promise<Record<string, any>> {
  const fields = `["employee_name","employee_number","designation","department","company","branch","date_of_joining","employment_type","gender","date_of_birth","cell_number","personal_email","status","image","reports_to","grade","user_id","name"]`;
  const hdr = erpHeaders();

  // Strategy 1: filter by user_id = actual email
  const r1 = await fetch(
    `${ERP_URL}/api/resource/Employee?filters=${encodeURIComponent(`[["user_id","=","${actualEmail}"]]`)}&fields=${encodeURIComponent(fields)}&limit=1`,
    { headers: hdr },
  );
  if (r1.ok) {
    const list = ((await safeJson(r1)) as any)?.data || [];
    if (list.length > 0) return list[0];
  }

  // Strategy 2: direct lookup by employee name = username (ERPNext often names employee WTT1194)
  if (username) {
    const r2 = await fetch(
      `${ERP_URL}/api/resource/Employee/${encodeURIComponent(username.toUpperCase())}?fields=${encodeURIComponent(fields)}`,
      { headers: hdr },
    );
    if (r2.ok) {
      const d = ((await safeJson(r2)) as any)?.data;
      if (d) return d;
    }
    // Also try lowercase
    const r2b = await fetch(
      `${ERP_URL}/api/resource/Employee/${encodeURIComponent(username)}?fields=${encodeURIComponent(fields)}`,
      { headers: hdr },
    );
    if (r2b.ok) {
      const d = ((await safeJson(r2b)) as any)?.data;
      if (d) return d;
    }
  }

  // Strategy 3: search by employee_name contains email prefix
  const emailPrefix = actualEmail.split("@")[0];
  const r3 = await fetch(
    `${ERP_URL}/api/resource/Employee?filters=${encodeURIComponent(`[["user_id","like","%${emailPrefix}%"]]`)}&fields=${encodeURIComponent(fields)}&limit=1`,
    { headers: hdr },
  );
  if (r3.ok) {
    const list = ((await safeJson(r3)) as any)?.data || [];
    if (list.length > 0) return list[0];
  }

  return {};
}

authRouter.post("/auth/login", async (req, res) => {
  const { usr, pwd } = req.body;
  if (!usr || !pwd) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }
  try {
    const response = await fetch(`${ERP_URL}/api/method/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ usr, pwd }),
    });

    const data = await safeJson(response);

    if (!response.ok) {
      let msg: string = "Invalid credentials";
      if (typeof data?.message === "string") msg = data.message;
      else if (typeof data?._server_messages === "string") {
        try {
          const parsed = JSON.parse(data._server_messages as string);
          const inner = Array.isArray(parsed) ? JSON.parse(parsed[0]) : parsed;
          msg = inner?.message || msg;
        } catch {}
      }
      return res.status(401).json({ error: msg });
    }

    // Extract cookies from login response to use for subsequent API calls
    const cookies = response.headers.get("set-cookie") || "";
    console.log("Login successful, got cookies:", cookies ? "yes" : "no");

    const loginId = typeof usr === "string" ? usr : String(usr);
    let fullName: string = (data as any)?.full_name || loginId;
    let email = loginId;
    let photo: string | null = null;
    let username: string | null = null;

    try {
      console.log("Resolving user document for loginId:", loginId);
      const userDoc = await resolveUserDoc(loginId, cookies);
      console.log("User document resolved:", userDoc);
      if (userDoc.full_name) fullName = userDoc.full_name;
      if (userDoc.email) email = userDoc.email;
      if (userDoc.username) username = userDoc.username;
      if (userDoc.user_image) {
        const img = String(userDoc.user_image);
        photo = img.startsWith("http") ? img : `${ERP_URL}${img}`;
      }
    } catch (profileErr) {
      console.warn("Could not fetch user profile:", profileErr);
    }

    // Validate that we have a proper email address
    if (!email || !email.includes("@")) {
      console.error("Invalid email address resolved:", email);
      return res.status(400).json({
        error:
          "Could not resolve email address for this username. Please use your email address to login.",
      });
    }

    // Check if 2FA is enabled for this user in the permissions table
    let twoFaRequired = true;
    try {
      const perms = await db
        .select()
        .from(userPermissionsTable)
        .where(eq(userPermissionsTable.email, email));
      if (perms.length > 0) {
        twoFaRequired = perms[0].twoFaEnabled ?? true;
      }
    } catch (dbErr) {
      console.warn("Could not check 2FA setting from DB:", dbErr);
    }

    if (!twoFaRequired) {
      // 2FA disabled for this user — return directly
      return res.json({
        status: "success",
        email,
        full_name: fullName,
        photo,
        username,
      });
    }

    // Generate OTP and send to the user's email
    const otp = generateOtp();
    otpStore.set(email, {
      otp,
      expires: Date.now() + 5 * 60 * 1000,
      userData: { email, full_name: fullName, photo, username },
    });

    try {
      await sendOtpEmail(email, otp, fullName);
    } catch (mailErr) {
      console.error("Failed to send OTP email:", mailErr);
      return res.status(500).json({
        error:
          "Could not send verification code. Please check email configuration.",
      });
    }

    return res.json({
      status: "otp_sent",
      email,
      maskedEmail: maskEmail(email),
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return res
      .status(500)
      .json({ error: "Failed to connect to authentication server" });
  }
});

authRouter.post("/auth/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  const entry = otpStore.get(email);
  if (!entry) {
    return res
      .status(401)
      .json({ error: "No pending verification found. Please log in again." });
  }
  if (Date.now() > entry.expires) {
    otpStore.delete(email);
    return res
      .status(401)
      .json({ error: "Verification code has expired. Please log in again." });
  }
  if (entry.otp !== String(otp).trim()) {
    return res
      .status(401)
      .json({ error: "Incorrect verification code. Please try again." });
  }

  otpStore.delete(email);
  return res.json({ message: "Logged In", ...entry.userData });
});

authRouter.post("/auth/logout", (_req, res) => {
  res.json({ ok: true });
});

// Return persisted user settings (theme, navbarStyle) from DB
authRouter.get("/auth/user-settings", async (req, res) => {
  const email = req.query.email as string;
  if (!email) return res.status(400).json({ error: "Missing email" });
  try {
    const rows = await db
      .select()
      .from(userPermissionsTable)
      .where(eq(userPermissionsTable.email, email));
    if (rows.length === 0) return res.json(null);
    const row = rows[0];
    return res.json({
      theme: row.theme,
      navbarStyle: row.navbarStyle,
      hasAccess: row.hasAccess,
      twoFaEnabled: row.twoFaEnabled,
    });
  } catch (err) {
    console.error("user-settings error:", err);
    return res.status(500).json({ error: String(err) });
  }
});

// Refresh current user's profile (name + photo) from ERPNext
authRouter.get("/auth/me", async (req, res) => {
  const loginId = req.query.email as string;
  if (!loginId) return res.status(400).json({ error: "Missing email" });
  try {
    const d = await resolveUserDoc(loginId);
    if (!d.email) return res.status(404).json({ error: "Not found" });
    let photo: string | null = null;
    if (d.user_image) {
      const img = String(d.user_image);
      photo = img.startsWith("http") ? img : `${ERP_URL}${img}`;
    }
    return res.json({
      email: d.email,
      full_name: d.full_name || loginId,
      photo,
      username: d.username || null,
    });
  } catch (err) {
    console.error("Me error:", err);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Full profile: User + Employee data from ERPNext
authRouter.get("/auth/profile", async (req, res) => {
  const loginId = req.query.email as string;
  if (!loginId) return res.status(400).json({ error: "Missing email" });

  try {
    // Step 1: resolve User doc (handles username OR email as login ID)
    const userData = await resolveUserDoc(loginId);
    const actualEmail = userData.email || loginId;

    // Step 2: fetch Employee — pass username as fallback key (e.g. WTT1194 often = employee name)
    const emp = await resolveEmployeeDoc(
      actualEmail,
      userData.username || undefined,
    );

    // Resolve photo URL via proxy
    const rawPhoto = userData.user_image || emp.image || null;
    let photo: string | null = null;
    if (rawPhoto) {
      const abs = String(rawPhoto).startsWith("http")
        ? rawPhoto
        : `${ERP_URL}${rawPhoto}`;
      photo = abs;
    }

    return res.json({
      // User
      email: actualEmail,
      full_name: userData.full_name || emp.employee_name || loginId,
      photo,
      mobile_no: userData.mobile_no || emp.cell_number || null,
      phone: userData.phone || null,
      username: userData.username || null,
      language: userData.language || null,
      time_zone: userData.time_zone || null,
      last_login: userData.last_login || null,
      enabled: userData.enabled ?? 1,
      // Employee
      employee_number: emp.employee_number || null,
      designation: emp.designation || null,
      department: emp.department || null,
      company: emp.company || null,
      branch: emp.branch || null,
      date_of_joining: emp.date_of_joining || null,
      employment_type: emp.employment_type || null,
      gender: emp.gender || null,
      date_of_birth: emp.date_of_birth || null,
      employee_status: emp.status || null,
      reports_to: emp.reports_to || null,
      grade: emp.grade || null,
      personal_email: emp.personal_email || null,
    });
  } catch (err) {
    console.error("Profile error:", err);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Proxy ERPNext user images so browser doesn't need direct access
authRouter.get("/auth/photo", async (req, res) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).send("Missing url");

  try {
    const target = url.startsWith("http") ? url : `${ERP_URL}${url}`;
    const imgRes = await fetch(target, {
      headers: {
        Authorization: `token ${API_KEY}:${API_SECRET}`,
      },
    });
    if (!imgRes.ok) return res.status(imgRes.status).send("Not found");

    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");

    const buf = await imgRes.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error("Photo proxy error:", err);
    res.status(500).send("Failed to fetch photo");
  }
});

// Proxy ERPNext file attachments so they open in-app without needing direct ERP access
authRouter.get("/file-proxy", async (req, res) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).send("Missing url");

  try {
    const target = url.startsWith("http") ? url : `${ERP_URL}${url}`;
    const fileRes = await fetch(target, {
      headers: { Authorization: `token ${API_KEY}:${API_SECRET}` },
    });
    if (!fileRes.ok) return res.status(fileRes.status).send("File not found");

    const ext = url.split(".").pop()?.toLowerCase() || "";
    const mimeMap: Record<string, string> = {
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ppt: "application/vnd.ms-powerpoint",
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
    };
    const contentType =
      mimeMap[ext] ||
      fileRes.headers.get("content-type") ||
      "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const buf = await fileRes.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error("File proxy error:", err);
    res.status(500).send("Failed to fetch file");
  }
});

// ── STEP / 3D file disk cache ─────────────────────────────────────────────────
// Files are downloaded from ERPNext once and stored on disk.
// The `modified` query param (ISO date string from the ERP record) is used as a
// version tag: if it changes, the old file is replaced by a fresh download.

const STEP_CACHE_DIR = join(process.cwd(), ".step-cache");
mkdir(STEP_CACHE_DIR, { recursive: true }).catch(() => {});

function stepCacheKey(url: string, modified: string): string {
  return createHash("sha256").update(`${url}::${modified}`).digest("hex");
}

async function diskCacheHas(key: string): Promise<boolean> {
  try {
    await access(join(STEP_CACHE_DIR, key));
    return true;
  } catch {
    return false;
  }
}

// Serve a 3D file from disk cache (download from ERP on first access, or when modified date changes)
authRouter.get("/step-file", async (req, res) => {
  const url      = req.query.url      as string | undefined;
  const modified = req.query.modified as string | undefined;

  if (!url) return res.status(400).send("Missing url");

  // Locally-uploaded files (saved privately to PG, never sent to ERPNext) use the
  // "local-3d://<name>" URL scheme. Resolve the on-disk file via the PM router helper.
  if (url.startsWith("local-3d://")) {
    const name = url.slice("local-3d://".length);
    const { getLocalDesign3dFile } = await import("./pm");
    const info = await getLocalDesign3dFile(name);
    if (!info) return res.status(404).send("Local 3D file not found");
    const data = await readFile(info.filePath);
    res.setHeader("Content-Type", info.mime);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("X-Step-Cache", "LOCAL");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.send(data);
  }

  const ext = extname(url.split("?")[0]).toLowerCase().replace(".", "") || "step";
  const cacheKey = stepCacheKey(url, modified || "");
  const cachePath = join(STEP_CACHE_DIR, cacheKey);

  const mimeMap: Record<string, string> = {
    step: "application/octet-stream", stp: "application/octet-stream",
    obj: "model/obj", stl: "application/octet-stream",
    gltf: "model/gltf+json", glb: "model/gltf-binary",
  };
  const contentType = mimeMap[ext] || "application/octet-stream";

  // Serve from disk if available
  if (await diskCacheHas(cacheKey)) {
    const data = await readFile(cachePath);
    console.log(`[step-file] cache HIT: ${url.split("/").pop()} (${data.length} bytes)`);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Step-Cache", "HIT");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.send(data);
  }

  // Download from ERPNext
  try {
    const target = url.startsWith("http") ? url : `${ERP_URL}${url}`;
    console.log(`[step-file] cache MISS — downloading: ${url.split("/").pop()}`);
    const fileRes = await fetch(target, {
      headers: { Authorization: `token ${API_KEY}:${API_SECRET}` },
    });
    if (!fileRes.ok) {
      console.error(`[step-file] ERP returned ${fileRes.status} for ${url}`);
      return res.status(fileRes.status).send("File not found in ERPNext");
    }

    const buf = Buffer.from(await fileRes.arrayBuffer());
    // Save to disk (non-blocking — don't block the response)
    writeFile(cachePath, buf).then(() => {
      console.log(`[step-file] saved to disk: ${cacheKey} (${buf.length} bytes)`);
    }).catch(e => {
      console.warn(`[step-file] disk write failed: ${e.message}`);
    });

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Step-Cache", "MISS");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.send(buf);
  } catch (err: any) {
    console.error("[step-file] error:", err.message);
    return res.status(500).send("Failed to fetch 3D file");
  }
});

// List cached STEP files (admin info)
authRouter.get("/step-file/cache-info", async (_req, res) => {
  try {
    const files = await readdir(STEP_CACHE_DIR);
    const stats = await Promise.all(
      files.map(async f => {
        const s = await stat(join(STEP_CACHE_DIR, f));
        return { key: f, sizeKB: Math.round(s.size / 1024), cachedAt: s.mtime };
      })
    );
    const totalMB = Math.round(stats.reduce((s, f) => s + f.sizeKB, 0) / 1024);
    res.json({ count: files.length, totalMB, files: stats });
  } catch {
    res.json({ count: 0, totalMB: 0, files: [] });
  }
});

// ── Server-side STEP → mesh conversion ───────────────────────────────────────
// Parses the STEP file on the server using occt-import-js (Node.js WASM),
// serialises the mesh data to gzipped JSON, and caches it on disk.
// The browser receives only compact geometry — no browser-side OCCT needed.

const gzipAsync = promisify(gzip);
const MESH_CACHE_DIR = join(process.cwd(), ".mesh-cache");
mkdir(MESH_CACHE_DIR, { recursive: true }).catch(() => {});

function meshCacheKey(url: string, modified: string): string {
  return createHash("sha256").update(`mesh::${url}::${modified}`).digest("hex") + ".gz";
}

async function hasMeshCache(key: string): Promise<boolean> {
  try { await access(join(MESH_CACHE_DIR, key)); return true; }
  catch { return false; }
}

// Use createRequire to load the CJS occt-import-js module from ESM context
const _require = createRequire(import.meta.url);

// Singleton OCCT instance (loaded once, reused for all conversions)
let occtPromise: Promise<any> | null = null;
function getServerOcct(): Promise<any> {
  if (!occtPromise) {
    occtPromise = (async () => {
      const occtimportjs = _require("occt-import-js");
      const occtDir = join(process.cwd(), "node_modules", "occt-import-js", "dist");
      return await occtimportjs({
        locateFile: (p: string) =>
          p.endsWith(".wasm") ? join(occtDir, "occt-import-js.wasm") : join(occtDir, p),
      });
    })();
  }
  return occtPromise;
}

// Per-URL conversion deduplication: prevents two requests from converting
// the same file simultaneously.
const conversionLock = new Map<string, Promise<Buffer>>();

function buildMeshTree(node: any, parentId: string, counter: { n: number }): any {
  const id = `${parentId}-${counter.n++}`;
  return {
    id,
    name: node.name || "Unnamed",
    meshIndices: Array.isArray(node.meshes) ? node.meshes : [],
    children: Array.isArray(node.children)
      ? node.children.map((c: any) => buildMeshTree(c, id, counter))
      : [],
  };
}

async function convertStepToMeshGz(
  stepBuffer: Buffer,
  logPrefix: string
): Promise<Buffer> {
  console.log(`[step-mesh] ${logPrefix} loading OCCT engine…`);
  const occt = await getServerOcct();

  console.log(`[step-mesh] ${logPrefix} parsing ${Math.round(stepBuffer.length / 1024 / 1024)}MB STEP file…`);
  const result = occt.ReadStepFile(new Uint8Array(stepBuffer), null);

  if (!result?.success) {
    throw new Error("OCCT failed to parse STEP file");
  }

  const total: number = result.meshes.length;
  console.log(`[step-mesh] ${logPrefix} tessellating ${total} parts…`);

  const meshes: any[] = [];
  for (let i = 0; i < total; i++) {
    const mesh = result.meshes[i];
    meshes.push({
      positions:  Array.from(mesh.attributes.position.array as Float32Array),
      normals:    mesh.attributes.normal ? Array.from(mesh.attributes.normal.array as Float32Array) : [],
      indices:    Array.from(mesh.index.array as Uint32Array | Uint16Array),
      color:      mesh.color ? [mesh.color[0], mesh.color[1], mesh.color[2]] : null,
      brepFaces:  Array.isArray(mesh.brep_faces)
        ? mesh.brep_faces.map((f: any) => ({
            first: f.first, last: f.last,
            color: f.color ? [f.color[0], f.color[1], f.color[2]] : null,
          }))
        : [],
      name: mesh.name || `Part ${i + 1}`,
    });
  }

  let root: any;
  if (result.root) {
    root = buildMeshTree(result.root, "root", { n: 0 });
    if (!root.name || root.name === "Unnamed") root.name = "Assembly";
  } else {
    root = { id: "root", name: "Assembly", meshIndices: meshes.map((_, k) => k), children: [] };
  }

  const json = JSON.stringify({ meshes, root });
  const gz = await gzipAsync(Buffer.from(json, "utf8"), { level: 6 });
  console.log(`[step-mesh] ${logPrefix} done — ${Math.round(json.length / 1024)}kB JSON → ${Math.round(gz.length / 1024)}kB gz`);
  return gz;
}

// GET /api/step-mesh?url=...&modified=...
// Returns pre-parsed mesh JSON (gzipped). The browser renders it directly with Three.js.
authRouter.get("/step-mesh", async (req, res) => {
  const url      = req.query.url      as string | undefined;
  const modified = req.query.modified as string | undefined;

  if (!url) return res.status(400).json({ error: "Missing url" });

  const meshKey   = meshCacheKey(url, modified || "");
  const meshPath  = join(MESH_CACHE_DIR, meshKey);
  const logPrefix = url.split("/").pop() || url;

  // --- Serve from mesh cache if available ---
  if (await hasMeshCache(meshKey)) {
    console.log(`[step-mesh] cache HIT: ${logPrefix}`);
    const gz = await readFile(meshPath);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Encoding", "gzip");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Mesh-Cache", "HIT");
    return res.send(gz);
  }

  // --- Deduplicate concurrent conversions for the same file ---
  if (!conversionLock.has(meshKey)) {
    const convert = (async (): Promise<Buffer> => {
      // Step 1: get the STEP file (local-3d → disk cache → ERP)
      let stepBuf: Buffer;

      if (url.startsWith("local-3d://")) {
        const name = url.slice("local-3d://".length);
        const { getLocalDesign3dFile } = await import("./pm");
        const info = await getLocalDesign3dFile(name);
        if (!info) throw new Error("Local 3D file not found");
        console.log(`[step-mesh] reading STEP from local upload: ${name}`);
        stepBuf = await readFile(info.filePath);
      } else {
        const stepCacheKey2 = stepCacheKey(url, modified || "");
        const stepPath      = join(STEP_CACHE_DIR, stepCacheKey2);

        if (await diskCacheHas(stepCacheKey2)) {
          console.log(`[step-mesh] reading STEP from disk cache: ${logPrefix}`);
          stepBuf = await readFile(stepPath);
        } else {
          const target = url.startsWith("http") ? url : `${ERP_URL}${url}`;
          console.log(`[step-mesh] downloading STEP from ERP: ${logPrefix}`);
          const r = await fetch(target, { headers: { Authorization: `token ${API_KEY}:${API_SECRET}` } });
          if (!r.ok) throw new Error(`ERP returned ${r.status}`);
          stepBuf = Buffer.from(await r.arrayBuffer());
          // Save to step-cache as well
          writeFile(stepPath, stepBuf).catch(() => {});
        }
      }

      // Step 2: convert
      const gz = await convertStepToMeshGz(stepBuf, logPrefix);

      // Step 3: persist mesh cache
      await writeFile(meshPath, gz);
      conversionLock.delete(meshKey);
      return gz;
    })();

    convert.catch(() => conversionLock.delete(meshKey));
    conversionLock.set(meshKey, convert);
  }

  try {
    const gz = await conversionLock.get(meshKey)!;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Encoding", "gzip");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Mesh-Cache", "MISS");
    return res.send(gz);
  } catch (err: any) {
    console.error("[step-mesh] conversion failed:", err.message);
    return res.status(500).json({ error: err.message || "Conversion failed" });
  }
});

// Count slides inside a PPTX file (PPTX is a ZIP; slides are ppt/slides/slideN.xml)
authRouter.get("/pptx-slides-count", async (req, res) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).json({ error: "Missing url" });

  try {
    const target = url.startsWith("http") ? url : `${ERP_URL}${url}`;
    const fileRes = await fetch(target, {
      headers: { Authorization: `token ${API_KEY}:${API_SECRET}` },
    });
    if (!fileRes.ok)
      return res.status(fileRes.status).json({ error: "File not found" });

    const buf = Buffer.from(await fileRes.arrayBuffer());
    // PPTX (ZIP) stores filenames as ASCII in the central directory.
    // Count unique entries matching ppt/slides/slideN.xml
    const str = buf.toString("latin1");
    const matches = str.match(/ppt\/slides\/slide\d+\.xml/g);
    const numSlides = matches ? new Set(matches).size : 1;

    res.json({ numSlides });
  } catch (err) {
    console.error("PPTX slides count error:", err);
    res.status(500).json({ error: String(err) });
  }
});

// Convert DWG → DXF server-side using dwg2dxf (libredwg), then return the DXF
authRouter.get("/dwg-convert", async (req, res) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).send("Missing url");

  let tmpDir: string | null = null;
  try {
    const target = url.startsWith("http") ? url : `${ERP_URL}${url}`;
    const fileRes = await fetch(target, {
      headers: { Authorization: `token ${API_KEY}:${API_SECRET}` },
    });
    if (!fileRes.ok) return res.status(fileRes.status).send("File not found");

    const buf = Buffer.from(await fileRes.arrayBuffer());
    tmpDir = await mkdtemp(join(tmpdir(), "dwg-"));
    const dwgPath = join(tmpDir, "input.dwg");
    const dxfPath = join(tmpDir, "input.dxf");

    await writeFile(dwgPath, buf);

    await execFileAsync(
      "/home/runner/.nix-profile/bin/dwg2dxf",
      ["-o", dxfPath, dwgPath],
      {
        timeout: 30000,
      },
    );

    const dxfBuf = await readFile(dxfPath);
    res.setHeader("Content-Type", "application/dxf");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("Content-Disposition", 'inline; filename="drawing.dxf"');
    res.send(dxfBuf);
  } catch (err: any) {
    console.error("DWG convert error:", err);
    res.status(500).json({ error: String(err?.message || err) });
  } finally {
    if (tmpDir) {
      const dwgPath = join(tmpDir, "input.dwg");
      const dxfPath = join(tmpDir, "input.dxf");
      await Promise.allSettled([unlink(dwgPath), unlink(dxfPath)]);
    }
  }
});

export default authRouter;
