import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Loader2, RefreshCw, ArrowLeft, ExternalLink,
  Calculator, Save, Edit2, X, FileText, TrendingUp,
  Wrench, Cpu, Droplets, Zap, Wind, Filter, Settings2, Package,
  IndianRupee, DollarSign, Euro, ChevronLeft, ChevronRight,
  AlertCircle,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const ERP_BASE = "https://erp.wttint.com";

// ── Formatters ───────────────────────────────────────────────────────────────
function inr(v: unknown) {
  const n = Number(v);
  if (v === null || v === undefined || v === "" || isNaN(n)) return "—";
  return "₹ " + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
function fmtEur(v: unknown) {
  const n = Number(v);
  if (v === null || v === undefined || v === "" || isNaN(n)) return "—";
  return "€ " + n.toLocaleString("en-DE", { maximumFractionDigits: 0 });
}
function fmtUsd(v: unknown) {
  const n = Number(v);
  if (v === null || v === undefined || v === "" || isNaN(n)) return "—";
  return "$ " + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtQty(v: unknown) {
  const n = Number(v);
  if (!v && v !== 0) return "—";
  return isNaN(n) || n === 0 ? "—" : n;
}

// ── Types ────────────────────────────────────────────────────────────────────
interface ListItem {
  name: string;
  project?: string;
  project_name?: string;
  flow?: number;
  revision?: string;
  usd?: number;
  eur?: number;
  modified?: string;
  docstatus?: number;
}

interface ErpDoc extends Record<string, unknown> {
  name: string;
  project?: string;
  project_name?: string;
  project_startup_sheet?: string;
  flow?: number;
  revision?: string;
  usd?: number;
  eur?: number;
  docstatus?: number;
  standard__cost?: number;
  overall_cost?: number;
  standard__cost2?: number;
  overall_cost2?: number;
  standard__cost3?: number;
  overall_cost3?: number;
  standard_cost?: AnyItem[];
  pre_treatment_table?: AnyItem[];
  pre_treatment_full_system?: AnyItem[];
  mf_table?: AnyItem[];
  mf_electrical_items?: AnyItem[];
  mbr_koch_table?: AnyItem[];
  mbr_electrical_items?: AnyItem[];
  mbro_full_system?: AnyItem[];
  mbr_ovivo_table?: AnyItem[];
  ovivo_electrical_items?: AnyItem[];
  cts_items?: AnyItem[];
  cts_full_system?: AnyItem[];
  cts_electrical_items?: AnyItem[];
  mbr_cts_table?: AnyItem[];
  mbr_cts_full_system?: AnyItem[];
  mbr_cts_electrical_items?: AnyItem[];
  dgt_items?: AnyItem[];
  dgt_full_system?: AnyItem[];
  dgt_electrical_items?: AnyItem[];
  plc_table_list?: AnyItem[];
  bio_all_items?: AnyItem[];
  bio_full_system?: AnyItem[];
  bio_electrical_items?: AnyItem[];
  cts_tars_system_items?: AnyItem[];
  cts_tars_electrical_items?: AnyItem[];
  margin_table?: AnyItem[];
}

type AnyItem = Record<string, unknown>;

// ── Tab definitions ──────────────────────────────────────────────────────────
interface SystemTabDef {
  id: string;
  label: string;
  icon: React.ElementType;
  mainTable: keyof ErpDoc;
  subTable?: keyof ErpDoc;
  electricalTable?: keyof ErpDoc;
  baseCostField?: keyof ErpDoc;
  electricalField?: keyof ErpDoc;
  totalCostField?: keyof ErpDoc;
}

const SYSTEM_TABS: SystemTabDef[] = [
  { id: "pre_treatment", label: "Pre Treatment", icon: Settings2,
    mainTable: "pre_treatment_table", subTable: "pre_treatment_full_system" },
  { id: "mf", label: "MF", icon: Filter,
    mainTable: "mf_table", electricalTable: "mf_electrical_items",
    baseCostField: "total_mf_cost", electricalField: "mf_electrical_cost", totalCostField: "total_cost_for_mf" },
  { id: "mbr_k", label: "MBR(K)", icon: Droplets,
    mainTable: "mbr_koch_table", electricalTable: "mbr_electrical_items",
    baseCostField: "mbr_overall_cost", totalCostField: "total_cost_for_mbrk" },
  { id: "mbr_o", label: "MBR(O)", icon: Droplets,
    mainTable: "mbro_full_system", subTable: "mbr_ovivo_table", electricalTable: "ovivo_electrical_items",
    baseCostField: "overall_mbr_ovivo_cost", electricalField: "ovivo_electrical_cost", totalCostField: "total_cost_for_mbro" },
  { id: "cts", label: "CTS", icon: Package,
    mainTable: "cts_items", subTable: "cts_full_system", electricalTable: "cts_electrical_items",
    baseCostField: "cts_overall_cost", electricalField: "cts_electrical_cost", totalCostField: "total_cost_for_cts" },
  { id: "cts_mbr", label: "CTS MBR", icon: Package,
    mainTable: "mbr_cts_table", subTable: "mbr_cts_full_system", electricalTable: "mbr_cts_electrical_items",
    baseCostField: "overall_mbr_cts_cost", electricalField: "mbr_cts_electrical_cost", totalCostField: "total_cost_for_mbr_cts" },
  { id: "degasser", label: "Degasser", icon: Wind,
    mainTable: "dgt_items", subTable: "dgt_full_system", electricalTable: "dgt_electrical_items",
    baseCostField: "dgt_overall_cost", electricalField: "dgt_electrical_cost", totalCostField: "total_cost_for_degasser" },
  { id: "plc", label: "PLC Items", icon: Cpu,
    mainTable: "plc_table_list",
    baseCostField: "plc_base_total", totalCostField: "total_cost_for_plc" },
  { id: "bio", label: "Bio / AN", icon: Wrench,
    mainTable: "bio_all_items", subTable: "bio_full_system", electricalTable: "bio_electrical_items",
    baseCostField: "overall_bio_cost", electricalField: "bio_electrical_cost", totalCostField: "total_cost_for_bio" },
  { id: "cts_tars", label: "CTS TARS", icon: Zap,
    mainTable: "cts_tars_system_items", electricalTable: "cts_tars_electrical_items",
    totalCostField: "total_cost_for_cts_cooling_tower" },
  { id: "margin", label: "Margin", icon: TrendingUp,
    mainTable: "margin_table" },
];

// ── Primitives ───────────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{children}</span>;
}

function StatusBadge({ docstatus }: { docstatus?: number }) {
  if (docstatus === 1) return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-100 text-green-700 border border-green-200">Submitted</span>;
  if (docstatus === 2) return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700 border border-red-200">Cancelled</span>;
  return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-200">Draft</span>;
}

function CostCard({ label, value, sub, accent = false }: { label: string; value: unknown; sub?: string; accent?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-0.5 px-4 py-3 rounded-xl border", accent ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200")}>
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      <span className={cn("text-sm font-bold font-mono", accent ? "text-blue-700" : "text-gray-800")}>{inr(value)}</span>
      {sub && <span className="text-[10px] text-gray-400">{sub}</span>}
    </div>
  );
}

