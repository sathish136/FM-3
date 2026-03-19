import { createServer } from "http";
import app from "./app";
import { setupTranscribeWS } from "./transcribe-ws";
import { setupChatWS } from "./chat-ws";

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

httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
