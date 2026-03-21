import { Router } from "express";

const ERPNEXT_URL = process.env.ERPNEXT_URL?.replace(/\/$/, "");
const ERPNEXT_API_KEY = process.env.ERPNEXT_API_KEY;
const ERPNEXT_API_SECRET = process.env.ERPNEXT_API_SECRET;

function authHeader(): string {
  return `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;
}

const router = Router();

router.post("/drawings/upload-file", async (req, res) => {
  try {
    if (!ERPNEXT_URL || !ERPNEXT_API_KEY || !ERPNEXT_API_SECRET) {
      return res.status(503).json({ error: "ERPNext not configured" });
    }

    const { fileData, fileName, folder } = req.body as {
      fileData: string;
      fileName: string;
      folder?: string;
    };

    if (!fileData || !fileName) {
      return res.status(400).json({ error: "fileData and fileName are required" });
    }

    const base64Data = fileData.includes(",") ? fileData.split(",")[1] : fileData;
    const buffer = Buffer.from(base64Data, "base64");

    const blob = new Blob([buffer], { type: "application/pdf" });
    const form = new FormData();
    form.append("file", blob, fileName);
    form.append("is_private", "1");
    form.append("folder", folder || "Home/FlowMatrix");

    const uploadRes = await fetch(`${ERPNEXT_URL}/api/method/upload_file`, {
      method: "POST",
      headers: { Authorization: authHeader() },
      body: form,
    });

    if (!uploadRes.ok) {
      const body = await uploadRes.text().catch(() => "");
      return res.status(uploadRes.status).json({ error: `ERPNext upload failed: ${body}` });
    }

    const json = await uploadRes.json() as any;
    const fileUrl: string | null = json.message?.file_url || json.message?.name || null;

    return res.json({ fileUrl });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/drawings/list-private", async (req, res) => {
  try {
    if (!ERPNEXT_URL || !ERPNEXT_API_KEY || !ERPNEXT_API_SECRET) {
      return res.status(503).json({ error: "ERPNext not configured" });
    }

    const folder = (req.query.folder as string) || "Home/FlowMatrix";

    const filters = JSON.stringify([
      ["File", "folder", "=", folder],
      ["File", "is_private", "=", "1"],
    ]);
    const fields = JSON.stringify([
      "name", "file_name", "file_url", "file_size", "creation", "modified", "folder", "attached_to_doctype", "attached_to_name",
    ]);

    const params = new URLSearchParams({ filters, fields, limit_page_length: "200", order_by: "creation desc" });
    const listRes = await fetch(`${ERPNEXT_URL}/api/resource/File?${params}`, {
      headers: { Authorization: authHeader() },
    });

    if (!listRes.ok) {
      const body = await listRes.text().catch(() => "");
      return res.status(listRes.status).json({ error: `ERPNext error: ${body}` });
    }

    const json = await listRes.json() as any;
    return res.json(json.data || []);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
