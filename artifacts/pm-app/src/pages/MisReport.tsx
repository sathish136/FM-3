import { useState, useEffect, useCallback, useMemo } from "react";
import { Layout } from "@/components/Layout";
import {
  RefreshCw, Briefcase, Users, Target, ShoppingBag, FileText,
  AlertTriangle, TrendingUp, TrendingDown, Calendar, Printer,
  BarChart3, ClipboardList, Receipt, CreditCard, UserCheck,
  Truck, Wallet, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp,
  Filter, X, IndianRupee,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Formatters ─────────────────────────────────────────────────────────────
function fmtCr(v: number | undefined | null) {
  const n = Number(v) || 0;
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtShort(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
function ageDays(due?: string | null) {
  if (!due) return 0;
  return Math.floor((Date.now() - new Date(due).getTime()) / 86400000);
}
function ageBucket(overdue: boolean, days: number) {
  if (!overdue) return { label: "Current", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", bar: "bg-emerald-500" };
  if (days <= 30) return { label: "1–30 d", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", bar: "bg-amber-400" };
  if (days <= 60) return { label: "31–60 d", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", bar: "bg-orange-500" };
  if (days <= 90) return { label: "61–90 d", color: "text-red-600", bg: "bg-red-50", border: "border-red-200", bar: "bg-red-500" };
  return { label: "90+ d", color: "text-red-800", bg: "bg-red-100", border: "border-red-300", bar: "bg-red-800" };
}

// ── Tiny components ────────────────────────────────────────────────────────
function Badge({ label, variant }: { label: string; variant: "green"|"amber"|"red"|"blue"|"gray"|"sky" }) {
  const cls: Record<string,string> = {
    green:"bg-emerald-100 text-emerald-700 border-emerald-200",
    amber:"bg-amber-100 text-amber-700 border-amber-200",
    red:"bg-red-100 text-red-700 border-red-200",
    blue:"bg-blue-100 text-blue-700 border-blue-200",
    gray:"bg-gray-100 text-gray-600 border-gray-200",
    sky:"bg-sky-100 text-sky-700 border-sky-200",
  };
  return <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cls[variant]}`}>{label}</span>;
}
function sv(status: string): "green"|"amber"|"red"|"blue"|"gray"|"sky" {
  const s = (status||"").toLowerCase();
  if (["completed","approved","paid","closed","received"].some(x=>s.includes(x))) return "green";
  if (["overdue","rejected","cancelled","expired"].some(x=>s.includes(x))) return "red";
  if (["draft","open","pending"].some(x=>s.includes(x))) return "amber";
  if (["to deliver","to bill","to receive","submitted","partially"].some(x=>s.includes(x))) return "blue";
  if (["on going"].some(x=>s.includes(x))) return "sky";
  return "gray";
}
function Pbar({ val, color }: { val: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[36px]">
        <div className={`h-full ${color} rounded-full`} style={{ width:`${Math.min(100,val)}%` }} />
      </div>
      <span className="text-[10px] font-bold text-gray-500 w-7 text-right">{val}%</span>
    </div>
  );
}
function KpiBox({ label, value, sub, color="text-gray-900", alert=false }: { label:string; value:string|number; sub?:string; color?:string; alert?:boolean }) {
  return (
    <div className={`rounded-xl p-3 ${alert?"bg-red-50 border border-red-100":"bg-gray-50"}`}>
      <p className={`text-xl font-black ${alert?"text-red-700":color}`}>{value}</p>
      <p className="text-[10px] font-bold text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[9px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Data table ─────────────────────────────────────────────────────────────
function Tbl({ headers, rows, emptyMsg="No records" }: { headers:string[]; rows:React.ReactNode[][]; emptyMsg?:string }) {
  return (
    <div className="overflow-x-auto mt-4 border-t border-gray-100 pt-3">
      <table className="w-full text-left min-w-max">
        <thead>
          <tr className="border-b border-gray-100">
            {headers.map((h,i)=>(
              <th key={i} className="pb-1.5 pr-4 text-[9px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length===0
            ? <tr><td colSpan={headers.length} className="py-4 text-center text-xs text-gray-400">{emptyMsg}</td></tr>
            : rows.map((cells,i)=>(
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60">
                {cells.map((cell,j)=>(
                  <td key={j} className="py-1.5 pr-4 text-xs text-gray-700 whitespace-nowrap">{cell}</td>
                ))}
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}

// ── Aging bar ──────────────────────────────────────────────────────────────
function AgingBar({ items, ak="outstanding" }: { items:any[]; ak?:string }) {
  const total = items.reduce((a,i)=>a+(i[ak]||0),0);
  const buckets = [
    { f:(i:any)=>!i.overdue, bar:"bg-emerald-500", label:"Current" },
    { f:(i:any)=>i.overdue&&ageDays(i.due)<=30, bar:"bg-amber-400", label:"1–30d" },
    { f:(i:any)=>i.overdue&&ageDays(i.due)>30&&ageDays(i.due)<=60, bar:"bg-orange-500", label:"31–60d" },
    { f:(i:any)=>i.overdue&&ageDays(i.due)>60&&ageDays(i.due)<=90, bar:"bg-red-500", label:"61–90d" },
    { f:(i:any)=>i.overdue&&ageDays(i.due)>90, bar:"bg-red-800", label:"90+d" },
  ];
  return (
    <div>
      <div className="flex h-2.5 rounded-full overflow-hidden gap-px mb-2">
        {buckets.map((b,bi)=>{
          const v=items.filter(b.f).reduce((a,i)=>a+(i[ak]||0),0);
          const pct=total>0?(v/total)*100:0;
          return pct>0?<div key={bi} className={`${b.bar}`} style={{width:`${pct}%`}} title={`${b.label}: ${fmtCr(v)}`}/>:null;
        })}
        {total===0&&<div className="bg-gray-200 w-full"/>}
      </div>
      <div className="flex flex-wrap gap-3">
        {buckets.map((b,bi)=>{
          const grp=items.filter(b.f);
          const v=grp.reduce((a,i)=>a+(i[ak]||0),0);
          if(!grp.length)return null;
          return (
            <div key={bi} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-sm ${b.bar}`}/>
              <span className="text-[9px] text-gray-500">{b.label}</span>
              <span className="text-[9px] font-bold text-gray-700">{fmtCr(v)}</span>
              <span className="text-[8px] text-gray-400">({grp.length})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Party cards (receivables / payables) ───────────────────────────────────
function PartyCards({ items, pk, ak="outstanding" }: { items:any[]; pk:string; ak?:string }) {
  const grouped = useMemo(()=>{
    const m: Record<string,{party:string;outstanding:number;invoices:any[];worstDays:number}> = {};
    for(const i of items){
      const p=i[pk]||"Unknown";
      if(!m[p]) m[p]={party:p,outstanding:0,invoices:[],worstDays:0};
      m[p].outstanding+=(i[ak]||0);
      m[p].invoices.push(i);
      if(i.overdue) m[p].worstDays=Math.max(m[p].worstDays,ageDays(i.due));
    }
    return Object.values(m).sort((a,b)=>b.outstanding-a.outstanding);
  },[items,pk,ak]);
  if(!grouped.length) return <p className="text-xs text-gray-400 py-3 text-center">No outstanding invoices</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 mt-3">
      {grouped.map((g,idx)=>{
        const hasOverdue=g.invoices.some(i=>i.overdue);
        const b=ageBucket(hasOverdue,g.worstDays);
        const overdueAmt=g.invoices.filter(i=>i.overdue).reduce((a,i)=>a+(i[ak]||0),0);
        const overdueCount=g.invoices.filter(i=>i.overdue).length;
        return (
          <div key={idx} className={`rounded-xl border ${hasOverdue?b.border:"border-gray-200"} bg-white p-3 shadow-sm`}>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p className="text-xs font-bold text-gray-800 leading-tight line-clamp-2 flex-1">{g.party}</p>
              <span className={`shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${b.border} ${b.bg} ${b.color}`}>{b.label}</span>
            </div>
            <p className={`text-base font-black ${hasOverdue?b.color:"text-gray-800"}`}>{fmtCr(g.outstanding)}</p>
            <p className="text-[9px] text-gray-400">{g.invoices.length} invoice{g.invoices.length!==1?"s":""}</p>
            {hasOverdue&&overdueCount>0&&(
              <p className="text-[9px] text-red-600 font-semibold mt-0.5">{fmtCr(overdueAmt)} overdue · {overdueCount} inv</p>
            )}
            <div className="mt-2 flex h-1.5 rounded-full overflow-hidden gap-px bg-gray-100">
              {[
                {f:(i:any)=>!i.overdue,b:"bg-emerald-400"},
                {f:(i:any)=>i.overdue&&ageDays(i.due)<=30,b:"bg-amber-400"},
                {f:(i:any)=>i.overdue&&ageDays(i.due)>30&&ageDays(i.due)<=60,b:"bg-orange-500"},
                {f:(i:any)=>i.overdue&&ageDays(i.due)>60&&ageDays(i.due)<=90,b:"bg-red-500"},
                {f:(i:any)=>i.overdue&&ageDays(i.due)>90,b:"bg-red-800"},
              ].map((bk,bi)=>{
                const v=g.invoices.filter(bk.f).reduce((a,i)=>a+(i[ak]||0),0);
                const pct=g.outstanding>0?(v/g.outstanding)*100:0;
                return pct>0?<div key={bi} className={bk.b} style={{width:`${pct}%`}}/>:null;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Collapsible section card ────────────────────────────────────────────────
function Section({
  id, icon: Icon, iconColor, title, count, total, totalColor="text-gray-900",
  alert, summary, detail, expanded, onToggle,
}: {
  id:string; icon:React.ElementType; iconColor:string; title:string;
  count?:number; total?:string; totalColor?:string; alert?:boolean;
  summary:React.ReactNode; detail:React.ReactNode;
  expanded:boolean; onToggle:()=>void;
}) {
  return (
    <div className={`bg-white rounded-2xl border ${alert?"border-red-200":"border-gray-200"} shadow-sm overflow-hidden`}>
      <div className="px-5 pt-4 pb-4">
        {/* header row */}
        <div className="flex items-center gap-2 mb-3">
          <Icon className={`w-4 h-4 ${iconColor} shrink-0`}/>
          <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider">{title}</h2>
          {count!==undefined&&<span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{count}</span>}
          <div className="flex-1 h-px bg-gray-100"/>
          {total&&<span className={`text-xs font-black ${totalColor}`}>{total}</span>}
          <button
            onClick={onToggle}
            className="ml-2 flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors shrink-0">
            {expanded?<ChevronUp className="w-3.5 h-3.5"/>:<ChevronDown className="w-3.5 h-3.5"/>}
            {expanded?"Hide":"View Details"}
          </button>
        </div>
        {/* always-visible summary */}
        {summary}
        {/* expandable detail */}
        {expanded&&detail}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function MisReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date|null>(null);
  const [projectFilter, setProjectFilter] = useState<string>("__all__");
  const [expanded, setExpanded] = useState<Record<string,boolean>>({});

  const toggle = (key:string) => setExpanded(p=>({...p,[key]:!p[key]}));

  const load = useCallback(async()=>{
    setLoading(true); setError("");
    try {
      const r=await fetch(`${BASE}/api/admin/mis-report`);
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const json=await r.json();
      // Projects
      json.projects = json.projects ?? {};
      json.projects.list = json.projects.list ?? [];
      json.projects.active = json.projects.active ?? 0;
      json.projects.completed = json.projects.completed ?? 0;
      json.projects.overdue = json.projects.overdue ?? 0;
      json.projects.avg_progress = json.projects.avg_progress ?? 0;
      json.projects.total_estimated_value = json.projects.total_estimated_value ?? 0;
      json.projects.total_actual_expense = json.projects.total_actual_expense ?? 0;
      // Procurement
      json.procurement = json.procurement ?? {};
      json.procurement.purchase_orders = json.procurement.purchase_orders ?? {};
      json.procurement.purchase_orders.list = json.procurement.purchase_orders.list ?? [];
      json.procurement.purchase_orders.pending = json.procurement.purchase_orders.pending ?? 0;
      json.procurement.purchase_orders.total_value = json.procurement.purchase_orders.total_value ?? 0;
      json.procurement.purchase_orders.pending_value = json.procurement.purchase_orders.pending_value ?? 0;
      json.procurement.purchase_orders.this_month = json.procurement.purchase_orders.this_month ?? 0;
      json.procurement.material_requests = json.procurement.material_requests ?? {};
      json.procurement.material_requests.list = json.procurement.material_requests.list ?? [];
      json.procurement.material_requests.pending = json.procurement.material_requests.pending ?? 0;
      json.procurement.material_requests.this_month = json.procurement.material_requests.this_month ?? 0;
      json.procurement.delivery_notes = json.procurement.delivery_notes ?? {};
      json.procurement.delivery_notes.list = json.procurement.delivery_notes.list ?? [];
      json.procurement.delivery_notes.pending = json.procurement.delivery_notes.pending ?? 0;
      json.procurement.delivery_notes.this_month = json.procurement.delivery_notes.this_month ?? 0;
      json.procurement.delivery_notes.total_value = json.procurement.delivery_notes.total_value ?? 0;
      // Sales
      json.sales = json.sales ?? {};
      json.sales.orders = json.sales.orders ?? {};
      json.sales.orders.list = json.sales.orders.list ?? [];
      json.sales.orders.active = json.sales.orders.active ?? 0;
      json.sales.orders.this_month = json.sales.orders.this_month ?? 0;
      json.sales.orders.this_month_value = json.sales.orders.this_month_value ?? 0;
      json.sales.orders.total_value = json.sales.orders.total_value ?? 0;
      json.sales.quotations = json.sales.quotations ?? {};
      json.sales.quotations.list = json.sales.quotations.list ?? [];
      json.sales.quotations.open = json.sales.quotations.open ?? 0;
      json.sales.quotations.total_value = json.sales.quotations.total_value ?? 0;
      json.sales.receivables = json.sales.receivables ?? {};
      json.sales.receivables.all_outstanding = json.sales.receivables.all_outstanding ?? [];
      json.sales.receivables.total_receivable = json.sales.receivables.total_receivable ?? 0;
      json.sales.receivables.overdue_invoices = json.sales.receivables.overdue_invoices ?? 0;
      json.sales.receivables.overdue_receivable = json.sales.receivables.overdue_receivable ?? 0;
      json.sales.receivables.outstanding_invoices = json.sales.receivables.outstanding_invoices ?? 0;
      // Payables
      json.payables = json.payables ?? {};
      json.payables.all_outstanding = json.payables.all_outstanding ?? [];
      json.payables.total_payable = json.payables.total_payable ?? 0;
      json.payables.overdue_invoices = json.payables.overdue_invoices ?? 0;
      json.payables.outstanding_invoices = json.payables.outstanding_invoices ?? 0;
      // HR
      json.hr = json.hr ?? {};
      json.hr.department_breakdown = json.hr.department_breakdown ?? [];
      json.hr.leave_applications = json.hr.leave_applications ?? [];
      json.hr.total_employees = json.hr.total_employees ?? 0;
      json.hr.on_leave_today = json.hr.on_leave_today ?? 0;
      json.hr.pending_leave_approvals = json.hr.pending_leave_approvals ?? 0;
      json.hr.expense_claims = json.hr.expense_claims ?? {};
      json.hr.expense_claims.list = json.hr.expense_claims.list ?? [];
      json.hr.expense_claims.pending = json.hr.expense_claims.pending ?? 0;
      json.hr.expense_claims.approved = json.hr.expense_claims.approved ?? 0;
      json.hr.expense_claims.total_pending_amount = json.hr.expense_claims.total_pending_amount ?? 0;
      json.hr.expense_claims.total_approved_amount = json.hr.expense_claims.total_approved_amount ?? 0;
      // Payments
      json.payments = json.payments ?? {};
      json.payments.list = json.payments.list ?? [];
      json.payments.total_received = json.payments.total_received ?? 0;
      json.payments.total_paid = json.payments.total_paid ?? 0;
      json.payments.this_month = json.payments.this_month ?? 0;
      // Period
      json.period = json.period ?? {};
      json.period.month_start = json.period.month_start ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
      setData(json);
      setLastUpdated(new Date());
    } catch(e:any){ setError(e.message||"Failed to load MIS data"); }
    setLoading(false);
  },[]);

  useEffect(()=>{load();},[load]);

  const fp = projectFilter==="__all__"?null:projectFilter;

  const projectNames = useMemo<string[]>(()=>{
    if(!data) return [];
    const s=new Set<string>();
    data.projects.list.forEach((p:any)=>p.id&&s.add(p.id));
    data.procurement.purchase_orders.list.forEach((p:any)=>p.project&&s.add(p.project));
    data.procurement.material_requests.list.forEach((m:any)=>m.project&&s.add(m.project));
    data.procurement.delivery_notes.list.forEach((d:any)=>d.project&&s.add(d.project));
    data.sales.orders.list.forEach((s2:any)=>s2.project&&s.add(s2.project));
    data.sales.receivables.all_outstanding.forEach((i:any)=>i.project&&s.add(i.project));
    data.payables.all_outstanding.forEach((i:any)=>i.project&&s.add(i.project));
    data.payments.list.forEach((p:any)=>p.project&&s.add(p.project));
    return Array.from(s).sort();
  },[data]);

  const filt = (arr:any[], key="project") => fp?arr.filter(x=>x[key]===fp):arr;
  const filtP   = useMemo(()=>fp?data?.projects.list.filter((p:any)=>p.id===fp):data?.projects.list??[],[data,fp]);
  const filtSO  = useMemo(()=>filt(data?.sales.orders.list??[]),[data,fp]);
  const filtPO  = useMemo(()=>filt(data?.procurement.purchase_orders.list??[]),[data,fp]);
  const filtMR  = useMemo(()=>filt(data?.procurement.material_requests.list??[]),[data,fp]);
  const filtDN  = useMemo(()=>filt(data?.procurement.delivery_notes.list??[]),[data,fp]);
  const filtRec = useMemo(()=>filt(data?.sales.receivables.all_outstanding??[]),[data,fp]);
  const filtPay = useMemo(()=>filt(data?.payables.all_outstanding??[]),[data,fp]);
  const filtPmt = useMemo(()=>filt(data?.payments.list??[]),[data,fp]);
  const filtQ   = useMemo(()=>data?.sales.quotations.list??[],[data]);

  const now = new Date();
  const monthName = now.toLocaleString("en-IN",{month:"long",year:"numeric"});

  return (
    <Layout>
      <div className="h-full flex flex-col bg-[#f0f4f8] overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3 px-6 py-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white"/>
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900 leading-tight">MD Dashboard — MIS Report</h1>
                <p className="text-[10px] text-gray-400">Management Information Summary · {monthName}</p>
              </div>
            </div>
            {data&&projectNames.length>0&&(
              <div className="flex items-center gap-2 ml-4">
                <Filter className="w-3.5 h-3.5 text-gray-400"/>
                <select value={projectFilter} onChange={e=>setProjectFilter(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 max-w-[220px]">
                  <option value="__all__">All Projects</option>
                  {projectNames.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
                {fp&&<button onClick={()=>setProjectFilter("__all__")} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-3.5 h-3.5"/></button>}
              </div>
            )}
            <div className="flex-1"/>
            {lastUpdated&&<span className="text-[10px] text-gray-400 hidden sm:block">Updated {lastUpdated.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span>}
            <button onClick={()=>window.print()} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hidden sm:block" title="Print"><Printer className="w-4 h-4"/></button>
            <button onClick={load} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading?"animate-spin":""}`}/>Refresh
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error&&(
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0"/>{error} — ERP connection issue or module not enabled.
            </div>
          )}
          {loading&&!data&&(
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-3"/>
                <p className="text-sm text-gray-500">Fetching live data from ERP…</p>
              </div>
            </div>
          )}

          {data&&(
            <>
              {/* ── Top KPI strip (hidden when project filtered) ── */}
              {!fp&&(
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  {[
                    { label:"Active Projects", value:data.projects.active, sub:`${data.projects.overdue} overdue`, icon:Briefcase, c:"text-blue-600", bg:"bg-blue-50", alert:data.projects.overdue>0 },
                    { label:"Employees", value:data.hr.total_employees, sub:`${data.hr.on_leave_today} on leave today`, icon:Users, c:"text-emerald-600", bg:"bg-emerald-50" },
                    { label:"Active SOs", value:data.sales.orders.active, sub:fmtCr(data.sales.orders.this_month_value)+" this mo", icon:Target, c:"text-violet-600", bg:"bg-violet-50" },
                    { label:"Receivable", value:fmtCr(data.sales.receivables.total_receivable), sub:`${data.sales.receivables.overdue_invoices} overdue inv`, icon:TrendingUp, c:"text-sky-600", bg:"bg-sky-50", alert:data.sales.receivables.overdue_invoices>0 },
                    { label:"Payable", value:fmtCr(data.payables.total_payable), sub:`${data.payables.overdue_invoices} overdue inv`, icon:TrendingDown, c:"text-orange-600", bg:"bg-orange-50", alert:data.payables.overdue_invoices>0 },
                    { label:"Pending POs", value:data.procurement.purchase_orders.pending, sub:fmtCr(data.procurement.purchase_orders.pending_value), icon:ShoppingBag, c:"text-amber-600", bg:"bg-amber-50" },
                    { label:"Pending MRs", value:data.procurement.material_requests.pending, sub:`${data.procurement.material_requests.this_month} this month`, icon:ClipboardList, c:"text-rose-600", bg:"bg-rose-50" },
                    { label:"Open Quotations", value:data.sales.quotations.open, sub:fmtCr(data.sales.quotations.total_value), icon:FileText, c:"text-indigo-600", bg:"bg-indigo-50" },
                  ].map((k,i)=>(
                    <div key={i} className={`bg-white rounded-2xl border ${k.alert?"border-red-200":"border-gray-200"} shadow-sm p-4`}>
                      <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center mb-2`}>
                        <k.icon className={`w-4 h-4 ${k.c}`}/>
                      </div>
                      <p className={`text-xl font-black ${k.alert?"text-red-600":"text-gray-900"}`}>{k.value}</p>
                      <p className="text-[10px] font-bold text-gray-500 mt-0.5">{k.label}</p>
                      {k.sub&&<p className="text-[9px] text-gray-400 mt-0.5">{k.sub}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* ── 1. Projects ── */}
              <Section id="projects" icon={Briefcase} iconColor="text-blue-500" title="Active Projects"
                count={filtP.length}
                total={!fp?`Avg ${data.projects.avg_progress}% done`:undefined}
                expanded={!!expanded.projects} onToggle={()=>toggle("projects")}
                summary={
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <KpiBox label="Active" value={data.projects.active} color="text-blue-700"/>
                    <KpiBox label="Completed" value={data.projects.completed} color="text-emerald-700"/>
                    <KpiBox label="Overdue" value={data.projects.overdue} color="text-red-700" alert={data.projects.overdue>0}/>
                    <KpiBox label="Avg Progress" value={`${data.projects.avg_progress}%`} color="text-indigo-700"/>
                    {!fp&&<>
                      <KpiBox label="Total Estimated" value={fmtCr(data.projects.total_estimated_value)} color="text-gray-700"/>
                      <KpiBox label="Actual Spend" value={fmtCr(data.projects.total_actual_expense)} color="text-gray-700"/>
                    </>}
                  </div>
                }
                detail={
                  <Tbl headers={["Project","Customer","Type","Progress","Estimated","Spend","Due Date","Status"]}
                    rows={filtP.map((p:any)=>[
                      <span className="font-semibold text-gray-800">{p.name}</span>,
                      <span className="text-gray-500">{p.customer||"—"}</span>,
                      <span className="text-gray-500">{p.type||"—"}</span>,
                      <Pbar val={p.progress} color={p.progress>=80?"bg-emerald-500":p.progress>=50?"bg-blue-500":"bg-amber-500"}/>,
                      <span>{fmtCr(p.estimated)}</span>,
                      <span>{fmtCr(p.expense)}</span>,
                      <span className={p.overdue?"text-red-600 font-bold":""}>{fmtDate(p.due)}</span>,
                      <Badge label={p.overdue?"OVERDUE":p.status} variant={p.overdue?"red":sv(p.status)}/>,
                    ])}/>
                }/>

              {/* ── 2. Receivables ── */}
              <Section id="receivables" icon={Receipt} iconColor="text-sky-500" title="Receivables — Outstanding"
                count={filtRec.length}
                total={fmtCr(filtRec.reduce((a:number,i:any)=>a+(i.outstanding||0),0))}
                totalColor="text-sky-700"
                alert={filtRec.some((i:any)=>i.overdue)}
                expanded={!!expanded.receivables} onToggle={()=>toggle("receivables")}
                summary={
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <KpiBox label="Total Outstanding" value={fmtCr(filtRec.reduce((a:number,i:any)=>a+(i.outstanding||0),0))} color="text-sky-700"/>
                      <KpiBox label="Overdue Invoices" value={filtRec.filter((i:any)=>i.overdue).length} alert={filtRec.some((i:any)=>i.overdue)}/>
                      <KpiBox label="Overdue Amount" value={fmtCr(filtRec.filter((i:any)=>i.overdue).reduce((a:number,i:any)=>a+(i.outstanding||0),0))} alert={filtRec.some((i:any)=>i.overdue)}/>
                    </div>
                    <AgingBar items={filtRec}/>
                    <PartyCards items={filtRec} pk="customer"/>
                  </div>
                }
                detail={
                  <Tbl headers={["Invoice","Customer","Invoice Total","Outstanding","Posted","Due","Age"]}
                    rows={filtRec.map((i:any)=>[
                      <span className="font-mono text-[10px] text-gray-500">{i.id}</span>,
                      <span className="font-semibold text-gray-800 max-w-[120px] truncate block">{i.customer}</span>,
                      <span>{fmtCr(i.amount)}</span>,
                      <span className={`font-bold ${i.overdue?"text-red-600":"text-sky-700"}`}>{fmtCr(i.outstanding)}</span>,
                      <span>{fmtShort(i.posted)}</span>,
                      <span className={i.overdue?"text-red-600 font-bold":""}>{fmtDate(i.due)}</span>,
                      i.overdue?<Badge label={`${ageDays(i.due)}d`} variant="red"/>:<Badge label="Current" variant="green"/>,
                    ])}/>
                }/>

              {/* ── 3. Payables ── */}
              <Section id="payables" icon={CreditCard} iconColor="text-orange-500" title="Payables — Outstanding"
                count={filtPay.length}
                total={fmtCr(filtPay.reduce((a:number,i:any)=>a+(i.outstanding||0),0))}
                totalColor="text-orange-700"
                alert={filtPay.some((i:any)=>i.overdue)}
                expanded={!!expanded.payables} onToggle={()=>toggle("payables")}
                summary={
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <KpiBox label="Total Payable" value={fmtCr(filtPay.reduce((a:number,i:any)=>a+(i.outstanding||0),0))} color="text-orange-700"/>
                      <KpiBox label="Overdue Invoices" value={filtPay.filter((i:any)=>i.overdue).length} alert={filtPay.some((i:any)=>i.overdue)}/>
                      <KpiBox label="Overdue Amount" value={fmtCr(filtPay.filter((i:any)=>i.overdue).reduce((a:number,i:any)=>a+(i.outstanding||0),0))} alert={filtPay.some((i:any)=>i.overdue)}/>
                    </div>
                    <AgingBar items={filtPay}/>
                    <PartyCards items={filtPay} pk="supplier"/>
                  </div>
                }
                detail={
                  <Tbl headers={["Invoice","Supplier","Invoice Total","Outstanding","Posted","Due","Age"]}
                    rows={filtPay.map((i:any)=>[
                      <span className="font-mono text-[10px] text-gray-500">{i.id}</span>,
                      <span className="font-semibold text-gray-800 max-w-[120px] truncate block">{i.supplier}</span>,
                      <span>{fmtCr(i.amount)}</span>,
                      <span className={`font-bold ${i.overdue?"text-red-600":"text-orange-700"}`}>{fmtCr(i.outstanding)}</span>,
                      <span>{fmtShort(i.posted)}</span>,
                      <span className={i.overdue?"text-red-600 font-bold":""}>{fmtDate(i.due)}</span>,
                      i.overdue?<Badge label={`${ageDays(i.due)}d`} variant="red"/>:<Badge label="Current" variant="green"/>,
                    ])}/>
                }/>

              {/* ── 4. Sales Orders ── */}
              <Section id="so" icon={Target} iconColor="text-violet-500" title="Sales Orders"
                count={filtSO.length}
                total={fmtCr(filtSO.reduce((a:number,s:any)=>a+(s.amount||0),0))}
                totalColor="text-violet-700"
                expanded={!!expanded.so} onToggle={()=>toggle("so")}
                summary={
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <KpiBox label="Active" value={filtSO.filter((s:any)=>["To Deliver and Bill","To Bill","To Deliver","Submitted"].includes(s.status)).length} color="text-violet-700"/>
                    <KpiBox label="This Month" value={filtSO.filter((s:any)=>s.date>=data.period.month_start).length} color="text-sky-700"
                      sub={fmtCr(filtSO.filter((s:any)=>s.date>=data.period.month_start).reduce((a:number,s:any)=>a+(s.amount||0),0))}/>
                    <KpiBox label="Total Value" value={fmtCr(filtSO.reduce((a:number,s:any)=>a+(s.amount||0),0))} color="text-gray-700"/>
                    <KpiBox label="Fully Delivered" value={filtSO.filter((s:any)=>s.delivered_pct===100).length} color="text-emerald-700"/>
                  </div>
                }
                detail={
                  <Tbl headers={["ID","Customer","Amount","Delivered","Billed","Delivery Date","Status"]}
                    rows={filtSO.map((s:any)=>[
                      <span className="font-mono text-[10px] text-gray-500">{s.id}</span>,
                      <span className="font-semibold text-gray-800 max-w-[130px] truncate block">{s.customer}</span>,
                      <span className="font-bold">{fmtCr(s.amount)}</span>,
                      <Pbar val={s.delivered_pct} color="bg-emerald-400"/>,
                      <Pbar val={s.billed_pct} color="bg-blue-400"/>,
                      <span>{fmtShort(s.delivery)}</span>,
                      <Badge label={s.status} variant={sv(s.status)}/>,
                    ])}/>
                }/>

              {/* ── 5. Quotations ── */}
              <Section id="quot" icon={FileText} iconColor="text-indigo-500" title="Open Quotations"
                count={filtQ.length}
                total={fmtCr(filtQ.reduce((a:number,q:any)=>a+(q.amount||0),0))}
                totalColor="text-indigo-700"
                expanded={!!expanded.quot} onToggle={()=>toggle("quot")}
                summary={
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <KpiBox label="Open Quotations" value={filtQ.length} color="text-indigo-700"/>
                    <KpiBox label="Total Pipeline Value" value={fmtCr(filtQ.reduce((a:number,q:any)=>a+(q.amount||0),0))} color="text-indigo-700"/>
                    <KpiBox label="Expiring Soon" value={filtQ.filter((q:any)=>q.valid_till&&ageDays(q.valid_till)<0&&ageDays(q.valid_till)>-7).length} color="text-amber-700"/>
                  </div>
                }
                detail={
                  <Tbl headers={["ID","Party","Amount","Date","Valid Till","Status"]}
                    rows={filtQ.map((q:any)=>[
                      <span className="font-mono text-[10px] text-gray-500">{q.id}</span>,
                      <span className="font-semibold text-gray-800 max-w-[130px] truncate block">{q.party||"—"}</span>,
                      <span className="font-bold">{fmtCr(q.amount)}</span>,
                      <span>{fmtShort(q.date)}</span>,
                      <span className={q.valid_till&&new Date(q.valid_till)<new Date()?"text-red-600 font-bold":""}>{fmtDate(q.valid_till)}</span>,
                      <Badge label={q.status} variant={sv(q.status)}/>,
                    ])}/>
                }/>

              {/* ── 6. Purchase Orders ── */}
              <Section id="po" icon={ShoppingBag} iconColor="text-amber-500" title="Purchase Orders"
                count={filtPO.length}
                total={fmtCr(filtPO.reduce((a:number,p:any)=>a+(p.amount||0),0))}
                totalColor="text-amber-700"
                expanded={!!expanded.po} onToggle={()=>toggle("po")}
                summary={
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <KpiBox label="Total POs" value={filtPO.length} color="text-amber-700"/>
                    <KpiBox label="Pending" value={filtPO.filter((p:any)=>["Draft","To Receive and Bill","To Bill","To Receive"].includes(p.status)).length}
                      sub={fmtCr(filtPO.filter((p:any)=>["Draft","To Receive and Bill","To Bill","To Receive"].includes(p.status)).reduce((a:number,p:any)=>a+(p.amount||0),0))}/>
                    <KpiBox label="Fully Received" value={filtPO.filter((p:any)=>p.received_pct===100).length} color="text-emerald-700"/>
                    <KpiBox label="This Month" value={filtPO.filter((p:any)=>p.date>=data.period.month_start).length}/>
                  </div>
                }
                detail={
                  <Tbl headers={["PO","Supplier","Amount","Received","Billed","Project","Order Date","Due Date","Status"]}
                    rows={filtPO.map((p:any)=>[
                      <span className="font-mono text-[10px] text-gray-500">{p.id}</span>,
                      <span className="font-semibold text-gray-800 max-w-[120px] truncate block">{p.supplier}</span>,
                      <span className="font-bold">{fmtCr(p.amount)}</span>,
                      <Pbar val={p.received_pct} color="bg-emerald-400"/>,
                      <Pbar val={p.billed_pct} color="bg-blue-400"/>,
                      <span className="text-gray-500 max-w-[80px] truncate block">{p.project||"—"}</span>,
                      <span>{fmtShort(p.date)}</span>,
                      <span className={p.due&&new Date(p.due)<new Date()&&!["Completed","Closed"].includes(p.status)?"text-red-600 font-bold":""}>{fmtDate(p.due)}</span>,
                      <Badge label={p.status} variant={sv(p.status)}/>,
                    ])}/>
                }/>

              {/* ── 7. Material Requests ── */}
              <Section id="mr" icon={ClipboardList} iconColor="text-rose-500" title="Material Requests"
                count={filtMR.length}
                expanded={!!expanded.mr} onToggle={()=>toggle("mr")}
                summary={
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <KpiBox label="Total MRs" value={filtMR.length}/>
                    <KpiBox label="Pending" value={filtMR.filter((m:any)=>["Draft","Submitted","Partially Ordered"].includes(m.status)).length} alert={filtMR.filter((m:any)=>["Draft","Submitted","Partially Ordered"].includes(m.status)).length>5}/>
                    <KpiBox label="Ordered" value={filtMR.filter((m:any)=>m.status==="Ordered").length} color="text-emerald-700"/>
                    <KpiBox label="This Month" value={filtMR.filter((m:any)=>m.date>=data.period.month_start).length}/>
                  </div>
                }
                detail={
                  <Tbl headers={["MR","Type","Project","Requested By","Date","Required By","Status"]}
                    rows={filtMR.map((m:any)=>[
                      <span className="font-mono text-[10px] text-gray-500">{m.id}</span>,
                      <span className="text-gray-600">{m.type||"—"}</span>,
                      <span className="text-gray-500 max-w-[100px] truncate block">{m.project||"—"}</span>,
                      <span className="text-gray-600">{m.requested_by||"—"}</span>,
                      <span>{fmtShort(m.date)}</span>,
                      <span className={m.due&&new Date(m.due)<new Date()&&m.status!=="Ordered"?"text-red-600 font-bold":""}>{fmtDate(m.due)}</span>,
                      <Badge label={m.status} variant={sv(m.status)}/>,
                    ])}/>
                }/>

              {/* ── 8. Delivery Notes ── */}
              <Section id="dn" icon={Truck} iconColor="text-teal-500" title="Delivery Notes"
                count={filtDN.length}
                total={fmtCr(filtDN.reduce((a:number,d:any)=>a+(d.amount||0),0))}
                totalColor="text-teal-700"
                expanded={!!expanded.dn} onToggle={()=>toggle("dn")}
                summary={
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <KpiBox label="Total DNs" value={filtDN.length}/>
                    <KpiBox label="Pending Billing" value={filtDN.filter((d:any)=>d.status==="To Bill"||d.status==="Draft").length} alert={filtDN.filter((d:any)=>d.status==="To Bill").length>0}/>
                    <KpiBox label="This Month" value={filtDN.filter((d:any)=>d.date>=data.period.month_start).length}/>
                    <KpiBox label="Total Value" value={fmtCr(filtDN.reduce((a:number,d:any)=>a+(d.amount||0),0))} color="text-teal-700"/>
                  </div>
                }
                detail={
                  <Tbl headers={["DN","Customer","Amount","Project","Date","LR No","Transporter","Status"]}
                    rows={filtDN.map((d:any)=>[
                      <span className="font-mono text-[10px] text-gray-500">{d.id}</span>,
                      <span className="font-semibold text-gray-800 max-w-[120px] truncate block">{d.customer}</span>,
                      <span className="font-bold">{fmtCr(d.amount)}</span>,
                      <span className="text-gray-500 max-w-[80px] truncate block">{d.project||"—"}</span>,
                      <span>{fmtShort(d.date)}</span>,
                      <span className="text-gray-500">{d.lr_no||"—"}</span>,
                      <span className="text-gray-500 max-w-[100px] truncate block">{d.transporter||"—"}</span>,
                      <Badge label={d.status} variant={sv(d.status)}/>,
                    ])}/>
                }/>

              {/* ── 9. Payments ── */}
              <Section id="pmt" icon={Wallet} iconColor="text-green-600" title="Payment Entries"
                count={filtPmt.length}
                expanded={!!expanded.pmt} onToggle={()=>toggle("pmt")}
                summary={
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <KpiBox label="Total Received" value={fmtCr(filtPmt.filter((p:any)=>p.type==="Receive").reduce((a:number,p:any)=>a+(p.amount||0),0))} color="text-emerald-700"/>
                    <KpiBox label="Total Paid Out" value={fmtCr(filtPmt.filter((p:any)=>p.type==="Pay").reduce((a:number,p:any)=>a+(p.amount||0),0))} color="text-orange-700"/>
                    <KpiBox label="Receipts This Month" value={filtPmt.filter((p:any)=>p.type==="Receive"&&p.date>=data.period.month_start).length}/>
                    <KpiBox label="Payments This Month" value={filtPmt.filter((p:any)=>p.type==="Pay"&&p.date>=data.period.month_start).length}/>
                  </div>
                }
                detail={
                  <Tbl headers={["ID","Type","Party","Amount","Mode","Date","Reference"]}
                    rows={filtPmt.map((p:any)=>[
                      <span className="font-mono text-[10px] text-gray-500">{p.id}</span>,
                      <Badge label={p.type} variant={p.type==="Receive"?"green":p.type==="Pay"?"red":"blue"}/>,
                      <span className="font-semibold text-gray-800 max-w-[120px] truncate block">{p.party||"—"}</span>,
                      <span className={`font-bold ${p.type==="Receive"?"text-emerald-700":"text-orange-700"}`}>{fmtCr(p.amount)}</span>,
                      <span className="text-gray-500">{p.mode||"—"}</span>,
                      <span>{fmtShort(p.date)}</span>,
                      <span className="text-gray-500 max-w-[100px] truncate block">{p.ref||"—"}</span>,
                    ])}/>
                }/>

              {/* ── 10. Expense Claims + HR (no project filter) ── */}
              {!fp&&(
                <>
                  <Section id="expense" icon={IndianRupee} iconColor="text-purple-500" title="Expense Claims"
                    count={data.hr.expense_claims.list.length}
                    expanded={!!expanded.expense} onToggle={()=>toggle("expense")}
                    summary={
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <KpiBox label="Pending Approval" value={data.hr.expense_claims.pending} alert={data.hr.expense_claims.pending>0}
                          sub={fmtCr(data.hr.expense_claims.total_pending_amount)}/>
                        <KpiBox label="Approved" value={data.hr.expense_claims.approved} color="text-emerald-700"
                          sub={fmtCr(data.hr.expense_claims.total_approved_amount)}/>
                        <KpiBox label="Total Claims" value={data.hr.expense_claims.list.length}/>
                      </div>
                    }
                    detail={
                      <Tbl headers={["ID","Employee","Department","Date","Claimed","Sanctioned","Status"]}
                        rows={data.hr.expense_claims.list.map((e:any)=>[
                          <span className="font-mono text-[10px] text-gray-500">{e.id}</span>,
                          <span className="font-semibold text-gray-800">{e.employee}</span>,
                          <span className="text-gray-500">{e.department||"—"}</span>,
                          <span>{fmtShort(e.date)}</span>,
                          <span className="font-bold">{fmtCr(e.claimed)}</span>,
                          <span className="font-bold text-emerald-700">{e.sanctioned?fmtCr(e.sanctioned):"—"}</span>,
                          <Badge label={e.status} variant={e.status==="Approved"?"green":e.status==="Draft"||e.status==="Submitted"?"amber":"red"}/>,
                        ])}/>
                    }/>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Dept breakdown */}
                    <Section id="dept" icon={UserCheck} iconColor="text-emerald-500" title="Department Headcount"
                      total={`${data.hr.total_employees} staff`}
                      expanded={!!expanded.dept} onToggle={()=>toggle("dept")}
                      summary={
                        <div className="space-y-2">
                          {data.hr.department_breakdown.slice(0,6).map((d:any,i:number)=>(
                            <div key={i} className="flex items-center gap-3">
                              <span className="text-xs text-gray-600 w-40 truncate">{d.dept}</span>
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-400 rounded-full"
                                  style={{width:`${Math.round((d.count/data.hr.total_employees)*100)}%`}}/>
                              </div>
                              <span className="text-xs font-bold text-gray-700 w-6 text-right">{d.count}</span>
                            </div>
                          ))}
                          {data.hr.department_breakdown.length>6&&<p className="text-[9px] text-gray-400">+{data.hr.department_breakdown.length-6} more departments</p>}
                        </div>
                      }
                      detail={
                        <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                          {data.hr.department_breakdown.slice(6).map((d:any,i:number)=>(
                            <div key={i} className="flex items-center gap-3">
                              <span className="text-xs text-gray-600 w-40 truncate">{d.dept}</span>
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-400 rounded-full"
                                  style={{width:`${Math.round((d.count/data.hr.total_employees)*100)}%`}}/>
                              </div>
                              <span className="text-xs font-bold text-gray-700 w-6 text-right">{d.count}</span>
                            </div>
                          ))}
                        </div>
                      }/>

                    {/* Leave applications */}
                    <Section id="leave" icon={Calendar} iconColor="text-sky-500" title="Leave Applications"
                      count={data.hr.leave_applications.length}
                      expanded={!!expanded.leave} onToggle={()=>toggle("leave")}
                      summary={
                        <div className="grid grid-cols-3 gap-3">
                          <KpiBox label="On Leave Today" value={data.hr.on_leave_today} alert={data.hr.on_leave_today>0}/>
                          <KpiBox label="Pending Approval" value={data.hr.pending_leave_approvals} alert={data.hr.pending_leave_approvals>0}/>
                          <KpiBox label="Total Records" value={data.hr.leave_applications.length}/>
                        </div>
                      }
                      detail={
                        <Tbl headers={["Employee","Leave Type","From","To","Days","Status"]}
                          rows={data.hr.leave_applications.map((l:any)=>[
                            <span className="font-semibold text-gray-800">{l.employee}</span>,
                            <span className="text-gray-500">{l.type}</span>,
                            <span>{fmtShort(l.from)}</span>,
                            <span>{fmtShort(l.to)}</span>,
                            <span className="font-bold text-gray-700">{l.days}</span>,
                            <Badge label={l.status} variant={l.status==="Approved"?"green":l.status==="Open"?"amber":l.status==="Rejected"?"red":"gray"}/>,
                          ])}/>
                      }/>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
