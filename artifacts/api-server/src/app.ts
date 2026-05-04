import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";

const app: Express = express();

app.use(cors({
  origin: true,          // reflect any origin, including null (pywebview local HTML)
  credentials: true,
}));
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

app.get("/", (req, res) => {
  const host = (req.headers["x-forwarded-host"] as string) || req.get("host") || "";
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  if (host && !host.startsWith("localhost")) {
    res.redirect(302, `${proto}://${host}/pm-app/`);
  } else {
    res.json({ status: "FlowMatriX API running", app: "/pm-app/" });
  }
});

app.use("/api", router);

export default app;
