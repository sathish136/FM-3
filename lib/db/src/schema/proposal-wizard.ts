import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const proposalWizardCounter = pgTable("proposal_wizard_counter", {
  id: serial("id").primaryKey(),
  counter: integer("counter").notNull().default(1),
  lastUsedAt: timestamp("last_used_at").notNull().defaultNow(),
  lastCustomer: text("last_customer"),
  lastFlowRate: text("last_flow_rate"),
});

export type ProposalWizardCounter = typeof proposalWizardCounter.$inferSelect;
