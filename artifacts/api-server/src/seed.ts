import { db } from "@workspace/db";
import {
  projectsTable, tasksTable, campaignsTable, leadsTable, teamMembersTable,
} from "@workspace/db/schema";

async function seed() {
  console.log("Seeding database...");

  const [p1] = await db.insert(projectsTable).values({ name: "Website Redesign", description: "Full redesign of the company website", status: "active", priority: "high", progress: 65, dueDate: "2026-04-30" }).returning();
  const [p2] = await db.insert(projectsTable).values({ name: "Mobile App Launch", description: "Launch the new mobile application", status: "active", priority: "high", progress: 40, dueDate: "2026-05-15" }).returning();
  const [p3] = await db.insert(projectsTable).values({ name: "Q2 Marketing Push", description: "Increase brand visibility for Q2", status: "planning", priority: "medium", progress: 10, dueDate: "2026-06-30" }).returning();
  const [p4] = await db.insert(projectsTable).values({ name: "CRM Integration", description: "Integrate new CRM system", status: "on_hold", priority: "low", progress: 25, dueDate: "2026-07-01" }).returning();
  const [p5] = await db.insert(projectsTable).values({ name: "Annual Report 2025", description: "Prepare annual company report", status: "completed", priority: "medium", progress: 100, dueDate: "2026-03-01" }).returning();

  await db.insert(tasksTable).values([
    { title: "Design new homepage mockup", projectId: p1.id, status: "done", priority: "high", assignee: "Alice Chen", dueDate: "2026-03-20" },
    { title: "Implement responsive navigation", projectId: p1.id, status: "in_progress", priority: "high", assignee: "Bob Smith", dueDate: "2026-04-05" },
    { title: "Write content for About page", projectId: p1.id, status: "review", priority: "medium", assignee: "Carol Davis", dueDate: "2026-04-10" },
    { title: "SEO audit and improvements", projectId: p1.id, status: "todo", priority: "medium", assignee: "Alice Chen", dueDate: "2026-04-20" },
    { title: "Set up CI/CD pipeline", projectId: p2.id, status: "done", priority: "high", assignee: "Bob Smith", dueDate: "2026-03-15" },
    { title: "Build user authentication", projectId: p2.id, status: "in_progress", priority: "high", assignee: "Dave Wilson", dueDate: "2026-04-01" },
    { title: "Design onboarding flow", projectId: p2.id, status: "todo", priority: "medium", assignee: "Carol Davis", dueDate: "2026-04-15" },
    { title: "Define campaign objectives", projectId: p3.id, status: "in_progress", priority: "high", assignee: "Alice Chen", dueDate: "2026-03-30" },
    { title: "Create email sequences", projectId: p3.id, status: "todo", priority: "medium", assignee: "Carol Davis", dueDate: "2026-04-10" },
    { title: "Social media calendar", projectId: p3.id, status: "todo", priority: "low", assignee: "Dave Wilson", dueDate: "2026-04-15" },
  ]);

  const [c1] = await db.insert(campaignsTable).values({ name: "Spring Email Blast", type: "email", status: "active", budget: "5000", spent: "3200", leads: 245, conversions: 38, startDate: "2026-03-01", endDate: "2026-04-30", description: "Targeted email campaign for spring promotions" }).returning();
  const [c2] = await db.insert(campaignsTable).values({ name: "LinkedIn Brand Awareness", type: "social", status: "active", budget: "8000", spent: "4100", leads: 182, conversions: 22, startDate: "2026-02-15", endDate: "2026-05-15", description: "B2B brand awareness on LinkedIn" }).returning();
  const [c3] = await db.insert(campaignsTable).values({ name: "Google Ads Q1", type: "ppc", status: "completed", budget: "12000", spent: "12000", leads: 520, conversions: 89, startDate: "2026-01-01", endDate: "2026-03-31", description: "Pay-per-click campaign for Q1" }).returning();
  const [c4] = await db.insert(campaignsTable).values({ name: "Blog Content Series", type: "content", status: "active", budget: "3000", spent: "1500", leads: 95, conversions: 12, startDate: "2026-03-01", endDate: "2026-06-30", description: "Monthly blog series for organic traffic" }).returning();
  const [c5] = await db.insert(campaignsTable).values({ name: "Webinar Series", type: "event", status: "draft", budget: "6000", spent: "0", leads: 0, conversions: 0, startDate: "2026-05-01", endDate: "2026-07-31", description: "Monthly webinars for lead generation" }).returning();

  await db.insert(leadsTable).values([
    { name: "Sarah Johnson", email: "sarah.j@techcorp.com", phone: "+1-555-0101", company: "TechCorp", status: "converted", campaignId: c1.id, notes: "Purchased enterprise plan" },
    { name: "Mark Williams", email: "m.williams@growstart.io", phone: "+1-555-0102", company: "GrowStart", status: "qualified", campaignId: c1.id, notes: "Interested in annual subscription" },
    { name: "Emma Davis", email: "emma.d@innovate.co", phone: "+1-555-0103", company: "Innovate Co", status: "contacted", campaignId: c2.id },
    { name: "James Miller", email: "james.m@globalind.com", phone: "+1-555-0104", company: "Global Industries", status: "new", campaignId: c2.id },
    { name: "Olivia Brown", email: "o.brown@nextlevel.net", phone: "+1-555-0105", company: "NextLevel", status: "converted", campaignId: c3.id, notes: "Signed 2-year contract" },
    { name: "Noah Garcia", email: "n.garcia@digitalwave.com", company: "Digital Wave", status: "qualified", campaignId: c3.id },
    { name: "Sophia Martinez", email: "s.martinez@cloudpeak.io", phone: "+1-555-0107", company: "CloudPeak", status: "contacted", campaignId: c4.id },
    { name: "Liam Anderson", email: "l.anderson@startup365.com", company: "Startup365", status: "new", campaignId: c1.id },
    { name: "Ava Thompson", email: "a.thompson@ventures.co", phone: "+1-555-0109", company: "Ventures Co", status: "lost", campaignId: c3.id, notes: "Chose competitor" },
    { name: "Ethan Wilson", email: "e.wilson@megacorp.com", phone: "+1-555-0110", company: "MegaCorp", status: "new", campaignId: c5.id },
  ]);

  await db.insert(teamMembersTable).values([
    { name: "Alice Chen", email: "alice@company.com", role: "Product Manager", department: "Product" },
    { name: "Bob Smith", email: "bob@company.com", role: "Lead Developer", department: "Engineering" },
    { name: "Carol Davis", email: "carol@company.com", role: "Content Strategist", department: "Marketing" },
    { name: "Dave Wilson", email: "dave@company.com", role: "Full Stack Developer", department: "Engineering" },
    { name: "Eve Martinez", email: "eve@company.com", role: "UX Designer", department: "Design" },
    { name: "Frank Lee", email: "frank@company.com", role: "Marketing Director", department: "Marketing" },
    { name: "Grace Kim", email: "grace@company.com", role: "Sales Manager", department: "Sales" },
  ]);

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