// ── Items Tables ─────────────────────────────────────────────────────────────
function EquipmentTable({ items, title }: { items: AnyItem[]; title?: string }) {
  const total = items.reduce((s, r) => s + (Number(r.total_price) || 0), 0);
  return (
    <div>
      {title && <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">{title} <span className="font-normal text-gray-400">({items.length})</span></div>}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["#","Item Description","Renamed / Spec","Flow","kW","Working","Standby","S/Standby","Unit Price (₹)","Total Price (₹)"].map(h => (
                <th key={h} className={cn("px-2.5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide",
                  h.includes("Price") || h === "Flow" || h === "kW" || h === "Working" || h === "Standby" || h === "S/Standby" ? "text-right" : "text-left"
                )}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, i) => (
              <tr key={i} className="hover:bg-blue-50/40 transition-colors">
                <td className="px-2.5 py-2 text-gray-400">{String(item.idx ?? i + 1)}</td>
                <td className="px-2.5 py-2 font-medium text-gray-700">{String(item.item_description ?? "—")}</td>
                <td className="px-2.5 py-2 text-blue-600 text-[11px]">{item.renamed ? String(item.renamed) : "—"}</td>
                <td className="px-2.5 py-2 text-right font-mono text-gray-600">{item.flow !== undefined ? String(item.flow) : "—"}</td>
                <td className="px-2.5 py-2 text-right font-mono text-gray-600">{item.range !== undefined ? String(item.range) : "—"}</td>
                <td className="px-2.5 py-2 text-right text-gray-700 font-medium">{fmtQty(item.w_qty)}</td>
                <td className="px-2.5 py-2 text-right text-gray-500">{fmtQty(item.sb_qty)}</td>
                <td className="px-2.5 py-2 text-right text-gray-400">{fmtQty(item.ssb_qty)}</td>
                <td className="px-2.5 py-2 text-right font-mono text-gray-700">{inr(item.unit_price)}</td>
                <td className="px-2.5 py-2 text-right font-mono font-semibold text-gray-800">{inr(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 bg-gray-50/80">
              <td colSpan={9} className="px-2.5 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Total</td>
              <td className="px-2.5 py-2.5 text-right font-mono font-bold text-gray-800">{inr(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function ElectricalTable({ items, title }: { items: AnyItem[]; title?: string }) {
  const total = items.reduce((s, r) => s + (Number(r.total_price) || 0), 0);
  return (
    <div>
      {title && <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-2 px-1 flex items-center gap-1"><Zap className="w-3 h-3" />{title} <span className="font-normal text-amber-400">({items.length})</span></div>}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[540px]">
          <thead>
            <tr className="bg-amber-50 border-b border-amber-200">
              {["#","Item Description","kW","Working","Standby","Unit Price (₹)","Total (₹)"].map(h => (
                <th key={h} className={cn("px-2.5 py-2.5 text-[10px] font-semibold text-amber-600 uppercase tracking-wide",
                  h.includes("Price") || h.includes("Total") || h === "kW" || h === "Working" || h === "Standby" ? "text-right" : "text-left"
                )}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-50">
            {items.map((item, i) => (
              <tr key={i} className="hover:bg-amber-50/60 transition-colors">
                <td className="px-2.5 py-2 text-gray-400">{String(item.idx ?? i + 1)}</td>
                <td className="px-2.5 py-2 font-medium text-gray-700">{String(item.item_description ?? "—")}</td>
                <td className="px-2.5 py-2 text-right text-gray-600">{item.range !== undefined ? String(item.range) : "—"}</td>
                <td className="px-2.5 py-2 text-right text-gray-700 font-medium">{fmtQty(item.w_qty)}</td>
                <td className="px-2.5 py-2 text-right text-gray-500">{fmtQty(item.sb_qty)}</td>
                <td className="px-2.5 py-2 text-right font-mono text-gray-700">{inr(item.unit_price)}</td>
                <td className="px-2.5 py-2 text-right font-mono font-semibold text-amber-700">{inr(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-amber-200 bg-amber-50">
              <td colSpan={6} className="px-2.5 py-2.5 text-[11px] font-bold text-amber-600 uppercase">Total Electrical</td>
              <td className="px-2.5 py-2.5 text-right font-mono font-bold text-amber-700">{inr(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function PlcTable({ items, title }: { items: AnyItem[]; title?: string }) {
  const total = items.reduce((s, r) => s + (Number(r.amount ?? r.total_price) || 0), 0);
  return (
    <div>
      {title && <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">{title} <span className="font-normal text-gray-400">({items.length})</span></div>}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[500px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["#","Description","Item Code","Qty","Unit Price (₹)","Amount (₹)"].map(h => (
                <th key={h} className={cn("px-2.5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide",
                  ["Qty","Unit Price (₹)","Amount (₹)"].includes(h) ? "text-right" : "text-left"
                )}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, i) => (
              <tr key={i} className="hover:bg-blue-50/40 transition-colors">
                <td className="px-2.5 py-2 text-gray-400">{String(item.idx ?? i + 1)}</td>
                <td className="px-2.5 py-2 font-medium text-gray-700">{String(item.item_description ?? "—")}</td>
                <td className="px-2.5 py-2 font-mono text-blue-700 text-[10px] max-w-[180px] truncate">{String(item.item_code ?? "—")}</td>
                <td className="px-2.5 py-2 text-right">{fmtQty(item.w_qty)}</td>
                <td className="px-2.5 py-2 text-right font-mono text-gray-700">{inr(item.unit_price)}</td>
                <td className="px-2.5 py-2 text-right font-mono font-semibold text-gray-800">{inr(item.amount ?? item.total_price)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 bg-gray-50/80">
              <td colSpan={5} className="px-2.5 py-2.5 text-[11px] font-bold text-gray-500 uppercase">Total</td>
              <td className="px-2.5 py-2.5 text-right font-mono font-bold text-gray-800">{inr(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function MarginTable({ items }: { items: AnyItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[400px]">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {["#","System","Description","Margin %","Cost (₹)"].map(h => (
              <th key={h} className={cn("px-2.5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide",
                ["Margin %","Cost (₹)"].includes(h) ? "text-right" : "text-left"
              )}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item, i) => (
            <tr key={i} className="hover:bg-blue-50/40 transition-colors">
              <td className="px-2.5 py-2 text-gray-400">{String(item.idx ?? i + 1)}</td>
              <td className="px-2.5 py-2 font-semibold text-gray-700">{String(item.system ?? "—")}</td>
              <td className="px-2.5 py-2 text-gray-600">{String(item.description ?? "—")}</td>
              <td className="px-2.5 py-2 text-right text-emerald-600 font-mono">{item.percentage != null ? `${item.percentage}%` : "—"}</td>
              <td className="px-2.5 py-2 text-right font-mono font-semibold text-gray-800">{inr(item.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StandardCostTable({ rows }: { rows: AnyItem[] }) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-gray-400 italic">No standard cost data</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[600px]">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {["#","System Name","Cost (INR)","PLC Split","Total (INR)","EUR","USD"].map(h => (
              <th key={h} className={cn("px-4 py-3 text-xs font-semibold text-gray-500 uppercase",
                ["Cost (INR)","PLC Split","Total (INR)","EUR","USD"].includes(h) ? "text-right" : "text-left"
              )}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-blue-50/30 transition-colors">
              <td className="px-4 py-2.5 text-gray-400 text-xs">{String(row.idx ?? i + 1)}</td>
              <td className="px-4 py-2.5 font-semibold text-gray-700">{String(row.system_name ?? "—")}</td>
              <td className="px-4 py-2.5 text-right font-mono text-gray-700">{inr(row.cost)}</td>
              <td className="px-4 py-2.5 text-right font-mono text-gray-400 text-xs">{inr(row.plc_split_cost)}</td>
              <td className="px-4 py-2.5 text-right font-mono font-semibold text-gray-800">{inr(row.total_cost)}</td>
              <td className="px-4 py-2.5 text-right font-mono text-blue-700">{fmtEur(row.total_price_eur)}</td>
              <td className="px-4 py-2.5 text-right font-mono text-green-700">{fmtUsd(row.total_price_usd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── System Tab Content ────────────────────────────────────────────────────────
function SystemTabContent({ tab, doc }: { tab: SystemTabDef; doc: ErpDoc }) {
  const mainItems = (doc[tab.mainTable] as AnyItem[] | undefined) ?? [];
  const subItems = tab.subTable ? ((doc[tab.subTable] as AnyItem[] | undefined) ?? []) : [];
  const elItems = tab.electricalTable ? ((doc[tab.electricalTable] as AnyItem[] | undefined) ?? []) : [];
  const baseCost = tab.baseCostField ? doc[tab.baseCostField] : null;
  const elCost = tab.electricalField ? doc[tab.electricalField] : null;
  const totalCost = tab.totalCostField ? doc[tab.totalCostField] : null;
  const isPlc = tab.id === "plc";
  const isMargin = tab.id === "margin";

  if (!mainItems.length && !subItems.length && !elItems.length) {
    return (
      <div className="flex flex-col items-center py-24 text-gray-300 gap-3">
        <tab.icon className="w-12 h-12" />
        <p className="text-sm text-gray-400">No data for this system in this document</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Cost summary */}
      {(baseCost != null || elCost != null || totalCost != null) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {baseCost != null && <CostCard label="System Cost" value={baseCost} />}
          {elCost != null && <CostCard label="Electrical Cost" value={elCost} />}
          {totalCost != null && <CostCard label="Total Cost (incl. tax/transport)" value={totalCost} accent />}
          {totalCost != null && doc.usd && (
            <div className="flex flex-col gap-0.5 px-4 py-3 rounded-xl border bg-green-50 border-green-200">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total (USD)</span>
              <span className="text-sm font-bold font-mono text-green-700">{fmtUsd(Number(totalCost) / (Number(doc.usd) || 1))}</span>
            </div>
          )}
        </div>
      )}

      {/* Main items */}
      {mainItems.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{tab.label} — Items</h4>
            <span className="text-[11px] text-gray-400">{mainItems.length} rows</span>
          </div>
          <div className="p-3">
            {isPlc ? <PlcTable items={mainItems} /> : isMargin ? <MarginTable items={mainItems} /> : <EquipmentTable items={mainItems} />}
          </div>
        </div>
      )}

      {/* Sub-table (full system) */}
      {subItems.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{tab.label} — Full System</h4>
            <span className="text-[11px] text-gray-400">{subItems.length} rows</span>
          </div>
          <div className="p-3">
            <EquipmentTable items={subItems} />
          </div>
        </div>
      )}

      {/* Electrical items */}
      {elItems.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-100 bg-amber-50/60 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider">{tab.label} — Electrical</h4>
            <span className="ml-auto text-[11px] text-amber-400">{elItems.length} rows</span>
          </div>
          <div className="p-3">
            <ElectricalTable items={elItems} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Details Tab ───────────────────────────────────────────────────────────────
function DetailsTab({
  doc, editMode, editForm, setField,
}: {
  doc: ErpDoc;
  editMode: boolean;
  editForm: Record<string, string>;
  setField: (k: string, v: string) => void;
}) {
  const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400";

  return (
    <div className="space-y-5">
      {/* Header fields */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Document Details</h3>
          <StatusBadge docstatus={doc.docstatus} />
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-5">
            {[
              { key: "project_startup_sheet", label: "Startup Sheet" },
              { key: "flow", label: "Flow (LPH)", numeric: true },
              { key: "revision", label: "Revision" },
              { key: "usd", label: "USD Rate (₹)", numeric: true },
              { key: "eur", label: "EUR Rate (₹)", numeric: true },
              { key: "project", label: "Project", readonly: true },
            ].map(({ key, label, numeric, readonly }) => (
              <div key={key} className="flex flex-col gap-1">
                <FieldLabel>{label}</FieldLabel>
                {editMode && !readonly ? (
                  <input
                    type={numeric ? "number" : "text"}
                    className={inp}
                    value={editForm[key] ?? ""}
                    onChange={e => setField(key, e.target.value)}
                  />
                ) : (
                  <span className={cn("text-sm font-semibold text-gray-800", key === "flow" && "tabular-nums")}>
                    {key === "flow" && doc.flow != null
                      ? Number(doc.flow).toLocaleString("en-IN")
                      : (String(doc[key] ?? "—") || "—")}
                  </span>
                )}
              </div>
            ))}
          </div>
          {doc.project_name && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <FieldLabel>Project Name</FieldLabel>
              <p className="text-sm font-bold text-gray-800 mt-1">{String(doc.project_name)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Overall cost row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <IndianRupee className="w-3 h-3" /> Total (INR)
          </div>
          <span className="text-lg font-black text-gray-800 font-mono tabular-nums">{inr(doc.standard__cost ?? doc.overall_cost)}</span>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <Euro className="w-3 h-3 text-blue-500" /> Total (EUR)
          </div>
          <span className="text-lg font-black text-blue-700 font-mono tabular-nums">{fmtEur(doc.standard__cost2 ?? doc.overall_cost2)}</span>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <DollarSign className="w-3 h-3 text-green-500" /> Total (USD)
          </div>
          <span className="text-lg font-black text-green-700 font-mono tabular-nums">{fmtUsd(doc.standard__cost3 ?? doc.overall_cost3)}</span>
        </div>
      </div>

      {/* Standard cost breakdown */}
      {(doc.standard_cost?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Standard Cost Breakdown</h3>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-400">
              <span className="flex items-center gap-1"><IndianRupee className="w-2.5 h-2.5" /> INR</span>
              <span className="flex items-center gap-1"><Euro className="w-2.5 h-2.5" /> EUR</span>
              <span className="flex items-center gap-1"><DollarSign className="w-2.5 h-2.5" /> USD</span>
            </div>
          </div>
          <StandardCostTable rows={doc.standard_cost ?? []} />
        </div>
      )}
    </div>
  );
}

// ── New Record Modal ──────────────────────────────────────────────────────────
function NewRecordModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ project: "", project_startup_sheet: "", flow: "", revision: "REV - 00", usd: "97", eur: "112" });
  const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400";

  async function save() {
    if (!form.project.trim()) { toast({ title: "Project code is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/api/cost-working/erp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: form.project.trim(),
          ...(form.project_startup_sheet && { project_startup_sheet: form.project_startup_sheet }),
          flow: Number(form.flow) || 0,
          revision: form.revision || "REV - 00",
          usd: Number(form.usd) || 97,
          eur: Number(form.eur) || 112,
        }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error ?? "Failed"); }
      toast({ title: "Created in ERPNext" });
      onCreated(); onClose();
    } catch (e: any) {
      toast({ title: "Create failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-blue-700 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-base">New Cost Working Tool</h2>
            <p className="text-blue-200 text-xs mt-0.5">Creates a new document in ERPNext</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Project Code <span className="text-red-500">*</span></label>
              <input placeholder="e.g. WTT-1200" className={inp} value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Startup Sheet</label>
              <input placeholder="e.g. STR-SHT01200" className={inp} value={form.project_startup_sheet} onChange={e => setForm(f => ({ ...f, project_startup_sheet: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Flow (LPH)</label>
              <input type="number" placeholder="e.g. 2000" className={inp} value={form.flow} onChange={e => setForm(f => ({ ...f, flow: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Revision</label>
              <input placeholder="REV - 00" className={inp} value={form.revision} onChange={e => setForm(f => ({ ...f, revision: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">USD Rate (₹)</label>
              <input type="number" className={inp} value={form.usd} onChange={e => setForm(f => ({ ...f, usd: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">EUR Rate (₹)</label>
              <input type="number" className={inp} value={form.eur} onChange={e => setForm(f => ({ ...f, eur: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {saving ? "Creating…" : "Create in ERP"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail View (tabs + edit) ─────────────────────────────────────────────────
function CostDetail({
  doc, onRefresh, editMode, editForm, setField, onSave, onDiscard, saving,
}: {
  doc: ErpDoc;
  onRefresh: () => void;
  editMode: boolean;
  editForm: Record<string, string>;
  setField: (k: string, v: string) => void;
  onSave: () => void;
  onDiscard: () => void;
  saving: boolean;
}) {
  const [activeTab, setActiveTab] = useState("details");
  const tabBarRef = useRef<HTMLDivElement>(null);

  const visibleTabs = useMemo(() => {
    const tabs: { id: string; label: string; icon: React.ElementType }[] = [
      { id: "details", label: "Details", icon: FileText },
    ];
    for (const tab of SYSTEM_TABS) {
      const a = (doc[tab.mainTable] as AnyItem[] | undefined) ?? [];
      const b = tab.subTable ? ((doc[tab.subTable] as AnyItem[] | undefined) ?? []) : [];
      const c = tab.electricalTable ? ((doc[tab.electricalTable] as AnyItem[] | undefined) ?? []) : [];
      if (a.length || b.length || c.length) tabs.push({ id: tab.id, label: tab.label, icon: tab.icon });
    }
    return tabs;
  }, [doc]);

  function scroll(dir: "left" | "right") {
    tabBarRef.current?.scrollBy({ left: dir === "left" ? -160 : 160, behavior: "smooth" });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab + action bar */}
      <div className="flex-none border-b border-gray-200 bg-white flex items-stretch">
        <button onClick={() => scroll("left")} className="flex-none px-2 text-gray-400 hover:text-gray-600 border-r border-gray-100 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <div ref={tabBarRef} className="flex-1 flex overflow-x-auto scrollbar-none">
          {visibleTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors flex-none",
                activeTab === tab.id
                  ? "border-blue-600 text-blue-700 bg-blue-50/60"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
        <button onClick={() => scroll("right")} className="flex-none px-2 text-gray-400 hover:text-gray-600 border-l border-gray-100 transition-colors">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Edit/Save/Discard in tab bar right */}
        <div className="flex-none flex items-center gap-2 px-3 border-l border-gray-100">
          {editMode ? (
            <>
              <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1 hidden sm:flex">
                <AlertCircle className="w-3 h-3" /> Editing
              </span>
              <button onClick={onDiscard}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Discard
              </button>
              <button onClick={onSave} disabled={saving}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-5">
        {activeTab === "details" && (
          <DetailsTab doc={doc} editMode={editMode} editForm={editForm} setField={setField} />
        )}
        {SYSTEM_TABS.map(tab =>
          activeTab === tab.id ? <SystemTabContent key={tab.id} tab={tab} doc={doc} /> : null
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CostWorkingTool() {
  const { toast } = useToast();
  const [records, setRecords] = useState<ListItem[]>([]);
  const [source, setSource] = useState<"erp" | "local">("erp");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<ErpDoc | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [erpConfigured, setErpConfigured] = useState(true);
  const [showNew, setShowNew] = useState(false);

  // Edit state (lifted up so topbar buttons work)
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditFormState] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/cost-working`);
      if (!r.ok) throw new Error(await r.text());
      const body = await r.json();
      setSource(body.source);
      setErpConfigured(body.source === "erp");
      setRecords(body.data ?? []);
    } catch {
      toast({ title: "Failed to load records", variant: "destructive" });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openRecord(item: ListItem) {
    setDocLoading(true);
    setSelectedDoc(null);
    setEditMode(false);
    try {
      const r = await fetch(`${BASE}/api/cost-working/erp/${encodeURIComponent(item.name)}`);
      if (!r.ok) throw new Error(await r.text());
      setSelectedDoc(await r.json());
    } catch (e: any) {
      toast({ title: "Failed to open document", description: e.message, variant: "destructive" });
    } finally { setDocLoading(false); }
  }

  async function refreshDoc() {
    if (!selectedDoc) return;
    try {
      const r = await fetch(`${BASE}/api/cost-working/erp/${encodeURIComponent(selectedDoc.name)}`);
      if (r.ok) setSelectedDoc(await r.json());
    } catch {}
  }

  function startEdit() {
    if (!selectedDoc) return;
    setEditFormState({
      project_startup_sheet: String(selectedDoc.project_startup_sheet ?? ""),
      flow: String(selectedDoc.flow ?? ""),
      revision: String(selectedDoc.revision ?? ""),
      usd: String(selectedDoc.usd ?? ""),
      eur: String(selectedDoc.eur ?? ""),
    });
    setEditMode(true);
  }

  async function saveEdit() {
    if (!selectedDoc) return;
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/api/cost-working/erp/${encodeURIComponent(selectedDoc.name)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editForm.project_startup_sheet && { project_startup_sheet: editForm.project_startup_sheet }),
          ...(editForm.flow && { flow: Number(editForm.flow) }),
          ...(editForm.revision && { revision: editForm.revision }),
          ...(editForm.usd && { usd: Number(editForm.usd) }),
          ...(editForm.eur && { eur: Number(editForm.eur) }),
        }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error ?? "Save failed"); }
      toast({ title: "Saved to ERPNext" });
      setEditMode(false);
      await refreshDoc();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  function closeDetail() { setSelectedDoc(null); setDocLoading(false); setEditMode(false); }

  async function syncERP() {
    setSyncing(true);
    try {
      const r = await fetch(`${BASE}/api/cost-working/sync`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Sync failed");
      toast({ title: `Synced ${d.synced ?? 0} of ${d.total ?? 0} records` });
      load();
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally { setSyncing(false); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return records;
    return records.filter(r =>
      (r.name ?? "").toLowerCase().includes(q) ||
      (r.project ?? "").toLowerCase().includes(q) ||
      (r.project_name ?? "").toLowerCase().includes(q)
    );
  }, [records, search]);

  const inDetail = selectedDoc !== null || docLoading;

  return (
    <Layout>
      <div className="flex flex-col h-full bg-gray-50">

        {/* ── Top Bar ─────────────────────────────────────────────────────── */}
        <div className="flex-none bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between gap-4">

            {/* Left: back + title */}
            <div className="flex items-center gap-3">
              {inDetail && (
                <button onClick={closeDetail}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Calculator className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900">Cost Working Tool</h1>
                <p className="text-xs text-gray-500">
                  {inDetail
                    ? docLoading
                      ? "Loading…"
                      : <span className="font-mono font-bold text-blue-700">{selectedDoc?.name} · {selectedDoc?.project_name ?? selectedDoc?.project}</span>
                    : `${records.length} records${source === "erp" ? " · Live ERP" : ""}`}
                </p>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2">
              {!inDetail && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search document, project…"
                      className="pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56" />
                  </div>
                  <button onClick={load} disabled={loading}
                    className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition-colors disabled:opacity-50">
                    <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                  </button>
                  <button onClick={syncERP} disabled={syncing}
                    className="flex items-center gap-2 px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                    <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
                    {syncing ? "Syncing…" : "Sync ERP"}
                  </button>
                  {erpConfigured && (
                    <button onClick={() => setShowNew(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
                      <Plus className="w-3.5 h-3.5" /> New
                    </button>
                  )}
                </>
              )}

              {inDetail && selectedDoc && (
                <>
                  <a href={`${ERP_BASE}/app/cost-working-tool/${encodeURIComponent(selectedDoc.name)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" /> Open in ERP
                  </a>
                  {!editMode && (
                    <button onClick={startEdit}
                      className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ERP not configured warning */}
        {!erpConfigured && !inDetail && (
          <div className="mx-5 mt-3 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-none text-amber-500" />
            <p>ERPNext not configured — set <code className="font-mono text-xs bg-amber-100 px-1 rounded">ERPNEXT_URL</code>, <code className="font-mono text-xs bg-amber-100 px-1 rounded">ERPNEXT_API_KEY</code>, and <code className="font-mono text-xs bg-amber-100 px-1 rounded">ERPNEXT_API_SECRET</code> to enable live sync.</p>
          </div>
        )}

        {/* ── List View ────────────────────────────────────────────────────── */}
        {!inDetail && (
          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="flex items-center justify-center h-40 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-gray-400">
                <Calculator className="w-10 h-10 mb-3 opacity-25" />
                <p className="text-sm text-gray-500">{search ? "No records match your search" : "No records — sync from ERP to load"}</p>
                {!search && erpConfigured && (
                  <button onClick={syncERP} disabled={syncing}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
                    <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} /> Sync from ERP
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {["Document","Project","Project Name","Flow (LPH)","Revision","Status","Modified"].map(h => (
                        <th key={h} className={cn("px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider",
                          h === "Flow (LPH)" ? "text-right" : "text-left"
                        )}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((r, i) => (
                      <tr key={i}
                        className={cn("transition-colors", source === "erp" ? "hover:bg-blue-50/40 cursor-pointer" : "cursor-default")}
                        onClick={() => source === "erp" && openRecord(r)}>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-bold text-blue-700">{r.name}</span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-600">{r.project ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 max-w-[200px] truncate">{r.project_name ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-right font-mono text-gray-600">
                          {r.flow ? Number(r.flow).toLocaleString("en-IN") : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{r.revision ?? "—"}</td>
                        <td className="px-4 py-3"><StatusBadge docstatus={r.docstatus} /></td>
                        <td className="px-4 py-3 text-xs text-gray-400">{r.modified?.slice(0, 10) ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
                  <span>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
                  {source === "erp" && <span className="text-green-600 font-semibold flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Live from ERPNext</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Loading indicator ────────────────────────────────────────────── */}
        {docLoading && (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <Loader2 className="w-7 h-7 animate-spin mr-2" /> Loading document…
          </div>
        )}

        {/* ── Detail View ──────────────────────────────────────────────────── */}
        {selectedDoc && !docLoading && (
          <div className="flex-1 min-h-0">
            <CostDetail
              doc={selectedDoc}
              onRefresh={refreshDoc}
              editMode={editMode}
              editForm={editForm}
              setField={(k, v) => setEditFormState(f => ({ ...f, [k]: v }))}
              onSave={saveEdit}
              onDiscard={() => setEditMode(false)}
              saving={saving}
            />
          </div>
        )}

        {/* New Record Modal */}
        {showNew && <NewRecordModal onClose={() => setShowNew(false)} onCreated={load} />}
      </div>
    </Layout>
  );
}
