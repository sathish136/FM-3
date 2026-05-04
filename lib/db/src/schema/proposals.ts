import { pgTable, text, serial, integer, timestamp, bigint } from "drizzle-orm/pg-core";

export const proposalsTable = pgTable("proposals", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull().unique(),
  customerName: text("customer_name"),
  revision: text("revision"),
  number: text("number"),
  proposalDate: text("proposal_date"),
  country: text("country"),
  fileSize: bigint("file_size", { mode: "number" }),
  fileMtime: text("file_mtime"),
  sourceHost: text("source_host"),
  sourcePath: text("source_path"),
  storagePath: text("storage_path"),
  rawText: text("raw_text"),
  pageCount: integer("page_count"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Proposal = typeof proposalsTable.$inferSelect;
export type InsertProposal = typeof proposalsTable.$inferInsert;
