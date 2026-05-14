import { useState, useEffect, useCallback, useRef } from "react";
import {
  Network, Plus, Search, RefreshCw, Trash2, Save, ArrowLeft,
  Cpu, Router, Monitor, Server, Zap, Radio, ChevronRight,
  Loader2, AlertCircle, Link2, Settings, X, GitBranch,
  Layers, Activity, ChevronDown, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ──────────────────────────────────────────────────────────────────────
type ModuleType =
  | "plc_cpu" | "io_di" | "io_do" | "io_ai" | "io_ao" | "io_mixed"
  | "power_supply" | "switch_managed" | "switch_unmanaged"
  | "hmi" | "scada_server" | "remote_io" | "gateway" | "modem" | "field_device";

interface NetworkModule {
  id: string;
  type: ModuleType;
  make: string;
  model: string;
  label: string;
  ip?: string;
  rack?: number;
  slot?: number;
  notes?: string;
}

interface NetConnection {
  id: string;
  from: string;
  to: string;
  protocol: string;
  label?: string;
}

interface Architecture {
  id: number;
  project_number?: string;
  project_name?: string;
  site_location?: string;
  architecture_name?: string;
  description?: string;
  modules: NetworkModule[];
  connections: NetConnection[];
  module_count?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface Project { code: string; name: string; label: string; status?: string; }

// ── Module catalogue ──────────────────────────────────────────────────────────
interface ModuleMeta {
  type: ModuleType;
  label: string;
  icon: typeof Cpu;
  slot: boolean;
  // Light-mode front face gradient stops
  lightFrom: string;
  lightTo: string;
  // Dark-mode front face gradient stops
  darkFrom: string;
  darkTo: string;
  // Accent color for LEDs / badges
  accent: string;
}

const MODULE_PALETTE: ModuleMeta[] = [
  { type: "plc_cpu",          label: "PLC CPU",          icon: Cpu,       slot: true,  lightFrom: "#1d4ed8", lightTo: "#2563eb", darkFrom: "#1e3a8a", darkTo: "#1d4ed8", accent: "#60a5fa" },
  { type: "power_supply",     label: "Power Supply",     icon: Zap,       slot: true,  lightFrom: "#b45309", lightTo: "#d97706", darkFrom: "#78350f", darkTo: "#b45309", accent: "#fbbf24" },
  { type: "io_di",            label: "DI Module",        icon: Layers,    slot: true,  lightFrom: "#166534", lightTo: "#16a34a", darkFrom: "#14532d", darkTo: "#166534", accent: "#4ade80" },
  { type: "io_do",            label: "DO Module",        icon: Layers,    slot: true,  lightFrom: "#065f46", lightTo: "#059669", darkFrom: "#064e3b", darkTo: "#065f46", accent: "#34d399" },
  { type: "io_ai",            label: "AI Module",        icon: Activity,  slot: true,  lightFrom: "#5b21b6", lightTo: "#7c3aed", darkFrom: "#4c1d95", darkTo: "#5b21b6", accent: "#a78bfa" },
  { type: "io_ao",            label: "AO Module",        icon: Activity,  slot: true,  lightFrom: "#6d28d9", lightTo: "#8b5cf6", darkFrom: "#581c87", darkTo: "#6d28d9", accent: "#c4b5fd" },
  { type: "io_mixed",         label: "Mixed I/O",        icon: Layers,    slot: true,  lightFrom: "#0e7490", lightTo: "#0891b2", darkFrom: "#083344", darkTo: "#0e7490", accent: "#67e8f9" },
  { type: "switch_managed",   label: "Managed Switch",   icon: Router,    slot: false, lightFrom: "#0369a1", lightTo: "#0284c7", darkFrom: "#0c4a6e", darkTo: "#0369a1", accent: "#38bdf8" },
  { type: "switch_unmanaged", label: "Unmanaged Switch", icon: Router,    slot: false, lightFrom: "#1e3a5f", lightTo: "#1e4976", darkFrom: "#172554", darkTo: "#1e3a5f", accent: "#93c5fd" },
  { type: "hmi",              label: "HMI Panel",        icon: Monitor,   slot: false, lightFrom: "#374151", lightTo: "#4b5563", darkFrom: "#1f2937", darkTo: "#374151", accent: "#e5e7eb" },
  { type: "scada_server",     label: "SCADA Server",     icon: Server,    slot: false, lightFrom: "#1f2937", lightTo: "#374151", darkFrom: "#111827", darkTo: "#1f2937", accent: "#9ca3af" },
  { type: "remote_io",        label: "Remote I/O",       icon: GitBranch, slot: true,  lightFrom: "#9a3412", lightTo: "#c2410c", darkFrom: "#7c2d12", darkTo: "#9a3412", accent: "#fb923c" },
  { type: "gateway",          label: "Gateway",          icon: Link2,     slot: false, lightFrom: "#831843", lightTo: "#9d174d", darkFrom: "#500724", darkTo: "#831843", accent: "#f9a8d4" },
  { type: "modem",            label: "Modem / Router",   icon: Radio,     slot: false, lightFrom: "#374151", lightTo: "#6b7280", darkFrom: "#1f2937", darkTo: "#374151", accent: "#d1d5db" },
  { type: "field_device",     label: "Field Device",     icon: Settings,  slot: false, lightFrom: "#3f6212", lightTo: "#4d7c0f", darkFrom: "#365314", darkTo: "#3f6212", accent: "#a3e635" },
];

const PROTOCOLS = ["PROFINET", "PROFIBUS DP", "Ethernet/IP", "Modbus TCP", "Modbus RTU", "OPC-UA", "EtherCAT", "Gigabit Ethernet", "Other"];
const MAKES_PLC = ["Siemens", "Beckhoff"];
const MAKES_SWITCH = ["Scalance (Siemens)", "Cisco", "Phoenix Contact", "Moxa", "TP-Link", "Hirschmann", "Other"];
const MAKES_HMI = ["Siemens", "Beckhoff", "Delta", "Weintek", "Pro-face", "Other"];
const MAKES_GENERIC = ["Siemens", "Beckhoff", "Phoenix Contact", "Wago", "Murr", "Turck", "Other"];

function makesFor(type: ModuleType): string[] {
  if (type === "plc_cpu" || type === "remote_io") return MAKES_PLC;
  if (type === "switch_managed" || type === "switch_unmanaged") return MAKES_SWITCH;
  if (type === "hmi") return MAKES_HMI;
  return MAKES_GENERIC;
}

function paletteMeta(type: ModuleType): ModuleMeta {
  return MODULE_PALETTE.find(p => p.type === type) || MODULE_PALETTE[0];
}

// ── Rack slot module (TIA Portal style) ───────────────────────────────────────
function RackModule({ mod, selected, onClick }: {
  mod: NetworkModule; selected: boolean; onClick: () => void;
}) {
  const meta = paletteMeta(mod.type);
  const Icon = meta.icon;

  return (
    <div
      onClick={onClick}
      title={mod.label || meta.label}
      className={cn("relative cursor-pointer select-none flex flex-col", selected && "z-10")}
      style={{ width: 68, flexShrink: 0 }}
    >
      {/* 3D top bevel */}
      <div style={{
        height: 7,
        marginLeft: 5,
        marginRight: -5,
        background: "linear-gradient(135deg, #c8cdd6 0%, #9aa0ad 100%)",
        borderRadius: "3px 3px 0 0",
        transform: "skewX(-45deg)",
        boxShadow: "0 -1px 0 rgba(255,255,255,0.6) inset",
      }} />
      {/* 3D right bevel */}
      <div style={{
        position: "absolute",
        top: 0,
        right: -5,
        bottom: 0,
        width: 5,
        background: "linear-gradient(180deg, #7a8290 0%, #4b5360 100%)",
      }} />
      {/* Front face */}
      <div
        className={cn("relative flex flex-col overflow-hidden", selected && "ring-2 ring-white ring-offset-0")}
        style={{
          height: 148,
          borderRadius: "2px 0 2px 2px",
          background: `linear-gradient(175deg, ${meta.lightFrom} 0%, ${meta.lightTo} 100%)`,
          border: "1px solid rgba(0,0,0,0.25)",
          borderTop: "1px solid rgba(255,255,255,0.18)",
          boxShadow: selected
            ? `0 0 0 2px white, inset 0 1px 0 rgba(255,255,255,0.2), 0 6px 20px rgba(0,0,0,0.4)`
            : `inset 0 1px 0 rgba(255,255,255,0.15), 0 3px 10px rgba(0,0,0,0.35)`,
        }}
      >
        {/* Status LEDs */}
        <div className="flex gap-1 px-1.5 pt-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: meta.accent, boxShadow: `0 0 6px ${meta.accent}` }} />
          <div className="w-2 h-2 rounded-full bg-amber-400 opacity-30" />
        </div>
        {/* Ventilation slots */}
        <div className="flex flex-col gap-0.5 px-1 mt-1">
          {[0,1,2,3].map(i => (
            <div key={i} className="h-px rounded" style={{ background: "rgba(255,255,255,0.12)" }} />
          ))}
        </div>
        {/* Icon area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-1 px-1">
          <div className="w-8 h-8 rounded flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.4)" }}>
            <Icon size={15} color="white" />
          </div>
          <p className="text-[8px] font-bold text-white text-center leading-tight px-0.5 truncate w-full">
            {mod.label || meta.label}
          </p>
        </div>
        {/* IP */}
        {mod.ip && <p className="text-[7px] text-white/50 text-center px-1 pb-0.5 font-mono truncate">{mod.ip}</p>}
        {/* Bottom connector strip */}
        <div className="flex justify-around pb-1.5 px-1">
          {[0,1,2].map(i => (
            <div key={i} className="w-2.5 h-2 rounded-sm" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.6)" }} />
          ))}
        </div>
        {/* Embossed type label at bottom */}
        <div style={{ background: "rgba(0,0,0,0.3)", borderTop: "1px solid rgba(0,0,0,0.3)" }}>
          <p className="text-[7px] font-mono text-white/40 text-center py-0.5 truncate px-1">{meta.label.replace(" Module","").replace("Unmanaged ","").replace("Managed ","")}</p>
        </div>
      </div>
    </div>
  );
}

// ── Network device (switch, HMI, etc.) ───────────────────────────────────────
function NetDevice({ mod, selected, onClick }: {
  mod: NetworkModule; selected: boolean; onClick: () => void;
}) {
  const meta = paletteMeta(mod.type);
  const Icon = meta.icon;

  return (
    <div onClick={onClick} className={cn("relative cursor-pointer select-none", selected && "z-10")} style={{ width: 130 }}>
      {/* 3D top bevel */}
      <div style={{
        height: 8, marginLeft: 8, marginRight: -8,
        background: "linear-gradient(135deg, #c8cdd6 0%, #8a9099 100%)",
        borderRadius: "4px 4px 0 0",
        transform: "skewX(-30deg)",
        boxShadow: "0 -1px 0 rgba(255,255,255,0.5) inset",
      }} />
      {/* 3D right bevel */}
      <div style={{
        position: "absolute", top: 0, right: -8, bottom: 0, width: 8,
        background: "linear-gradient(180deg, #6b7280 0%, #1f2937 100%)",
        borderRadius: "0 4px 4px 0",
      }} />
      {/* Front face */}
      <div
        className={cn("relative rounded-sm overflow-hidden", selected && "ring-2 ring-white")}
        style={{
          background: `linear-gradient(160deg, ${meta.lightFrom} 0%, ${meta.lightTo} 100%)`,
          border: "1px solid rgba(0,0,0,0.3)",
          borderTop: "1px solid rgba(255,255,255,0.2)",
          boxShadow: selected
            ? `0 0 0 2px white, inset 0 1px 0 rgba(255,255,255,0.2), 0 8px 24px rgba(0,0,0,0.5)`
            : `inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 16px rgba(0,0,0,0.4)`,
        }}
      >
        {/* Status bar */}
        <div className="flex items-center justify-between px-2 py-1.5" style={{ background: "rgba(0,0,0,0.2)", borderBottom: "1px solid rgba(0,0,0,0.25)" }}>
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: meta.accent, boxShadow: `0 0 5px ${meta.accent}` }} />
            <div className="w-2 h-2 rounded-full bg-amber-400 opacity-25" />
          </div>
          <p className="text-[7px] font-mono text-white/35 uppercase tracking-wider">{meta.label.slice(0,8)}</p>
        </div>

        {/* Body */}
        <div className="flex flex-col items-center py-3 gap-1.5">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "inset 0 2px 5px rgba(0,0,0,0.5)" }}>
            <Icon size={22} color="white" />
          </div>
          <p className="text-[10px] font-bold text-white text-center leading-tight max-w-[110px] px-2 truncate">{mod.label || meta.label}</p>
          {mod.make && <p className="text-[8px] text-white/50 truncate max-w-[110px]">{mod.make} {mod.model}</p>}
          {mod.ip && <p className="text-[8px] font-mono text-white/40 truncate">{mod.ip}</p>}
        </div>

        {/* Port strip for switches */}
        {(mod.type === "switch_managed" || mod.type === "switch_unmanaged") && (
          <div className="flex justify-center gap-0.5 pb-2 px-2">
            {[0,1,2,3,4,5,6,7].map(i => (
              <div key={i} className="w-2.5 h-1.5 rounded-sm" style={{ background: i < 2 ? "#22c55e" : "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.08)" }} />
            ))}
          </div>
        )}

        {/* Display screen for HMI */}
        {mod.type === "hmi" && (
          <div className="mx-2 mb-2 rounded" style={{ height: 28, background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="w-3/4 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          </div>
        )}

        {/* Type badge */}
        <div style={{ background: "rgba(0,0,0,0.25)", borderTop: "1px solid rgba(0,0,0,0.25)" }}>
          <p className="text-[7px] font-mono text-white/35 text-center py-0.5 tracking-wider">{meta.label.toUpperCase()}</p>
        </div>
      </div>
    </div>
  );
}

