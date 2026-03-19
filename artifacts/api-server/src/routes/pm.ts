import { Router } from "express";
import { db } from "@workspace/db";
import {
  projectsTable, tasksTable, campaignsTable, leadsTable, teamMembersTable,
} from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  isErpNextConfigured,
  fetchErpNextProjects,
  fetchErpNextDrawings,
  fetchErpNextDesign3D,
  fetchErpNextDesign2D,
  fetchErpNextPresentations,
  fetchErpNextPID,
  fetchErpNextMaterialRequests,
  fetchErpNextMaterialRequest,
  createErpNextMaterialRequest,
  fetchErpNextMaterialRequestItems,
  fetchErpNextWarehouses,
  fetchErpNextCompanies,
} from "../lib/erpnext";

const router = Router();

// ─── Projects ───────────────────────────────────────────────────────────────

router.get("/projects", async (_req, res) => {
  try {
    if (isErpNextConfigured()) {
      const projects = await fetchErpNextProjects();
      return res.json(projects);
    }
    const rows = await db.select().from(projectsTable).orderBy(projectsTable.createdAt);
    res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/projects", async (req, res) => {
  try {
    const [row] = await db.insert(projectsTable).values(req.body).returning();
    res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/projects/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(projectsTable).where(eq(projectsTable.id, Number(req.params.id)));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch("/projects/:id", async (req, res) => {
  try {
    const [row] = await db.update(projectsTable).set(req.body).where(eq(projectsTable.id, Number(req.params.id))).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/projects/:id", async (req, res) => {
  try {
    await db.delete(projectsTable).where(eq(projectsTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ─── Tasks ───────────────────────────────────────────────────────────────────

router.get("/tasks", async (req, res) => {
  try {
    const { projectId } = req.query;
    let q = db.select().from(tasksTable);
    if (projectId) {
      const rows = await db.select().from(tasksTable).where(eq(tasksTable.projectId, Number(projectId))).orderBy(tasksTable.createdAt);
      return res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
    }
    const rows = await q.orderBy(tasksTable.createdAt);
    res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/tasks", async (req, res) => {
  try {
    const [row] = await db.insert(tasksTable).values(req.body).returning();
    res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch("/tasks/:id", async (req, res) => {
  try {
    const [row] = await db.update(tasksTable).set(req.body).where(eq(tasksTable.id, Number(req.params.id))).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/tasks/:id", async (req, res) => {
  try {
    await db.delete(tasksTable).where(eq(tasksTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ─── Campaigns ───────────────────────────────────────────────────────────────

router.get("/campaigns", async (_req, res) => {
  try {
    const rows = await db.select().from(campaignsTable).orderBy(campaignsTable.createdAt);
    res.json(rows.map(r => ({ ...r, budget: Number(r.budget), spent: r.spent ? Number(r.spent) : 0, createdAt: r.createdAt.toISOString() })));
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/campaigns", async (req, res) => {
  try {
    const [row] = await db.insert(campaignsTable).values(req.body).returning();
    res.status(201).json({ ...row, budget: Number(row.budget), spent: row.spent ? Number(row.spent) : 0, createdAt: row.createdAt.toISOString() });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch("/campaigns/:id", async (req, res) => {
  try {
    const [row] = await db.update(campaignsTable).set(req.body).where(eq(campaignsTable.id, Number(req.params.id))).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row, budget: Number(row.budget), spent: row.spent ? Number(row.spent) : 0, createdAt: row.createdAt.toISOString() });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/campaigns/:id", async (req, res) => {
  try {
    await db.delete(campaignsTable).where(eq(campaignsTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ─── Leads ───────────────────────────────────────────────────────────────────

router.get("/leads", async (req, res) => {
  try {
    const { campaignId } = req.query;
    if (campaignId) {
      const rows = await db.select().from(leadsTable).where(eq(leadsTable.campaignId, Number(campaignId))).orderBy(leadsTable.createdAt);
      return res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
    }
    const rows = await db.select().from(leadsTable).orderBy(leadsTable.createdAt);
    res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/leads", async (req, res) => {
  try {
    const [row] = await db.insert(leadsTable).values(req.body).returning();
    res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch("/leads/:id", async (req, res) => {
  try {
    const [row] = await db.update(leadsTable).set(req.body).where(eq(leadsTable.id, Number(req.params.id))).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/leads/:id", async (req, res) => {
  try {
    await db.delete(leadsTable).where(eq(leadsTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ─── Team Members ─────────────────────────────────────────────────────────────

router.get("/team", async (_req, res) => {
  try {
    const rows = await db.select().from(teamMembersTable).orderBy(teamMembersTable.createdAt);
    res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/team", async (req, res) => {
  try {
    const [row] = await db.insert(teamMembersTable).values(req.body).returning();
    res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ─── ERPNext Status ───────────────────────────────────────────────────────────

router.get("/erpnext/status", (_req, res) => {
  res.json({ configured: isErpNextConfigured(), url: process.env.ERPNEXT_URL || null });
});

// ─── Analytics Summary ────────────────────────────────────────────────────────

router.get("/analytics/summary", async (_req, res) => {
  try {
    const [leadStats] = await db.select({
      totalLeads: sql<number>`count(*)::int`,
      totalConversions: sql<number>`sum(case when status = 'converted' then 1 else 0 end)::int`,
    }).from(leadsTable);

    const [campaignStats] = await db.select({
      totalBudget: sql<number>`coalesce(sum(budget::numeric), 0)::float`,
      totalSpent: sql<number>`coalesce(sum(spent::numeric), 0)::float`,
      activeCampaigns: sql<number>`sum(case when status = 'active' then 1 else 0 end)::int`,
    }).from(campaignsTable);

    const [projectStats] = await db.select({
      activeProjects: sql<number>`sum(case when status = 'active' then 1 else 0 end)::int`,
    }).from(projectsTable);

    const [taskStats] = await db.select({
      completedTasks: sql<number>`sum(case when status = 'done' then 1 else 0 end)::int`,
      pendingTasks: sql<number>`sum(case when status != 'done' then 1 else 0 end)::int`,
    }).from(tasksTable);

    const totalLeads = leadStats.totalLeads || 0;
    const totalConversions = leadStats.totalConversions || 0;

    res.json({
      totalLeads,
      totalConversions,
      totalBudget: campaignStats.totalBudget || 0,
      totalSpent: campaignStats.totalSpent || 0,
      activeCampaigns: campaignStats.activeCampaigns || 0,
      activeProjects: projectStats.activeProjects || 0,
      completedTasks: taskStats.completedTasks || 0,
      pendingTasks: taskStats.pendingTasks || 0,
      conversionRate: totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0,
      monthlyLeads: [],
    });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ─── Drawings ────────────────────────────────────────────────────────────────

router.get("/drawings", async (req, res) => {
  try {
    const { department } = req.query as { department?: string };
    const drawings = await fetchErpNextDrawings(department);
    res.json(drawings);
  } catch (e) {
    console.error("Drawings fetch error:", e);
    res.status(500).json({ error: String(e) });
  }
});

// ─── Marketing Presentations ─────────────────────────────────────────────────

router.get("/presentations", async (req, res) => {
  try {
    const records = await fetchErpNextPresentations();
    res.json(records);
  } catch (e) {
    console.error("Presentations fetch error:", e);
    res.status(500).json({ error: String(e) });
  }
});

// ─── P&ID ─────────────────────────────────────────────────────────────────────

router.get("/pid", async (_req, res) => {
  try {
    const records = await fetchErpNextPID();
    res.json(records);
  } catch (e) {
    console.error("P&ID fetch error:", e);
    res.status(500).json({ error: String(e) });
  }
});

// ─── Design 2D ───────────────────────────────────────────────────────────────

router.get("/design-2d", async (req, res) => {
  try {
    const { department } = req.query as { department?: string };
    const records = await fetchErpNextDesign2D(department);
    res.json(records);
  } catch (e) {
    console.error("Design 2D fetch error:", e);
    res.status(500).json({ error: String(e) });
  }
});

// ─── Design 3D ───────────────────────────────────────────────────────────────

router.get("/design-3d", async (req, res) => {
  try {
    const { department } = req.query as { department?: string };
    const records = await fetchErpNextDesign3D(department);
    res.json(records);
  } catch (e) {
    console.error("Design 3D fetch error:", e);
    res.status(500).json({ error: String(e) });
  }
});

// ─── Material Requests ────────────────────────────────────────────────────────

router.get("/material-requests", async (req, res) => {
  try {
    const { status, type, project } = req.query as { status?: string; type?: string; project?: string };
    const records = await fetchErpNextMaterialRequests({ status, type, project });
    res.json(records);
  } catch (e) {
    console.error("Material Request fetch error:", e);
    res.status(500).json({ error: String(e) });
  }
});

router.get("/material-requests/:name", async (req, res) => {
  try {
    const record = await fetchErpNextMaterialRequest(req.params.name);
    res.json(record);
  } catch (e) {
    console.error("Material Request detail fetch error:", e);
    res.status(500).json({ error: String(e) });
  }
});

router.post("/material-requests", async (req, res) => {
  try {
    const record = await createErpNextMaterialRequest(req.body);
    res.status(201).json(record);
  } catch (e) {
    console.error("Material Request create error:", e);
    res.status(500).json({ error: String(e) });
  }
});

router.get("/material-request-items", async (_req, res) => {
  try {
    const items = await fetchErpNextMaterialRequestItems();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/warehouses", async (_req, res) => {
  try {
    const warehouses = await fetchErpNextWarehouses();
    res.json(warehouses);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/companies", async (_req, res) => {
  try {
    const companies = await fetchErpNextCompanies();
    res.json(companies);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
