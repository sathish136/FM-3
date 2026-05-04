import { Layout } from "@/components/Layout";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ShoppingCart, Search, RefreshCw, Loader2, ArrowLeft, ExternalLink,
  Building2, Calendar, Truck, IndianRupee, Filter, X,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${BASE}/api`;
const ERP_BASE = "https://erp.wttint.com";

type Stage = "ordered" | "in_transit" | "received" | "overdue" | "partial";

interface PO {
  name: string;
  supplier: string;
  supplier_name: string | null;
  status: string | null;
  po_date: string | null;
  schedule_date: string | null;
  per_received: number;
  per_billed: number;
  grand_total: number;
  currency: string | null;
  project: string | null;
  days_overdue: number;
  stage: Stage;
  discussion: string;
}

interface Stats {
  total: number;
  overdue: number;
  partial: number;
  in_transit: number;
  ordered: number;
  received: number;
  critical_overdue: number;
  open_value: number;
}

interface ProjectOption {
  name: string;
  project_name: string;
}

const STAGE_META: Record<Stage, { label: string; pill: string; dot: string }> = {
  overdue:    { label: "Overdue",          pill: "bg-red-100 text-red-700",         dot: "bg-red-500" },
  partial:    { label: "Partial receipt",  pill: "bg-amber-100 text-amber-700",     dot: "bg-amber-500" },
  in_transit: { label: "Awaiting delivery",pill: "bg-blue-100 text-blue-700",       dot: "bg-blue-500" },
  ordered:    { label: "Recently released",pill: "bg-indigo-100 text-indigo-700",   dot: "bg-indigo-500" },
  received:   { label: "Fully received",   pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
};

function fmtMoney(n: number, ccy: string | null) {
  const c = ccy || "INR";
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n || 0);
  } catch {
    return `${c} ${(n || 0).toFixed(0)}`;
  }
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PurchaseOrders() {
  const [, navigate] = useLocation();
  const initialQS = new URLSearchParams(window.location.search);

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [project, setProject] = useState<string>(initialQS.get("project") || "");
  const [orders, setOrders] = useState<PO[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [stage, setStage] = useState<Stage | "all" | "pending">(
    (initialQS.get("stage") as any) || "pending"
  );
  const [severity, setSeverity] = useState<"all" | "critical" | "high" | "watch">("all");
  const [supplier, setSupplier] = useState("");
  const [search, setSearch] = useState("");
  const [minDays, setMinDays] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"days_desc" | "due_asc" | "po_desc" | "value_desc">("days_desc");

  // Load projects (for picker)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/projects`);
        if (!res.ok) return;
        const data = await res.json();
        const list: ProjectOption[] = Array.isArray(data)
          ? data.map((p: any) => ({
              name: p.erpnextName ?? p.name,
              project_name: p.project_name ?? p.name,
            }))
          : [];
        setProjects(list);
      } catch {/* ignore */}
    })();
  }, []);

  const load = useMemo(() => async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (project) qs.set("project", project);
      const res = await fetch(`${API}/meeting-discussions/purchase-orders/detail?${qs.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOrders(Array.isArray(data?.purchase_orders) ? data.purchase_orders : []);
      setStats(data?.stats || null);
    } catch (e: any) {
      setError(e?.message || String(e));
      setOrders([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => { load(); }, [load]);

  const supplierOptions = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => set.add(o.supplier_name || o.supplier));
    return Array.from(set).sort();
  }, [orders]);

  const filtered = useMemo(() => {
    let list = orders;

    if (stage === "pending") {
      list = list.filter((o) => o.stage !== "received");
    } else if (stage !== "all") {
      list = list.filter((o) => o.stage === stage);
    }
    if (severity !== "all") {
      list = list.filter((o) => {
        if (o.stage !== "overdue") return false;
        const d = o.days_overdue;
        if (severity === "critical") return d >= 30;
        if (severity === "high")     return d >= 14 && d < 30;
        return d >= 3 && d < 14;
      });
    }
    if (supplier) list = list.filter((o) => (o.supplier_name || o.supplier) === supplier);
    if (minDays > 0) list = list.filter((o) => o.days_overdue >= minDays);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          (o.supplier_name || o.supplier || "").toLowerCase().includes(q) ||
          (o.status || "").toLowerCase().includes(q),
      );
    }

    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "days_desc":  return b.days_overdue - a.days_overdue;
        case "due_asc":    return (a.schedule_date || "9999").localeCompare(b.schedule_date || "9999");
        case "po_desc":    return (b.po_date || "").localeCompare(a.po_date || "");
        case "value_desc": return (b.grand_total || 0) - (a.grand_total || 0);
      }
    });
    return sorted;
  }, [orders, stage, severity, supplier, search, minDays, sortBy]);

  const clearFilters = () => {
    setStage("pending");
    setSeverity("all");
    setSupplier("");
    setSearch("");
    setMinDays(0);
    setSortBy("days_desc");
  };

  const activeFilterCount =
    (stage !== "pending" ? 1 : 0) +
    (severity !== "all" ? 1 : 0) +
    (supplier ? 1 : 0) +
    (search ? 1 : 0) +
    (minDays > 0 ? 1 : 0);

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/meeting-discussion")}
              className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center"
              title="Back to Meeting Discussion"
            >
              <ArrowLeft className="w-4 h-4 text-gray-700" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Purchase Orders</h1>
              <p className="text-xs text-gray-500">
                Vendor follow-ups, deliveries, and PO status
                {project && projects.find((p) => p.name === project) && (
                  <> · <span className="font-semibold text-gray-700">{projects.find((p) => p.name === project)?.project_name}</span></>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>

        {/* Stats strip */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <StatTile label="Total POs"      value={stats.total}            tone="gray" />
            <StatTile label="Overdue"        value={stats.overdue}          tone="red"
              onClick={() => { setStage("overdue"); setSeverity("all"); }} />
            <StatTile label="30+ days late"  value={stats.critical_overdue} tone="red"
              onClick={() => { setStage("overdue"); setSeverity("critical"); }} />
            <StatTile label="Partial receipt" value={stats.partial}         tone="amber"
              onClick={() => { setStage("partial"); setSeverity("all"); }} />
            <StatTile label="Awaiting"        value={stats.in_transit}      tone="blue"
              onClick={() => { setStage("in_transit"); setSeverity("all"); }} />
            <StatTile label="Open value"     value={fmtMoney(stats.open_value, "INR")} tone="indigo" small />
          </div>
        )}

        {/* Filters */}
        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px]">
                  {activeFilterCount}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-[180px] relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search PO, supplier, status…"
                className="w-full pl-8 pr-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-1 text-gray-600"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <Select label="Project" value={project} onChange={setProject}
              options={[{ value: "", label: "All projects" }, ...projects.map((p) => ({ value: p.name, label: `${p.project_name} (${p.name})` }))]}
            />
            <Select label="Stage" value={stage} onChange={(v) => setStage(v as any)}
              options={[
                { value: "pending",    label: "Pending (not received)" },
                { value: "all",        label: "All stages" },
                { value: "overdue",    label: "Overdue" },
                { value: "partial",    label: "Partial receipt" },
                { value: "in_transit", label: "Awaiting delivery" },
                { value: "ordered",    label: "Recently released" },
                { value: "received",   label: "Fully received" },
              ]}
            />
            <Select label="Severity" value={severity} onChange={(v) => setSeverity(v as any)}
              options={[
                { value: "all",      label: "Any delay" },
                { value: "critical", label: "Critical (30+ days late)" },
                { value: "high",     label: "High (14–29 days late)" },
                { value: "watch",    label: "Watch (3–13 days late)" },
              ]}
            />
            <Select label="Supplier" value={supplier} onChange={setSupplier}
              options={[{ value: "", label: "All suppliers" }, ...supplierOptions.map((s) => ({ value: s, label: s }))]}
            />
            <Select label="Sort by" value={sortBy} onChange={(v) => setSortBy(v as any)}
              options={[
                { value: "days_desc",  label: "Most overdue" },
                { value: "due_asc",    label: "Earliest due date" },
                { value: "po_desc",    label: "Newest PO" },
                { value: "value_desc", label: "Highest value" },
              ]}
            />
          </div>
        </div>

        {/* Results */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between text-xs">
            <div className="text-gray-600">
              Showing <span className="font-bold text-gray-900">{filtered.length}</span>
              {orders.length > filtered.length && (
                <> of <span className="font-semibold">{orders.length}</span></>
              )} PO{filtered.length === 1 ? "" : "s"}
            </div>
            {loading && <span className="text-gray-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</span>}
          </div>

          {error ? (
            <div className="p-6 text-sm text-red-700 bg-red-50">Failed to load: {error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              No purchase orders match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
                    <th className="text-left px-3 py-2 font-semibold">PO</th>
                    <th className="text-left px-3 py-2 font-semibold">Supplier</th>
                    <th className="text-left px-3 py-2 font-semibold">Stage</th>
                    <th className="text-left px-3 py-2 font-semibold">PO Date</th>
                    <th className="text-left px-3 py-2 font-semibold">Due</th>
                    <th className="text-right px-3 py-2 font-semibold">Late</th>
                    <th className="text-right px-3 py-2 font-semibold">Received</th>
                    <th className="text-right px-3 py-2 font-semibold">Value</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((po) => {
                    const meta = STAGE_META[po.stage];
                    return (
                      <tr key={po.name} className="hover:bg-amber-50/30">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                            <span className="font-semibold text-gray-900">{po.name}</span>
                          </div>
                          {po.project && (
                            <div className="text-[10px] text-gray-400 ml-4">{po.project}</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <Building2 className="w-3.5 h-3.5 text-gray-400" />
                            <span className="truncate max-w-[220px]" title={po.supplier_name || po.supplier}>
                              {po.supplier_name || po.supplier}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.pill}`}>
                            {meta.label}
                          </span>
                          {po.status && <div className="text-[10px] text-gray-400 mt-0.5">{po.status}</div>}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                          <Calendar className="inline w-3 h-3 text-gray-400 mr-1" />
                          {fmtDate(po.po_date)}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                          <Truck className="inline w-3 h-3 text-gray-400 mr-1" />
                          {fmtDate(po.schedule_date)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {po.days_overdue > 0 ? (
                            <span className={`font-bold ${po.days_overdue >= 30 ? "text-red-600" : po.days_overdue >= 14 ? "text-orange-600" : "text-amber-600"}`}>
                              {po.days_overdue}d
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <div className="w-16 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                              <div
                                className={`h-full ${
                                  po.per_received >= 100 ? "bg-emerald-500" :
                                  po.per_received > 0    ? "bg-amber-500"   : "bg-blue-400"
                                }`}
                                style={{ width: `${Math.min(100, Math.max(2, po.per_received))}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-semibold text-gray-600 tabular-nums w-8 text-right">
                              {po.per_received.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap font-semibold text-gray-900 tabular-nums">
                          <IndianRupee className="inline w-3 h-3 text-gray-400" />
                          {fmtMoney(po.grand_total, po.currency).replace(/^₹\s?/, "")}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <a
                            href={`${ERP_BASE}/app/purchase-order/${encodeURIComponent(po.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-blue-600 hover:bg-blue-50"
                            title="Open in ERPNext"
                          >
                            Open <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function StatTile({
  label, value, tone, onClick, small,
}: {
  label: string;
  value: number | string;
  tone: "gray" | "red" | "amber" | "blue" | "indigo";
  onClick?: () => void;
  small?: boolean;
}) {
  const tones: Record<string, string> = {
    gray:   "bg-gray-50 border-gray-200 text-gray-900",
    red:    "bg-red-50 border-red-200 text-red-700",
    amber:  "bg-amber-50 border-amber-200 text-amber-700",
    blue:   "bg-blue-50 border-blue-200 text-blue-700",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
  };
  const Tag: any = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-left transition ${tones[tone]} ${onClick ? "hover:shadow-sm hover:-translate-y-0.5" : ""}`}
    >
      <div className="text-[10px] uppercase tracking-wider font-bold opacity-70">{label}</div>
      <div className={`font-extrabold tabular-nums ${small ? "text-base" : "text-xl"}`}>{value}</div>
    </Tag>
  );
}

function Select({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
