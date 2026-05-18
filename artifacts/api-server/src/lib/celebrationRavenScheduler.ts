import { pool } from "@workspace/db";
import type { WishThemeId } from "./celebrationWishSvg";
import {
  buildWishCaption,
  getTodayCelebrations,
  isCelebrationsConfigured,
  renderCelebrationCard,
  type CelebrationEntry,
} from "./celebrationsService";
import {
  isRavenConfigured,
  resolveRavenChannelId,
  sendRavenImage,
  sendRavenText,
  uploadFileToErp,
} from "./ravenClient";

const ENABLED = process.env.CELEBRATION_RAVEN_ENABLED !== "false";
const POST_HOUR = parseInt(process.env.CELEBRATION_POST_HOUR || "9", 10);
const TZ = process.env.CELEBRATION_TIMEZONE || "Asia/Kolkata";

let lastRunDateKey: string | null = null;
let running = false;

pool
  .query(`
    CREATE TABLE IF NOT EXISTS celebration_raven_log (
      id SERIAL PRIMARY KEY,
      post_date DATE NOT NULL,
      employee_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      raven_message_id TEXT,
      posted_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (post_date, employee_id, kind)
    );
  `)
  .then(() => console.log("[celebrations] celebration_raven_log table ready"))
  .catch((e: Error) => console.error("[celebrations] log table error:", e.message));

export function todayKeyInTz(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function hourInTz(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  return parseInt(parts.find(p => p.type === "hour")?.value ?? "0", 10);
}

async function alreadyPosted(postDate: string, employeeId: string, kind: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM celebration_raven_log WHERE post_date = $1 AND employee_id = $2 AND kind = $3 LIMIT 1`,
    [postDate, employeeId, kind],
  );
  return (r.rowCount ?? 0) > 0;
}

async function markPosted(
  postDate: string,
  employeeId: string,
  kind: string,
  messageId: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO celebration_raven_log (post_date, employee_id, kind, raven_message_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (post_date, employee_id, kind) DO NOTHING`,
    [postDate, employeeId, kind, messageId],
  );
}

export async function postCelebrationToRaven(
  entry: CelebrationEntry,
  channelId: string,
  postDate: string,
  skipDedup = false,
  opts?: { theme?: WishThemeId; customMessage?: string },
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  if (!skipDedup && (await alreadyPosted(postDate, entry.name, entry.kind))) {
    return { ok: true, messageId: "skipped" };
  }

  const caption = opts?.customMessage?.trim() || buildWishCaption(entry);
  try {
    const svg = await renderCelebrationCard(entry, opts?.theme, opts?.customMessage);
    const safeName = entry.employee_name.replace(/[^\w.-]+/g, "_").slice(0, 40);
    const filename = `${entry.kind}-${safeName}-${postDate}.svg`;
    const fileUrl = await uploadFileToErp(filename, Buffer.from(svg, "utf8"), "image/svg+xml");
    const messageId = await sendRavenImage(channelId, fileUrl, caption);
    await markPosted(postDate, entry.name, entry.kind, messageId);
    return { ok: true, messageId };
  } catch (e) {
    try {
      const messageId = await sendRavenText(channelId, caption);
      await markPosted(postDate, entry.name, entry.kind, messageId);
      return { ok: true, messageId, error: `image failed, text only: ${e}` };
    } catch (e2) {
      return { ok: false, error: String(e2) };
    }
  }
}

export interface RavenPostRunResult {
  postDate: string;
  channelId: string;
  posted: number;
  skipped: number;
  failed: number;
  details: Array<{ employee: string; kind: string; ok: boolean; error?: string }>;
}

/** Post all of today's birthdays & anniversaries to Raven. */
export async function runDailyCelebrationRavenPost(force = false): Promise<RavenPostRunResult> {
  if (!isCelebrationsConfigured() || !isRavenConfigured()) {
    throw new Error("ERPNext/Raven not configured (ERPNEXT_* and RAVEN_CHANNEL_ID)");
  }

  const postDate = todayKeyInTz();
  const channelId = await resolveRavenChannelId();
  const entries = await getTodayCelebrations();

  const result: RavenPostRunResult = {
    postDate,
    channelId,
    posted: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  if (entries.length === 0) {
    if (force) {
      await sendRavenText(
        channelId,
        `☀️ Good morning, WTT team!\n\nNo birthdays or work anniversaries today (${postDate}). Have a great day!`,
      );
    }
    return result;
  }

  if (force || entries.length > 0) {
    const b = entries.filter(e => e.kind === "birthday").length;
    const a = entries.filter(e => e.kind === "anniversary").length;
    const parts: string[] = ["☀️ Good morning, WTT team!", "", "Today's celebrations:"];
    if (b) parts.push(`🎂 ${b} birthday${b > 1 ? "s" : ""}`);
    if (a) parts.push(`🏆 ${a} work anniversary${a > 1 ? "ies" : "y"}`);
    parts.push("");
    await sendRavenText(channelId, parts.join("\n"));
  }

  for (const entry of entries) {
    const r = await postCelebrationToRaven(entry, channelId, postDate, force);
    result.details.push({
      employee: entry.employee_name,
      kind: entry.kind,
      ok: r.ok,
      error: r.error,
    });
    if (r.messageId === "skipped") result.skipped++;
    else if (r.ok) result.posted++;
    else result.failed++;
    await new Promise(res => setTimeout(res, 800));
  }

  return result;
}

async function tick(): Promise<void> {
  if (!ENABLED || running) return;
  if (!isCelebrationsConfigured() || !isRavenConfigured()) return;

  const dateKey = todayKeyInTz();
  const hour = hourInTz();

  if (hour !== POST_HOUR) return;
  if (lastRunDateKey === dateKey) return;

  running = true;
  try {
    console.log(`[celebrations] Starting 9 AM Raven post for ${dateKey} (${TZ})`);
    const result = await runDailyCelebrationRavenPost(false);
    lastRunDateKey = dateKey;
    console.log(
      `[celebrations] Done: posted=${result.posted} skipped=${result.skipped} failed=${result.failed}`,
    );
  } catch (e) {
    console.error("[celebrations] Daily Raven post failed:", e);
  } finally {
    running = false;
  }
}

export function startCelebrationRavenScheduler(): void {
  if (!ENABLED) {
    console.log("[celebrations] Raven auto-post disabled (CELEBRATION_RAVEN_ENABLED=false)");
    return;
  }
  console.log(
    `[celebrations] Raven scheduler: daily ${POST_HOUR}:00 ${TZ} → channel ${process.env.RAVEN_CHANNEL_ID || "WTT INTERNATIONAL PVT LTD-wtt-common"}`,
  );
  setInterval(() => { tick().catch(() => {}); }, 60_000);
  tick().catch(() => {});
}
