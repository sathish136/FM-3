/**
 * Modules turned off for this deployment.
 * Add a module key here to hide it from nav, search, and user-management permissions.
 */
export const DISABLED_MODULE_KEYS = new Set<string>([
  // PLC & Automation
  "plc-device-config",
  "plc-site-calls",
  "plc-service-reports",
  "plc-programs",
  "plc-hmi-programs",
  "plc-pid-design",
  "plc-instruments",
  "plc-tags",
  "plc-panel-inspection",
  "plc-support-tickets",
  "plc-network-architecture",
  // O&M
  "om-chemical-consumption",
  "om-lab-reports",
  "om-site-performance",
  // IP call sub-logs (parent ip-call-logs stays)
  "ip-call-logs-hr",
  "ip-call-logs-project",
  "ip-call-logs-purchase",
  "ip-call-logs-marketing",
  // Monitoring / ops extras
  "plant-overview",
  "site-db-system",
  "cctv",
  "gallery",
  // Core extras
  "team-pulse",
  "team-reporting",
  // Marketing extras
  "campaigns",
  "vc-card-scanner",
  // Other
  "logistics-dashboard",
  "agent-management",
  "project-insights",
  "speech-translator",
  "translator",
  "viewer-options",
  "sheets",
  "chat",
]);

export function isModuleEnabled(key: string): boolean {
  return !DISABLED_MODULE_KEYS.has(key);
}
