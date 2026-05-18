import type { ElementType } from "react";
import type { AppModule } from "./appModules";
import { navMetaForPath } from "./appNavMeta";

export interface NavItem {
  path: string;
  label: string;
  icon: ElementType;
  color?: string;
  bgColor?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Build sidebar groups from active APP_MODULES only (single source of truth). */
export function buildNavGroups(modules: AppModule[]): NavGroup[] {
  const byGroup = new Map<string, NavItem[]>();

  for (const mod of modules) {
    const path = mod.paths[0];
    if (!path) continue;
    const meta = navMetaForPath(path);
    const item: NavItem = {
      path,
      label: mod.label,
      icon: meta.icon,
      color: meta.color,
      bgColor: meta.bgColor,
    };
    const list = byGroup.get(mod.group) ?? [];
    if (!list.some(i => i.path === path)) list.push(item);
    byGroup.set(mod.group, list);
  }

  const order = [
    "Shortcuts",
    "Work",
    "Main",
    "IP Call Logs",
    "Projects",
    "Project Management",
    "Design & Engineering",
    "Procurement",
    "Communication",
    "Proposal",
    "Marketing & CRM",
    "HR",
    "Workshop",
    "O&M",
    "PLC & Automation",
    "Monitoring",
    "Executive",
    "Admin",
    "Operations",
  ];

  const groups: NavGroup[] = [];
  for (const label of order) {
    const items = byGroup.get(label);
    if (items?.length) groups.push({ label, items });
  }
  for (const [label, items] of byGroup) {
    if (!order.includes(label) && items.length) groups.push({ label, items });
  }
  return groups;
}

/** Paths for search / launcher from active modules. */
export function installedPathsFromModules(modules: AppModule[]): Set<string> {
  const paths = new Set<string>();
  for (const m of modules) {
    for (const p of m.paths) paths.add(p);
  }
  return paths;
}
