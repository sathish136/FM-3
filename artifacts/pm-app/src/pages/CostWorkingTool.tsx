import { useState, useEffect, useCallback, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Loader2, RefreshCw, ArrowLeft, ExternalLink,
  Calculator, ChevronLeft, ChevronRight, IndianRupee, DollarSign, Euro,
  AlertCircle, Clock, CheckCircle2, X, FileText, TrendingUp, Layers,
  Wrench, Cpu, Droplets, Zap, Wind, Filter, Settings2, Package,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function fmt(v: any, currency: "inr" | "usd" | "eur" = "inr") {
  const n = Number(v);
  if (!v || isNaN(n)) return "—";
  if (currency === "inr") return "₹ " + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  if (currency === "usd") return "$ " + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (currency === "eur") return "€ " + n.toLocaleString("en-DE", { maximumFractionDigits: 0 });
  return String(n);
}

function fmtNum(v: any) {
  const n = Number(v);
  if (!v || isNaN(n)) return "—";
  return n.toLocaleString("en-IN");
}

function val(v: any) {
  if (v === null || v === undefined || v === 0 || v === "0" || v === "") return "—";
  return String(v);
}

const ERP_URL = "https://erp.wttint.com";

const TAB_DEFS: { id: string; label: string; icon: React.ElementType; childKey?: string }[] = [
  { id: "details",            label: "Details",            icon: FileText },
  { id: "discount",           label: "Discount",           icon: TrendingUp,  childKey: "discount" },
  { id: "template_selection", label: "Template Selection", icon: Layers,      childKey: "template_selection" },
  { id: "mf",                 label: "MF",                 icon: Filter,      childKey: "mf" },
  { id: "mbr_k",              label: "MBR(K)",             icon: Droplets,    childKey: "mbr_k" },
  { id: "mbr_o",              label: "MBR(O)",             icon: Droplets,    childKey: "mbr_o" },
  { id: "pre_treatment",      label: "Pre Treatment",      icon: Settings2,   childKey: "pre_treatment" },
  { id: "cts",                label: "CTS",                icon: Package,     childKey: "cts" },
  { id: "cts_mbr",            label: "CTS MBR",            icon: Package,     childKey: "cts_mbr" },
  { id: "degasser",           label: "Degasser",           icon: Wind,        childKey: "degasser" },
  { id: "plc_items",          label: "PLC Items",          icon: Cpu,         childKey: "plc_items" },
  { id: "col",                label: "Col",                icon: Wrench,      childKey: "col" },
  { id: "electrical",         label: "Electrical",         icon: Zap,         childKey: "electrical" },
  { id: "civil",              label: "Civil",              icon: Wrench,      childKey: "civil" },
  { id: "ro",                 label: "RO",                 icon: Droplets,    childKey: "ro" },
  { id: "rro",                label: "RRO",                icon: Droplets,    childKey: "rro" },
];

const CHILD_ITEM_COLS = [
  { key: "idx",         label: "#",          className: "w-10 text-center text-slate-400" },
  { key: "item_code",   label: "Item Code",  className: "w-32 font-mono text-xs text-blue-700" },
  { key: "item_name",   label: "Description",className: "min-w-[200px]" },
  { key: "qty",         label: "Qty",        className: "w-20 text-right" },
  { key: "uom",         label: "UOM",        className: "w-16 text-center" },
  { key: "rate",        label: "Rate (₹)",   className: "w-28 text-right font-mono text-slate-700" },
  { key: "amount",      label: "Amount (₹)", className: "w-32 text-right font-semibold text-slate-800" },
  { key: "rate_usd",    label: "Rate ($)",   className: "w-24 text-right text-green-700" },
  { key: "amount_usd",  label: "Amt ($)",    className: "w-28 text-right text-green-700" },
  { key: "rate_eur",    label: "Rate (€)",   className: "w-24 text-right text-blue-600" },
  { key: "amount_eur",  label: "Amt (€)",    className: "w-28 text-right text-blue-600" },
];

function FieldBox({ label, value, mono = false }: { label: string; value?: any; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className={cn("text-sm text-slate-800 font-medium truncate", mono && "font-mono")}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function StandardCostTable({ rows }: { rows: any[] }) {
  if (!rows?.length) return (
    <div className="text-sm text-slate-400 italic py-4 text-center">No standard cost data</div>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">System Name</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Total Price (INR)</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Total Price (EUR)</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Total Price (USD)</th>
            <th className="px-2 py-2.5 w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => {
            const isTotal = row.system_name?.toLowerCase() === "total" || i === rows.length - 1;
            return (
              <tr key={i} className={cn(isTotal ? "bg-slate-50 font-bold" : "hover:bg-slate-50/60")}>
                <td className={cn("px-4 py-2.5 text-slate-700", isTotal && "text-slate-900 font-bold")}>
                  {row.system_name ?? "—"}
                </td>
                <td className={cn("px-4 py-2.5 text-right font-mono text-slate-700", isTotal && "text-slate-900 font-bold")}>
                  {fmt(row.total_price_inr, "inr")}
                </td>
                <td className={cn("px-4 py-2.5 text-right font-mono text-blue-700", isTotal && "font-bold")}>
                  {fmt(row.total_price_eur, "eur")}
                </td>
                <td className={cn("px-4 py-2.5 text-right font-mono text-green-700", isTotal && "font-bold")}>
                  {fmt(row.total_price_usd, "usd")}
                </td>
                <td className="px-2 py-2.5" />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ChildTable({ items, tabId }: { items: any[]; tabId: string }) {
  if (!items?.length) return (
    <div className="flex flex-col items-center py-16 text-slate-400 gap-2">
      <Package className="w-10 h-10 text-slate-200" />
      <p className="text-sm">No items in this section</p>
    </div>
  );

  const presentCols = CHILD_ITEM_COLS.filter(col => {
    if (col.key === "idx") return true;
    return items.some(item => item[col.key] !== undefined && item[col.key] !== null && item[col.key] !== "");
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-slate-200 bg-slate-50">
            {presentCols.map(col => (
              <th key={col.key} className={cn("px-3 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap", col.className)}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item, i) => (
            <tr key={i} className="hover:bg-blue-50/30 transition-colors">
              {presentCols.map(col => (
                <td key={col.key} className={cn("px-3 py-2 text-xs whitespace-nowrap", col.className)}>
                  {col.key === "amount" || col.key === "amount_usd" || col.key === "amount_eur"
                    ? fmtNum(item[col.key])
                    : col.key === "rate" || col.key === "rate_usd" || col.key === "rate_eur"
                    ? fmtNum(item[col.key])
                    : (item[col.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
            {presentCols.map((col, ci) => {
              if (ci === 0) return <td key={col.key} className="px-3 py-2.5 text-xs text-slate-500 font-semibold" colSpan={presentCols.filter(c => !["amount","amount_usd","amount_eur"].includes(c.key) && c.key !== col.key).length > 0 ? 1 : 1}>Total</td>;
              if (["amount", "amount_usd", "amount_eur"].includes(col.key)) {
                const total = items.reduce((s, r) => s + (Number(r[col.key]) || 0), 0);
                return (
                  <td key={col.key} className={cn("px-3 py-2.5 text-xs font-bold", col.className)}>
                    {fmtNum(total)}
                  </td>
                );
              }
              return <td key={col.key} className="px-3 py-2.5" />;
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function DocDetail({
  doc,
  onClose,
}: {
  doc: any;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState("details");

  const availableTabs = useMemo(() => {
    return TAB_DEFS.filter(tab => {
      if (tab.id === "details") return true;
      if (!tab.childKey) return false;
      const arr = doc[tab.childKey];
      return Array.isArray(arr) && arr.length > 0;
    });
  }, [doc]);

  const standardCost: any[] = useMemo(() => {
    return doc.standard_cost ?? doc.standard_cost_items ?? doc.cost_summary ?? [];
  }, [doc]);

  const discountItems: any[] = doc.discount_items ?? doc.discount ?? [];

  function getTabItems(tabId: string) {
    const tab = TAB_DEFS.find(t => t.id === tabId);
    if (!tab?.childKey) return [];
    return doc[tab.childKey] ?? [];
  }

  const erpDocUrl = `${ERP_URL}/app/cost-working-tool/${encodeURIComponent(doc.name)}`;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors px-2 py-1 rounded hover:bg-slate-100">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-xs text-slate-400">Cost Working Tool</span>
          <span className="text-slate-300">›</span>
          <span className="text-sm font-bold text-slate-800 font-mono truncate">{doc.name}</span>
          {doc.docstatus === 1 && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-100 text-green-700 border border-green-200">Submitted</span>
          )}
          {doc.docstatus === 2 && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700 border border-red-200">Cancelled</span>
          )}
          {(!doc.docstatus || doc.docstatus === 0) && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-200">Draft</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <a href={erpDocUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> Open in ERP
          </a>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-slate-200 bg-white flex-shrink-0 overflow-x-auto">
        <div className="flex min-w-max">
          {availableTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-blue-600 text-blue-700 bg-blue-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto bg-[#f8f9fb]">
        <div className="max-w-7xl mx-auto p-6">

          {activeTab === "details" && (
            <div className="space-y-5">
              {/* Main fields card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Document Details</h3>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
                    <FieldBox label="Project Startup Sheet" value={doc.startup_sheet} mono />
                    <FieldBox label="Flow" value={doc.flow ? Number(doc.flow).toLocaleString("en-IN") : "—"} />
                    <FieldBox label="Revision" value={doc.revision} />
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600 flex-shrink-0 mt-4" />
                      <FieldBox label="Exchange Rate (USD)" value={doc.exchange_rate_usd ?? doc.usd_rate} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Euro className="w-4 h-4 text-blue-600 flex-shrink-0 mt-4" />
                      <FieldBox label="Exchange Rate (EUR)" value={doc.exchange_rate_eur ?? doc.eur_rate} />
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <FieldBox label="Project" value={doc.project} />
                  </div>
                </div>
              </div>

              {/* Standard Cost */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Standard Cost</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" /> INR</span>
                    <span className="flex items-center gap-1"><Euro className="w-3 h-3" /> EUR</span>
                    <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> USD</span>
                  </div>
                </div>
                <StandardCostTable rows={standardCost} />
              </div>

              {/* Any remaining top-level scalar fields we didn't display */}
              {(() => {
                const shown = new Set(["name","doctype","docstatus","idx","owner","creation","modified","modified_by",
                  "startup_sheet","flow","revision","exchange_rate_usd","exchange_rate_eur","usd_rate","eur_rate","project",
                  "standard_cost","standard_cost_items","cost_summary",
                  ...TAB_DEFS.filter(t => t.childKey).map(t => t.childKey!),
                  "discount_items","discount",
                  "amended_from","parentfield","parenttype","parent","naming_series",
                  "_comments","_assign","_liked_by","_user_tags",
                ]);
                const extra = Object.entries(doc).filter(([k, v]) =>
                  !shown.has(k) &&
                  !Array.isArray(v) &&
                  typeof v !== "object" &&
                  v !== null && v !== "" && v !== 0
                );
                if (!extra.length) return null;
                return (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Additional Fields</h3>
                    </div>
                    <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {extra.map(([k, v]) => (
                        <FieldBox key={k} label={k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} value={String(v)} />
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === "discount" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Discount</h3>
              </div>
              <ChildTable items={discountItems} tabId="discount" />
            </div>
          )}

          {!["details", "discount"].includes(activeTab) && (() => {
            const tab = TAB_DEFS.find(t => t.id === activeTab);
            const items = getTabItems(activeTab);
            return (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{tab?.label}</h3>
                  <span className="text-xs text-slate-400">{items.length} item{items.length !== 1 ? "s" : ""}</span>
                </div>
                <ChildTable items={items} tabId={activeTab} />
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

interface ListItem {
  name?: string;
  id?: number;
  erp_name?: string;
  project?: string;
  project_name?: string;
  startup_sheet?: string;
  flow?: number;
  revision?: string;
  exchange_rate_usd?: number;
  exchange_rate_eur?: number;
  modified?: string;
  creation?: string;
  docstatus?: number;
  quote_no?: string;
  customer?: string;
  status?: string;
}

export default function CostWorkingTool() {
  const { toast } = useToast();
  const [source, setSource] = useState<"erp" | "local">("erp");
  const [records, setRecords] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [openDoc, setOpenDoc] = useState<any | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [erpConfigured, setErpConfigured] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/cost-working`);
      if (!r.ok) throw new Error(await r.text());
      const body = await r.json();
      if (body.source === "erp") {
        setSource("erp");
        setRecords(body.data ?? []);
      } else {
        setSource("local");
        setErpConfigured(false);
        setRecords(body.data ?? []);
      }
    } catch {
      toast({ title: "Failed to load records", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openRecord(item: ListItem) {
    const erpName = item.name ?? item.erp_name;
    if (!erpName || source !== "erp") return;
    setDocLoading(true);
    try {
      const r = await fetch(`${BASE}/api/cost-working/erp/${encodeURIComponent(erpName)}`);
      if (!r.ok) throw new Error(await r.text());
      const doc = await r.json();
      setOpenDoc(doc);
    } catch (e: any) {
      toast({ title: "Failed to open document", description: e.message, variant: "destructive" });
    } finally {
      setDocLoading(false);
    }
  }

  async function syncERP() {
    setSyncing(true);
    try {
      const r = await fetch(`${BASE}/api/cost-working/sync`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Sync failed");
      toast({ title: `Synced ${d.synced ?? 0} of ${d.total ?? 0} records from ERP` });
      load();
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return records;
    return records.filter(r => {
      const name = (r.name ?? r.quote_no ?? "").toLowerCase();
      const project = (r.project ?? r.project_name ?? "").toLowerCase();
      const sheet = (r.startup_sheet ?? r.customer ?? "").toLowerCase();
      return name.includes(q) || project.includes(q) || sheet.includes(q);
    });
  }, [records, search]);

  if (openDoc) {
    return <DocDetail doc={openDoc} onClose={() => setOpenDoc(null)} />;
  }

  return (
    <Layout>
      <div className="flex flex-col h-full bg-[#f4f6fb]">

        {/* Page Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 shadow shadow-blue-200">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Cost Working Tool</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {source === "erp"
                  ? `${records.length} documents from ERPNext`
                  : "Local records (ERPNext not configured)"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {source === "erp" && (
              <a href={`${ERP_URL}/app/cost-working-tool`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                <ExternalLink className="w-4 h-4" /> ERP
              </a>
            )}
            <button onClick={syncERP} disabled={syncing}
              className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
              <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
              {syncing ? "Syncing…" : "Sync ERP"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Records", value: records.length, color: "text-slate-800", bg: "bg-white" },
              { label: "Submitted", value: records.filter(r => r.docstatus === 1).length, color: "text-green-700", bg: "bg-green-50" },
              { label: "Draft", value: records.filter(r => !r.docstatus || r.docstatus === 0).length, color: "text-amber-700", bg: "bg-amber-50" },
              { label: "Cancelled", value: records.filter(r => r.docstatus === 2).length, color: "text-red-700", bg: "bg-red-50" },
            ].map(s => (
              <div key={s.label} className={cn("rounded-xl border border-slate-200 p-4 flex flex-col gap-1", s.bg)}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</span>
                <span className={cn("text-2xl font-black", s.color)}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by document name, project, startup sheet…"
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
          </div>

          {/* No ERP notice */}
          {!erpConfigured && (
            <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
              <p>ERPNext is not configured. Showing local records. Set <code className="font-mono text-xs bg-amber-100 px-1 rounded">ERPNEXT_URL</code>, <code className="font-mono text-xs bg-amber-100 px-1 rounded">ERPNEXT_API_KEY</code>, and <code className="font-mono text-xs bg-amber-100 px-1 rounded">ERPNEXT_API_SECRET</code> to sync from ERP.</p>
            </div>
          )}

          {/* Loading */}
          {(loading || docLoading) && (
            <div className="flex justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-sm text-slate-400">{docLoading ? "Loading document…" : "Loading records…"}</p>
              </div>
            </div>
          )}

          {/* Table */}
          {!loading && !docLoading && (
            filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 text-center py-24">
                <Calculator className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                <p className="font-semibold text-slate-500">No records found</p>
                <p className="text-sm text-slate-400 mt-1">
                  {search ? "Try a different search term" : "Click 'Sync ERP' to import Cost Working Tool records"}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Document</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Project</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Startup Sheet</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Flow</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Revision</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">USD Rate</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">EUR Rate</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Modified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((r, i) => {
                      const docName = r.name ?? r.erp_name ?? r.quote_no ?? `#${r.id}`;
                      const status = r.docstatus === 1 ? "Submitted" : r.docstatus === 2 ? "Cancelled" : "Draft";
                      const statusCfg = {
                        Submitted: "bg-green-50 text-green-700 border-green-200",
                        Cancelled: "bg-red-50 text-red-700 border-red-200",
                        Draft: "bg-amber-50 text-amber-700 border-amber-200",
                      }[status];
                      const modDate = (r.modified ?? r.creation ?? "")?.slice(0, 10);
                      const isErpRecord = source === "erp" && !!r.name;
                      return (
                        <tr key={i}
                          className={cn("hover:bg-blue-50/40 transition-colors group", isErpRecord ? "cursor-pointer" : "cursor-default")}
                          onClick={() => isErpRecord && openRecord(r)}>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs font-bold text-blue-700">{docName}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-700 max-w-[200px]">
                            <div className="truncate text-xs">{r.project ?? r.project_name ?? "—"}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-slate-600">{r.startup_sheet ?? r.customer ?? "—"}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600 text-right">
                            {r.flow ? Number(r.flow).toLocaleString("en-IN") : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">{r.revision ?? "—"}</td>
                          <td className="px-4 py-3 text-xs text-green-700 font-mono">
                            {r.exchange_rate_usd ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-blue-700 font-mono">
                            {r.exchange_rate_eur ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border", statusCfg)}>
                              {status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">{modDate || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
                  <span>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
                  {source === "erp" && <span className="text-green-600 font-semibold">● Live from ERPNext</span>}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </Layout>
  );
}
