import { Router } from "express";
import nodemailer from "nodemailer";
import { db } from "@workspace/db";
import { userPermissionsTable, inAppNotificationsTable } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";

const notificationsRouter = Router();

const ULTRAMSG_INSTANCE = "instance149987";
const ULTRAMSG_TOKEN = "6baxh4iuxajibxez";
const ULTRAMSG_BASE = `https://api.ultramsg.com/${ULTRAMSG_INSTANCE}`;

const GMAIL_USER = process.env.GMAIL_USER || "noreply@wttint.com";
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD || "ejjjsfufipqmvpuh";

async function sendWhatsApp(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const params = new URLSearchParams({
      token: ULTRAMSG_TOKEN,
      to,
      body: message,
      priority: "10",
    });
    const res = await fetch(`${ULTRAMSG_BASE}/messages/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await res.json() as Record<string, unknown>;
    if (data.sent === "true" || data.sent === true) return { success: true };
    return { success: false, error: JSON.stringify(data) };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function sendEmailNotification(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });
    await transporter.sendMail({
      from: `"FlowMatriX" <${GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function createSystemNotification(userEmail: string, title: string, message: string, type = "info", data?: Record<string, unknown>) {
  await db.insert(inAppNotificationsTable).values({ userEmail, title, message, type, data });
}

export async function sendNotification(opts: {
  userEmail: string;
  title: string;
  message: string;
  type?: string;
  eventType?: string;
  data?: Record<string, unknown>;
}) {
  const { userEmail, title, message, type = "info", eventType, data } = opts;

  const [prefs] = await db.select().from(userPermissionsTable).where(eq(userPermissionsTable.email, userEmail));
  if (!prefs) return;

  const events: string[] = JSON.parse(prefs.notifEvents || "[]");
  if (eventType && !events.includes(eventType)) return;

  const results: Record<string, { success: boolean; error?: string }> = {};

  if (prefs.notifSystem) {
    await createSystemNotification(userEmail, title, message, type, data);
    results.system = { success: true };
  }

  if (prefs.notifWhatsapp && prefs.notifWhatsappPhone) {
    const waMsg = `*${title}*\n${message}`;
    results.whatsapp = await sendWhatsApp(prefs.notifWhatsappPhone, waMsg);
  }

  if (prefs.notifEmail) {
    const html = buildEmailHtml(title, message);
    results.email = await sendEmailNotification(userEmail, title, html);
  }

  return results;
}

function buildEmailHtml(title: string, message: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:16px;">
      <h2 style="color:#0a2463;margin:0 0 8px;">FlowMatri<span style="color:#0ea5e9">X</span></h2>
      <p style="color:#64748b;font-size:14px;margin:0 0 24px;">Notification</p>
      <div style="background:#fff;border:2px solid #e2e8f0;border-radius:12px;padding:24px;margin:16px 0;">
        <h3 style="margin:0 0 8px;color:#0a2463;">${title}</h3>
        <p style="color:#1e293b;font-size:15px;margin:0;">${message}</p>
      </div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
      <p style="color:#94a3b8;font-size:12px;text-align:center;">© ${new Date().getFullYear()} WTT INTERNATIONAL INDIA</p>
    </div>
  `;
}

notificationsRouter.get("/notifications/settings", async (req, res) => {
  try {
    const email = (req.query.email as string) || (req.headers["x-user-email"] as string);
    if (!email) return res.status(400).json({ error: "email required" });

    const [prefs] = await db.select().from(userPermissionsTable).where(eq(userPermissionsTable.email, email));
    if (!prefs) return res.json({
      notifWhatsapp: false,
      notifWhatsappPhone: "",
      notifEmail: true,
      notifSystem: true,
      notifEvents: ["task_assigned", "project_update", "new_lead", "new_message"],
    });

    res.json({
      notifWhatsapp: prefs.notifWhatsapp,
      notifWhatsappPhone: prefs.notifWhatsappPhone || "",
      notifEmail: prefs.notifEmail,
      notifSystem: prefs.notifSystem,
      notifEvents: JSON.parse(prefs.notifEvents || "[]"),
    });
  } catch (e) {
    console.error("notif settings get error:", e);
    res.status(500).json({ error: "Failed to load settings" });
  }
});

notificationsRouter.post("/notifications/settings", async (req, res) => {
  try {
    const { email, notifWhatsapp, notifWhatsappPhone, notifEmail, notifSystem, notifEvents } = req.body;
    if (!email) return res.status(400).json({ error: "email required" });

    await db.insert(userPermissionsTable).values({
      email,
      notifWhatsapp: notifWhatsapp ?? false,
      notifWhatsappPhone: notifWhatsappPhone || null,
      notifEmail: notifEmail ?? true,
      notifSystem: notifSystem ?? true,
      notifEvents: JSON.stringify(notifEvents || []),
    }).onConflictDoUpdate({
      target: userPermissionsTable.email,
      set: {
        notifWhatsapp: notifWhatsapp ?? false,
        notifWhatsappPhone: notifWhatsappPhone || null,
        notifEmail: notifEmail ?? true,
        notifSystem: notifSystem ?? true,
        notifEvents: JSON.stringify(notifEvents || []),
        updatedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (e) {
    console.error("notif settings save error:", e);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

notificationsRouter.post("/notifications/test", async (req, res) => {
  try {
    const { email, channel } = req.body;
    if (!email || !channel) return res.status(400).json({ error: "email and channel required" });

    const [prefs] = await db.select().from(userPermissionsTable).where(eq(userPermissionsTable.email, email));

    if (channel === "whatsapp") {
      const phone = req.body.phone || prefs?.notifWhatsappPhone;
      if (!phone) return res.status(400).json({ error: "No WhatsApp phone configured" });
      const result = await sendWhatsApp(phone, "*FlowMatriX Test* ✅\nWhatsApp notifications are working!");
      return res.json(result);
    }

    if (channel === "email") {
      const html = buildEmailHtml("Test Notification ✅", "Email notifications from FlowMatriX are working correctly.");
      const result = await sendEmailNotification(email, "FlowMatriX — Test Notification", html);
      return res.json(result);
    }

    if (channel === "system") {
      await createSystemNotification(email, "Test Notification ✅", "System notifications are working!", "info");
      return res.json({ success: true });
    }

    res.status(400).json({ error: "Unknown channel" });
  } catch (e) {
    console.error("notif test error:", e);
    res.status(500).json({ error: "Test failed" });
  }
});

notificationsRouter.post("/notifications/send", async (req, res) => {
  try {
    const { userEmail, title, message, type, eventType, data } = req.body;
    if (!userEmail || !title || !message) return res.status(400).json({ error: "userEmail, title, message required" });
    const results = await sendNotification({ userEmail, title, message, type, eventType, data });
    res.json({ success: true, results });
  } catch (e) {
    console.error("notif send error:", e);
    res.status(500).json({ error: "Failed to send" });
  }
});

notificationsRouter.get("/notifications", async (req, res) => {
  try {
    const email = (req.query.email as string) || (req.headers["x-user-email"] as string);
    if (!email) return res.status(400).json({ error: "email required" });

    const notifications = await db
      .select()
      .from(inAppNotificationsTable)
      .where(eq(inAppNotificationsTable.userEmail, email))
      .orderBy(desc(inAppNotificationsTable.createdAt))
      .limit(50);

    res.json(notifications);
  } catch (e) {
    console.error("notif list error:", e);
    res.status(500).json({ error: "Failed to load notifications" });
  }
});

notificationsRouter.post("/notifications/read", async (req, res) => {
  try {
    const { email, id } = req.body;
    if (!email) return res.status(400).json({ error: "email required" });

    if (id) {
      await db.update(inAppNotificationsTable)
        .set({ read: true })
        .where(and(eq(inAppNotificationsTable.id, id), eq(inAppNotificationsTable.userEmail, email)));
    } else {
      await db.update(inAppNotificationsTable)
        .set({ read: true })
        .where(eq(inAppNotificationsTable.userEmail, email));
    }

    res.json({ success: true });
  } catch (e) {
    console.error("notif read error:", e);
    res.status(500).json({ error: "Failed to update" });
  }
});

notificationsRouter.delete("/notifications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const email = (req.query.email as string) || (req.headers["x-user-email"] as string);
    await db.delete(inAppNotificationsTable)
      .where(and(eq(inAppNotificationsTable.id, parseInt(id)), eq(inAppNotificationsTable.userEmail, email)));
    res.json({ success: true });
  } catch (e) {
    console.error("notif delete error:", e);
    res.status(500).json({ error: "Failed to delete" });
  }
});

export default notificationsRouter;
