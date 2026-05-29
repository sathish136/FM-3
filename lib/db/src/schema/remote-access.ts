import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";

export const remoteAccessMachinesTable = pgTable("remote_access_machines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  site: text("site").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  description: text("description"),
  isOnline: boolean("is_online").notNull().default(false),
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: text("created_by"),
});

export type RemoteAccessMachine = typeof remoteAccessMachinesTable.$inferSelect;
export type InsertRemoteAccessMachine = typeof remoteAccessMachinesTable.$inferInsert;

export const remoteAccessSessionsTable = pgTable("remote_access_sessions", {
  id: serial("id").primaryKey(),
  machineId: serial("machine_id").references(() => remoteAccessMachinesTable.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  initiatedBy: text("initiated_by"),
});

export type RemoteAccessSession = typeof remoteAccessSessionsTable.$inferSelect;
