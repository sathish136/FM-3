import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard, Plus, RefreshCw, Smartphone, Wifi, Tv, ShoppingBag,
  Phone, Shield, Zap, CheckCircle, Clock, AlertTriangle,
  X, Edit3, Trash2, Bell, ArrowLeft,
  Calendar, DollarSign, Tag, FileText, Check, Search, Receipt,
  Users, ChevronDown, ChevronRight,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type SubType = "mobile" | "cug" | "broadband" | "dth" | "ott" | "office_phone" | "electricity" | "insurance" | "other";
type SubStatus = "active" | "inactive" | "expired";

interface Subscription {
  id: number; name: string; type: SubType; mobile_or_account: string;
  operator: string; plan_name: string; plan_amount: string;
  validity_days: number; due_date: string | null; status: SubStatus;
  notes: string; created_at: string; payment_count: string; pending_followups: string;
}
interface PaymentHistory {
  id: number; subscription_id: number; amount: string; paid_date: string;
  method: string; reference: string; notes: string; created_at: string;
}
interface Followup {
  id: number; subscription_id: number; followup_date: string; notes: string;
  done: boolean; done_at: string | null;
}
interface CugRow {
  _id: string; mobile: string; name: string;
  operator: string; plan_name: string; plan_amount: string; validity_days: string; due_date: string;
}

const TYPE_META: Record<SubType, { label: string; icon: React.ElementType; color: string; bg: string; border: string; accent: string }> = {
  mobile:       { label: "Mobile",       icon: Smartphone, color: "text-sky-600",     bg: "bg-sky-50",     border: "border-sky-200",     accent: "bg-sky-500" },
  cug:          { label: "CUG Group",    icon: Users,      color: "text-primary",     bg: "bg-accent",     border: "border-primary/20",  accent: "bg-primary" },
  broadband:    { label: "Broadband",    icon: Wifi,       color: "text-primary",     bg: "bg-accent",     border: "border-primary/20",  accent: "bg-primary" },
  dth:          { label: "DTH / Cable",  icon: Tv,         color: "text-purple-600",  bg: "bg-purple-50",  border: "border-purple-200",  accent: "bg-purple-500" },
  ott:          { label: "OTT",          icon: ShoppingBag,color: "text-pink-600",    bg: "bg-pink-50",    border: "border-pink-200",    accent: "bg-pink-500" },
  office_phone: { label: "Office Phone", icon: Phone,      color: "text-teal-600",    bg: "bg-teal-50",    border: "border-teal-200",    accent: "bg-teal-500" },
  electricity:  { label: "Electricity",  icon: Zap,        color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-200",   accent: "bg-amber-500" },
  insurance:    { label: "Insurance",    icon: Shield,     color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", accent: "bg-emerald-500" },
  other:        { label: "Other",        icon: CreditCard, color: "text-muted-foreground", bg: "bg-muted", border: "border-border",      accent: "bg-muted-foreground" },
};

const OPERATOR_STYLE: Record<string, { bg: string; text: string; border: string; dot: string; pill: string }> = {
  "Jio":    { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   dot: "bg-blue-500",   pill: "bg-blue-500" },
  "Airtel": { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    dot: "bg-red-500",    pill: "bg-red-500" },
  "Vi":     { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", dot: "bg-purple-500", pill: "bg-purple-500" },
  "BSNL":   { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  dot: "bg-green-500",  pill: "bg-green-500" },
};

const DEFAULT_PLAN: Record<string, { amount: string; validity: string }> = {
  Jio:    { amount: "299", validity: "28" },
  Airtel: { amount: "299", validity: "28" },
  Vi:     { amount: "299", validity: "28" },
  BSNL:   { amount: "187", validity: "28" },
};

const QUICK_PLANS: Record<string, { amount: string; validity: string; label: string }[]> = {
  Jio: [
    { amount: "199", validity: "28", label: "₹199 · 28d" }, { amount: "299", validity: "28", label: "₹299 · 28d" },
    { amount: "349", validity: "28", label: "₹349 · 28d" }, { amount: "449", validity: "56", label: "₹449 · 56d" },
    { amount: "599", validity: "84", label: "₹599 · 84d" }, { amount: "2999", validity: "365", label: "₹2999 · 1yr" },
  ],
  Airtel: [
    { amount: "199", validity: "28", label: "₹199 · 28d" }, { amount: "299", validity: "28", label: "₹299 · 28d" },
    { amount: "349", validity: "28", label: "₹349 · 28d" }, { amount: "449", validity: "56", label: "₹449 · 56d" },
    { amount: "599", validity: "84", label: "₹599 · 84d" }, { amount: "3359", validity: "365", label: "₹3359 · 1yr" },
  ],
  Vi: [
    { amount: "199", validity: "28", label: "₹199 · 28d" }, { amount: "299", validity: "28", label: "₹299 · 28d" },
    { amount: "349", validity: "28", label: "₹349 · 28d" }, { amount: "449", validity: "56", label: "₹449 · 56d" },
    { amount: "599", validity: "84", label: "₹599 · 84d" }, { amount: "2899", validity: "365", label: "₹2899 · 1yr" },
  ],
  BSNL: [
    { amount: "97", validity: "26", label: "₹97 · 26d" }, { amount: "187", validity: "28", label: "₹187 · 28d" },
    { amount: "247", validity: "28", label: "₹247 · 28d" }, { amount: "399", validity: "90", label: "₹399 · 90d" },
    { amount: "1999", validity: "365", label: "₹1999 · 1yr" },
  ],
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr); due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtAmt(a: string | number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(a));
}

function DueBadge({ dueDate }: { dueDate: string | null }) {
  const days = daysUntil(dueDate);
  if (days === null) return <span className="text-[10px] text-muted-foreground">No date</span>;
  if (days < 0) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 ring-1 ring-red-200">
      <AlertTriangle className="w-2.5 h-2.5" /> Overdue {Math.abs(days)}d
    </span>
  );
  if (days === 0) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 ring-1 ring-red-200">
      <AlertTriangle className="w-2.5 h-2.5" /> Due Today
    </span>
  );
  if (days <= 3) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 ring-1 ring-orange-200">
      <Clock className="w-2.5 h-2.5" /> {days}d left
    </span>
  );
  if (days <= 7) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 ring-1 ring-amber-200">
      <Clock className="w-2.5 h-2.5" /> {days}d left
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
      <CheckCircle className="w-2.5 h-2.5" /> {days}d left
    </span>
  );
}

