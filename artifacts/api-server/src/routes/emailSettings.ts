import { Router } from "express";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { emailAccountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const { Pool } = pg;

// Use the configured DATABASE_URL (local Replit DB) for email settings storage
const emailPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=disable") ? false : undefined,
});
const db = drizzle(emailPool, { schema: { emailAccountsTable } });

const router = Router();

// Ensure table exists
emailPool.query(`
  CREATE TABLE IF NOT EXISTS email_accounts (
    id SERIAL PRIMARY KEY,
    display_name TEXT NOT NULL,
    email_address TEXT NOT NULL,
    gmail_user TEXT NOT NULL,
    gmail_app_password TEXT NOT NULL,
    assigned_to TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
`).then(() => console.log("email_accounts table ready")).catch((e: any) => console.error("email_accounts migration error:", e.message));

// GET /api/email-settings — list all accounts
router.get("/email-settings", async (_req, res) => {
  try {
    const accounts = await db
      .select()
      .from(emailAccountsTable)
      .orderBy(emailAccountsTable.createdAt);
    const masked = accounts.map(a => ({
      ...a,
      gmailAppPassword: a.gmailAppPassword ? "••••••••" : "",
    }));
    res.json(masked);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email-settings — create account
router.post("/email-settings", async (req, res) => {
  const { displayName, emailAddress, gmailUser, gmailAppPassword, assignedTo, isDefault } = req.body;
  if (!displayName || !emailAddress || !gmailUser || !gmailAppPassword) {
    return res.status(400).json({ error: "displayName, emailAddress, gmailUser and gmailAppPassword are required" });
  }
  try {
    if (isDefault) {
      await db.update(emailAccountsTable).set({ isDefault: false });
    }
    const [row] = await db
      .insert(emailAccountsTable)
      .values({ displayName, emailAddress, gmailUser, gmailAppPassword, assignedTo: assignedTo || null, isDefault: !!isDefault })
      .returning();
    res.json({ ...row, gmailAppPassword: "••••••••" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/email-settings/:id — update account
router.put("/email-settings/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { displayName, emailAddress, gmailUser, gmailAppPassword, assignedTo, isDefault } = req.body;
  try {
    if (isDefault) {
      await db.update(emailAccountsTable).set({ isDefault: false });
    }
    const updates: any = {
      displayName,
      emailAddress,
      gmailUser,
      assignedTo: assignedTo || null,
      isDefault: !!isDefault,
      updatedAt: new Date(),
    };
    if (gmailAppPassword && gmailAppPassword !== "••••••••") {
      updates.gmailAppPassword = gmailAppPassword;
    }
    const [row] = await db
      .update(emailAccountsTable)
      .set(updates)
      .where(eq(emailAccountsTable.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row, gmailAppPassword: "••••••••" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/email-settings/:id
router.delete("/email-settings/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.delete(emailAccountsTable).where(eq(emailAccountsTable.id, id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/email-settings/active — get the active creds for email use
router.get("/email-settings/active", async (req, res) => {
  const assignedTo = req.query.user as string | undefined;
  try {
    let account = null;
    if (assignedTo) {
      const rows = await db
        .select()
        .from(emailAccountsTable)
        .where(eq(emailAccountsTable.assignedTo, assignedTo));
      account = rows[0] ?? null;
    }
    if (!account) {
      const rows = await db
        .select()
        .from(emailAccountsTable)
        .where(eq(emailAccountsTable.isDefault, true));
      account = rows[0] ?? null;
    }
    if (!account) return res.status(404).json({ error: "No email account configured" });
    res.json(account);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
