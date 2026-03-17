import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("planning"),
  priority: text("priority").default("medium"),
  progress: integer("progress").notNull().default(0),
  dueDate: text("due_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  status: text("status").notNull().default("todo"),
  priority: text("priority").notNull().default("medium"),
  assignee: text("assignee"),
  dueDate: text("due_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"),
  type: text("type").notNull(),
  budget: numeric("budget", { precision: 12, scale: 2 }).notNull().default("0"),
  spent: numeric("spent", { precision: 12, scale: 2 }).default("0"),
  leads: integer("leads").default(0),
  conversions: integer("conversions").default(0),
  startDate: text("start_date"),
  endDate: text("end_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({ id: true, createdAt: true });
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaignsTable.$inferSelect;

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
  status: text("status").notNull().default("new"),
  campaignId: integer("campaign_id").references(() => campaignsTable.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({ id: true, createdAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;

export const teamMembersTable = pgTable("team_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  department: text("department"),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembersTable).omit({ id: true, createdAt: true });
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembersTable.$inferSelect;