function OperatorChip({ operator }: { operator: string }) {
  if (!operator) return null;
  const os = OPERATOR_STYLE[operator];
  if (!os) return <span className="text-[11px] text-muted-foreground font-semibold">{operator}</span>;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${os.bg} ${os.text} ${os.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${os.dot}`} />
      {operator}
    </span>
  );
}

const EMPTY_FORM = {
  name: "", type: "mobile" as SubType, mobile_or_account: "", operator: "",
  plan_name: "", plan_amount: "", validity_days: "28", due_date: "", notes: "",
  bulk_numbers: "",
};

function parseLinesToRows(text: string, defaults: { operator: string; plan_name: string; plan_amount: string; validity_days: string; due_date: string }): CugRow[] {
  return text.trim().split("\n").filter(l => l.trim()).map((line, i) => {
    const parts = line.trim().split(/\s+/);
    const isNumber = /^\d{6,15}$/.test(parts[0]);
    const mobile = isNumber ? parts[0] : parts[parts.length - 1];
    const nameParts = isNumber ? parts.slice(1) : parts.slice(0, -1);
    const name = nameParts.join(" ") || mobile;
    return { _id: `row_${i}_${Date.now()}`, mobile, name, ...defaults };
  });
}

function SubscriptionForm({ initial, onSave, onCancel }: {
  initial?: Partial<typeof EMPTY_FORM & { id: number }>;
  onSave: (data: typeof EMPTY_FORM) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [detecting, setDetecting] = useState(false);
  const [cugRows, setCugRows] = useState<CugRow[]>([]);
  const [cugStep, setCugStep] = useState<"paste" | "table">("paste");
  const [globalDef, setGlobalDef] = useState({ operator: "", plan_name: "", plan_amount: "", validity_days: "28", due_date: "" });
  const { toast } = useToast();

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }
  function setGlobal(k: string, v: string) { setGlobalDef(g => ({ ...g, [k]: v })); }
  function setRow(id: string, k: keyof CugRow, v: string) {
    setCugRows(rows => rows.map(r => r._id === id ? { ...r, [k]: v } : r));
  }
  function removeRow(id: string) { setCugRows(rows => rows.filter(r => r._id !== id)); }
  function addRow() {
    setCugRows(rows => [...rows, { _id: `row_new_${Date.now()}`, mobile: "", name: "", ...globalDef }]);
  }
  function applyGlobalToAll() {
    setCugRows(rows => rows.map(r => ({ ...r, ...globalDef })));
    toast({ title: "Applied defaults to all rows" });
  }

  function parseToCugTable() {
    const rows = parseLinesToRows(form.bulk_numbers, globalDef);
    if (rows.length === 0) { toast({ title: "No numbers found", variant: "destructive" }); return; }
    setCugRows(rows);
    setCugStep("table");
  }

  useEffect(() => {
    const digits = form.mobile_or_account.replace(/\D/g, "");
    if (form.type === "mobile" && digits.length === 10) autoDetect(digits);
  }, [form.mobile_or_account, form.type]);

  async function autoDetect(mobile: string) {
    setDetecting(true);
    try {
      const r = await fetch(`${BASE}/api/admin/payment-tracker/lookup-mobile`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });
      const data = await r.json();
      if (data.operator && data.operator !== "Unknown") {
        const def = DEFAULT_PLAN[data.operator];
        setForm(f => ({
          ...f, operator: data.operator,
          plan_amount: f.plan_amount || (def?.amount ?? f.plan_amount),
          validity_days: (f.validity_days === "28" || f.validity_days === "30" || !f.validity_days) ? (def?.validity ?? f.validity_days) : f.validity_days,
        }));
      }
    } catch {}
    setDetecting(false);
  }

  const opStyle = form.operator ? OPERATOR_STYLE[form.operator] : null;
  const quickPlans = form.operator ? QUICK_PLANS[form.operator] : null;
  const isCug = form.type === "cug";
  const isCugTable = isCug && !initial?.id && cugStep === "table";
  const typeOptions: SubType[] = ["mobile", "cug", "broadband", "dth", "ott", "office_phone", "electricity", "insurance", "other"];

  const totalAmt = cugRows.reduce((a, r) => a + Number(r.plan_amount || 0), 0);

  function handleSubmit() {
    if (isCugTable) {
      const valid = cugRows.filter(r => r.mobile.trim());
      onSave({ ...form, bulk_numbers: JSON.stringify(valid) });
    } else {
      onSave(form);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={`bg-card rounded-2xl w-full shadow-2xl max-h-[95vh] flex flex-col border border-border ${isCugTable ? "max-w-5xl" : "max-w-lg"}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-bold text-card-foreground">
              {initial?.id ? "Edit Entry" : isCugTable ? `CUG Group — ${form.name || "Untitled"} · ${cugRows.length} numbers` : isCug ? "Add CUG Group" : "Add Recharge / Bill Entry"}
            </h2>
            {isCug && !initial?.id && cugStep === "paste" && (
              <p className="text-[10px] text-primary mt-0.5">Paste all numbers → set default plan → parse into table</p>
            )}
            {isCugTable && (
              <button onClick={() => setCugStep("paste")} className="text-[10px] text-primary hover:text-primary/80 underline mt-0.5">
                ← Back to paste view
              </button>
            )}
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* ── CUG TABLE MODE ── */}
          {isCugTable ? (
            <div className="flex flex-col gap-0">
              {/* Global defaults bar */}
              <div className="px-4 py-3 bg-accent border-b border-border">
                <div className="flex items-end gap-2 flex-wrap">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest self-center whitespace-nowrap">Default for all:</p>
                  <div className="flex items-end gap-2 flex-1 flex-wrap">
                    <div>
                      <p className="text-[9px] text-muted-foreground mb-0.5">Operator</p>
                      <input value={globalDef.operator} onChange={e => setGlobal("operator", e.target.value)} placeholder="e.g. Airtel"
                        className="w-24 px-2 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground mb-0.5">Plan</p>
                      <input value={globalDef.plan_name} onChange={e => setGlobal("plan_name", e.target.value)} placeholder="e.g. 299 Unlim"
                        className="w-28 px-2 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground mb-0.5">Amount (₹)</p>
                      <input type="number" value={globalDef.plan_amount} onChange={e => setGlobal("plan_amount", e.target.value)} placeholder="0"
                        className="w-20 px-2 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground mb-0.5">Validity (d)</p>
                      <input type="number" value={globalDef.validity_days} onChange={e => setGlobal("validity_days", e.target.value)} placeholder="28"
                        className="w-16 px-2 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground mb-0.5">Due Date</p>
                      <input type="date" value={globalDef.due_date} onChange={e => setGlobal("due_date", e.target.value)}
                        className="px-2 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
                    </div>
                    <button onClick={applyGlobalToAll}
                      className="px-3 py-1.5 text-[11px] font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap">
                      Apply to all
                    </button>
                  </div>
                </div>
              </div>

              {/* Per-row table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[900px]">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground w-8">#</th>
                      <th className="px-2 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Mobile Number</th>
                      <th className="px-2 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Name / Label</th>
                      <th className="px-2 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Operator</th>
                      <th className="px-2 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Plan</th>
                      <th className="px-2 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Amount (₹)</th>
                      <th className="px-2 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Validity (d)</th>
                      <th className="px-2 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Due Date</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cugRows.map((row, i) => (
                      <tr key={row._id} className={`border-b border-border/50 ${i % 2 === 1 ? "bg-muted/40" : "bg-card"}`}>
                        <td className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold">{i + 1}</td>
                        <td className="px-2 py-1.5">
                          <input value={row.mobile} onChange={e => setRow(row._id, "mobile", e.target.value)}
                            placeholder="10-digit number" maxLength={15}
                            className="w-32 px-2 py-1 text-xs font-mono rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={row.name} onChange={e => setRow(row._id, "name", e.target.value)}
                            placeholder="Name / label"
                            className="w-32 px-2 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={row.operator} onChange={e => setRow(row._id, "operator", e.target.value)}
                            placeholder="Airtel"
                            className="w-20 px-2 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={row.plan_name} onChange={e => setRow(row._id, "plan_name", e.target.value)}
                            placeholder="299 Unlim"
                            className="w-28 px-2 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" value={row.plan_amount} onChange={e => setRow(row._id, "plan_amount", e.target.value)}
                            placeholder="0"
                            className="w-20 px-2 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-400 font-semibold" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" value={row.validity_days} onChange={e => setRow(row._id, "validity_days", e.target.value)}
                            placeholder="28"
                            className="w-16 px-2 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="date" value={row.due_date} onChange={e => setRow(row._id, "due_date", e.target.value)}
                            className="px-2 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
                        </td>
                        <td className="px-2 py-1.5">
                          <button onClick={() => removeRow(row._id)} className="p-1 text-muted-foreground/40 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted border-t border-border">
                      <td colSpan={5} className="px-3 py-2 text-[10px] font-bold text-muted-foreground">
                        {cugRows.length} numbers
                      </td>
                      <td className="px-2 py-2">
                        <span className="text-xs font-black text-emerald-700">{fmtAmt(totalAmt)}</span>
                        <p className="text-[9px] text-muted-foreground">total/cycle</p>
                      </td>
                      <td colSpan={3} className="px-2 py-2">
                        <button onClick={addRow}
                          className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors">
                          <Plus className="w-3 h-3" /> Add row
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            /* ── STANDARD FORM / CUG PASTE MODE ── */
            <div className="px-6 py-4 space-y-4">
              {/* Type selector */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Category</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {typeOptions.map(t => {
                    const m = TYPE_META[t]; const Icon = m.icon;
                    return (
                      <button key={t} onClick={() => set("type", t)}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-[11px] font-semibold transition-all
                          ${form.type === t ? `${m.bg} ${m.color} ${m.border} shadow-sm` : "border-border text-muted-foreground hover:border-border/80 bg-card"}`}>
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Name */}
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">
                    {isCug ? "CUG Group Name *" : "Label / Name *"}
                  </label>
                  <input value={form.name} onChange={e => set("name", e.target.value)}
                    placeholder={isCug ? "e.g. Sales Team CUG, Field Staff CUG" : "e.g. CEO Mobile, Office WiFi"}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>

                {/* CUG paste step */}
                {isCug && !initial?.id ? (
                  <>
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">
                        Mobile Numbers <span className="text-primary normal-case font-normal">(one per line — number name or name number)</span>
                      </label>
                      <textarea value={form.bulk_numbers} onChange={e => set("bulk_numbers", e.target.value)} rows={6}
                        placeholder={"9876543210 Sathish\n9876543211 Ravi Kumar\n9876543212\n9876543213 CEO Sir\n..."}
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono resize-none" />
                      {form.bulk_numbers.trim() && (
                        <p className="text-[10px] text-primary mt-1 font-semibold">
                          {form.bulk_numbers.trim().split("\n").filter(l => l.trim()).length} numbers entered
                        </p>
                      )}
                    </div>

                    {/* Default plan for CUG */}
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Default Operator</label>
                      <input value={globalDef.operator} onChange={e => setGlobal("operator", e.target.value)} placeholder="e.g. Airtel, Jio"
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Default Plan</label>
                      <input value={globalDef.plan_name} onChange={e => setGlobal("plan_name", e.target.value)} placeholder="e.g. CUG 299"
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Default Amount (₹)</label>
                      <input type="number" value={globalDef.plan_amount} onChange={e => setGlobal("plan_amount", e.target.value)} placeholder="0"
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Default Validity (days)</label>
                      <input type="number" value={globalDef.validity_days} onChange={e => setGlobal("validity_days", e.target.value)} placeholder="28"
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Default Due Date</label>
                      <input type="date" value={globalDef.due_date} onChange={e => setGlobal("due_date", e.target.value)}
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">
                        {form.type === "mobile" || form.type === "cug" ? "Mobile Number" : form.type === "broadband" ? "Account / Username" : "Account Number"}
                      </label>
                      <div className="relative">
                        <input value={form.mobile_or_account} onChange={e => set("mobile_or_account", e.target.value)}
                          placeholder={form.type === "mobile" || form.type === "cug" ? "Enter 10-digit mobile number" : "Account ID"}
                          maxLength={form.type === "mobile" ? 10 : undefined}
                          className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary pr-32" />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                          {detecting && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Detecting…</span>}
                          {!detecting && form.operator && opStyle && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${opStyle.bg} ${opStyle.text} ${opStyle.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${opStyle.dot}`} /> {form.operator}
                            </span>
                          )}
                          {!detecting && form.operator && !opStyle && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-muted text-foreground border border-border">{form.operator}</span>
                          )}
                        </div>
                      </div>
                      {form.type === "mobile" && (
                        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5 text-primary/60" /> Operator auto-detected at 10 digits
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Operator / Provider</label>
                      <input value={form.operator} onChange={e => set("operator", e.target.value)}
                        placeholder="e.g. Airtel, BSNL, JioFiber"
                        className={`w-full px-3 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground bg-background
                          ${opStyle ? `${opStyle.border} ${opStyle.bg}` : "border-border"}`} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Plan / Description</label>
                      <input value={form.plan_name} onChange={e => set("plan_name", e.target.value)} placeholder="e.g. 299 Unlimited"
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                    </div>

                    {quickPlans && (
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Quick Plan</label>
                        <div className="flex flex-wrap gap-1.5">
                          {quickPlans.map(p => {
                            const isSelected = form.plan_amount === p.amount && form.validity_days === p.validity;
                            return (
                              <button key={p.label}
                                onClick={() => setForm(f => ({ ...f, plan_amount: p.amount, validity_days: p.validity }))}
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all ${
                                  isSelected
                                    ? `${opStyle?.bg || "bg-accent"} ${opStyle?.text || "text-primary"} ${opStyle?.border || "border-primary/30"} shadow-sm`
                                    : "border-border text-foreground/70 hover:border-border/80 hover:bg-muted bg-card"
                                }`}>
                                {p.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Amount (₹)</label>
                      <input type="number" value={form.plan_amount} onChange={e => set("plan_amount", e.target.value)} placeholder="0"
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Validity (days)</label>
                      <input type="number" value={form.validity_days} onChange={e => set("validity_days", e.target.value)} placeholder="28"
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Due / Recharge Date</label>
                      <input type="date" value={form.due_date} onChange={e => set("due_date", e.target.value)}
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Notes</label>
                      <input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional"
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
          {isCug && !initial?.id && cugStep === "paste" ? (
            <button onClick={parseToCugTable} disabled={!form.name || !form.bulk_numbers.trim()}
              className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors">
              Parse {form.bulk_numbers.trim().split("\n").filter(l => l.trim()).length || 0} Numbers into Table →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={!form.name && !isCugTable}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors">
              {initial?.id ? "Save Changes" : isCugTable ? `Save ${cugRows.filter(r => r.mobile.trim()).length} CUG Numbers` : "Add Entry"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PayModal({ sub, onClose, onPaid }: { sub: Subscription; onClose: () => void; onPaid: () => void }) {
  const [form, setForm] = useState({
    amount: sub.plan_amount, paid_date: new Date().toISOString().split("T")[0],
    method: "UPI", reference: "", notes: "",
  });
  const { toast } = useToast();

  async function handlePay() {
    const r = await fetch(`${BASE}/api/admin/payment-tracker/subscriptions/${sub.id}/pay`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (!r.ok) { toast({ title: "Failed", variant: "destructive" }); return; }
    toast({ title: "Payment recorded!" });
    onPaid();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-sm shadow-2xl border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-bold text-card-foreground">Mark as Recharged</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">{sub.name} · {sub.mobile_or_account}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Amount (₹)</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Paid Date</label>
              <input type="date" value={form.paid_date} onChange={e => setForm(f => ({ ...f, paid_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Payment Method</label>
            <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
              {["UPI", "Net Banking", "Credit Card", "Debit Card", "Cash", "Cheque", "Auto Debit", "Other"].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Transaction ID (optional)</label>
            <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="UPI ref / txn ID"
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>
          <div className="bg-accent rounded-xl px-3 py-2.5 text-[11px] text-primary">
            Next due: <strong>{sub.due_date
              ? new Date(new Date(sub.due_date).getTime() + sub.validity_days * 86400000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
              : `Today + ${sub.validity_days} days`}</strong>
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handlePay} className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">Record Payment</button>
        </div>
      </div>
    </div>
  );
}

function DetailPanel({ sub, onBack, onRefresh }: { sub: Subscription; onBack: () => void; onRefresh: () => void }) {
  const [history, setHistory] = useState<PaymentHistory[]>([]);
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [tab, setTab] = useState<"history" | "followups">("history");
  const [newFollowup, setNewFollowup] = useState({ date: "", notes: "" });
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    const [h, f] = await Promise.all([
      fetch(`${BASE}/api/admin/payment-tracker/subscriptions/${sub.id}/history`).then(r => r.json()),
      fetch(`${BASE}/api/admin/payment-tracker/subscriptions/${sub.id}/followups`).then(r => r.json()),
    ]);
    setHistory(Array.isArray(h) ? h : []);
    setFollowups(Array.isArray(f) ? f : []);
  }, [sub.id]);

  useEffect(() => { load(); }, [load]);

  async function addFollowup() {
    if (!newFollowup.date) return;
    await fetch(`${BASE}/api/admin/payment-tracker/subscriptions/${sub.id}/followups`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ followup_date: newFollowup.date, notes: newFollowup.notes }),
    });
    setNewFollowup({ date: "", notes: "" }); setShowFollowupForm(false); load();
    toast({ title: "Follow-up added" });
  }

  async function markFollowupDone(fid: number) {
    await fetch(`${BASE}/api/admin/payment-tracker/followups/${fid}/done`, { method: "PATCH" });
    load();
  }

  const meta = TYPE_META[sub.type] || TYPE_META.other;
  const Icon = meta.icon;
  const days = daysUntil(sub.due_date);

  return (
    <div className="h-full flex flex-col">
      <div className="bg-card border-b border-border px-6 py-4 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><ArrowLeft className="w-4 h-4" /></button>
        <div className={`w-9 h-9 rounded-xl ${meta.bg} ${meta.border} border flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${meta.color}`} />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-card-foreground">{sub.name}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <OperatorChip operator={sub.operator} />
            {sub.mobile_or_account && <span className="text-[10px] text-muted-foreground font-mono">{sub.mobile_or_account}</span>}
          </div>
        </div>
        <DueBadge dueDate={sub.due_date} />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-background">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Amount", value: fmtAmt(sub.plan_amount), icon: DollarSign, color: "text-emerald-600" },
            { label: "Due Date", value: fmtDate(sub.due_date), icon: Calendar, color: days !== null && days < 0 ? "text-red-600" : "text-foreground" },
            { label: "Validity", value: `${sub.validity_days}d`, icon: Clock, color: "text-primary" },
          ].map(c => { const CI = c.icon; return (
            <div key={c.label} className="bg-card rounded-2xl px-4 py-3 border border-border shadow-sm">
              <div className="flex items-center gap-1.5 mb-1"><CI className={`w-3 h-3 ${c.color}`} />
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{c.label}</p></div>
              <p className={`text-sm font-bold ${c.color}`}>{c.value}</p>
            </div>
          ); })}
        </div>
        {sub.plan_name && (
          <div className="bg-card rounded-2xl px-4 py-3 border border-border flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-primary/60" />
            <span className="text-xs text-foreground/70"><span className="font-semibold">Plan:</span> {sub.plan_name}</span>
          </div>
        )}
        {sub.notes && (
          <div className="bg-card rounded-2xl px-4 py-3 border border-border flex items-start gap-2">
            <FileText className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
            <span className="text-xs text-foreground/70">{sub.notes}</span>
          </div>
        )}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex border-b border-border">
            {(["history", "followups"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-3 text-xs font-bold capitalize transition-colors
                  ${tab === t ? "text-primary border-b-2 border-primary bg-accent/30" : "text-muted-foreground hover:text-foreground"}`}>
                {t === "history" ? `Payments (${history.length})` : `Follow-ups (${followups.filter(f => !f.done).length})`}
              </button>
            ))}
          </div>
          {tab === "history" && (
            <div className="divide-y divide-border/50">
              {history.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">No payments recorded yet</p>
              ) : history.map(h => (
                <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground">{fmtAmt(h.amount)}</p>
                    <p className="text-[10px] text-muted-foreground">{fmtDate(h.paid_date)} · {h.method}{h.reference ? ` · ${h.reference}` : ""}</p>
                    {h.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{h.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === "followups" && (
            <div>
              <div className="divide-y divide-border/50">
                {followups.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-6">No follow-ups yet</p>
                ) : followups.map(f => (
                  <div key={f.id} className={`flex items-center gap-3 px-4 py-3 ${f.done ? "opacity-50" : ""}`}>
                    <button onClick={() => !f.done && markFollowupDone(f.id)}
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors
                        ${f.done ? "bg-emerald-500 border-emerald-500" : "border-border hover:border-primary"}`}>
                      {f.done && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <div className="flex-1">
                      <p className={`text-xs font-semibold ${f.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{fmtDate(f.followup_date)}</p>
                      {f.notes && <p className="text-[10px] text-muted-foreground">{f.notes}</p>}
                    </div>
                    {!f.done && daysUntil(f.followup_date) !== null && daysUntil(f.followup_date)! <= 1 && (
                      <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-semibold">Urgent</span>
                    )}
                  </div>
                ))}
              </div>
              {showFollowupForm ? (
                <div className="px-4 py-3 border-t border-border space-y-2">
                  <input type="date" value={newFollowup.date} onChange={e => setNewFollowup(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  <input value={newFollowup.notes} onChange={e => setNewFollowup(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Notes (optional)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowFollowupForm(false)} className="flex-1 py-2 text-xs font-semibold rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
                    <button onClick={addFollowup} className="flex-1 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Add</button>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-3 border-t border-border">
                  <button onClick={() => setShowFollowupForm(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-primary hover:bg-accent rounded-xl transition-colors">
                    <Bell className="w-3.5 h-3.5" /> Add Follow-up Reminder
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CUG Group Card (table layout) ───────────────────────────────────────────
function CugGroupCard({ groupName, operator, items, onPayAll, onEdit, onDelete, onAddNumber, onItemClick, onPayItem }: {
  groupName: string; operator: string; items: Subscription[];
  onPayAll: () => void; onEdit: (s: Subscription) => void; onDelete: (id: number) => void;
  onAddNumber: () => void; onItemClick: (s: Subscription) => void; onPayItem: (s: Subscription) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const os = OPERATOR_STYLE[operator];
  const totalAmt = items.reduce((a, s) => a + Number(s.plan_amount), 0);
  const overdue = items.filter(s => { const d = daysUntil(s.due_date); return d !== null && d < 0; }).length;
  const dueSoon = items.filter(s => { const d = daysUntil(s.due_date); return d !== null && d >= 0 && d <= 7; }).length;

  const borderColor = overdue > 0 ? "border-l-red-500" : dueSoon > 0 ? "border-l-amber-500" : "border-l-primary";

  return (
    <div className={`bg-card rounded-2xl border border-border shadow-sm overflow-hidden border-l-4 ${borderColor}`}>
      {/* Group header */}
      <div className={`flex items-center gap-3 px-4 py-3 ${os ? os.bg : "bg-accent"} border-b border-border`}>
        <button onClick={() => setCollapsed(c => !c)} className="p-1 rounded-lg hover:bg-black/5 transition-colors">
          {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        <div className={`w-8 h-8 rounded-xl bg-card ${os ? os.border : "border-primary/20"} border flex items-center justify-center shrink-0`}>
          <Users className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground">{groupName}</span>
            <OperatorChip operator={operator} />
            <span className="text-[10px] font-bold text-primary bg-accent border border-primary/20 px-1.5 py-0.5 rounded-full">
              {items.length} numbers
            </span>
            {overdue > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-full flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" />{overdue} overdue</span>}
            {dueSoon > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-full flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{dueSoon} due soon</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-foreground">{fmtAmt(totalAmt)}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">total/cycle</p>
          </div>
          <button onClick={onAddNumber}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold border border-primary/30 text-primary bg-card rounded-xl hover:bg-accent transition-colors">
            <Plus className="w-3 h-3" /> Add
          </button>
          <button onClick={onPayAll}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors">
            <CheckCircle className="w-3 h-3" /> Recharge All
          </button>
        </div>
      </div>

      {/* Table */}
      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground w-8">#</th>
                <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Mobile</th>
                <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Name</th>
                <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Plan</th>
                <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Amount</th>
                <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Validity</th>
                <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Due Date</th>
                <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((s, i) => {
                const d = daysUntil(s.due_date);
                const rowBg = d !== null && d < 0 ? "bg-red-50/40"
                  : d !== null && d <= 3 ? "bg-orange-50/30"
                  : d !== null && d <= 7 ? "bg-amber-50/20"
                  : i % 2 === 1 ? "bg-muted/20" : "bg-card";
                return (
                  <tr key={s.id}
                    className={`border-b border-border/50 hover:bg-accent/20 transition-colors cursor-pointer ${rowBg}`}
                    onClick={() => onItemClick(s)}>
                    <td className="px-4 py-2.5 text-[10px] text-muted-foreground font-semibold">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-mono font-semibold text-foreground tracking-wide">
                        {s.mobile_or_account || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs text-foreground/80 font-medium">{s.name}</span>
                      {s.notes && <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{s.notes}</p>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[11px] text-muted-foreground">{s.plan_name || "—"}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-bold text-emerald-700">{fmtAmt(s.plan_amount)}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[11px] text-foreground/70">{s.validity_days}d</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[11px] text-foreground/70 whitespace-nowrap">{fmtDate(s.due_date)}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <DueBadge dueDate={s.due_date} />
                    </td>
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button onClick={() => onPayItem(s)}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-colors" title="Recharge">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onEdit(s)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors" title="Edit">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDelete(s.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground/40 hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/40 border-t border-border">
                <td colSpan={4} className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                  {items.length} numbers total
                </td>
                <td className="px-3 py-2">
                  <span className="text-xs font-black text-emerald-700">{fmtAmt(totalAmt)}</span>
                </td>
                <td colSpan={4} className="px-3 py-2 text-[10px] text-muted-foreground">per recharge cycle</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Individual Subscription Card ────────────────────────────────────────────
function SubCard({ s, onPay, onEdit, onDelete, onClick }: {
  s: Subscription; onPay: () => void; onEdit: () => void; onDelete: () => void; onClick: () => void;
}) {
  const meta = TYPE_META[s.type] || TYPE_META.other;
  const Icon = meta.icon;
  const days = daysUntil(s.due_date);
  const urgency = days !== null && days < 0 ? "border-red-300 shadow-red-100"
    : days !== null && days <= 3 ? "border-orange-300 shadow-orange-100"
    : days !== null && days <= 7 ? "border-amber-200"
    : "border-border";

  return (
    <div onClick={onClick} className={`bg-card rounded-2xl border ${urgency} shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden`}>
      {/* Left accent bar */}
      <div className={`h-0.5 w-full ${meta.accent}`} />

      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl ${meta.bg} ${meta.border} border flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 ${meta.color}`} />
            </div>
            <OperatorChip operator={s.operator} />
          </div>
          <DueBadge dueDate={s.due_date} />
        </div>

        {/* Name */}
        <p className="text-sm font-bold text-card-foreground leading-tight">{s.name}</p>
        {s.mobile_or_account && (
          <p className="text-[11px] text-muted-foreground font-mono mt-0.5 tracking-wide">{s.mobile_or_account}</p>
        )}

        {/* Plan info */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50">
          <div>
            <p className="text-xs font-black text-emerald-700">{fmtAmt(s.plan_amount)}</p>
            <p className="text-[9px] text-muted-foreground">amount</p>
          </div>
          <div className="w-px h-6 bg-border" />
          <div>
            <p className="text-xs font-semibold text-foreground/80">{s.validity_days}d</p>
            <p className="text-[9px] text-muted-foreground">validity</p>
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-foreground/80">{fmtDate(s.due_date)}</p>
            <p className="text-[9px] text-muted-foreground">due date</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border/50" onClick={e => e.stopPropagation()}>
          <button onClick={onPay}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors">
            <CheckCircle className="w-3 h-3" /> Recharge
          </button>
          <button onClick={onEdit} className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground transition-colors" title="Edit">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-xl hover:bg-red-50 text-muted-foreground/40 hover:text-red-500 transition-colors" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
type TabType = "all" | "mobile" | "cug" | "broadband" | "dth" | "ott" | "bills";
const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: "all",       label: "All",       icon: Receipt },
  { id: "mobile",    label: "Mobile",    icon: Smartphone },
  { id: "cug",       label: "CUG",       icon: Users },
  { id: "broadband", label: "Broadband", icon: Wifi },
  { id: "dth",       label: "DTH / OTT", icon: Tv },
  { id: "bills",     label: "Bills",     icon: Zap },
];

export default function PaymentTracker() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<SubType | undefined>();
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [payingSub, setPayingSub] = useState<Subscription | null>(null);
  const [detailSub, setDetailSub] = useState<Subscription | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/admin/payment-tracker/subscriptions`);
      const data = await r.json();
      setSubs(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveSub(form: typeof EMPTY_FORM) {
    if (editSub) {
      const r = await fetch(`${BASE}/api/admin/payment-tracker/subscriptions/${editSub.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!r.ok) { toast({ title: "Failed to save", variant: "destructive" }); return; }
      toast({ title: "Updated successfully" });
    } else if (form.type === "cug" && form.bulk_numbers.trim()) {
      let rows: CugRow[] = [];
      if (form.bulk_numbers.trim().startsWith("[")) {
        rows = JSON.parse(form.bulk_numbers).filter((r: CugRow) => r.mobile.trim());
      } else {
        rows = form.bulk_numbers.trim().split("\n").filter(l => l.trim()).map((line, i) => {
          const parts = line.trim().split(/\s+/);
          const isNumber = /^\d{6,15}$/.test(parts[0]);
          const mobile = isNumber ? parts[0] : parts[parts.length - 1];
          const nameParts = isNumber ? parts.slice(1) : parts.slice(0, -1);
          return { _id: `${i}`, mobile, name: nameParts.join(" ") || mobile,
            operator: form.operator, plan_name: form.plan_name,
            plan_amount: form.plan_amount, validity_days: form.validity_days, due_date: form.due_date };
        });
      }
      let created = 0;
      for (const row of rows) {
        await fetch(`${BASE}/api/admin/payment-tracker/subscriptions`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form, name: row.name || row.mobile, mobile_or_account: row.mobile,
            operator: row.operator, plan_name: row.plan_name,
            plan_amount: row.plan_amount, validity_days: row.validity_days, due_date: row.due_date,
            bulk_numbers: undefined,
          }),
        });
        created++;
      }
      toast({ title: `${created} CUG numbers added successfully` });
    } else {
      const r = await fetch(`${BASE}/api/admin/payment-tracker/subscriptions`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!r.ok) { toast({ title: "Failed to save", variant: "destructive" }); return; }
      toast({ title: "Entry added" });
    }
    setShowForm(false); setEditSub(null); setFormType(undefined); load();
  }

  async function deleteSub(id: number) {
    if (!confirm("Delete this entry?")) return;
    await fetch(`${BASE}/api/admin/payment-tracker/subscriptions/${id}`, { method: "DELETE" });
    toast({ title: "Deleted" }); load();
  }

  const cugItems = subs.filter(s => s.type === "cug");
  const cugGroups: Record<string, Subscription[]> = {};
  for (const s of cugItems) {
    const key = `${s.name.replace(/\s*\d+$/, "").trim()}|${s.operator}`;
    if (!cugGroups[key]) cugGroups[key] = [];
    cugGroups[key].push(s);
  }

  const overdue = subs.filter(s => { const d = daysUntil(s.due_date); return d !== null && d < 0; });
  const dueSoon = subs.filter(s => { const d = daysUntil(s.due_date); return d !== null && d >= 0 && d <= 7; });
  const totalMonthly = subs.reduce((a, s) => a + (Number(s.plan_amount) * (30 / (s.validity_days || 30))), 0);

  const tabTypes: Record<TabType, SubType[]> = {
    all: [], mobile: ["mobile"], cug: ["cug"],
    broadband: ["broadband"], dth: ["dth", "ott"],
    bills: ["electricity", "insurance", "office_phone", "other"],
  };
  const filtered = subs.filter(s => {
    const matchSearch = !search
      || s.name.toLowerCase().includes(search.toLowerCase())
      || (s.mobile_or_account || "").includes(search)
      || (s.operator || "").toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === "all" || tabTypes[activeTab].includes(s.type);
    return matchSearch && matchTab;
  });

  const filteredNonCug = filtered.filter(s => s.type !== "cug");
  const filteredCug = filtered.filter(s => s.type === "cug");

  if (detailSub) {
    return (
      <Layout>
        <div className="h-full flex flex-col bg-background overflow-hidden">
          <DetailPanel sub={detailSub} onBack={() => { setDetailSub(null); load(); }} onRefresh={load} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-full flex flex-col bg-background overflow-hidden">
        {showForm && (
          <SubscriptionForm
            initial={editSub
              ? { ...editSub, plan_amount: editSub.plan_amount, validity_days: String(editSub.validity_days), due_date: editSub.due_date || "", type: editSub.type }
              : formType ? { type: formType } : undefined}
            onSave={saveSub}
            onCancel={() => { setShowForm(false); setEditSub(null); setFormType(undefined); }}
          />
        )}
        {payingSub && (
          <PayModal sub={payingSub} onClose={() => setPayingSub(null)} onPaid={() => { setPayingSub(null); load(); }} />
        )}

        {/* ── Header ── */}
        <div className="bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-4 px-6 py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                <Receipt className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-card-foreground leading-tight">Bill & Recharge Tracker</h1>
                <p className="text-[10px] text-muted-foreground">Follow-up & Renewal Manager</p>
              </div>
            </div>
            <div className="flex-1" />
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, number, operator…"
                className="w-52 pl-8 pr-3 py-2 text-xs rounded-xl border border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-card transition-all" />
            </div>
            <button onClick={load} disabled={loading} className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => { setFormType("cug"); setEditSub(null); setShowForm(true); }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-2 border-primary/30 text-primary bg-accent rounded-xl hover:bg-accent/80 transition-colors">
                <Users className="w-3.5 h-3.5" /> Add CUG
              </button>
              <button onClick={() => { setFormType(undefined); setEditSub(null); setShowForm(true); }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Entry
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-0 px-6 border-t border-border overflow-x-auto scrollbar-hide">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const count = tab.id === "all" ? subs.length
                : tab.id === "dth" ? subs.filter(s => ["dth","ott"].includes(s.type)).length
                : tab.id === "bills" ? subs.filter(s => ["electricity","insurance","office_phone","other"].includes(s.type)).length
                : subs.filter(s => s.type === tab.id).length;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap
                    ${activeTab === tab.id
                      ? "border-primary text-primary bg-accent/30"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold
                      ${activeTab === tab.id ? "bg-accent text-primary" : "bg-muted text-muted-foreground"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-6 py-5 space-y-5">

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Entries", value: subs.length, sub: `${cugItems.length} CUG numbers`, icon: Receipt, color: "text-primary", bg: "bg-accent", border: "border-primary/10" },
                { label: "Overdue", value: overdue.length, sub: "need immediate recharge", icon: AlertTriangle, color: overdue.length > 0 ? "text-red-600" : "text-muted-foreground/30", bg: overdue.length > 0 ? "bg-red-50" : "bg-muted", border: overdue.length > 0 ? "border-red-100" : "border-border" },
                { label: "Due in 7 Days", value: dueSoon.length, sub: "upcoming renewals", icon: Clock, color: dueSoon.length > 0 ? "text-amber-600" : "text-muted-foreground/30", bg: dueSoon.length > 0 ? "bg-amber-50" : "bg-muted", border: dueSoon.length > 0 ? "border-amber-100" : "border-border" },
                { label: "Monthly Est.", value: fmtAmt(totalMonthly.toFixed(0)), sub: "approx. per month", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
              ].map(c => { const CI = c.icon; return (
                <div key={c.label} className={`bg-card rounded-2xl px-4 py-3.5 border ${c.border} shadow-sm`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-7 h-7 rounded-lg ${c.bg} flex items-center justify-center`}>
                      <CI className={`w-3.5 h-3.5 ${c.color}`} />
                    </div>
                  </div>
                  <p className={`text-xl font-black ${c.color}`}>{c.value}</p>
                  <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">{c.label}</p>
                  <p className="text-[9px] text-muted-foreground/50 mt-0.5">{c.sub}</p>
                </div>
              ); })}
            </div>

            {/* Urgent alerts */}
            {(overdue.length > 0 || dueSoon.length > 0) && (
              <div className="space-y-2">
                {overdue.slice(0, 5).map(s => {
                  const meta = TYPE_META[s.type] || TYPE_META.other; const Icon = meta.icon;
                  return (
                    <div key={s.id} className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-red-800">{s.name}
                          {s.mobile_or_account && <span className="font-mono font-normal text-red-500 ml-1.5">{s.mobile_or_account}</span>}
                        </p>
                        <p className="text-[10px] text-red-400">{s.operator} · Due was {fmtDate(s.due_date)} · {fmtAmt(s.plan_amount)}</p>
                      </div>
                      <button onClick={() => setPayingSub(s)}
                        className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 shrink-0">Recharge Now</button>
                    </div>
                  );
                })}
                {dueSoon.slice(0, 3).map(s => {
                  const meta = TYPE_META[s.type] || TYPE_META.other; const Icon = meta.icon;
                  const days = daysUntil(s.due_date);
                  return (
                    <div key={s.id} className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                      <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-amber-800">{s.name} — Due {days === 0 ? "Today" : `in ${days}d`}</p>
                        <p className="text-[10px] text-amber-500">{s.operator} · {fmtDate(s.due_date)} · {fmtAmt(s.plan_amount)}</p>
                      </div>
                      <button onClick={() => setPayingSub(s)}
                        className="px-3 py-1.5 text-xs font-bold bg-amber-600 text-white rounded-xl hover:bg-amber-700 shrink-0">Recharge</button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* CUG Groups section */}
            {(activeTab === "all" || activeTab === "cug") && filteredCug.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">CUG Groups</h2>
                  <span className="text-[10px] text-primary bg-accent border border-primary/20 px-2 py-0.5 rounded-full font-bold">
                    {filteredCug.length} numbers
                  </span>
                </div>
                <div className="space-y-4">
                  {Object.entries(cugGroups).filter(([, items]) =>
                    items.some(s => filteredCug.includes(s))
                  ).map(([key, items]) => {
                    const [groupName, operator] = key.split("|");
                    return (
                      <CugGroupCard key={key}
                        groupName={groupName} operator={operator} items={items}
                        onPayAll={() => { if (items[0]) setPayingSub(items[0]); }}
                        onPayItem={(s) => setPayingSub(s)}
                        onEdit={(s) => { setEditSub(s); setShowForm(true); }}
                        onDelete={(id) => deleteSub(id)}
                        onAddNumber={() => { setFormType("cug"); setEditSub(null); setShowForm(true); }}
                        onItemClick={(s) => setDetailSub(s)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Individual entries table */}
            {filteredNonCug.length > 0 && activeTab !== "cug" && (
              <div>
                {(activeTab === "all" && filteredCug.length > 0) && (
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-sm font-bold text-foreground">Individual Entries</h2>
                    <span className="text-[10px] text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full font-bold">
                      {filteredNonCug.length}
                    </span>
                  </div>
                )}
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Type</th>
                          <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Name / Account</th>
                          <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Mobile / ID</th>
                          <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Operator</th>
                          <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Plan</th>
                          <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Amount</th>
                          <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Validity</th>
                          <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Due Date</th>
                          <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                          <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredNonCug.map((s, i) => {
                          const meta = TYPE_META[s.type] || TYPE_META.other;
                          const Icon = meta.icon;
                          const d = daysUntil(s.due_date);
                          const rowBg = d !== null && d < 0 ? "bg-red-50/40"
                            : d !== null && d <= 3 ? "bg-orange-50/30"
                            : d !== null && d <= 7 ? "bg-amber-50/20"
                            : i % 2 === 1 ? "bg-muted/20" : "bg-card";
                          return (
                            <tr key={s.id} onClick={() => setDetailSub(s)}
                              className={`border-b border-border/50 hover:bg-accent/20 transition-colors cursor-pointer ${rowBg}`}>
                              <td className="px-4 py-3">
                                <div className={`w-8 h-8 rounded-xl ${meta.bg} ${meta.border} border flex items-center justify-center`}>
                                  <Icon className={`w-4 h-4 ${meta.color}`} />
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <p className="text-xs font-semibold text-foreground">{s.name}</p>
                                {s.notes && <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{s.notes}</p>}
                              </td>
                              <td className="px-3 py-3">
                                <span className="text-[11px] font-mono font-semibold text-foreground/80 tracking-wide">
                                  {s.mobile_or_account || "—"}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <OperatorChip operator={s.operator} />
                              </td>
                              <td className="px-3 py-3">
                                <span className="text-[11px] text-muted-foreground">{s.plan_name || "—"}</span>
                              </td>
                              <td className="px-3 py-3">
                                <span className="text-xs font-bold text-emerald-700">{fmtAmt(s.plan_amount)}</span>
                              </td>
                              <td className="px-3 py-3">
                                <span className="text-[11px] text-foreground/70">{s.validity_days}d</span>
                              </td>
                              <td className="px-3 py-3">
                                <span className="text-[11px] text-foreground/70 whitespace-nowrap">{fmtDate(s.due_date)}</span>
                              </td>
                              <td className="px-3 py-3">
                                <DueBadge dueDate={s.due_date} />
                              </td>
                              <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => setPayingSub(s)}
                                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-colors" title="Recharge">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => { setEditSub(s); setShowForm(true); }}
                                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors" title="Edit">
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => deleteSub(s.id)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground/40 hover:text-red-400 transition-colors" title="Delete">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state */}
            {filtered.length === 0 && !loading && (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Receipt className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-bold text-muted-foreground">
                  {search ? "No results found" : activeTab === "cug" ? "No CUG groups yet" : "Nothing here yet"}
                </p>
                <p className="text-xs text-muted-foreground/50 mt-1">
                  {search ? "Try a different search term" : activeTab === "cug"
                    ? 'Click "Add CUG" to add your corporate group numbers in bulk'
                    : 'Click "Add Entry" to get started'}
                </p>
              </div>
            )}

            {loading && (
              <div className="flex justify-center py-16">
                <RefreshCw className="w-6 h-6 animate-spin text-primary/60" />
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
