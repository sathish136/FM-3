/**
 * Single source of truth for app modules (user management, nav access, search).
 * When adding a route, add an entry here with key, label, group, and paths.
 */

export interface AppModule {
  key: string;
  label: string;
  group: string;
  /** URL paths that require this module key (exact or prefix match). */
  paths: string[];
}

export const APP_MODULES: AppModule[] = [
  // Core
  { key: "dashboard", label: "Dashboard", group: "Core", paths: ["/"] },
  { key: "calendar", label: "Calendar", group: "Core", paths: ["/calendar"] },
  { key: "tasks", label: "Tasks (Kanban)", group: "Core", paths: ["/tasks"] },
  { key: "task-management", label: "Task Management", group: "Core", paths: ["/task-management"] },
  { key: "team-pulse", label: "Team Pulse", group: "Core", paths: ["/team-pulse"] },
  { key: "team-reporting", label: "Team Reporting", group: "Core", paths: ["/team-reporting"] },
  { key: "ip-call-logs", label: "IP Call Logs", group: "IP Call Logs", paths: ["/ip-call-logs"] },
  { key: "ip-call-logs-hr", label: "HR Recruitment Logs", group: "IP Call Logs", paths: ["/ip-call-logs/hr"] },
  { key: "ip-call-logs-project", label: "Project Followups", group: "IP Call Logs", paths: ["/ip-call-logs/project"] },
  { key: "ip-call-logs-purchase", label: "Purchase Followups", group: "IP Call Logs", paths: ["/ip-call-logs/purchase"] },
  { key: "ip-call-logs-marketing", label: "Marketing Followups", group: "IP Call Logs", paths: ["/ip-call-logs/marketing"] },
  // Project Management
  { key: "projects", label: "Projects", group: "Project Management", paths: ["/projects"] },
  { key: "project-board", label: "Project Board", group: "Project Management", paths: ["/project-board"] },
  { key: "project-timeline", label: "Project Timeline", group: "Project Management", paths: ["/project-timeline"] },
  { key: "meeting-minutes", label: "Meeting Minutes", group: "Project Management", paths: ["/meeting-minutes"] },
  { key: "meeting-discussion", label: "Project Discussion", group: "Project Management", paths: ["/meeting-discussion"] },
  { key: "project-drawings", label: "Project Drawings", group: "Project Management", paths: ["/project-drawings"] },
  { key: "approved-drawings", label: "Approved Drawings", group: "Project Management", paths: ["/approved-drawings"] },
  { key: "presentation", label: "Presentation", group: "Project Management", paths: ["/presentation"] },
  { key: "speech-translator", label: "Speech Translator", group: "Project Management", paths: ["/speech-translator"] },
  { key: "translator", label: "Translator", group: "Project Management", paths: ["/translator"] },
  { key: "project-insights", label: "Project Insights", group: "Project Management", paths: ["/project-insights"] },
  // Proposal
  { key: "proposal-wizard", label: "Proposal Wizard", group: "Proposal", paths: ["/proposal-wizard"] },
  { key: "proposal-library", label: "Proposal Library", group: "Proposal", paths: ["/proposal-library"] },
  { key: "proposals", label: "Proposal Requests", group: "Proposal", paths: ["/proposals"] },
  { key: "process-proposal", label: "Process & Proposal", group: "Proposal", paths: ["/process-proposal"] },
  // Design & Engineering
  { key: "design-3d", label: "Design 3D", group: "Design & Engineering", paths: ["/design-3d"] },
  { key: "pid", label: "P&ID Process", group: "Design & Engineering", paths: ["/pid"] },
  { key: "nesting", label: "Nesting", group: "Design & Engineering", paths: ["/nesting"] },
  { key: "viewer-options", label: "Viewer Options", group: "Design & Engineering", paths: ["/viewer-options"] },
  // O&M
  { key: "om-chemical-consumption", label: "Chemical Consumption", group: "O&M", paths: ["/om/chemical-consumption"] },
  { key: "om-lab-reports", label: "Lab Reports", group: "O&M", paths: ["/om/lab-reports"] },
  { key: "om-site-performance", label: "Site Performance", group: "O&M", paths: ["/om/site-performance"] },
  // PLC & Automation
  { key: "plc-device-config", label: "PLC Device Config", group: "PLC & Automation", paths: ["/plc-automation/device-config"] },
  { key: "plc-site-calls", label: "PLC Site Calls", group: "PLC & Automation", paths: ["/plc-automation/site-calls"] },
  { key: "plc-service-reports", label: "Service Reports", group: "PLC & Automation", paths: ["/plc-automation/service-reports"] },
  { key: "plc-programs", label: "PLC Programs", group: "PLC & Automation", paths: ["/plc-automation/plc-programs"] },
  { key: "plc-hmi-programs", label: "HMI Programs", group: "PLC & Automation", paths: ["/plc-automation/hmi-programs"] },
  { key: "plc-pid-design", label: "PID Design", group: "PLC & Automation", paths: ["/plc-automation/pid-design"] },
  { key: "plc-instruments", label: "Instruments", group: "PLC & Automation", paths: ["/plc-automation/instruments"] },
  { key: "plc-tags", label: "PLC Tags", group: "PLC & Automation", paths: ["/plc-automation/tags"] },
  { key: "plc-panel-inspection", label: "Panel Inspection", group: "PLC & Automation", paths: ["/plc-automation/panel-inspection"] },
  { key: "plc-support-tickets", label: "Support Tickets", group: "PLC & Automation", paths: ["/plc-automation/support-tickets"] },
  { key: "plc-network-architecture", label: "Network Architecture", group: "PLC & Automation", paths: ["/plc-automation/network-architecture"] },
  // Procurement
  { key: "material-request", label: "Material Request", group: "Procurement", paths: ["/material-request"] },
  { key: "purchase-order", label: "Purchase Order", group: "Procurement", paths: ["/purchase-order"] },
  { key: "purchase-orders", label: "Purchase Orders", group: "Procurement", paths: ["/purchase-orders"] },
  { key: "purchase-dashboard", label: "Purchase Dashboard", group: "Procurement", paths: ["/purchase-dashboard"] },
  { key: "stores-dashboard", label: "Stores Dashboard", group: "Procurement", paths: ["/stores-dashboard"] },
  { key: "stock-reports", label: "Stock Reports", group: "Procurement", paths: ["/stock-reports"] },
  { key: "logistics-dashboard", label: "Logistics Dashboard", group: "Procurement", paths: ["/logistics-dashboard"] },
  { key: "finance-dashboard", label: "Finance Dashboard", group: "Procurement", paths: ["/finance-dashboard"] },
  // Communication
  { key: "email", label: "Email", group: "Communication", paths: ["/email"] },
  { key: "smart-inbox", label: "Smart Inbox (AI)", group: "Communication", paths: ["/smart-inbox"] },
  { key: "chat", label: "FlowTalk", group: "Communication", paths: ["/chat"] },
  { key: "sheets", label: "Sheets", group: "Communication", paths: ["/sheets"] },
  // Marketing & CRM
  { key: "marketing", label: "Marketing", group: "Marketing & CRM", paths: ["/marketing"] },
  { key: "sales-dashboard", label: "Sales Dashboard", group: "Marketing & CRM", paths: ["/sales-dashboard", "/sales"] },
  { key: "leads", label: "Leads", group: "Marketing & CRM", paths: ["/leads"] },
  { key: "campaigns", label: "Campaigns", group: "Marketing & CRM", paths: ["/campaigns"] },
  { key: "vc-card-scanner", label: "VC Card Scanner", group: "Marketing & CRM", paths: ["/vc-card-scanner"] },
  { key: "plant-enquiry", label: "Plant Enquiry", group: "Marketing & CRM", paths: ["/plant-enquiry"] },
  // HR
  { key: "hrms", label: "HRMS", group: "HR", paths: ["/hrms"] },
  { key: "team", label: "Team Directory", group: "HR", paths: ["/team"] },
  { key: "hrms-checkin", label: "Attendance", group: "HR", paths: ["/hrms/checkin"] },
  { key: "hrms-leave-request", label: "Leave Request", group: "HR", paths: ["/hrms/leave-request"] },
  { key: "hrms-claims", label: "Claims", group: "HR", paths: ["/hrms/claims"] },
  { key: "hrms-recruitment", label: "Recruitment", group: "HR", paths: ["/hrms/recruitment"] },
  { key: "hrms-incidents", label: "HR Incidents", group: "HR", paths: ["/hrms/incidents"] },
  { key: "hrms-analytics", label: "HR Analytics", group: "HR", paths: ["/hrms/analytics"] },
  { key: "hrms-performance", label: "Performance", group: "HR", paths: ["/hrms/performance"] },
  { key: "hrms-team-performance", label: "Team Dashboard", group: "HR", paths: ["/hrms/team-performance"] },
  { key: "hrms-task-summary", label: "Task Summary", group: "HR", paths: ["/hrms/task-summary"] },
  { key: "hrms-daily-reporting", label: "Daily Reporting", group: "HR", paths: ["/hrms/daily-reporting"] },
  { key: "hrms-work-monitor", label: "Work Monitor", group: "HR", paths: ["/hrms/work-monitor"] },
  { key: "hrms-id-cards", label: "Employee ID Cards", group: "HR", paths: ["/hrms/id-cards"] },
  // Monitoring
  { key: "site-data", label: "Site Data", group: "Monitoring", paths: ["/site-data"] },
  { key: "plant-overview", label: "Plant Overview", group: "Monitoring", paths: ["/plant-overview"] },
  { key: "site-db", label: "Site DB Viewer", group: "Monitoring", paths: ["/site-db"] },
  { key: "site-db-analyze", label: "Plant Analytics", group: "Monitoring", paths: ["/site-db/analyze"] },
  { key: "site-db-system", label: "Site DB System", group: "Monitoring", paths: ["/site-db/system"] },
  { key: "cctv", label: "CCTV", group: "Monitoring", paths: ["/cctv"] },
  // Operations
  { key: "gallery", label: "Gallery", group: "Operations", paths: ["/gallery"] },
  { key: "workshop", label: "Workshop", group: "Operations", paths: ["/workshop"] },
  // Executive
  { key: "mis-report", label: "MD Dashboard", group: "Executive", paths: ["/mis-report"] },
  // Admin
  { key: "payment-tracker", label: "Bill & Recharge", group: "Admin", paths: ["/payment-tracker"] },
  { key: "user-management", label: "User Management", group: "Admin", paths: ["/user-management"] },
  { key: "agent-management", label: "Agent Management", group: "Admin", paths: ["/agent-management"] },
  { key: "settings", label: "Settings", group: "Admin", paths: ["/settings"] },
  { key: "email-settings", label: "Email Settings", group: "Admin", paths: ["/email-settings"] },
];

