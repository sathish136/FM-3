const ERPNEXT_URL = process.env.ERPNEXT_URL?.replace(/\/$/, "");
const ERPNEXT_API_KEY = process.env.ERPNEXT_API_KEY;
const ERPNEXT_API_SECRET = process.env.ERPNEXT_API_SECRET;

/** Raven channel document name or CH-xxxxx id (from ERP URL slug). */
const RAVEN_CHANNEL_ID = process.env.RAVEN_CHANNEL_ID?.trim()
  || "WTT INTERNATIONAL PVT LTD-wtt-common";

export function isRavenConfigured(): boolean {
  return !!(ERPNEXT_URL && ERPNEXT_API_KEY && ERPNEXT_API_SECRET && RAVEN_CHANNEL_ID);
}

function authHeader(): string {
  return `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;
}

let cachedChannelId: string | null = null;

/** Resolve Raven Channel document name → channel id used by send_message. */
export async function resolveRavenChannelId(): Promise<string> {
  if (cachedChannelId) return cachedChannelId;
  if (!ERPNEXT_URL) throw new Error("ERPNext not configured");

  // If env is already CH-xxxxx or full doc name, try direct GET first
  const tryNames = [RAVEN_CHANNEL_ID];
  if (RAVEN_CHANNEL_ID.includes("wtt-common")) {
    tryNames.push("WTT INTERNATIONAL PVT LTD-wtt-common");
  }

  for (const name of tryNames) {
    const r = await fetch(
      `${ERPNEXT_URL}/api/resource/Raven Channel/${encodeURIComponent(name)}`,
      { headers: { Authorization: authHeader() } },
    );
    if (r.ok) {
      const j = await r.json();
      cachedChannelId = j.data?.name ?? name;
      return cachedChannelId!;
    }
  }

  // Search by channel_name
  const filters = JSON.stringify([
    ["Raven Channel", "channel_name", "like", "%wtt-common%"],
  ]);
  const params = new URLSearchParams({
    fields: JSON.stringify(["name", "channel_name"]),
    filters,
    limit_page_length: "5",
  });
  const list = await fetch(`${ERPNEXT_URL}/api/resource/Raven Channel?${params}`, {
    headers: { Authorization: authHeader() },
  });
  if (list.ok) {
    const j = await list.json();
    const row = (j.data ?? [])[0];
    if (row?.name) {
      cachedChannelId = row.name;
      return cachedChannelId;
    }
  }

  cachedChannelId = RAVEN_CHANNEL_ID;
  return cachedChannelId;
}

export async function sendRavenText(channelId: string, text: string, content?: string): Promise<string> {
  if (!ERPNEXT_URL) throw new Error("ERPNext not configured");
  const r = await fetch(`${ERPNEXT_URL}/api/method/raven.api.raven_message.send_message`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel_id: channelId,
      text,
      content: content ?? text.replace(/\*\*/g, "").replace(/_/g, ""),
      message_type: "Text",
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (j as { message?: string; exc?: string }).message
      || (j as { _server_messages?: string })._server_messages
      || r.statusText;
    throw new Error(`Raven send_message failed: ${msg}`);
  }
  const doc = (j as { message?: { name?: string } }).message;
  return doc?.name ?? "ok";
}

/** Upload file to Frappe; returns public file URL path (e.g. /files/wish.svg). */
export async function uploadFileToErp(
  filename: string,
  buffer: Buffer,
  mime: string,
): Promise<string> {
  if (!ERPNEXT_URL) throw new Error("ERPNext not configured");
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mime }), filename);
  form.append("is_private", "0");
  form.append("folder", "Home");

  const r = await fetch(`${ERPNEXT_URL}/api/method/upload_file`, {
    method: "POST",
    headers: { Authorization: authHeader() },
    body: form,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(`ERP file upload failed: ${JSON.stringify(j).slice(0, 200)}`);
  }
  const msg = (j as { message?: { file_url?: string; file_name?: string } }).message;
  const url = msg?.file_url;
  if (!url) throw new Error("upload_file returned no file_url");
  return url.startsWith("http") ? url : `${ERPNEXT_URL}${url}`;
}

export async function sendRavenImage(
  channelId: string,
  fileUrl: string,
  caption: string,
): Promise<string> {
  if (!ERPNEXT_URL) throw new Error("ERPNext not configured");
  const r = await fetch(`${ERPNEXT_URL}/api/method/raven.api.raven_message.send_message`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel_id: channelId,
      text: caption,
      content: caption.replace(/\*\*/g, "").replace(/_/g, ""),
      message_type: "Image",
      file: fileUrl,
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    // Fallback: text + link
    return sendRavenText(channelId, `${caption}\n\n🖼️ ${fileUrl}`);
  }
  const doc = (j as { message?: { name?: string } }).message;
  return doc?.name ?? "ok";
}
