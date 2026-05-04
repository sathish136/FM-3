import { Router } from "express";
import { ImapFlow } from "imapflow";
import pg from "pg";
import { simpleParser } from "mailparser";

const router = Router();
const { Pool } = pg;

// Database connections
const emailPool = new Pool({
  connectionString: "postgresql://postgres:wtt%40adm123@122.165.225.42:5432/flowmatrix",
});

const smartPool = new Pool({
  connectionString: "postgresql://postgres:wtt%40adm123@122.165.225.42:5432/flowmatrix",
});

// Track sync operations
const syncOperations = new Map<string, {
  status: 'running' | 'completed' | 'error';
  progress: number;
  total: number;
  message: string;
  startTime: Date;
}>();

// Account management
type Account = { 
  id: number; 
  gmailUser: string; 
  gmailAppPassword: string; 
  emailAddress: string; 
  assigned_to?: string;
};

async function getAllAccounts(): Promise<Account[]> {
  const res = await emailPool.query(
    "SELECT id, gmail_user, gmail_app_password, email_address, assigned_to FROM email_accounts WHERE gmail_user IS NOT NULL AND gmail_app_password IS NOT NULL"
  );
  return res.rows.map(row => ({
    id: row.id,
    gmailUser: row.gmail_user,
    gmailAppPassword: row.gmail_app_password?.replace(/\s/g, ""),
    emailAddress: row.email_address || row.gmail_user,
    assigned_to: row.assigned_to,
  }));
}

// IMAP helpers
function makeImapClient(user: string, pass: string) {
  return new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });
}

async function withImap<T>(user: string, pass: string, fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = makeImapClient(user, pass);
  let connectionError: Error | null = null;
  client.on("error", (err: Error) => {
    connectionError = err;
  });
  try {
    await client.connect();
    if (connectionError) throw connectionError;
    return await fn(client);
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes("ETIMEOUT") || msg.includes("timeout") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
      throw new Error("Cannot connect to Gmail IMAP — check your internet connection and that IMAP is enabled in Gmail settings.");
    }
    if (msg.includes("Command failed") || msg.includes("Invalid credentials") || msg.includes("AUTHENTICATIONFAILED") || msg.includes("Authentication") || msg.includes("[AUTH]")) {
      throw new Error("Gmail authentication failed — please check your Gmail App Password in Email Settings.");
    }
    throw err;
  } finally {
    try { await client.logout(); } catch {}
  }
}

