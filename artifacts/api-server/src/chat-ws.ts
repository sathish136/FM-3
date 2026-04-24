import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage, Server } from "http";
import pg from "pg";

const { Pool } = pg;
export const chatPool = new Pool({
  connectionString: "postgresql://postgres:wtt%40adm123@122.165.225.42:5432/flowmatrix",
});

interface ChatClient {
  ws: WebSocket;
  channelId: string;
  userEmail: string;
  userName: string;
}

const clients: Set<ChatClient> = new Set();

export async function setupChatWS(server: Server) {
  await initChatTables();

  // Use noServer + manual upgrade routing so multiple WS endpoints can coexist
  // on the same httpServer. Attaching with `{server, path}` would abort other
  // endpoints' upgrades with HTTP 400 because ws calls shouldHandle on every
  // upgrade event, regardless of path.
  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (req, socket, head) => {
    if (!req.url) return;
    const pathname = req.url.split("?")[0];
    if (pathname !== "/api/chat-ws") return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url!, `http://localhost`);
    const channelId = url.searchParams.get("channel") || "1";
    const userEmail = url.searchParams.get("user") || "unknown";
    const userName = decodeURIComponent(url.searchParams.get("name") || userEmail.split("@")[0]);

    const client: ChatClient = { ws, channelId, userEmail, userName };
    clients.add(client);

    const onlinePayload = JSON.stringify({ type: "online", userEmail, userName, channelId });
    for (const c of clients) {
      if (c.channelId === channelId && c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(onlinePayload);
      }
    }

    ws.on("message", async (raw) => {
      try {
        const data = JSON.parse(raw.toString());

        if (data.type === "message") {
          const msg = await saveMessage(channelId, userEmail, userName, data.content, data.attachmentName || null);
          const payload = JSON.stringify({ type: "message", ...msg });
          for (const c of clients) {
            if (c.channelId === channelId && c.ws.readyState === WebSocket.OPEN) {
              c.ws.send(payload);
            }
          }
        }

        if (data.type === "typing") {
          const payload = JSON.stringify({ type: "typing", userEmail, userName });
          for (const c of clients) {
            if (c.channelId === channelId && c.ws !== ws && c.ws.readyState === WebSocket.OPEN) {
              c.ws.send(payload);
            }
          }
        }

        if (data.type === "reaction") {
          await chatPool.query(
            `INSERT INTO chat_reactions (message_id, user_email, emoji) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
            [data.messageId, userEmail, data.emoji]
          );
          const payload = JSON.stringify({ type: "reaction", messageId: data.messageId, emoji: data.emoji, userEmail });
          for (const c of clients) {
            if (c.channelId === channelId && c.ws.readyState === WebSocket.OPEN) {
              c.ws.send(payload);
            }
          }
        }
      } catch (e) {
        console.error("chat-ws error:", e);
      }
    });

    ws.on("close", () => {
      clients.delete(client);
      const offlinePayload = JSON.stringify({ type: "offline", userEmail, channelId });
      for (const c of clients) {
        if (c.channelId === channelId && c.ws.readyState === WebSocket.OPEN) {
          c.ws.send(offlinePayload);
        }
      }
    });

    ws.on("error", () => clients.delete(client));
  });

  console.log("FlowTalk WebSocket ready at /api/chat-ws");
}

async function initChatTables() {
  try {
    await chatPool.query(`
      CREATE TABLE IF NOT EXISTS chat_channels (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        type TEXT NOT NULL DEFAULT 'public',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        channel_id INTEGER NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
        user_email TEXT NOT NULL,
        user_name TEXT NOT NULL,
        content TEXT NOT NULL,
        attachment_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS chat_reactions (
        id SERIAL PRIMARY KEY,
        message_id INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
        user_email TEXT NOT NULL,
        emoji TEXT NOT NULL,
        UNIQUE(message_id, user_email, emoji)
      );

      INSERT INTO chat_channels (name, description, type) VALUES
        ('general', 'Company-wide announcements and work updates', 'public'),
        ('random', 'Non-work banter and fun stuff', 'public'),
        ('engineering', 'Engineering team discussions and updates', 'public'),
        ('procurement', 'Procurement, materials, and vendor info', 'public'),
        ('hr', 'HR updates, policies, and announcements', 'public')
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log("FlowTalk chat tables ready");
  } catch (e) {
    console.error("chat table init error:", e);
  }
}

async function saveMessage(channelId: string, userEmail: string, userName: string, content: string, attachmentName: string | null) {
  const r = await chatPool.query(
    `INSERT INTO chat_messages (channel_id, user_email, user_name, content, attachment_name)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [channelId, userEmail, userName, content, attachmentName]
  );
  return r.rows[0];
}
