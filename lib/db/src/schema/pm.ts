import { pgTable, text, serial, integer, numeric, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
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
  startDate: text("start_date"),
  tags: text("tags"),
  estimatedHours: numeric("estimated_hours", { precision: 8, scale: 2 }),
  erpTaskId: text("erp_task_id"),
  erpStatus: text("erp_status"),
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

export const meetingMinutesTable = pgTable("meeting_minutes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  attendees: text("attendees"),
  venue: text("venue"),
  date: text("date").notNull(),
  rawNotes: text("raw_notes"),
  aiSummary: text("ai_summary"),
  actionItems: text("action_items"),
  status: text("status").notNull().default("draft"),
  mode: text("mode").notNull().default("manual"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMeetingMinutesSchema = createInsertSchema(meetingMinutesTable).omit({ id: true, createdAt: true });
export type InsertMeetingMinutes = z.infer<typeof insertMeetingMinutesSchema>;
export type MeetingMinutes = typeof meetingMinutesTable.$inferSelect;

export const spreadsheetsTable = pgTable("spreadsheets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  data: text("data").notNull().default("{}"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSpreadsheetSchema = createInsertSchema(spreadsheetsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSpreadsheet = z.infer<typeof insertSpreadsheetSchema>;
export type Spreadsheet = typeof spreadsheetsTable.$inferSelect;

export const roleTemplatesTable = pgTable("role_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  color: text("color").notNull().default("violet"),
  moduleRoles: text("module_roles").notNull().default("{}"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export type RoleTemplate = typeof roleTemplatesTable.$inferSelect;
export const insertRoleTemplateSchema = createInsertSchema(roleTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRoleTemplate = z.infer<typeof insertRoleTemplateSchema>;

export const userPermissionsTable = pgTable("user_permissions", {
  email: text("email").primaryKey(),
  fullName: text("full_name"),
  hasAccess: boolean("has_access").notNull().default(true),
  modules: text("modules").notNull().default("[]"),
  moduleRoles: text("module_roles").notNull().default("{}"),
  roleType: text("role_type"),
  allowedProjects: text("allowed_projects").notNull().default("[]"),
  allowedDrawingDepts: text("allowed_drawing_depts").notNull().default("[]"),
  twoFaEnabled: boolean("two_fa_enabled").notNull().default(false),
  theme: text("theme").notNull().default("system"),
  navbarStyle: text("navbar_style").notNull().default("full"),
  notifWhatsapp: boolean("notif_whatsapp").notNull().default(false),
  notifWhatsappPhone: text("notif_whatsapp_phone"),
  notifEmail: boolean("notif_email").notNull().default(true),
  notifSystem: boolean("notif_system").notNull().default(true),
  notifEvents: text("notif_events").notNull().default('["task_assigned","project_update","new_lead","new_message"]'),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export type UserPermission = typeof userPermissionsTable.$inferSelect;

export const inAppNotificationsTable = pgTable("in_app_notifications", {
  id: serial("id").primaryKey(),
  userEmail: text("user_email").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  read: boolean("read").notNull().default(false),
  data: jsonb("data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const emailAccountsTable = pgTable("email_accounts", {
  id: serial("id").primaryKey(),
  displayName: text("display_name").notNull(),
  emailAddress: text("email_address").notNull(),
  gmailUser: text("gmail_user").notNull(),
  gmailAppPassword: text("gmail_app_password").notNull(),
  assignedTo: text("assigned_to"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEmailAccountSchema = createInsertSchema(emailAccountsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmailAccount = z.infer<typeof insertEmailAccountSchema>;
export type EmailAccount = typeof emailAccountsTable.$inferSelect;

export const projectDrawingsTable = pgTable("project_drawings", {
  id: text("id").primaryKey(),
  drawingNo: text("drawing_no").notNull(),
  title: text("title").notNull().default(""),
  project: text("project").notNull().default(""),
  department: text("department").notNull().default(""),
  drawingType: text("drawing_type").notNull().default(""),
  systemName: text("system_name").notNull().default(""),
  uploadedAt: text("uploaded_at").notNull(),
  status: text("status").notNull().default("draft"),
  revisionNo: integer("revision_no").notNull().default(0),
  revisionLabel: text("revision_label").notNull().default(""),
  fileData: text("file_data").notNull().default(""),
  fileName: text("file_name").notNull().default(""),
  note: text("note").notNull().default(""),
  uploadedBy: text("uploaded_by").notNull().default(""),
  history: jsonb("history").notNull().default([]),
  viewLog: jsonb("view_log").notNull().default([]),
  checkedBy: jsonb("checked_by"),
  approvedBy: jsonb("approved_by"),
  erpFileUrl: text("erp_file_url"),
  aiAnalysis: jsonb("ai_analysis"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export type ProjectDrawing = typeof projectDrawingsTable.$inferSelect;

export const taskCommentsTable = pgTable("task_comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasksTable.id, { onDelete: "cascade" }),
  author: text("author").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const insertTaskCommentSchema = createInsertSchema(taskCommentsTable).omit({ id: true, createdAt: true });
export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;
export type TaskComment = typeof taskCommentsTable.$inferSelect;

export const resumeAnalysisCacheTable = pgTable("resume_analysis_cache", {
  id: serial("id").primaryKey(),
  fileHash: text("file_hash").notNull().unique(),
  result: jsonb("result").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
