import { useState, useMemo, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import {
  Package, Warehouse, RefreshCw, Download, Search, X,
  ChevronDown, ChevronUp, ChevronsUpDown, BarChart3,
  ArrowUpDown, TrendingUp, AlertCircle, Layers, ClipboardList,
  Filter, Calendar,
} from "lucide-react";
import * as XLSX from "xlsx";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function fmt(n: any, decimals = 2): string {
  const num = parseFloat(String(n ?? 0));
  if (isNaN(num)) return "—";
  return num.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtAmt(n: any): string {
  const num = parseFloat(String(n ?? 0));
  if (isNaN(num)) return "—";
  return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getRows(data: any): Record<string, any>[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  const msg = data?.message;
  if (!msg) return [];
  if (Array.isArray(msg)) return msg;
  if (Array.isArray(msg.data)) return msg.data;
  if (typeof msg === "object" && msg !== null) {
    const vals = Object.values(msg);
    if (vals.length > 0 && Array.isArray(vals[0])) return vals[0] as Record<string, any>[];
  }
  return [];
}

function exportToExcel(rows: Record<string, any>[], filename: string) {
  if (!rows.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stock Report");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

type SortDir = "asc" | "desc" | null;
type Tab = "summary" | "itemwise" | "warehousewise" | "ledger";

function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === "asc") return <ChevronUp className="w-3 h-3 ml-1 inline" />;
  if (dir === "desc") return <ChevronDown className="w-3 h-3 ml-1 inline" />;
  return <ChevronsUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
}

function useSortable<T extends Record<string, any>>(rows: T[]) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const an = parseFloat(av), bn = parseFloat(bv);
      let cmp: number;
      if (!isNaN(an) && !isNaN(bn)) cmp = an - bn;
      else cmp = String(av ?? "").localeCompare(String(bv ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  const onSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); }
    else if (sortDir === "asc") setSortDir("desc");
    else { setSortKey(null); setSortDir(null); }
  };

  const dir = (key: string): SortDir => sortKey === key ? sortDir : null;

  return { sorted, onSort, dir };
}

function Th({ label, sortKey, onSort, dir }: { label: string; sortKey: string; onSort: (k: string) => void; dir: SortDir }) {
  return (
    <th
      onClick={() => onSort(sortKey)}
      className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:text-gray-800 transition-colors"
    >
      {label}<SortIcon dir={dir} />
    </th>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
      </div>
    </div>
  );
}

function FilterBar({
  search, setSearch,
  project, setProject, projects,
  warehouse, setWarehouse, warehouses,
  fromDate, setFromDate,
  toDate, setToDate,
  showDates,
}: {
  search: string; setSearch: (v: string) => void;
  project: string; setProject: (v: string) => void; projects: string[];
  warehouse: string; setWarehouse: (v: string) => void; warehouses: string[];
  fromDate: string; setFromDate: (v: string) => void;
  toDate: string; setToDate: (v: string) => void;
  showDates?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="flex items-center gap-2 border border-gray-300 rounded-xl px-3 py-2 bg-white min-w-[200px]">
        <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items…"
          className="text-sm outline-none text-gray-700 flex-1 placeholder-gray-400"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <select
        value={project}
        onChange={(e) => setProject(e.target.value)}
        className="text-sm border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-700 outline-none cursor-pointer"
      >
        <option value="">All Projects</option>
        {projects.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>

      <select
        value={warehouse}
        onChange={(e) => setWarehouse(e.target.value)}
        className="text-sm border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-700 outline-none cursor-pointer"
      >
        <option value="">All Warehouses</option>
        {warehouses.map((w) => <option key={w} value={w}>{w}</option>)}
      </select>

      {showDates && (
        <>
          <div className="flex items-center gap-2 border border-gray-300 rounded-xl px-3 py-2 bg-white">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className="text-sm outline-none text-gray-700 bg-transparent" />
          </div>
          <div className="flex items-center gap-2 border border-gray-300 rounded-xl px-3 py-2 bg-white">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="text-sm outline-none text-gray-700 bg-transparent" />
          </div>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────
// Summary Tab (project-level stock from WTT)
// ──────────────────────────────────────────
function SummaryTab({ project, warehouses }: { project: string; warehouses: string[] }) {
  const [warehouse, setWarehouse] = useState("");
  const [search, setSearch] = useState("");
  const [, setProject] = useState(project);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["stock-summary", project],
    queryFn: () => {
      const params = new URLSearchParams();
      if (project) params.set("project", project);
      return fetch(`${BASE}/api/stock-reports/summary?${params}`).then((r) => r.json());
    },
    staleTime: 60_000,
  });

  const allRows: Record<string, any>[] = useMemo(() => getRows(data), [data]);

  const filtered = useMemo(() => allRows.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q || Object.values(r).some((v) => String(v).toLowerCase().includes(q));
    const matchWh = !warehouse || String(r.warehouse ?? "").toLowerCase().includes(warehouse.toLowerCase());
    return matchSearch && matchWh;
  }), [allRows, search, warehouse]);

  const { sorted, onSort, dir } = useSortable(filtered);

  const totalQty = filtered.reduce((s, r) => s + parseFloat(r.actual_qty ?? r.qty ?? 0), 0);
  const totalVal = filtered.reduce((s, r) => s + parseFloat(r.stock_value ?? r.amount ?? 0), 0);
  const uniqueItems = new Set(filtered.map((r) => r.item_code)).size;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Package} label="Total Items" value={String(uniqueItems)} color="bg-blue-50 text-blue-600" />
        <StatCard icon={BarChart3} label="Total Qty" value={fmt(totalQty, 1)} color="bg-teal-50 text-teal-600" />
        <StatCard icon={TrendingUp} label="Stock Value" value={fmtAmt(totalVal)} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={Layers} label="Rows" value={String(filtered.length)} color="bg-violet-50 text-violet-600" />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <FilterBar
          search={search} setSearch={setSearch}
          project={project} setProject={setProject} projects={[]}
          warehouse={warehouse} setWarehouse={setWarehouse} warehouses={warehouses}
          fromDate="" setFromDate={() => {}} toDate="" setToDate={() => {}}
        />
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button onClick={() => exportToExcel(sorted, "stock-summary")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {isFetching ? (
        <LoadingState />
      ) : sorted.length === 0 ? (
        <EmptyState msg={allRows.length === 0 ? "No stock data available" : "No results match your filters"} />
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
                  {Object.keys(sorted[0] || {}).slice(0, 8).map((k) => (
                    <Th key={k} label={k.replace(/_/g, " ")} sortKey={k} onSort={onSort} dir={dir(k)} />
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((row, i) => (
                  <tr key={i} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                    {Object.keys(sorted[0] || {}).slice(0, 8).map((k) => (
                      <td key={k} className="px-4 py-2.5 text-gray-700 whitespace-nowrap text-xs">
                        {String(row[k] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────
// Item-wise Tab (Bin doctype)
// ──────────────────────────────────────────
function ItemwiseTab({ warehouses }: { warehouses: string[] }) {
  const [search, setSearch] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [, setProject] = useState("");

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["stock-bin", warehouse, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (warehouse) params.set("warehouse", warehouse);
      if (search) params.set("search", search);
      return fetch(`${BASE}/api/stock-reports/bin?${params}`).then((r) => r.json());
    },
    staleTime: 60_000,
  });

  const allRows = useMemo<Record<string, any>[]>(() => {
    const d = data?.data ?? data?.message ?? data ?? [];
    return Array.isArray(d) ? d : [];
  }, [data]);

  const filtered = useMemo(() => allRows.filter((r) => {
    const q = search.toLowerCase();
    return !q || String(r.item_code ?? "").toLowerCase().includes(q)
      || String(r.item_name ?? "").toLowerCase().includes(q);
  }), [allRows, search]);

  const { sorted, onSort, dir } = useSortable(filtered);

  const totalQty = filtered.reduce((s, r) => s + parseFloat(r.actual_qty ?? 0), 0);
  const totalVal = filtered.reduce((s, r) => s + parseFloat(r.stock_value ?? 0), 0);
  const uniqueWh = new Set(filtered.map((r) => r.warehouse)).size;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Package} label="Unique Items" value={String(new Set(filtered.map((r) => r.item_code)).size)} color="bg-blue-50 text-blue-600" />
        <StatCard icon={Warehouse} label="Warehouses" value={String(uniqueWh)} color="bg-teal-50 text-teal-600" />
        <StatCard icon={TrendingUp} label="Total Qty" value={fmt(totalQty, 1)} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={BarChart3} label="Stock Value" value={fmtAmt(totalVal)} color="bg-violet-50 text-violet-600" />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <FilterBar
          search={search} setSearch={setSearch}
          project="" setProject={setProject} projects={[]}
          warehouse={warehouse} setWarehouse={setWarehouse} warehouses={warehouses}
          fromDate="" setFromDate={() => {}} toDate="" setToDate={() => {}}
        />
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button onClick={() => exportToExcel(sorted.map((r) => ({
            "Item Code": r.item_code,
            "Item Name": r.item_name,
            "Warehouse": r.warehouse,
            "Actual Qty": r.actual_qty,
            "Projected Qty": r.projected_qty,
            "Reserved Qty": r.reserved_qty,
            "UOM": r.stock_uom,
            "Valuation Rate": r.valuation_rate,
            "Stock Value": r.stock_value,
          })), "item-wise-stock")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {isFetching ? (
        <LoadingState />
      ) : sorted.length === 0 ? (
        <EmptyState msg={allRows.length === 0 ? "No stock data from ERPNext" : "No results match your filters"} />
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 w-8">#</th>
                  <Th label="Item Code" sortKey="item_code" onSort={onSort} dir={dir("item_code")} />
                  <Th label="Item Name" sortKey="item_name" onSort={onSort} dir={dir("item_name")} />
                  <Th label="Warehouse" sortKey="warehouse" onSort={onSort} dir={dir("warehouse")} />
                  <Th label="Actual Qty" sortKey="actual_qty" onSort={onSort} dir={dir("actual_qty")} />
                  <Th label="Projected Qty" sortKey="projected_qty" onSort={onSort} dir={dir("projected_qty")} />
                  <Th label="Reserved Qty" sortKey="reserved_qty" onSort={onSort} dir={dir("reserved_qty")} />
                  <Th label="UOM" sortKey="stock_uom" onSort={onSort} dir={dir("stock_uom")} />
                  <Th label="Val. Rate" sortKey="valuation_rate" onSort={onSort} dir={dir("valuation_rate")} />
                  <Th label="Stock Value" sortKey="stock_value" onSort={onSort} dir={dir("stock_value")} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((r, i) => (
                  <tr key={i} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-gray-900 whitespace-nowrap">{r.item_code}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-700 max-w-[200px] truncate">{r.item_name}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{r.warehouse}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold text-gray-900 text-right tabular-nums">{fmt(r.actual_qty, 2)}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 text-right tabular-nums">{fmt(r.projected_qty, 2)}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 text-right tabular-nums">{fmt(r.reserved_qty, 2)}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{r.stock_uom}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-700 text-right tabular-nums">{fmtAmt(r.valuation_rate)}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold text-emerald-700 text-right tabular-nums">{fmtAmt(r.stock_value)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={4} className="px-4 py-2.5 text-xs font-bold text-gray-600">Total ({sorted.length} rows)</td>
                  <td className="px-4 py-2.5 text-xs font-bold text-gray-900 text-right tabular-nums">{fmt(totalQty, 2)}</td>
                  <td colSpan={4} />
                  <td className="px-4 py-2.5 text-xs font-bold text-emerald-700 text-right tabular-nums">{fmtAmt(totalVal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────
// Warehouse-wise Tab (aggregate Bin by warehouse)
// ──────────────────────────────────────────
function WarehousewiseTab() {
  const [search, setSearch] = useState("");

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["stock-bin-all"],
    queryFn: () => fetch(`${BASE}/api/stock-reports/bin`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const allRows = useMemo<Record<string, any>[]>(() => {
    const d = data?.data ?? data?.message ?? data ?? [];
    return Array.isArray(d) ? d : [];
  }, [data]);

  const warehouseAgg = useMemo(() => {
    const map: Record<string, { warehouse: string; item_count: number; total_qty: number; stock_value: number }> = {};
    for (const r of allRows) {
      const wh = r.warehouse ?? "Unknown";
      if (!map[wh]) map[wh] = { warehouse: wh, item_count: 0, total_qty: 0, stock_value: 0 };
      map[wh].item_count++;
      map[wh].total_qty += parseFloat(r.actual_qty ?? 0);
      map[wh].stock_value += parseFloat(r.stock_value ?? 0);
    }
    return Object.values(map);
  }, [allRows]);

  const filtered = useMemo(() => warehouseAgg.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.warehouse.toLowerCase().includes(q);
  }), [warehouseAgg, search]);

  const { sorted, onSort, dir } = useSortable(filtered);

  const totalVal = filtered.reduce((s, r) => s + r.stock_value, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={Warehouse} label="Warehouses" value={String(filtered.length)} color="bg-teal-50 text-teal-600" />
        <StatCard icon={Package} label="Unique Items" value={String(allRows.length)} color="bg-blue-50 text-blue-600" />
        <StatCard icon={TrendingUp} label="Total Stock Value" value={fmtAmt(totalVal)} color="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 border border-gray-300 rounded-xl px-3 py-2 bg-white">
          <Search className="w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search warehouses…"
            className="text-sm outline-none text-gray-700 placeholder-gray-400 w-40" />
          {search && <button onClick={() => setSearch("")}><X className="w-3 h-3 text-gray-400" /></button>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button onClick={() => exportToExcel(sorted.map((r) => ({
            Warehouse: r.warehouse,
            "Item Count": r.item_count,
            "Total Qty": r.total_qty,
            "Stock Value (₹)": r.stock_value,
          })), "warehouse-wise-stock")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {isFetching ? (
        <LoadingState />
      ) : sorted.length === 0 ? (
        <EmptyState msg="No warehouse stock data available" />
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 w-8">#</th>
                  <Th label="Warehouse" sortKey="warehouse" onSort={onSort} dir={dir("warehouse")} />
                  <Th label="Items in Stock" sortKey="item_count" onSort={onSort} dir={dir("item_count")} />
                  <Th label="Total Qty" sortKey="total_qty" onSort={onSort} dir={dir("total_qty")} />
                  <Th label="Stock Value" sortKey="stock_value" onSort={onSort} dir={dir("stock_value")} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((r, i) => {
                  const pct = totalVal > 0 ? (r.stock_value / totalVal) * 100 : 0;
                  return (
                    <tr key={i} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5 text-xs font-semibold text-gray-900">{r.warehouse}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-700 text-right">{r.item_count}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-700 text-right tabular-nums">{fmt(r.total_qty, 2)}</td>
                      <td className="px-4 py-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-[60px]">
                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-semibold text-emerald-700 tabular-nums whitespace-nowrap">{fmtAmt(r.stock_value)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={4} className="px-4 py-2.5 text-xs font-bold text-gray-600">Total ({sorted.length} warehouses)</td>
                  <td className="px-4 py-2.5 text-xs font-bold text-emerald-700 text-right tabular-nums">{fmtAmt(totalVal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────
// Ledger Tab (Stock Ledger Entries)
// ──────────────────────────────────────────
function LedgerTab({ warehouses }: { warehouses: string[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [search, setSearch] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [fromDate, setFromDate] = useState(monthAgo);
  const [toDate, setToDate] = useState(today);
  const [, setProject] = useState("");

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["stock-ledger", fromDate, toDate, warehouse, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (fromDate) params.set("from_date", fromDate);
      if (toDate) params.set("to_date", toDate);
      if (warehouse) params.set("warehouse", warehouse);
      if (search) params.set("item_code", search);
      return fetch(`${BASE}/api/stock-reports/ledger?${params}`).then((r) => r.json());
    },
    staleTime: 60_000,
  });

  const allRows = useMemo<Record<string, any>[]>(() => {
    const d = data?.data ?? data?.message ?? data ?? [];
    return Array.isArray(d) ? d : [];
  }, [data]);

  const { sorted, onSort, dir } = useSortable(allRows);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={ClipboardList} label="Entries" value={String(sorted.length)} color="bg-blue-50 text-blue-600" />
        <StatCard icon={Package} label="Unique Items" value={String(new Set(sorted.map((r) => r.item_code)).size)} color="bg-teal-50 text-teal-600" />
        <StatCard icon={Warehouse} label="Warehouses" value={String(new Set(sorted.map((r) => r.warehouse)).size)} color="bg-violet-50 text-violet-600" />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <FilterBar
          search={search} setSearch={setSearch}
          project="" setProject={setProject} projects={[]}
          warehouse={warehouse} setWarehouse={setWarehouse} warehouses={warehouses}
          fromDate={fromDate} setFromDate={setFromDate}
          toDate={toDate} setToDate={setToDate}
          showDates
        />
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button onClick={() => exportToExcel(sorted.map((r) => ({
            "Item Code": r.item_code,
            "Item Name": r.item_name,
            "Warehouse": r.warehouse,
            "Date": r.posting_date,
            "Qty Change": r.actual_qty,
            "Qty After": r.qty_after_transaction,
            "UOM": r.stock_uom,
            "Val Rate": r.valuation_rate,
            "Val Diff": r.stock_value_difference,
            "Voucher Type": r.voucher_type,
            "Voucher No": r.voucher_no,
          })), "stock-ledger")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {isFetching ? (
        <LoadingState />
      ) : sorted.length === 0 ? (
        <EmptyState msg="No stock ledger entries for the selected period" />
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 w-8">#</th>
                  <Th label="Date" sortKey="posting_date" onSort={onSort} dir={dir("posting_date")} />
                  <Th label="Item Code" sortKey="item_code" onSort={onSort} dir={dir("item_code")} />
                  <Th label="Item Name" sortKey="item_name" onSort={onSort} dir={dir("item_name")} />
                  <Th label="Warehouse" sortKey="warehouse" onSort={onSort} dir={dir("warehouse")} />
                  <Th label="Qty Change" sortKey="actual_qty" onSort={onSort} dir={dir("actual_qty")} />
                  <Th label="Qty After" sortKey="qty_after_transaction" onSort={onSort} dir={dir("qty_after_transaction")} />
                  <Th label="UOM" sortKey="stock_uom" onSort={onSort} dir={dir("stock_uom")} />
                  <Th label="Val. Rate" sortKey="valuation_rate" onSort={onSort} dir={dir("valuation_rate")} />
                  <Th label="Value Diff" sortKey="stock_value_difference" onSort={onSort} dir={dir("stock_value_difference")} />
                  <Th label="Voucher Type" sortKey="voucher_type" onSort={onSort} dir={dir("voucher_type")} />
                  <Th label="Voucher No." sortKey="voucher_no" onSort={onSort} dir={dir("voucher_no")} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((r, i) => {
                  const qty = parseFloat(r.actual_qty ?? 0);
                  const isIn = qty >= 0;
                  return (
                    <tr key={i} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{r.posting_date}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-gray-900 whitespace-nowrap">{r.item_code}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-700 max-w-[180px] truncate">{r.item_name}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{r.warehouse}</td>
                      <td className={`px-4 py-2.5 text-xs font-bold text-right tabular-nums ${isIn ? "text-emerald-600" : "text-red-600"}`}>
                        {isIn ? "+" : ""}{fmt(r.actual_qty, 3)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-700 text-right tabular-nums">{fmt(r.qty_after_transaction, 3)}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{r.stock_uom}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-700 text-right tabular-nums">{fmtAmt(r.valuation_rate)}</td>
                      <td className={`px-4 py-2.5 text-xs font-semibold text-right tabular-nums ${parseFloat(r.stock_value_difference ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {fmtAmt(r.stock_value_difference)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                          {r.voucher_type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-gray-600 whitespace-nowrap">{r.voucher_no}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────
// Shared UI helpers
// ──────────────────────────────────────────
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center animate-pulse">
        <Package className="w-6 h-6 text-gray-300" />
      </div>
      <p className="text-sm">Loading stock data…</p>
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-gray-300" />
      </div>
      <p className="text-sm text-gray-500">{msg}</p>
    </div>
  );
}

// ──────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "summary",       label: "Stock Summary",    icon: BarChart3,    desc: "Project-level stock totals from ERPNext" },
  { id: "itemwise",      label: "Item-wise",         icon: Package,      desc: "Current stock per item across warehouses" },
  { id: "warehousewise", label: "Warehouse-wise",    icon: Warehouse,    desc: "Aggregated stock per warehouse" },
  { id: "ledger",        label: "Stock Ledger",      icon: ClipboardList, desc: "Stock movement history by date range" },
];

export default function StockReports() {
  const [activeTab, setActiveTab] = useState<Tab>("itemwise");
  const [projectFilter, setProjectFilter] = useState("");

  const { data: warehousesData } = useQuery({
    queryKey: ["stock-warehouses"],
    queryFn: () => fetch(`${BASE}/api/stock-reports/warehouses`).then((r) => r.json()),
    staleTime: 300_000,
  });

  const { data: projectsData } = useQuery({
    queryKey: ["stock-projects"],
    queryFn: () => fetch(`${BASE}/api/stock-reports/projects`).then((r) => r.json()),
    staleTime: 300_000,
  });

  const warehouses = useMemo<string[]>(() => {
    const d = warehousesData?.data ?? warehousesData?.message ?? [];
    return Array.isArray(d) ? d.map((w: any) => w.name ?? w.warehouse_name).filter(Boolean) : [];
  }, [warehousesData]);

  const projects = useMemo<string[]>(() => {
    const d = projectsData?.data ?? projectsData?.message ?? [];
    return Array.isArray(d) ? d.map((p: any) => p.name).filter(Boolean) : [];
  }, [projectsData]);

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Page Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 bg-white">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Stock Reports</h1>
                <p className="text-sm text-gray-500">Live inventory data from ERPNext</p>
              </div>
            </div>
            {activeTab === "summary" && (
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-700 outline-none cursor-pointer"
              >
                <option value="">All Projects</option>
                {projects.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  activeTab === tab.id
                    ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-300 hover:border-teal-400 hover:text-teal-700"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === "summary"       && <SummaryTab project={projectFilter} warehouses={warehouses} />}
          {activeTab === "itemwise"      && <ItemwiseTab warehouses={warehouses} />}
          {activeTab === "warehousewise" && <WarehousewiseTab />}
          {activeTab === "ledger"        && <LedgerTab warehouses={warehouses} />}
        </div>
      </div>
    </Layout>
  );
}
