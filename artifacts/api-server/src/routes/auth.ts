import { Router } from "express";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, readFile, unlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

const authRouter = Router();

const ERP_URL = process.env.ERPNEXT_URL || "https://erp.wttint.com";
const API_KEY = process.env.ERPNEXT_API_KEY || "";
const API_SECRET = process.env.ERPNEXT_API_SECRET || "";

async function safeJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const text = await response.text();
    if (!text || !text.trim()) return {};
    return JSON.parse(text);
  } catch {
    return {};
  }
}

authRouter.post("/auth/login", async (req, res) => {
  const { usr, pwd } = req.body;
  if (!usr || !pwd) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  try {
    const response = await fetch(`${ERP_URL}/api/method/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
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

    const loginFullName = (data as any)?.full_name || usr;
    let fullName = loginFullName;
    let email = typeof usr === "string" ? usr : String(usr);
    let photo: string | null = null;

    try {
      const profileRes = await fetch(
        `${ERP_URL}/api/resource/User/${encodeURIComponent(email)}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `token ${API_KEY}:${API_SECRET}`,
          },
        }
      );
      if (profileRes.ok) {
        const profile = await safeJson(profileRes);
        const d = (profile as any)?.data;
        if (d) {
          if (d.full_name) fullName = d.full_name;
          if (d.email) email = d.email;
          if (d.user_image) {
            photo = String(d.user_image).startsWith("http")
              ? d.user_image
              : `${ERP_URL}${d.user_image}`;
          }
        }
      }
    } catch (profileErr) {
      console.warn("Could not fetch user profile:", profileErr);
    }

    return res.json({ message: "Logged In", full_name: fullName, email, photo });
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Failed to connect to authentication server" });
  }
});

authRouter.post("/auth/logout", (_req, res) => {
  res.json({ ok: true });
});

// Refresh current user's profile (name + photo) from ERPNext
authRouter.get("/auth/me", async (req, res) => {
  const email = req.query.email as string;
  if (!email) return res.status(400).json({ error: "Missing email" });
  try {
    const profileRes = await fetch(
      `${ERP_URL}/api/resource/User/${encodeURIComponent(email)}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `token ${API_KEY}:${API_SECRET}`,
        },
      }
    );
    if (!profileRes.ok) return res.status(profileRes.status).json({ error: "Not found" });
    const profile = await safeJson(profileRes);
    const d = (profile as any)?.data;
    if (!d) return res.status(404).json({ error: "No data" });
    let photo: string | null = null;
    if (d.user_image) {
      photo = String(d.user_image).startsWith("http")
        ? d.user_image
        : `${ERP_URL}${d.user_image}`;
    }
    return res.json({
      email: d.email || email,
      full_name: d.full_name || email,
      photo,
    });
  } catch (err) {
    console.error("Me error:", err);
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
    const contentType = mimeMap[ext] || fileRes.headers.get("content-type") || "application/octet-stream";

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

// Count slides inside a PPTX file (PPTX is a ZIP; slides are ppt/slides/slideN.xml)
authRouter.get("/pptx-slides-count", async (req, res) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).json({ error: "Missing url" });

  try {
    const target = url.startsWith("http") ? url : `${ERP_URL}${url}`;
    const fileRes = await fetch(target, {
      headers: { Authorization: `token ${API_KEY}:${API_SECRET}` },
    });
    if (!fileRes.ok) return res.status(fileRes.status).json({ error: "File not found" });

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

    await execFileAsync("/home/runner/.nix-profile/bin/dwg2dxf", ["-o", dxfPath, dwgPath], {
      timeout: 30000,
    });

    const dxfBuf = await readFile(dxfPath);
    res.setHeader("Content-Type", "application/dxf");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("Content-Disposition", "inline; filename=\"drawing.dxf\"");
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