// ── Rack view ─────────────────────────────────────────────────────────────────
function RackView({ modules, selected, onSelect }: {
  modules: NetworkModule[]; selected: string | null; onSelect: (id: string) => void;
}) {
  const rackModules = modules.filter(m => paletteMeta(m.type).slot);
  if (!rackModules.length) return null;

  const racks: Record<number, NetworkModule[]> = {};
  rackModules.forEach(m => {
    const r = m.rack ?? 0;
    if (!racks[r]) racks[r] = [];
    racks[r].push(m);
    racks[r].sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
  });

  return (
    <div className="mb-8">
      <p className="text-xs font-bold text-gray-500 dark:text-white/50 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Layers size={12} /> Rack-Mounted Modules
      </p>
      {Object.entries(racks).map(([rack, mods]) => (
        <div key={rack} className="mb-5">
          {Object.keys(racks).length > 1 && (
            <p className="text-[10px] text-gray-400 dark:text-white/40 mb-2">Rack {rack}</p>
          )}
          {/* Rail housing */}
          <div className="relative rounded-xl p-4 overflow-x-auto"
            style={{
              background: "linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 50%, #94a3b8 100%)",
              boxShadow: "inset 0 2px 6px rgba(0,0,0,0.25), 0 4px 20px rgba(0,0,0,0.15)",
              border: "1px solid #94a3b8",
            }}
            data-dark="true"
          >
            {/* DIN rail bar */}
            <div className="absolute inset-x-4 top-6 h-2 rounded"
              style={{ background: "linear-gradient(180deg, #94a3b8 0%, #475569 50%, #64748b 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 3px rgba(0,0,0,0.4)" }} />
            {/* Bottom cable duct */}
            <div className="absolute inset-x-4 bottom-3 h-3 rounded"
              style={{ background: "linear-gradient(180deg, #94a3b8 0%, #64748b 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)" }} />
            {/* Modules */}
            <div className="flex gap-1.5 items-end pt-5 pb-5 min-w-max">
              {mods.map((m, i) => (
                <div key={m.id} className="flex flex-col items-center gap-1">
                  <RackModule mod={m} selected={selected === m.id} onClick={() => onSelect(m.id)} />
                  <p className="text-[8px] text-gray-500 font-mono">{m.slot !== undefined ? m.slot : i}</p>
                </div>
              ))}
              {/* Empty slots */}
              {Array.from({ length: Math.max(0, 16 - mods.length) }).map((_, i) => (
                <div key={`empty-${i}`}
                  style={{ width: 68, height: 148, flexShrink: 0, background: "rgba(0,0,0,0.08)", border: "1px dashed rgba(0,0,0,0.12)", borderRadius: 2 }} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Connection line legend ─────────────────────────────────────────────────────
function ConnectionBadge({ conn, modules, onDelete }: {
  conn: NetConnection; modules: NetworkModule[]; onDelete: () => void;
}) {
  const from = modules.find(m => m.id === conn.from);
  const to   = modules.find(m => m.id === conn.to);
  return (
    <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 group">
      <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-white/60 min-w-0">
        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
        <span className="truncate font-medium">{from?.label || from?.model || "?"}</span>
        <div className="flex-1 h-px bg-gray-300 dark:bg-white/20 min-w-[12px] max-w-[24px]" />
        <span className="text-[10px] text-gray-500 dark:text-white/40 shrink-0 font-mono">{conn.protocol}</span>
        <div className="flex-1 h-px bg-gray-300 dark:bg-white/20 min-w-[12px] max-w-[24px]" />
        <span className="truncate font-medium">{to?.label || to?.model || "?"}</span>
        <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
      </div>
      <button onClick={onDelete} className="ml-auto text-gray-300 dark:text-white/20 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <X size={11} />
      </button>
    </div>
  );
}

// ── Network topology ──────────────────────────────────────────────────────────
function NetworkView({ modules, connections, selected, onSelect }: {
  modules: NetworkModule[]; connections: NetConnection[]; selected: string | null; onSelect: (id: string) => void;
}) {
  const netModules = modules.filter(m => !paletteMeta(m.type).slot);
  if (!netModules.length) return null;
  return (
    <div className="mb-8">
      <p className="text-xs font-bold text-gray-500 dark:text-white/50 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Network size={12} /> Network Topology
      </p>
      <div className="relative p-6 rounded-xl border border-dashed border-gray-300 dark:border-white/10"
        style={{ background: "linear-gradient(135deg, rgba(248,250,252,0.8) 0%, rgba(241,245,249,0.8) 100%)" }}>
        <div className="flex flex-wrap gap-6 items-start">
          {netModules.map(m => (
            <NetDevice key={m.id} mod={m} selected={selected === m.id} onClick={() => onSelect(m.id)} />
          ))}
        </div>
        {/* Connection lines overlay as badges */}
      </div>
    </div>
  );
}

// ── Module properties panel ───────────────────────────────────────────────────
function ModulePanel({ mod, modules, connections, onChange, onDelete, onAddConnection, onDeleteConnection }: {
  mod: NetworkModule;
  modules: NetworkModule[];
  connections: NetConnection[];
  onChange: (m: NetworkModule) => void;
  onDelete: () => void;
  onAddConnection: () => void;
  onDeleteConnection: (id: string) => void;
}) {
  const meta = paletteMeta(mod.type);
  const myConns = connections.filter(c => c.from === mod.id || c.to === mod.id);

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-gray-200 dark:border-white/8 sticky top-0 bg-gray-50 dark:bg-slate-800 z-10">
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{meta.label}</p>
          <p className="text-[10px] text-gray-400 dark:text-white/30 font-mono">{mod.id.slice(0, 8)}</p>
        </div>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {([
          { label: "Label",    key: "label" as keyof NetworkModule, placeholder: "e.g. CPU 1215C" },
          { label: "Make",     key: "make"  as keyof NetworkModule, options: makesFor(mod.type) },
          { label: "Model",    key: "model" as keyof NetworkModule, placeholder: "e.g. 6ES7 215-1AG40" },
          { label: "IP Address",key: "ip"  as keyof NetworkModule, placeholder: "e.g. 192.168.0.1" },
          { label: "Notes",    key: "notes" as keyof NetworkModule, placeholder: "Any notes…" },
        ] as { label: string; key: keyof NetworkModule; placeholder?: string; options?: string[] }[]).map(f => (
          <div key={f.key as string}>
            <label className="text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider block mb-1">{f.label}</label>
            {f.options ? (
              <select value={(mod[f.key] || "") as string} onChange={e => onChange({ ...mod, [f.key]: e.target.value })}
                className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400">
                <option value="">— Select —</option>
                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input value={(mod[f.key] || "") as string} onChange={e => onChange({ ...mod, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-white/20 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400" />
            )}
          </div>
        ))}

        {meta.slot && (
          <div className="grid grid-cols-2 gap-2">
            {([{ label: "Rack", key: "rack" }, { label: "Slot", key: "slot" }] as { label: string; key: "rack" | "slot" }[]).map(f => (
              <div key={f.key}>
                <label className="text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider block mb-1">{f.label}</label>
                <input type="number" min={0} value={mod[f.key] ?? 0} onChange={e => onChange({ ...mod, [f.key]: Number(e.target.value) })}
                  className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" />
              </div>
            ))}
          </div>
        )}

        {/* Connections */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider">Connections</label>
            <button onClick={onAddConnection} className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5">
              <Plus size={10} /> Add
            </button>
          </div>
          {myConns.length === 0 ? (
            <p className="text-[10px] text-gray-300 dark:text-white/20">No connections</p>
          ) : (
            <div className="space-y-1">
              {myConns.map(c => {
                const otherId = c.from === mod.id ? c.to : c.from;
                const other = modules.find(m => m.id === otherId);
                return (
                  <div key={c.id} className="flex items-center gap-1.5 text-[10px] text-gray-600 dark:text-white/50 bg-gray-100 dark:bg-white/5 rounded-lg px-2 py-1.5 group">
                    <Link2 size={9} className="text-blue-500 shrink-0" />
                    <span className="truncate">{other?.label || other?.model || "Unknown"}</span>
                    <span className="text-gray-400 dark:text-white/25 mx-0.5">·</span>
                    <span className="text-gray-400 dark:text-white/30 font-mono">{c.protocol}</span>
                    <button onClick={() => onDeleteConnection(c.id)} className="ml-auto text-gray-300 dark:text-white/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={9} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Connection dialog ─────────────────────────────────────────────────────────
function AddConnectionDialog({ fromId, modules, onAdd, onClose }: {
  fromId: string; modules: NetworkModule[];
  onAdd: (c: NetConnection) => void; onClose: () => void;
}) {
  const [toId, setToId] = useState("");
  const [protocol, setProtocol] = useState("PROFINET");
  const others = modules.filter(m => m.id !== fromId);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-2xl p-6 w-80 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Add Connection</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><X size={14} /></button>
        </div>
        <div className="space-y-3">
          {[
            { label: "Connect To", el: (
              <select value={toId} onChange={e => setToId(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500">
                <option value="">— Select Module —</option>
                {others.map(m => <option key={m.id} value={m.id}>{m.label || m.model || paletteMeta(m.type).label}</option>)}
              </select>
            )},
            { label: "Protocol", el: (
              <select value={protocol} onChange={e => setProtocol(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500">
                {PROTOCOLS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )},
          ].map(f => (
            <div key={f.label}>
              <label className="text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider block mb-1">{f.label}</label>
              {f.el}
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-gray-300 dark:border-white/10 text-sm text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5">Cancel</button>
          <button disabled={!toId} onClick={() => { if (!toId) return; onAdd({ id: crypto.randomUUID(), from: fromId, to: toId, protocol, label: "" }); onClose(); }}
            className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm text-white font-semibold disabled:opacity-40">Add</button>
        </div>
      </div>
    </div>
  );
}

// ── ERP Project picker ────────────────────────────────────────────────────────
function ErpPicker({ value, onChange }: { value: string; onChange: (p: Project) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [q, setQ] = useState(value || "");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { fetch(`${BASE}/api/workshop/erp-projects`).then(r => r.json()).then(d => setProjects(d.projects ?? [])).catch(() => {}); }, []);
  useEffect(() => { setQ(value || ""); }, [value]);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const filtered = q.trim() ? projects.filter(p => p.label.toLowerCase().includes(q.toLowerCase())) : projects;
  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center border border-gray-300 dark:border-white/10 rounded-lg overflow-hidden focus-within:border-blue-500 dark:focus-within:border-blue-400 bg-white dark:bg-white/5">
        <input className="flex-1 px-3 py-2 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30"
          placeholder="Search ERP project…" value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); onChange({ code: "", name: e.target.value, label: e.target.value }); }}
          onFocus={() => setOpen(true)} />
        <button type="button" onClick={() => setOpen(v => !v)} className="px-3 text-gray-400"><ChevronDown size={14} /></button>
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-[60] mt-1 w-full max-h-56 overflow-y-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl">
          {filtered.map(p => (
            <button key={p.code} type="button"
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 dark:hover:bg-white/10 border-b border-gray-50 dark:border-white/5 last:border-0 flex items-center gap-2"
              onClick={() => { onChange(p); setQ(p.label); setOpen(false); }}>
              <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold shrink-0">{p.code}</span>
              <span className="text-gray-800 dark:text-white/80 truncate">{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PLCNetworkArchitecture() {
  const { user } = useAuth();
  const userName = (user as any)?.fullName || (user as any)?.email || "";

  const [architectures, setArchitectures] = useState<Architecture[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Architecture | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Builder fields
  const [projNumber, setProjNumber] = useState("");
  const [projName, setProjName] = useState("");
  const [siteLocation, setSiteLocation] = useState("");
  const [archName, setArchName] = useState("");
  const [description, setDescription] = useState("");
  const [modules, setModules] = useState<NetworkModule[]>([]);
  const [connections, setConnections] = useState<NetConnection[]>([]);
  const [selectedModId, setSelectedModId] = useState<string | null>(null);
  const [showConnDialog, setShowConnDialog] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const q = search.trim() ? `?search=${encodeURIComponent(search)}` : "";
      const r = await fetch(`${BASE}/api/plc/network-architectures${q}`);
      setArchitectures((await r.json()).data || []);
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchList(); }, [fetchList]);

  function openNew() {
    setProjNumber(""); setProjName(""); setSiteLocation(""); setArchName(""); setDescription("");
    setModules([]); setConnections([]); setSelectedModId(null);
    setSelected(null); setIsNew(true); setError(""); setSaved(false);
  }

  async function openEdit(a: Architecture) {
    setSelected(a); setIsNew(false); setError(""); setSaved(false);
    setProjNumber(a.project_number || ""); setProjName(a.project_name || "");
    setSiteLocation(a.site_location || ""); setArchName(a.architecture_name || "");
    setDescription(a.description || "");
    setModules([]); setConnections([]); setSelectedModId(null);
    try {
      const r = await fetch(`${BASE}/api/plc/network-architectures/${a.id}`);
      const full: Architecture = await r.json();
      setModules(Array.isArray(full.modules) ? full.modules : []);
      setConnections(Array.isArray(full.connections) ? full.connections : []);
    } catch { /* keep empty */ }
  }

  function closeDetail() { setSelected(null); setIsNew(false); setError(""); setSaved(false); }

  async function handleSave() {
    setSaving(true); setError(""); setSaved(false);
    try {
      const body = {
        project_number: projNumber || null, project_name: projName || null,
        site_location: siteLocation || null, architecture_name: archName || null,
        description: description || null, modules, connections,
        created_by: isNew ? userName : undefined,
      };
      const url = isNew
        ? `${BASE}/api/plc/network-architectures`
        : `${BASE}/api/plc/network-architectures/${selected!.id}`;
      const r = await fetch(url, { method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      const saved = await r.json();
      setSelected(saved);
      setIsNew(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await fetchList();
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this network architecture?")) return;
    await fetch(`${BASE}/api/plc/network-architectures/${id}`, { method: "DELETE" });
    await fetchList(); closeDetail();
  }

  function addModule(type: ModuleType) {
    const meta = paletteMeta(type);
    const sameRack0 = modules.filter(m => paletteMeta(m.type).slot && (m.rack ?? 0) === 0);
    const newMod: NetworkModule = {
      id: crypto.randomUUID(), type, make: "", model: "", label: meta.label,
      rack: 0, slot: sameRack0.length,
    };
    setModules(prev => [...prev, newMod]);
    setSelectedModId(newMod.id);
  }

  const selectedMod = modules.find(m => m.id === selectedModId) ?? null;
  const inDetail = isNew || selected !== null;

  return (
    <Layout>
      <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-900">

        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <div className="flex-none bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {inDetail && (
                <button onClick={closeDetail} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-white/50 hover:text-gray-800 dark:hover:text-white transition-colors">
                  <ArrowLeft size={16} />
                </button>
              )}
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <Network size={17} className="text-blue-700 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900 dark:text-white">Network Architecture</h1>
                <p className="text-xs text-gray-500 dark:text-white/40">
                  {inDetail
                    ? (isNew ? "New Architecture" : archName || projName || `#${selected?.id}`)
                    : `${architectures.length} architecture${architectures.length !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!inDetail && (
                <>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchList()}
                      placeholder="Search…"
                      className="pl-8 pr-3 py-2 text-sm text-gray-800 dark:text-white placeholder-gray-400 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 focus:outline-none focus:border-blue-500 w-48" />
                  </div>
                  <button onClick={fetchList} className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-500 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-blue-600 transition-colors">
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  </button>
                  <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
                    <Plus size={14} /> New Architecture
                  </button>
                </>
              )}
              {inDetail && (
                <>
                  {saved && (
                    <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
                      <Check size={14} /> Saved
                    </span>
                  )}
                  {!isNew && selected && (
                    <button onClick={() => handleDelete(selected.id)} disabled={saving}
                      className="flex items-center gap-2 px-3 py-2 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-sm font-medium transition-colors">
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors">
                    <Save size={14} /> {saving ? "Saving…" : "Save"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-3 flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 rounded-lg text-sm text-red-700 dark:text-red-300">
            <AlertCircle size={14} className="flex-none" /> {error}
          </div>
        )}

        {/* ── List view ───────────────────────────────────────────────────── */}
        {!inDetail && (
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex justify-center items-center h-40 text-gray-400 dark:text-white/30">
                <Loader2 size={22} className="animate-spin mr-2" /> Loading…
              </div>
            ) : architectures.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-gray-400 dark:text-white/30">
                <Network size={48} className="mb-4 opacity-30" />
                <p className="text-sm">No network architectures yet</p>
                <button onClick={openNew} className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
                  <Plus size={14} /> Create First Architecture
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                      {["#", "Architecture", "Project", "Site", "Modules", "Updated"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {architectures.map((a, i) => (
                      <tr key={a.id} onClick={() => openEdit(a)}
                        className="border-b border-gray-100 dark:border-slate-700/60 last:border-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors group">
                        <td className="px-4 py-3 text-xs text-gray-400 dark:text-white/25 font-mono">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                              <Network size={13} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">{a.architecture_name || "Unnamed"}</p>
                              {a.description && <p className="text-[11px] text-gray-400 dark:text-white/35 truncate max-w-[200px]">{a.description}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-gray-700 dark:text-white/70">{a.project_name || "—"}</p>
                          {a.project_number && <p className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">{a.project_number}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-white/45">{a.site_location || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-semibold">
                            {a.module_count ?? 0} modules
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 dark:text-white/30">
                          {a.updated_at ? new Date(a.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Builder view ─────────────────────────────────────────────────── */}
        {inDetail && (
          <div className="flex flex-1 overflow-hidden">

            {/* Left: palette */}
            <div className="w-48 flex-none border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto">
              <div className="p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-white/30 mb-3">Add Module</p>
                <div className="space-y-0.5">
                  {MODULE_PALETTE.map(meta => {
                    const Icon = meta.icon;
                    return (
                      <button key={meta.type} onClick={() => addModule(meta.type)}
                        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/8 hover:text-gray-900 dark:hover:text-white transition-colors text-left">
                        <div className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                          style={{ background: `linear-gradient(135deg, ${meta.lightFrom}, ${meta.lightTo})` }}>
                          <Icon size={12} color="white" />
                        </div>
                        <span>{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Center: canvas */}
            <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-slate-900">
              {/* Project info */}
              <div className="mb-6 grid grid-cols-2 gap-4 max-w-2xl">
                {[
                  { label: "Architecture Name", val: archName, set: setArchName, placeholder: "e.g. Main Panel Network" },
                  { label: "Site Location",      val: siteLocation, set: setSiteLocation, placeholder: "e.g. Vadodara Plant" },
                ].map(f => (
                  <div key={f.label}>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-white/40 block mb-1">{f.label}</label>
                    <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/20 focus:outline-none focus:border-blue-500" />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-white/40 block mb-1">ERP Project</label>
                  <ErpPicker value={projNumber ? `${projNumber} - ${projName}` : projName} onChange={p => { setProjNumber(p.code); setProjName(p.name); }} />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-white/40 block mb-1">Description</label>
                  <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief architecture description…"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/20 focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              {modules.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-52 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700">
                  <Network size={40} className="mb-3 text-gray-300 dark:text-white/15" />
                  <p className="text-sm text-gray-400 dark:text-white/25">Select modules from the left panel to build the architecture</p>
                </div>
              ) : (
                <>
                  <RackView modules={modules} selected={selectedModId} onSelect={setSelectedModId} />
                  <NetworkView modules={modules} connections={connections} selected={selectedModId} onSelect={setSelectedModId} />
                  {/* Connection list */}
                  {connections.length > 0 && (
                    <div className="mt-6">
                      <p className="text-xs font-bold text-gray-500 dark:text-white/50 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Link2 size={12} /> Connections
                      </p>
                      <div className="grid grid-cols-1 gap-1.5 max-w-xl">
                        {connections.map(c => (
                          <ConnectionBadge key={c.id} conn={c} modules={modules} onDelete={() => setConnections(prev => prev.filter(x => x.id !== c.id))} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right: properties */}
            <div className="w-56 flex-none border-l border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden flex flex-col">
              {selectedMod ? (
                <ModulePanel
                  mod={selectedMod}
                  modules={modules}
                  connections={connections}
                  onChange={m => setModules(prev => prev.map(x => x.id === m.id ? m : x))}
                  onDelete={() => { setModules(prev => prev.filter(x => x.id !== selectedMod.id)); setConnections(prev => prev.filter(c => c.from !== selectedMod.id && c.to !== selectedMod.id)); setSelectedModId(null); }}
                  onAddConnection={() => setShowConnDialog(true)}
                  onDeleteConnection={id => setConnections(prev => prev.filter(c => c.id !== id))}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <Settings size={28} className="mb-3 text-gray-300 dark:text-white/15" />
                  <p className="text-xs text-gray-400 dark:text-white/25">Click any module to edit its properties</p>
                </div>
              )}
            </div>
          </div>
        )}

        {showConnDialog && selectedModId && (
          <AddConnectionDialog
            fromId={selectedModId} modules={modules}
            onAdd={c => setConnections(prev => [...prev, c])}
            onClose={() => setShowConnDialog(false)}
          />
        )}
      </div>
    </Layout>
  );
}
