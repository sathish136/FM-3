import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
// Explicitly resolve .env relative to this file so it works regardless of CWD
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../.env") });
import { createServer } from "http";
import app from "./app";
import { setupTranscribeWS } from "./transcribe-ws";
import { setupChatWS } from "./chat-ws";
import { setupDeepgramWS } from "./deepgram-ws";
import { setupWhisperWS } from "./whisper-ws";
import { warmupDeptCallLogs } from "./routes/dept-call-logs";

// Prevent unhandled errors (e.g., IMAP socket timeouts) from crashing the server
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception (server kept alive):", err.message);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection (server kept alive):", reason);
});

const rawPort = process.env["PORT"] ?? "8080";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);
setupTranscribeWS(httpServer);
setupChatWS(httpServer);
setupDeepgramWS(httpServer);
setupWhisperWS(httpServer);

httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  warmupDeptCallLogs().catch(() => {});
});
