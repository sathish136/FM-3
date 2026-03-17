import { Router } from "express";
import { db } from "@workspace/db";
import { spreadsheetsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(spreadsheetsTable).orderBy(spreadsheetsTable.createdAt);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(spreadsheetsTable).where(eq(spreadsheetsTable.id, Number(req.params.id)));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, projectId } = req.body;
    const defaultData = JSON.stringify({
      tabs: [{ id: "tab_1", name: "Sheet 1", cells: {} }],
      activeTab: "tab_1",
    });
    const [row] = await db.insert(spreadsheetsTable).values({
      name: name || "Untitled Spreadsheet",
      projectId: projectId || null,
      data: defaultData,
    }).returning();
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { name, data, projectId } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (data !== undefined) updates.data = typeof data === "string" ? data : JSON.stringify(data);
    if (projectId !== undefined) updates.projectId = projectId;
    const [row] = await db.update(spreadsheetsTable).set(updates).where(eq(spreadsheetsTable.id, Number(req.params.id))).returning();
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(spreadsheetsTable).where(eq(spreadsheetsTable.id, Number(req.params.id)));
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
