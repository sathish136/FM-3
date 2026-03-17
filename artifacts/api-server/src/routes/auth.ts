import { Router } from "express";

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

    const contentType = fileRes.headers.get("content-type") || "application/octet-stream";
    const contentDisposition = fileRes.headers.get("content-disposition");

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    if (contentDisposition) res.setHeader("Content-Disposition", contentDisposition);

    const buf = await fileRes.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error("File proxy error:", err);
    res.status(500).send("Failed to fetch file");
  }
});

export default authRouter;
