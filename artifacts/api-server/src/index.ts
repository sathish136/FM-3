import "dotenv/config";
import { createServer } from "http";
import app from "./app";
import { setupTranscribeWS } from "./transcribe-ws";
import { setupChatWS } from "./chat-ws";
import { setupDeepgramWS } from "./deepgram-ws";
import { warmupDeptCallLogs } from "./routes/dept-call-logs";

// Prevent unhandled errors (e.g., IMAP socket timeouts) from crashing the server
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception (server kept alive):", err.message);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection (server kept alive):", reason);
});

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);
setupTranscribeWS(httpServer);
setupChatWS(httpServer);
setupDeepgramWS(httpServer);

httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  warmupDeptCallLogs().catch(() => {});
});
