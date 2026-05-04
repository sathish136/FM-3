import { Router } from "express";
import { chatPool } from "../chat-ws";

const router = Router();

router.get("/chat/channels", async (_req, res) => {
  try {
    const r = await chatPool.query(`SELECT * FROM chat_channels ORDER BY id ASC`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/chat/channels", async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  try {
    const r = await chatPool.query(
      `INSERT INTO chat_channels (name, description) VALUES ($1,$2) RETURNING *`,
      [name.toLowerCase().replace(/\s+/g, "-"), description || null]
    );
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/chat/:channelId/messages", async (req, res) => {
  const { channelId } = req.params;
  const limit = parseInt(req.query.limit as string) || 80;
  try {
    const r = await chatPool.query(
      `SELECT m.*,
        COALESCE(json_agg(json_build_object('emoji', rr.emoji, 'userEmail', rr.user_email)) FILTER (WHERE rr.id IS NOT NULL), '[]') AS reactions
       FROM chat_messages m
       LEFT JOIN chat_reactions rr ON rr.message_id = m.id
       WHERE m.channel_id = $1
       GROUP BY m.id
       ORDER BY m.created_at ASC
       LIMIT $2`,
      [channelId, limit]
    );
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/chat/messages/:messageId", async (req, res) => {
  const { messageId } = req.params;
  const { userEmail } = req.query;
  try {
    await chatPool.query(
      `DELETE FROM chat_messages WHERE id = $1 AND user_email = $2`,
      [messageId, userEmail]
    );
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/chat/messages/:messageId/react", async (req, res) => {
  const { messageId } = req.params;
  const { userEmail, emoji } = req.body;
  try {
    const existing = await chatPool.query(
      `SELECT id FROM chat_reactions WHERE message_id=$1 AND user_email=$2 AND emoji=$3`,
      [messageId, userEmail, emoji]
    );
    if (existing.rows.length > 0) {
      await chatPool.query(`DELETE FROM chat_reactions WHERE message_id=$1 AND user_email=$2 AND emoji=$3`, [messageId, userEmail, emoji]);
      res.json({ toggled: "off" });
    } else {
      await chatPool.query(`INSERT INTO chat_reactions (message_id, user_email, emoji) VALUES ($1,$2,$3)`, [messageId, userEmail, emoji]);
      res.json({ toggled: "on" });
    }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