// Initialize tables
async function initTables() {
  await emailPool.query(`
    CREATE TABLE IF NOT EXISTS email_cache (
      id SERIAL PRIMARY KEY,
      account_id INTEGER NOT NULL,
      folder_path TEXT NOT NULL,
      uid INTEGER NOT NULL,
      subject TEXT,
      from_addr TEXT,
      to_addr TEXT,
      cc_addr TEXT,
      email_date TIMESTAMPTZ,
      seen BOOLEAN NOT NULL DEFAULT false,
      starred BOOLEAN NOT NULL DEFAULT false,
      size INTEGER DEFAULT 0,
      has_attachment BOOLEAN NOT NULL DEFAULT false,
      body_html TEXT,
      body_text TEXT,
      body_fetched BOOLEAN NOT NULL DEFAULT false,
      synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(account_id, folder_path, uid)
    )
  `);

  await emailPool.query(`
    CREATE TABLE IF NOT EXISTS email_folders_cache (
      id SERIAL PRIMARY KEY,
      account_id INTEGER NOT NULL,
      path TEXT NOT NULL,
      name TEXT,
      flags TEXT,
      synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(account_id, path)
    )
  `);

  await smartPool.query(`
    CREATE TABLE IF NOT EXISTS smart_email_inbox (
      id SERIAL PRIMARY KEY,
      uid TEXT NOT NULL UNIQUE,
      account_id INTEGER,
      subject TEXT,
      from_addr TEXT,
      to_addr TEXT,
      cc_addr TEXT,
      email_date TIMESTAMPTZ,
      body_text TEXT,
      body_html TEXT,
      seen BOOLEAN NOT NULL DEFAULT false,
      has_attachment BOOLEAN NOT NULL DEFAULT false,
      email_type TEXT,
      category TEXT,
      project_name TEXT,
      supplier_name TEXT,
      is_internal BOOLEAN NOT NULL DEFAULT false,
      priority TEXT,
      auto_replied BOOLEAN NOT NULL DEFAULT false,
      classified BOOLEAN NOT NULL DEFAULT false,
      department TEXT,
      snippet TEXT,
      has_draft BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

// Helper function to safely parse email dates
function parseEmailDate(date: any): Date | null {
  if (!date) return null;
  
  try {
    // If it's already a Date object, validate it
    if (date instanceof Date) {
      // Check if date is reasonable (not too far in future or past)
      const now = new Date();
      const yearDiff = date.getFullYear() - now.getFullYear();
      if (Math.abs(yearDiff) > 10) {
        console.warn(`Date with unreasonable year detected: ${date.toISOString()}`);
        return null;
      }
      return date;
    }
    
    // Try to parse string dates
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      console.warn(`Invalid date format: ${date}`);
      return null;
    }
    
    // Validate parsed date
    const now = new Date();
    const yearDiff = parsed.getFullYear() - now.getFullYear();
    if (Math.abs(yearDiff) > 10) {
      console.warn(`Date with unreasonable year detected: ${date} -> ${parsed.toISOString()}`);
      return null;
    }
    
    return parsed;
  } catch (error) {
    console.warn(`Error parsing date: ${date}`, error);
    return null;
  }
}

// Helper function to check if email is within the 90-day lookback window
function isEmailWithinLookback(date: Date | null): boolean {
  if (!date) return false;
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  return date >= ninetyDaysAgo;
}
function detectAttachments(bodyStructure: any): boolean {
  if (bodyStructure.disposition?.toLowerCase() === "attachment") return true;
  if (bodyStructure.type?.toLowerCase() === "application") return true;
  if (bodyStructure.childNodes) return bodyStructure.childNodes.some((c: any) => detectAttachments(c));
  return false;
}

// Sync a single folder
async function syncFolder(account: Account, folderPath: string, syncId: string): Promise<void> {
  const operation = syncOperations.get(syncId);
  if (!operation) return;

  try {
    await withImap(account.gmailUser, account.gmailAppPassword, async (client) => {
      await client.mailboxOpen(folderPath);
      const status = await client.status(folderPath, { messages: true });
      const total = status.messages ?? 0;
      
      operation.total = total;
      operation.message = `Syncing ${total} emails from ${folderPath}`;

      if (total === 0) return;

      // Get existing UIDs in database
      const existingRes = await emailPool.query(
        "SELECT uid FROM email_cache WHERE account_id=$1 AND folder_path=$2",
        [account.id, folderPath]
      );
      const existingUids = new Set(existingRes.rows.map(r => r.uid));

      // Fetch all email headers
      const range = "1:*";
      const fetched = await client.fetch(range, { uid: true, envelope: true, flags: true, size: true, bodyStructure: true });
      
      let processed = 0;
      let emailsFromMarch21 = 0;
      for await (const msg of fetched) {
        processed++;
        
        const parsedDate = parseEmailDate(msg.envelope?.date);
        
        // Skip emails outside the 90-day lookback window
        if (!isEmailWithinLookback(parsedDate)) {
          continue;
        }
        
        emailsFromMarch21++;
        operation.progress = emailsFromMarch21;
        
        if (existingUids.has(msg.uid)) {
          // Update flags if needed
          const seen = msg.flags?.has("\\Seen") ?? false;
          const starred = msg.flags?.has("\\Flagged") ?? false;
          await emailPool.query(
            `UPDATE email_cache SET seen=$1, starred=$2, synced_at=NOW()
             WHERE account_id=$3 AND folder_path=$4 AND uid=$5`,
            [seen, starred, account.id, folderPath, msg.uid]
          );
          continue;
        }

        // New email - insert into cache
        const hasAttachment = detectAttachments(msg.bodyStructure);
        await emailPool.query(
          `INSERT INTO email_cache 
           (account_id, folder_path, uid, subject, from_addr, to_addr, cc_addr,
            email_date, seen, starred, size, has_attachment)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT (account_id, folder_path, uid) DO NOTHING`,
          [account.id, folderPath, msg.uid, msg.envelope?.subject || null, 
           msg.envelope?.from?.[0]?.address || null, 
           msg.envelope?.to?.map(t => t.address).join(", ") || null,
           msg.envelope?.cc?.map(c => c.address).join(", ") || null,
           parsedDate, msg.flags?.has("\\Seen") ?? false,
           msg.flags?.has("\\Flagged") ?? false, msg.size, hasAttachment]
        );
      }
      
      // Update total to reflect only emails within lookback window
      operation.total = emailsFromMarch21;
      operation.message = `Processed ${processed} emails, found ${emailsFromMarch21} within lookback window in ${folderPath}`;

      // Fetch bodies for new emails (limit to prevent memory issues)
      const lookbackDate = new Date();
      lookbackDate.setDate(lookbackDate.getDate() - 90);
      const newEmailsRes = await emailPool.query(
        `SELECT uid FROM email_cache 
         WHERE account_id=$1 AND folder_path=$2 AND body_fetched=false 
         AND email_date >= $3
         ORDER BY email_date DESC LIMIT 50`,
        [account.id, folderPath, lookbackDate]
      );

      for (const row of newEmailsRes.rows) {
        try {
          const dl = await client.download(row.uid, undefined, { uid: true });
          if (!dl) continue;
          
          const chunks: Buffer[] = [];
          for await (const chunk of dl.content) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          
          const parsed = await simpleParser(Buffer.concat(chunks));
          await emailPool.query(
            `UPDATE email_cache SET body_html=$1, body_text=$2, body_fetched=true
             WHERE account_id=$3 AND folder_path=$4 AND uid=$5`,
            [parsed.html || null, parsed.text || null, account.id, folderPath, row.uid]
          );
        } catch {
          // Body fetch failed - skip
        }
      }
    });
  } catch (error: any) {
    operation.status = 'error';
    operation.message = `Error syncing ${folderPath}: ${error.message}`;
    throw error;
  }
}

// Get all folders for an account
async function getAllFolders(account: Account): Promise<string[]> {
  return await withImap(account.gmailUser, account.gmailAppPassword, async (client) => {
    const list = await client.list();
    return (list as any[]).map(f => f.path).filter(path => !path.includes("[Gmail]"));
  });
}

// Main sync function for all accounts and folders
async function syncAllEmails(syncId: string, userEmail?: string): Promise<void> {
  const operation = syncOperations.get(syncId);
  if (!operation) return;

  try {
    let accounts: Account[];
    if (userEmail) {
      const res = await emailPool.query("SELECT id, gmail_user, gmail_app_password, email_address, assigned_to FROM email_accounts WHERE assigned_to = $1", [userEmail]);
      accounts = res.rows.map(row => ({
        id: row.id,
        gmailUser: row.gmail_user,
        gmailAppPassword: row.gmail_app_password?.replace(/\s/g, ""),
        emailAddress: row.email_address || row.gmail_user,
        assigned_to: row.assigned_to,
      }));
    } else {
      accounts = await getAllAccounts();
    }

    if (accounts.length === 0) {
      operation.status = 'completed';
      operation.message = 'No email accounts configured';
      return;
    }

    operation.message = `Found ${accounts.length} account(s) to sync`;

    for (const account of accounts) {
      const folders = await getAllFolders(account);
      operation.message = `Syncing ${folders.length} folders for account ${account.emailAddress}`;
      
      for (const folder of folders) {
        await syncFolder(account, folder, syncId);
      }
    }

    // After syncing to email_cache, ingest into smart_email_inbox
    await ingestIntoSmartInbox(userEmail);
    
    operation.status = 'completed';
    operation.message = 'Email synchronization completed successfully';
    return;
  } catch (error: any) {
    operation.status = 'error';
    operation.message = `Sync failed: ${error.message}`;
    throw error;
  }
}

// Ingest emails from email_cache to smart_email_inbox
async function ingestIntoSmartInbox(userEmail?: string): Promise<void> {
  try {
    const accountFilter = userEmail 
      ? await emailPool.query("SELECT id FROM email_accounts WHERE assigned_to = $1", [userEmail])
      : null;

    const accountId = accountFilter?.rows[0]?.id;
    
    // Get emails not yet in smart inbox, within 90-day lookback window
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - 90);
    let query = `
      SELECT ec.uid, ec.account_id, ec.subject, ec.from_addr, ec.to_addr, ec.cc_addr,
             ec.email_date, ec.body_text, ec.body_html, ec.seen, ec.has_attachment
      FROM email_cache ec
      LEFT JOIN smart_email_inbox sei ON ec.uid::text = sei.uid
      WHERE sei.uid IS NULL AND ec.email_date >= $1
    `;
    const params: any[] = [lookbackDate];
    
    if (accountId) {
      query += ` AND ec.account_id = $2`;
      params.push(accountId);
    }

    const cached = await emailPool.query(query, params);
    
    for (const row of cached.rows) {
      await smartPool.query(
        `INSERT INTO smart_email_inbox
          (uid, account_id, subject, from_addr, to_addr, cc_addr, email_date, body_text, body_html, seen, has_attachment)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (uid) DO NOTHING`,
        [`${row.uid}`, row.account_id, row.subject, row.from_addr, row.to_addr, row.cc_addr,
         row.email_date, row.body_text, row.body_html, row.seen, row.has_attachment]
      );
    }

    console.log(`Ingested ${cached.rows.length} emails into smart inbox`);
  } catch (error: any) {
    console.error('Ingest error:', error.message);
    throw error;
  }
}

// Routes
router.post("/email-sync/start", async (req, res) => {
  const { user_email } = req.body;
  const syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  syncOperations.set(syncId, {
    status: 'running',
    progress: 0,
    total: 0,
    message: 'Starting email synchronization...',
    startTime: new Date(),
  });

  // Start sync in background
  syncAllEmails(syncId, user_email).catch(error => {
    console.error('Background sync error:', error);
  });

  res.json({ sync_id: syncId });
});

router.get("/email-sync/status/:syncId", (req, res) => {
  const operation = syncOperations.get(req.params.syncId);
  if (!operation) {
    return res.status(404).json({ error: 'Sync operation not found' });
  }
  res.json(operation);
});

router.get("/email-sync/active", (req, res) => {
  const activeOps = Array.from(syncOperations.entries())
    .filter(([_, op]) => op.status === 'running')
    .map(([id, op]) => ({ sync_id: id, ...op }));
  res.json(activeOps);
});

router.post("/email-sync/ingest", async (req, res) => {
  const { user_email } = req.body;
  try {
    await ingestIntoSmartInbox(user_email);
    res.json({ success: true, message: 'Emails ingested into smart inbox' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize tables on startup
initTables().catch(e => console.error("Email sync tables init error:", e.message));

export default router;
