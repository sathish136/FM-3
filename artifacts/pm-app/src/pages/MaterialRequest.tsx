import { Layout } from "@/components/Layout";
import {
  ShoppingCart, Plus, RefreshCw, Search, ExternalLink, X,
  Loader2, AlertCircle, ChevronDown, Trash2, CheckCircle2,
  Clock, FileText, Package, Calendar,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const ERPNEXT_URL = "https://erp.wttint.com";

interface MRItem {
  item_code: string;
  item_name?: string;
  qty: number;
  uom?: string;
  warehouse?: string;
  schedule_date?: string;
}

interface MaterialRequest {
  name: string;
  title: string | null;
  material_request_type: string;
  status: string;
  transaction_date: string;
  schedule_date: string | null;
  company: string | null;
  requested_by: string | null;
  items?: MRItem[];
}

const MR_TYPES = ["Purchase", "Material Transfer", "Material Issue", "Customer Provided", "Material Transfer for Manufacture"];
const MR_STATUSES = ["Draft", "Submitted", "Stopped", "Cancelled", "Pending"];

function statusBadge(status: string) {
  switch (status.toLowerCase()) {
    case "draft":
      return "bg-yellow-100 text-yellow-700 border border-yellow-200";
    case "submitted":
    case "approved":
      return "bg-green-100 text-green-700 border border-green-200";
    case "stopped":
    case "cancelled":
      return "bg-red-100 text-red-700 border border-red-200";
    case "pending":
      return "bg-blue-100 text-blue-700 border border-blue-200";
    default:
      return "bg-gray-100 text-gray-600 border border-gray-200";
  }
}

function statusIcon(status: string) {
  switch (status.toLowerCase()) {
    case "submitted": return <CheckCircle2 className="w-3 h-3" />;
    case "draft":     return <Clock className="w-3 h-3" />;
    case "pending":   return <Clock className="w-3 h-3" />;
    default:          return <FileText className="w-3 h-3" />;
  }
}

function typeBadge(type: string) {
  switch (type) {
    case "Purchase":                          return "bg-violet-100 text-violet-700";
    case "Material Transfer":                 return "bg-sky-100 text-sky-700";
    case "Material Issue":                    return "bg-orange-100 text-orange-700";
    case "Customer Provided":                 return "bg-teal-100 text-teal-700";
    case "Material Transfer for Manufacture": return "bg-indigo-100 text-indigo-700";
    default:                                  return "bg-gray-100 text-gray-600";
  }
}

function formatDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_ITEM: MRItem = { item_code: "", qty: 1, uom: "Nos" };

function ItemRow({
  item, index, items_list, warehouses,
  onChange, onRemove,
}: {
  item: MRItem;
  index: number;
  items_list: string[];
  warehouses: string[];
  onChange: (i: number, field: keyof MRItem, val: string | number) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
      <td className="px-3 py-2">
        {items_list.length > 0 ? (
          <select
            value={item.item_code}
            onChange={e => onChange(index, "item_code", e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Select item…</option>
            {items_list.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        ) : (
          <input
            value={item.item_code}
            onChange={e => onChange(index, "item_code", e.target.value)}
            placeholder="Item code"
            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        )}
      </td>
      <td className="px-3 py-2">
        <input
          type="number" min="0.001" step="any"
          value={item.qty}
          onChange={e => onChange(index, "qty", parseFloat(e.target.value) || 1)}
          className="w-24 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </td>
      <td className="px-3 py-2">
        <input
          value={item.uom || ""}
          onChange={e => onChange(index, "uom", e.target.value)}
          placeholder="Nos"
          className="w-24 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </td>
      <td className="px-3 py-2">
        {warehouses.length > 0 ? (
          <select
            value={item.warehouse || ""}
            onChange={e => onChange(index, "warehouse", e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">No warehouse</option>
            {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        ) : (
          <input
            value={item.warehouse || ""}
            onChange={e => onChange(index, "warehouse", e.target.value)}
            placeholder="Warehouse"
            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        )}
      </td>
      <td className="px-3 py-2">
        <input
          type="date"
          value={item.schedule_date || ""}
          onChange={e => onChange(index, "schedule_date", e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <button
          onClick={() => onRemove(index)}
          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          title="Remove item"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

export default function MaterialRequestPage() {
  const { toast } = useToast();

  const [records, setRecords] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [detail, setDetail] = useState<MaterialRequest | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [itemsList, setItemsList] = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);

  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("Purchase");
  const [formScheduleDate, setFormScheduleDate] = useState(today());
  const [formCompany, setFormCompany] = useState("");
  const [formItems, setFormItems] = useState<MRItem[]>([{ ...EMPTY_ITEM }]);
  const [submitting, setSubmitting] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter)   params.set("type", typeFilter);
      const res = await fetch(`${BASE}/api/material-requests?${params.toString()}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setRecords(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  useEffect(() => {
    fetch(`${BASE}/api/material-request-items`).then(r => r.json()).then(d => setItemsList(d)).catch(() => {});
    fetch(`${BASE}/api/warehouses`).then(r => r.json()).then(d => setWarehouses(d)).catch(() => {});
    fetch(`${BASE}/api/companies`).then(r => r.json()).then(d => {
      setCompanies(d);
      if (d.length > 0 && !formCompany) setFormCompany(d[0]);
    }).catch(() => {});
  }, []);

  const openDetail = async (mr: MaterialRequest) => {
    setDetail(mr);
    setDetailLoading(true);
    try {
      const res = await fetch(`${BASE}/api/material-requests/${encodeURIComponent(mr.name)}`);
      if (!res.ok) throw new Error("Failed to load detail");
      const data = await res.json();
      setDetail(data);
    } catch {
      // keep list-level data
    } finally {
      setDetailLoading(false);
    }
  };

  const updateItem = (i: number, field: keyof MRItem, val: string | number) => {
    setFormItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  };
  const removeItem = (i: number) => setFormItems(prev => prev.filter((_, idx) => idx !== i));
  const addItem = () => setFormItems(prev => [...prev, { ...EMPTY_ITEM }]);

  const handleCreate = async () => {
    if (!formTitle.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (formItems.some(it => !it.item_code.trim())) { toast({ title: "All items need an item code", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const payload = {
        title: formTitle,
        material_request_type: formType,
        schedule_date: formScheduleDate,
        company: formCompany || undefined,
        items: formItems,
      };
      const res = await fetch(`${BASE}/api/material-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      toast({ title: `Material Request ${data.name} created!` });
      setShowNew(false);
      setFormTitle(""); setFormType("Purchase"); setFormScheduleDate(today()); setFormItems([{ ...EMPTY_ITEM }]);
      fetchRecords();
    } catch (e) {
      toast({ title: "Error creating request", description: String(e), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = records.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(s) ||
      (r.title ?? "").toLowerCase().includes(s) ||
      (r.company ?? "").toLowerCase().includes(s) ||
      (r.requested_by ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <Layout>
      <div className="h-full flex flex-col bg-[#f8fafc] overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 shrink-0 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shrink-0">
            <ShoppingCart className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 leading-tight">Material Request</h1>
            <p className="text-xs text-gray-400 mt-0.5">Linked with ERPNext · {ERPNEXT_URL}</p>
          </div>
          <a
            href={`${ERPNEXT_URL}/app/material-request`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in ERPNext
          </a>
          <button
            onClick={fetchRecords}
            title="Refresh"
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Request
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 bg-white border-b border-gray-100 flex flex-wrap items-center gap-3 shrink-0">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search requests…"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">All Statuses</option>
            {MR_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">All Types</option>
            {MR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex">
          {/* List */}
          <div className={`flex-1 overflow-y-auto ${detail ? "hidden md:flex md:flex-col" : ""}`}>
            {loading && (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                <p className="text-sm">Loading material requests from ERPNext…</p>
              </div>
            )}
            {!loading && error && (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-red-500">
                <AlertCircle className="w-8 h-8" />
                <p className="text-sm font-medium">Failed to load</p>
                <p className="text-xs text-gray-400 max-w-sm text-center">{error}</p>
                <button onClick={fetchRecords} className="px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm hover:bg-red-100 transition-colors">
                  Retry
                </button>
              </div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
                <Package className="w-10 h-10 text-gray-200" />
                <p className="text-sm font-medium">No material requests found</p>
                <p className="text-xs">Try adjusting filters or create a new request</p>
              </div>
            )}
            {!loading && !error && filtered.length > 0 && (
              <div className="divide-y divide-gray-100">
                {filtered.map(mr => (
                  <button
                    key={mr.name}
                    onClick={() => openDetail(mr)}
                    className={`w-full text-left px-6 py-4 hover:bg-indigo-50/50 transition-colors group ${detail?.name === mr.name ? "bg-indigo-50 border-r-2 border-indigo-400" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                        <ShoppingCart className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-800 font-mono">{mr.name}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge(mr.status)}`}>
                            {statusIcon(mr.status)} {mr.status}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${typeBadge(mr.material_request_type)}`}>
                            {mr.material_request_type}
                          </span>
                        </div>
                        {mr.title && <p className="text-sm text-gray-600 mt-0.5 truncate">{mr.title}</p>}
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400 flex-wrap">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(mr.transaction_date)}</span>
                          {mr.schedule_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Required by {formatDate(mr.schedule_date)}</span>}
                          {mr.company && <span>{mr.company}</span>}
                          {mr.requested_by && <span>by {mr.requested_by}</span>}
                        </div>
                      </div>
                      <ExternalLink
                        className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-400 transition-colors shrink-0 mt-1"
                        onClick={e => { e.stopPropagation(); window.open(`${ERPNEXT_URL}/app/material-request/${mr.name}`, "_blank"); }}
                        title="Open in ERPNext"
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {detail && (
            <div className="w-full md:w-[420px] border-l border-gray-100 bg-white flex flex-col overflow-hidden shrink-0">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800 flex-1 truncate font-mono">{detail.name}</h2>
                <a
                  href={`${ERPNEXT_URL}/app/material-request/${detail.name}`}
                  target="_blank" rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  title="Open in ERPNext"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setDetail(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {detailLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(detail.status)}`}>
                      {statusIcon(detail.status)} {detail.status}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${typeBadge(detail.material_request_type)}`}>
                      {detail.material_request_type}
                    </span>
                  </div>

                  {detail.title && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Title / Purpose</p>
                      <p className="text-sm text-gray-800 font-medium">{detail.title}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Date</p>
                      <p className="text-sm text-gray-700">{formatDate(detail.transaction_date)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Required By</p>
                      <p className="text-sm text-gray-700">{formatDate(detail.schedule_date)}</p>
                    </div>
                    {detail.company && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Company</p>
                        <p className="text-sm text-gray-700">{detail.company}</p>
                      </div>
                    )}
                    {detail.requested_by && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Requested By</p>
                        <p className="text-sm text-gray-700">{detail.requested_by}</p>
                      </div>
                    )}
                  </div>

                  {detail.items && detail.items.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Items ({detail.items.length})</p>
                      <div className="space-y-2">
                        {detail.items.map((it, i) => (
                          <div key={i} className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                            <p className="text-sm font-semibold text-gray-800">{it.item_name || it.item_code}</p>
                            {it.item_name && it.item_code !== it.item_name && (
                              <p className="text-xs text-gray-400 font-mono">{it.item_code}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                              <span>Qty: <b>{it.qty}</b> {it.uom}</span>
                              {it.warehouse && <span>→ {it.warehouse}</span>}
                              {it.schedule_date && <span><Calendar className="w-3 h-3 inline mr-0.5" />{formatDate(it.schedule_date)}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Material Request Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-base font-bold text-gray-900 flex-1">New Material Request</h2>
              <button onClick={() => setShowNew(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Header fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Title / Purpose <span className="text-red-500">*</span></label>
                  <input
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="e.g. Monthly procurement for Workshop"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Request Type</label>
                  <div className="relative">
                    <select
                      value={formType}
                      onChange={e => setFormType(e.target.value)}
                      className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 pr-8"
                    >
                      {MR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Required By <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={formScheduleDate}
                    onChange={e => setFormScheduleDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                {companies.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Company</label>
                    <div className="relative">
                      <select
                        value={formCompany}
                        onChange={e => setFormCompany(e.target.value)}
                        className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 pr-8"
                      >
                        {companies.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>

              {/* Items table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-600">Items <span className="text-red-500">*</span></label>
                  <button
                    onClick={addItem}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Item Code</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Qty</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">UOM</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Warehouse</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Required By</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formItems.map((item, i) => (
                        <ItemRow
                          key={i}
                          item={item}
                          index={i}
                          items_list={itemsList}
                          warehouses={warehouses}
                          onChange={updateItem}
                          onRemove={removeItem}
                        />
                      ))}
                    </tbody>
                  </table>
                  {formItems.length === 0 && (
                    <div className="py-6 text-center text-sm text-gray-400">
                      No items added yet. Click "Add Item" to start.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => setShowNew(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-60 shadow-sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                {submitting ? "Creating…" : "Create in ERPNext"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