/** Paths that do not require a module grant (profile, public-ish in-app pages). */
export const OPEN_PATHS = ["/profile"];

export const MODULE_GROUPS = [...new Set(APP_MODULES.map(m => m.group))];

export const ALL_MODULE_KEYS = APP_MODULES.map(m => m.key);

/** Longest-prefix wins when multiple modules share a path prefix. */
const PATH_ENTRIES = APP_MODULES.flatMap(m =>
  m.paths.map(p => ({ path: p, key: m.key })),
).sort((a, b) => b.path.length - a.path.length);

/** Flat map for exact lookups (legacy). */
export const PATH_TO_MODULE: Record<string, string> = Object.fromEntries(
  PATH_ENTRIES.map(e => [e.path, e.key]),
);

export function resolveModuleKey(pathname: string): string | null {
  const path = pathname.split("?")[0].replace(/\/$/, "") || "/";
  if (OPEN_PATHS.includes(path)) return null;
  const exact = PATH_TO_MODULE[path];
  if (exact) return exact;
  for (const { path: prefix, key } of PATH_ENTRIES) {
    if (path === prefix || path.startsWith(prefix + "/")) return key;
  }
  return null;
}

export function isModuleRoleAllowed(
  moduleRoles: Record<string, string> | null,
  pathname: string,
): boolean {
  const key = resolveModuleKey(pathname);
  if (!key) return true;
  if (moduleRoles === null) return true;
  const role = moduleRoles[key];
  if (role === undefined) return false;
  return role === "read" || role === "write";
}

export function getModuleByKey(key: string): AppModule | undefined {
  return APP_MODULES.find(m => m.key === key);
}
