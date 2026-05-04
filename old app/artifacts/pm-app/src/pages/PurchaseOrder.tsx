import { Layout } from "@/components/Layout";
import {
  ShoppingBag, RefreshCw, Search, ExternalLink, X,
  Loader2, AlertCircle, ChevronDown, Package,
  Calendar, FileText, Building2, TrendingUp,
  ArrowUpDown, ChevronUp, ChevronDown as ChevronDownIcon,
  Truck, DollarSign, CheckCircle2, Clock, Ban,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const ERPNEXT_URL = "https://erp.wttint.com";

interface POItem {
  name: string;
  item_code: string;
  item_name: string;
  description: string | null;
  qty: number;
  uom: string;
  rate: number;
  amount: number;
  received_qty: number;
  billed_amt: number;
  warehouse: string | null;
  schedule_date: string | null;
}

interface PurchaseOrder {
  name: string;
  supplier: string;
  supplier_name: string | null;
  status: string;
  transaction_date: string;
  schedule_date: string | null;
  company: string | null;
  project: string | null;
  grand_total: number;
  currency: string | null;
  modified: string | null;
  owner: string | null;
  per_received: number;
  per_billed: number;
  items?: POItem[];
}

const PO_STATUSES = ["Draft", "To Receive and Bill", "To Bill", "To Receive", "Completed", "Cancelled", "Closed"];

function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

function formatCurrency(amount: number, currency?: string | null) {
  const sym = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";
  if (amount >= 10000000) return `${sym}${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `${sym}${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `${sym}${(amount / 1000).toFixed(1)}K`;
  return `${sym}${amount.toFixed(2)}`;
}

type StatusCfg = { label: string; dot: string; badge: string; icon: React.ElementType };

function statusCfg(status: string): StatusCfg {
  const s = (status || "").toLowerCase();
  if (s === "completed")
    return { label: status, dot: "bg-emerald-500", badge: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle2 };
  if (s === "to receive and bill" || s === "to receive")
    return { label: status, dot: "bg-blue-500", badge: "text-blue-700 bg-blue-50 border-blue-200", icon: Truck };
  if (s === "to bill")
    return { label: status, dot: "bg-amber-500", badge: "text-amber-700 bg-amber-50 border-amber-200", icon: DollarSign };
  if (s === "cancelled" || s === "closed")
    return { label: status, dot: "bg-red-400", badge: "text-red-700 bg-red-50 border-red-200", icon: Ban };
  if (s === "draft")
    return { label: status, dot: "bg-slate-400", badge: "text-slate-600 bg-slate-100 border-slate-200", icon: Clock };
  return { label: status || "Draft", dot: "bg-slate-400", badge: "text-slate-600 bg-slate-100 border-slate-200", icon: Clock };
}

const AVATAR_COLORS = [
  "bg-violet-500", "bg-indigo-500", "bg-blue-500", "bg-cyan-500",
  "bg-teal-500", "bg-emerald-500", "bg-amber-500", "bg-orange-500",
  "bg-rose-500", "bg-pink-500",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

type SortKey = "name" | "supplier_name" | "transaction_date" | "grand_total" | "status" | "per_received";
type SortDir = "asc" | "desc";

export default function PurchaseOrder() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("transaction_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (supplierFilter) params.set("supplier", supplierFilter);
      const res = await fetch(`${BASE}/api/purchase-orders?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setOrders(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, supplierFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const openDetail = async (po: PurchaseOrder) => {
    setSelected(po);
    setDetailLoading(true);
    try {
      const res = await fetch(`${BASE}/api/purchase-orders/${encodeURIComponent(po.name)}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSelected(data);
    } catch (e) {
      toast({ title: "Error loading details", description: String(e), variant: "destructive" });
    } finally {
      setDetailLoading(false);
    }
  };

  const sort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = orders.filter(o => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !o.name.toLowerCase().includes(q) &&
        !(o.supplier_name || o.supplier).toLowerCase().includes(q) &&
        !(o.project || "").toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let va: any, vb: any;
    if (sortKey === "grand_total") { va = a.grand_total; vb = b.grand_total; }
    else if (sortKey === "per_received") { va = a.per_received; vb = b.per_received; }
    else if (sortKey === "transaction_date") { va = a.transaction_date; vb = b.transaction_date; }
    else { va = (a[sortKey] || "").toString().toLowerCase(); vb = (b[sortKey] || "").toString().toLowerCase(); }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortDir === "asc"
        ? <ChevronUp className="w-3 h-3 text-indigo-500" />
        : <ChevronDownIcon className="w-3 h-3 text-indigo-500" />
      : <ArrowUpDown className="w-3 h-3 text-slate-400" />;

  // Summary stats
  const totalValue = orders.reduce((s, o) => s + (o.grand_total || 0), 0);
  const pendingCount = orders.filter(o => o.status === "To Receive and Bill" || o.status === "To Receive").length;
  const completedCount = orders.filter(o => o.status === "Completed").length;
  const draftCount = orders.filter(o => o.status === "Draft").length;

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5 max-w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Purchase Orders</h1>
              <p className="text-xs text-gray-500">{orders.length} orders · synced from ERPNext</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`${ERPNEXT_URL}/app/purchase-order`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in ERPNext
            </a>
            <button
              onClick={fetchOrders}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Value", value: formatCurrency(totalValue, orders[0]?.currency), icon: DollarSign, color: "text-indigo-600", bg: "bg-indigo-50" },
            { label: "Pending Receipt", value: pendingCount.toString(), icon: Truck, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Completed", value: completedCount.toString(), icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Drafts", value: draftCount.toString(), icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}>
                <card.icon className={`w-4.5 h-4.5 ${card.color}`} style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{card.label}</p>
                <p className="text-lg font-bold text-gray-900 leading-tight">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by PO number, supplier, project…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 shadow-sm min-w-[160px]"
          >
            <option value="">All Statuses</option>
            {PO_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              <span className="text-sm">Loading purchase orders…</span>
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
              <ShoppingBag className="w-8 h-8" />
              <p className="text-sm font-medium">No purchase orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {([
                      ["name", "PO Number"],
                      ["supplier_name", "Supplier"],
                      ["transaction_date", "Date"],
                      ["grand_total", "Amount"],
                      ["status", "Status"],
                      ["per_received", "Receipt %"],
                    ] as [SortKey, string][]).map(([key, label]) => (
                      <th
                        key={key}
                        onClick={() => sort(key)}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
                      >
                        <span className="flex items-center gap-1">
                          {label}
                          <SortIcon k={key} />
                        </span>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Project</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Modified</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sorted.map(po => {
                    const cfg = statusCfg(po.status);
                    const supplierDisplay = po.supplier_name || po.supplier;
                    const StatusIcon = cfg.icon;
                    return (
                      <tr
                        key={po.name}
                        onClick={() => openDetail(po)}
                        className="hover:bg-indigo-50/30 cursor-pointer transition-colors group"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-700">
                          {po.name}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg ${avatarColor(po.supplier)} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
                              {initials(supplierDisplay)}
                            </div>
                            <span className="font-medium text-gray-800 truncate max-w-[160px]">{supplierDisplay}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(po.transaction_date)}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                          {formatCurrency(po.grand_total, po.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full border ${cfg.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {po.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-blue-500 transition-all"
                                style={{ width: `${Math.min(100, po.per_received || 0)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 tabular-nums w-8 text-right">
                              {(po.per_received || 0).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 truncate max-w-[140px]">
                          {po.project || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                          {timeAgo(po.modified)}
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={`${ERPNEXT_URL}/app/purchase-order/${encodeURIComponent(po.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-500"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
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

        <p className="text-xs text-gray-400 text-right">{sorted.length} of {orders.length} orders</p>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-mono font-bold text-gray-900 text-sm">{selected.name}</p>
                  <p className="text-xs text-gray-500">{selected.supplier_name || selected.supplier}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`${ERPNEXT_URL}/app/purchase-order/${encodeURIComponent(selected.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {detailLoading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                  <span className="text-sm">Loading details…</span>
                </div>
              ) : (
                <div className="p-5 space-y-5">
                  {/* Status + Amounts */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${statusCfg(selected.status).badge}`}>
                      <span className={`w-2 h-2 rounded-full ${statusCfg(selected.status).dot}`} />
                      {selected.status}
                    </span>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(selected.grand_total, selected.currency)}</p>
                      <p className="text-xs text-gray-400">{selected.currency || "INR"}</p>
                    </div>
                  </div>

                  {/* Receipt + Bill Progress */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                          <Truck className="w-3 h-3" /> Received
                        </span>
                        <span className="text-sm font-bold text-blue-800">{(selected.per_received || 0).toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-blue-100 rounded-full">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, selected.per_received || 0)}%` }} />
                      </div>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                          <DollarSign className="w-3 h-3" /> Billed
                        </span>
                        <span className="text-sm font-bold text-amber-800">{(selected.per_billed || 0).toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-amber-100 rounded-full">
                        <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${Math.min(100, selected.per_billed || 0)}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100">
                    {[
                      { icon: Building2, label: "Supplier", value: selected.supplier_name || selected.supplier },
                      { icon: Calendar, label: "Order Date", value: formatDate(selected.transaction_date) },
                      { icon: Calendar, label: "Expected Delivery", value: formatDate(selected.schedule_date) },
                      { icon: FileText, label: "Company", value: selected.company || "—" },
                      { icon: TrendingUp, label: "Project", value: selected.project || "—" },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3 px-4 py-3">
                        <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
                        <span className="text-sm text-gray-800 font-medium flex-1 truncate">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Line Items */}
                  {selected.items && selected.items.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-indigo-500" />
                        Items ({selected.items.length})
                      </h3>
                      <div className="space-y-2">
                        {selected.items.map((item, i) => (
                          <div key={item.name || i} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <p className="text-sm font-semibold text-gray-800">{item.item_name}</p>
                                <p className="text-xs text-gray-400 font-mono">{item.item_code}</p>
                              </div>
                              <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
                                {formatCurrency(item.amount, selected.currency)}
                              </p>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                              <div>
                                <span className="text-gray-400">Qty</span>
                                <p className="font-semibold text-gray-700">{item.qty} {item.uom}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Rate</span>
                                <p className="font-semibold text-gray-700">{formatCurrency(item.rate, selected.currency)}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Received</span>
                                <p className="font-semibold text-gray-700">{item.received_qty} {item.uom}</p>
                              </div>
                            </div>
                            {/* Item receipt progress */}
                            {item.qty > 0 && (
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1 bg-gray-100 rounded-full">
                                  <div
                                    className="h-full rounded-full bg-blue-400 transition-all"
                                    style={{ width: `${Math.min(100, (item.received_qty / item.qty) * 100)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-gray-400 tabular-nums w-8 text-right">
                                  {((item.received_qty / item.qty) * 100).toFixed(0)}%
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
