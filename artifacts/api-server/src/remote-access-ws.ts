import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import crypto from "crypto";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgresql://postgres:wtt%40adm123@122.165.225.42:5432/flowmatrix",
});

interface AgentConnection {
  ws: WebSocket;
  machineId: number;
  connectedAt: Date;
}

interface ViewerConnection {
  ws: WebSocket;
  machineId: number;
  userEmail: string;
  sessionId?: number;
}

const agents = new Map<number, AgentConnection>();
const viewers = new Map<number, Set<ViewerConnection>>();

async function hashToken(token: string): Promise<string> {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function getMachineByToken(token: string): Promise<{ id: number; name: string; site: string } | null> {
  try {
    const hash = await hashToken(token);
    const r = await pool.query(
      `SELECT id, name, site FROM remote_access_machines WHERE token_hash = $1`,
      [hash]
    );
    return r.rows[0] || null;
  } catch {
    return null;
  }
}

async function setMachineOnline(machineId: number, online: boolean) {
  try {
    await pool.query(
      `UPDATE remote_access_machines SET is_online = $1, last_seen = NOW() WHERE id = $2`,
      [online, machineId]
    );
  } catch (e) {
    console.error("remote-access: setMachineOnline error:", e);
  }
}

async function openSession(machineId: number, userEmail: string): Promise<number | undefined> {
  try {
    const r = await pool.query(
      `INSERT INTO remote_access_sessions (machine_id, initiated_by) VALUES ($1, $2) RETURNING id`,
      [machineId, userEmail]
    );
    return r.rows[0]?.id;
  } catch {
    return undefined;
  }
}

async function closeSession(sessionId: number) {
  try {
    await pool.query(
      `UPDATE remote_access_sessions SET ended_at = NOW() WHERE id = $1 AND ended_at IS NULL`,
      [sessionId]
    );
  } catch {}
}

function broadcastToViewers(machineId: number, data: Buffer | string, isBinary = false) {
  const vset = viewers.get(machineId);
  if (!vset) return;
  for (const viewer of vset) {
    if (viewer.ws.readyState === WebSocket.OPEN) {
      viewer.ws.send(data, { binary: isBinary });
    }
  }
}

function notifyMachineStatus(machineId: number, online: boolean) {
  const vset = viewers.get(machineId);
  if (!vset) return;
  const payload = JSON.stringify({ type: "machine_status", online });
  for (const viewer of vset) {
    if (viewer.ws.readyState === WebSocket.OPEN) {
      viewer.ws.send(payload);
    }
  }
}

export function setupRemoteAccessWS(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    if (!req.url) return;
    const pathname = req.url.split("?")[0];
    if (pathname !== "/api/remote-ws") return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", async (ws: WebSocket, req) => {
    const url = new URL(req.url!, "http://localhost");
    const role = url.searchParams.get("role"); // "agent" or "viewer"
    const token = url.searchParams.get("token") || "";
    const machineIdParam = url.searchParams.get("machineId");
    const userEmail = url.searchParams.get("user") || "unknown";

    if (role === "agent") {
      const machine = await getMachineByToken(token);
      if (!machine) {
        ws.send(JSON.stringify({ type: "error", message: "Invalid token" }));
        ws.close(1008, "Unauthorized");
        return;
      }

      const machineId = machine.id;

      if (agents.has(machineId)) {
        const existing = agents.get(machineId)!;
        existing.ws.close(1000, "Replaced by new connection");
      }

      const agent: AgentConnection = { ws, machineId, connectedAt: new Date() };
      agents.set(machineId, agent);
      await setMachineOnline(machineId, true);
      notifyMachineStatus(machineId, true);

      ws.send(JSON.stringify({ type: "auth_ok", machineId, name: machine.name }));
      console.log(`remote-access: agent connected machine ${machineId} (${machine.name})`);

      ws.on("message", (data, isBinary) => {
        if (isBinary) {
          // Raw binary JPEG frame — forward directly to all viewers
          broadcastToViewers(machineId, data as Buffer, true);
        } else {
          try {
            const msg = JSON.parse(data.toString());
            if (msg.type === "frame") {
              // Legacy base64 frame (not used anymore but keep for compat)
              broadcastToViewers(machineId, data as Buffer, false);
            } else if (msg.type === "clipboard_data") {
              // Agent is responding to a clipboard_read — forward to all viewers
              broadcastToViewers(machineId, data as Buffer, false);
            }
          } catch {}
        }
      });

      ws.on("close", async () => {
        agents.delete(machineId);
        await setMachineOnline(machineId, false);
        notifyMachineStatus(machineId, false);
        console.log(`remote-access: agent disconnected machine ${machineId}`);
      });

      ws.on("error", () => {
        agents.delete(machineId);
        setMachineOnline(machineId, false).catch(() => {});
        notifyMachineStatus(machineId, false);
      });

    } else if (role === "viewer") {
      const machineId = parseInt(machineIdParam || "0");
      if (!machineId) {
        ws.send(JSON.stringify({ type: "error", message: "Missing machineId" }));
        ws.close(1008, "Bad request");
        return;
      }

      const viewer: ViewerConnection = { ws, machineId, userEmail };
      if (!viewers.has(machineId)) viewers.set(machineId, new Set());
      viewers.get(machineId)!.add(viewer);

      const agentConn = agents.get(machineId);
      const isOnline = !!agentConn && agentConn.ws.readyState === WebSocket.OPEN;

      viewer.sessionId = await openSession(machineId, userEmail);

      ws.send(JSON.stringify({
        type: "connected",
        machineId,
        online: isOnline,
        sessionId: viewer.sessionId,
      }));

      if (isOnline) {
        agentConn!.ws.send(JSON.stringify({ type: "viewer_joined", userEmail }));
      }

      ws.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString());
          const agent = agents.get(machineId);
          if (!agent || agent.ws.readyState !== WebSocket.OPEN) return;

          if (["mousemove", "mousedown", "mouseup", "keydown", "keyup", "scroll",
               "clipboard_read", "clipboard_write"].includes(msg.type)) {
            agent.ws.send(JSON.stringify(msg));
          }
          if (msg.type === "disconnect_request") {
            ws.close(1000, "User disconnected");
          }
        } catch {}
      });

      ws.on("close", async () => {
        viewers.get(machineId)?.delete(viewer);
        if (viewer.sessionId) await closeSession(viewer.sessionId);

        const agent = agents.get(machineId);
        if (agent && agent.ws.readyState === WebSocket.OPEN) {
          const remaining = viewers.get(machineId)?.size || 0;
          agent.ws.send(JSON.stringify({ type: "viewer_left", remaining }));
        }
      });

      ws.on("error", () => {
        viewers.get(machineId)?.delete(viewer);
        if (viewer.sessionId) closeSession(viewer.sessionId).catch(() => {});
      });

    } else {
      ws.close(1008, "Invalid role");
    }
  });

  console.log("Remote Access WebSocket relay ready at /api/remote-ws");
}

export function getAgentStatus(machineId: number): boolean {
  const agent = agents.get(machineId);
  return !!agent && agent.ws.readyState === WebSocket.OPEN;
}
