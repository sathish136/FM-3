import { Router } from "express";

const authRouter = Router();

const ERP_URL = process.env.ERPNEXT_URL || "https://erp.wttint.com";

authRouter.post("/auth/login", async (req, res) => {
  const { usr, pwd } = req.body;
  if (!usr || !pwd) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  try {
    const response = await fetch(`${ERP_URL}/api/method/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ usr, pwd }),
    });

    const data = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      const msg = (data as any)?.message || (data as any)?._server_messages || "Invalid credentials";
      return res.status(401).json({ error: typeof msg === "string" ? msg : "Invalid credentials" });
    }

    const userRes = await fetch(`${ERP_URL}/api/method/frappe.auth.get_logged_user`, {
      headers: {
        "Accept": "application/json",
        "Cookie": response.headers.get("set-cookie") || "",
      },
    });

    let fullName = (data as any)?.full_name || usr;
    let email = usr;

    if (userRes.ok) {
      const userData = await userRes.json() as any;
      const userName = userData?.message;
      if (userName) email = userName;
    }

    return res.json({
      message: "Logged In",
      full_name: fullName,
      email,
    });
  } catch (err: any) {
    console.error("ERPNext login error:", err);
    return res.status(500).json({ error: "Failed to connect to ERPNext" });
  }
});

authRouter.post("/auth/logout", (_req, res) => {
  res.json({ ok: true });
});

export default authRouter;
