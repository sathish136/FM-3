import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard, Plus, RefreshCw, Smartphone, Wifi, Tv, ShoppingBag,
  Phone, Shield, Zap, MoreHorizontal, CheckCircle, Clock, AlertTriangle,
  ChevronDown, X, Edit3, Trash2, History, Bell, BellOff, ArrowLeft,
  Calendar, DollarSign, Tag, Building2, FileText, Check, Search, Receipt,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type SubType = "mobile" | "broadband" | "dth" | "ott" | "office_phone" | "electricity" | "insurance" | "other";
type SubStatus = "active" | "inactive" | "expired";

interface Subscription {
  id: number;
  name: string;
  type: SubType;
  mobile_or_account: string;
  operator: string;
  plan_name: string;
  plan_amount: string;
  validity_days: number;
  due_date: string | null;
  status: SubStatus;
  notes: string;
  created_at: string;
  payment_count: string;
  pending_followups: string;
}

interface PaymentHistory {
  id: number;
  subscription_id: number;
  amount: string;
  paid_date: string;
  method: string;
  reference: string;
  notes: string;
  created_at: string;
}

interface Followup {
  id: number;
  subscription_id: number;
  followup_date: string;
  notes: string;
  done: boolean;
  done_at: string | null;
}

const TYPE_META: Record<SubType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  mobile: { label: "Mobile", icon: Smartphone, color: "text-blue-600", bg: "bg-blue-100" },
  broadband: { label: "Broadband", icon: Wifi, color: "text-indigo-600", bg: "bg-indigo-100" },
  dth: { label: "DTH / Cable", icon: Tv, color: "text-purple-600", bg: "bg-purple-100" },
  ott: { label: "OTT / Streaming", icon: ShoppingBag, color: "text-pink-600", bg: "bg-pink-100" },
  office_phone: { label: "Office Phone", icon: Phone, color: "text-teal-600", bg: "bg-teal-100" },
  electricity: { label: "Electricity", icon: Zap, color: "text-amber-600", bg: "bg-amber-100" },
  insurance: { label: "Insurance", icon: Shield, color: "text-emerald-600", bg: "bg-emerald-100" },
  other: { label: "Other", icon: CreditCard, color: "text-gray-600", bg: "bg-gray-100" },
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
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
  if (days === null) return <span className="text-xs text-gray-400">No due date</span>;
  if (days < 0) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 ring-1 ring-red-300">
      <AlertTriangle className="w-3 h-3" /> Overdue {Math.abs(days)}d
    </span>
  );
  if (days === 0) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 ring-1 ring-red-300">
      <AlertTriangle className="w-3 h-3" /> Due Today
    </span>
  );
  if (days <= 3) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 ring-1 ring-orange-300">
      <Clock className="w-3 h-3" /> {days}d left
    </span>
  );
  if (days <= 7) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 ring-1 ring-amber-300">
      <Clock className="w-3 h-3" /> {days}d left
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300">
      <CheckCircle className="w-3 h-3" /> {days}d left
    </span>
  );
}

// Operator brand colors
const OPERATOR_STYLE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "Jio":    { bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-300",   dot: "bg-blue-500" },
  "Airtel": { bg: "bg-red-100",    text: "text-red-700",    border: "border-red-300",    dot: "bg-red-500" },
  "Vi":     { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300", dot: "bg-purple-500" },
  "BSNL":   { bg: "bg-green-100",  text: "text-green-700",  border: "border-green-300",  dot: "bg-green-500" },
};

// Common plans per operator
const QUICK_PLANS: Record<string, { amount: string; validity: string; label: string }[]> = {
  Jio: [
    { amount: "199", validity: "28", label: "₹199 · 28d" },
    { amount: "239", validity: "28", label: "₹239 · 28d" },
    { amount: "299", validity: "28", label: "₹299 · 28d" },
    { amount: "349", validity: "28", label: "₹349 · 28d" },
    { amount: "449", validity: "56", label: "₹449 · 56d" },
    { amount: "599", validity: "84", label: "₹599 · 84d" },
    { amount: "2999", validity: "365", label: "₹2999 · 1yr" },
  ],
  Airtel: [
    { amount: "199", validity: "28", label: "₹199 · 28d" },
    { amount: "299", validity: "28", label: "₹299 · 28d" },
    { amount: "349", validity: "28", label: "₹349 · 28d" },
    { amount: "449", validity: "56", label: "₹449 · 56d" },
    { amount: "599", validity: "84", label: "₹599 · 84d" },
    { amount: "3359", validity: "365", label: "₹3359 · 1yr" },
  ],
  Vi: [
    { amount: "199", validity: "28", label: "₹199 · 28d" },
    { amount: "299", validity: "28", label: "₹299 · 28d" },
    { amount: "349", validity: "28", label: "₹349 · 28d" },
    { amount: "449", validity: "56", label: "₹449 · 56d" },
    { amount: "599", validity: "84", label: "₹599 · 84d" },
    { amount: "2899", validity: "365", label: "₹2899 · 1yr" },
  ],
  BSNL: [
    { amount: "97", validity: "26", label: "₹97 · 26d" },
    { amount: "187", validity: "28", label: "₹187 · 28d" },
    { amount: "247", validity: "28", label: "₹247 · 28d" },
    { amount: "399", validity: "90", label: "₹399 · 90d" },
    { amount: "1999", validity: "365", label: "₹1999 · 1yr" },
  ],
};

const EMPTY_FORM = {
  name: "", type: "mobile" as SubType, mobile_or_account: "", operator: "",
  plan_name: "", plan_amount: "", validity_days: "30", due_date: "", notes: "",
};

function SubscriptionForm({ initial, onSave, onCancel }: {
  initial?: Partial<typeof EMPTY_FORM & { id: number }>;
  onSave: (data: typeof EMPTY_FORM) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [detecting, setDetecting] = useState(false);
  const { toast } = useToast();

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  // Auto-detect operator when mobile number is 10 digits
  useEffect(() => {
    const digits = form.mobile_or_account.replace(/\D/g, "");
    if (form.type === "mobile" && digits.length === 10) {
      autoDetect(digits);
    }
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
        setForm(f => ({ ...f, operator: data.operator }));
      }
    } catch {}
    setDetecting(false);
  }

  const opStyle = form.operator ? OPERATOR_STYLE[form.operator] : null;
  const quickPlans = form.operator ? QUICK_PLANS[form.operator] : null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">{initial?.id ? "Edit Entry" : "Add Recharge / Bill Entry"}</h2>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          {/* Type selector */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Type</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(TYPE_META) as SubType[]).map(t => {
                const m = TYPE_META[t];
                const Icon = m.icon;
                return (
                  <button key={t} onClick={() => set("type", t)}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-[10px] font-semibold transition-all
                      ${form.type === t ? `${m.bg} ${m.color} border-current` : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                    <Icon className="w-4 h-4" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Label / Name *</label>
              <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Office WiFi, CEO Mobile, Sathish Phone"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            {/* Mobile number with auto-detect */}
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">
                {form.type === "mobile" ? "Mobile Number" : form.type === "broadband" ? "Account / Username" : "Account Number"}
              </label>
              <div className="relative">
                <input
                  value={form.mobile_or_account}
                  onChange={e => set("mobile_or_account", e.target.value)}
                  placeholder={form.type === "mobile" ? "Enter 10-digit mobile number" : "Account ID"}
                  maxLength={form.type === "mobile" ? 10 : undefined}
                  className={`w-full px-3 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-300 pr-28
                    ${opStyle ? `border-${opStyle.border.replace("border-","")}` : "border-gray-200"}`}
                />
                {/* Operator chip shown inside the input on the right */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {detecting && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Detecting…
                    </span>
                  )}
                  {!detecting && form.operator && opStyle && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${opStyle.bg} ${opStyle.text} ${opStyle.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${opStyle.dot}`} />
                      {form.operator}
                    </span>
                  )}
                  {!detecting && form.operator && !opStyle && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                      {form.operator}
                    </span>
                  )}
                </div>
              </div>
              {form.type === "mobile" && (
                <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-indigo-400" />
                  Operator is auto-detected when you enter 10 digits
                </p>
              )}
            </div>

            {/* Operator override */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Operator / Provider</label>
              <input value={form.operator} onChange={e => set("operator", e.target.value)} placeholder="e.g. Airtel, BSNL, JioFiber"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            {/* Plan name */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Plan Name / Description</label>
              <input value={form.plan_name} onChange={e => set("plan_name", e.target.value)} placeholder="e.g. 299 Unlimited, Annual"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            {/* Quick plan picker */}
            {quickPlans && (
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Quick Select Plan</label>
                <div className="flex flex-wrap gap-1.5">
                  {quickPlans.map(p => {
                    const isSelected = form.plan_amount === p.amount && form.validity_days === p.validity;
                    return (
                      <button
                        key={p.label}
                        onClick={() => setForm(f => ({ ...f, plan_amount: p.amount, validity_days: p.validity }))}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all ${
                          isSelected
                            ? `${opStyle?.bg || "bg-indigo-100"} ${opStyle?.text || "text-indigo-700"} ${opStyle?.border || "border-indigo-300"}`
                            : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                        }`}>
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Amount (₹)</label>
              <input type="number" value={form.plan_amount} onChange={e => set("plan_amount", e.target.value)} placeholder="0"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Validity (days)</label>
              <input type="number" value={form.validity_days} onChange={e => set("validity_days", e.target.value)} placeholder="30"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Due / Recharge Date</label>
              <input type="date" value={form.due_date} onChange={e => set("due_date", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Notes</label>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSave(form)} disabled={!form.name}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors">
            {initial?.id ? "Save Changes" : "Add Entry"}
          </button>
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
    toast({ title: "Payment recorded!", description: `Next due date updated.` });
    onPaid();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Mark as Paid</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Amount (₹)</label>
            <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Paid Date</label>
            <input type="date" value={form.paid_date} onChange={e => setForm(f => ({ ...f, paid_date: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Payment Method</label>
            <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300">
              {["UPI", "Net Banking", "Credit Card", "Debit Card", "Cash", "Cheque", "Auto Debit", "Other"].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Reference / Transaction ID</label>
            <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Optional"
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <p className="text-[10px] text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
            Next due date will be set to <strong>{sub.due_date
              ? new Date(new Date(sub.due_date).getTime() + sub.validity_days * 86400000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
              : `+${sub.validity_days} days from today`}</strong>
          </p>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600">Cancel</button>
          <button onClick={handlePay} className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">Record Payment</button>
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
    setNewFollowup({ date: "", notes: "" });
    setShowFollowupForm(false);
    load();
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
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><ArrowLeft className="w-4 h-4" /></button>
        <div className={`w-8 h-8 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${meta.color}`} />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-gray-900">{sub.name}</h2>
          <p className="text-[10px] text-gray-400">{sub.operator} · {sub.mobile_or_account}</p>
        </div>
        <DueBadge dueDate={sub.due_date} />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-[#f1f5f9]">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Plan Amount", value: fmtAmt(sub.plan_amount), icon: DollarSign, color: "text-emerald-600" },
            { label: "Due Date", value: fmtDate(sub.due_date), icon: Calendar, color: days !== null && days < 0 ? "text-red-600" : "text-gray-700" },
            { label: "Validity", value: `${sub.validity_days} days`, icon: Clock, color: "text-indigo-600" },
          ].map(c => {
            const CI = c.icon;
            return (
              <div key={c.label} className="bg-white rounded-2xl px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <div className="flex items-center gap-1.5 mb-1">
                  <CI className={`w-3 h-3 ${c.color}`} />
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{c.label}</p>
                </div>
                <p className={`text-sm font-bold ${c.color}`}>{c.value}</p>
              </div>
            );
          })}
        </div>

        {sub.plan_name && (
          <div className="bg-white rounded-2xl px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs text-gray-600"><span className="font-semibold">Plan:</span> {sub.plan_name}</span>
          </div>
        )}
        {sub.notes && (
          <div className="bg-white rounded-2xl px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-start gap-2">
            <FileText className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
            <span className="text-xs text-gray-600">{sub.notes}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="flex border-b border-gray-100">
            {(["history", "followups"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-3 text-xs font-bold capitalize transition-colors
                  ${tab === t ? "text-indigo-700 border-b-2 border-indigo-500" : "text-gray-400 hover:text-gray-700"}`}>
                {t === "history" ? `Payment History (${history.length})` : `Follow-ups (${followups.filter(f => !f.done).length} pending)`}
              </button>
            ))}
          </div>

          {tab === "history" && (
            <div className="divide-y divide-gray-50">
              {history.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-8">No payments recorded yet</p>
              ) : history.map(h => (
                <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-800">{fmtAmt(h.amount)}</p>
                    <p className="text-[10px] text-gray-400">{fmtDate(h.paid_date)} · {h.method}{h.reference ? ` · ${h.reference}` : ""}</p>
                    {h.notes && <p className="text-[10px] text-gray-400 mt-0.5">{h.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "followups" && (
            <div>
              <div className="divide-y divide-gray-50">
                {followups.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-6">No follow-ups yet</p>
                ) : followups.map(f => (
                  <div key={f.id} className={`flex items-center gap-3 px-4 py-3 ${f.done ? "opacity-50" : ""}`}>
                    <button onClick={() => !f.done && markFollowupDone(f.id)}
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors
                        ${f.done ? "bg-emerald-500 border-emerald-500" : "border-gray-300 hover:border-indigo-400"}`}>
                      {f.done && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <div className="flex-1">
                      <p className={`text-xs font-semibold ${f.done ? "line-through text-gray-400" : "text-gray-800"}`}>{fmtDate(f.followup_date)}</p>
                      {f.notes && <p className="text-[10px] text-gray-400">{f.notes}</p>}
                    </div>
                    {!f.done && daysUntil(f.followup_date) !== null && daysUntil(f.followup_date)! <= 1 && (
                      <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-semibold">Urgent</span>
                    )}
                  </div>
                ))}
              </div>
              {showFollowupForm ? (
                <div className="px-4 py-3 border-t border-gray-100 space-y-2">
                  <input type="date" value={newFollowup.date} onChange={e => setNewFollowup(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  <input value={newFollowup.notes} onChange={e => setNewFollowup(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Notes (optional)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowFollowupForm(false)} className="flex-1 py-2 text-xs font-semibold rounded-xl border border-gray-200 text-gray-600">Cancel</button>
                    <button onClick={addFollowup} className="flex-1 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white">Add</button>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-3 border-t border-gray-100">
                  <button onClick={() => setShowFollowupForm(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
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

export default function PaymentTracker() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<SubType | "">("");
  const [showForm, setShowForm] = useState(false);
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
    const url = editSub
      ? `${BASE}/api/admin/payment-tracker/subscriptions/${editSub.id}`
      : `${BASE}/api/admin/payment-tracker/subscriptions`;
    const method = editSub ? "PUT" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!r.ok) { toast({ title: "Failed to save", variant: "destructive" }); return; }
    toast({ title: editSub ? "Subscription updated" : "Subscription added" });
    setShowForm(false); setEditSub(null); load();
  }

  async function deleteSub(id: number) {
    if (!confirm("Delete this subscription?")) return;
    await fetch(`${BASE}/api/admin/payment-tracker/subscriptions/${id}`, { method: "DELETE" });
    toast({ title: "Deleted" });
    load();
  }

  const filtered = subs.filter(s =>
    (!search || s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.mobile_or_account || "").includes(search) ||
      (s.operator || "").toLowerCase().includes(search.toLowerCase())) &&
    (!typeFilter || s.type === typeFilter)
  );

  const overdue = subs.filter(s => { const d = daysUntil(s.due_date); return d !== null && d < 0; });
  const dueSoon = subs.filter(s => { const d = daysUntil(s.due_date); return d !== null && d >= 0 && d <= 7; });
  const totalMonthly = subs.reduce((a, s) => a + (Number(s.plan_amount) * (30 / (s.validity_days || 30))), 0);

  if (detailSub) {
    return (
      <Layout>
        <div className="h-full flex flex-col bg-[#f1f5f9] overflow-hidden">
          <DetailPanel sub={detailSub} onBack={() => { setDetailSub(null); load(); }} onRefresh={load} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-full flex flex-col bg-[#f1f5f9] overflow-hidden">
        {showForm && (
          <SubscriptionForm
            initial={editSub ? { ...editSub, plan_amount: editSub.plan_amount, validity_days: String(editSub.validity_days), due_date: editSub.due_date || "" } : undefined}
            onSave={saveSub}
            onCancel={() => { setShowForm(false); setEditSub(null); }}
          />
        )}
        {payingSub && (
          <PayModal sub={payingSub} onClose={() => setPayingSub(null)} onPaid={() => { setPayingSub(null); load(); }} />
        )}

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-0 flex items-center gap-4 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-500" />
            <h1 className="text-sm font-bold text-gray-900">Bill & Recharge Tracker</h1>
            <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">Follow-up & Renewal Manager</span>
          </div>
          <div className="flex-1" />
          <button onClick={load} disabled={loading} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => { setEditSub(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-3.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Entry
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-h-0">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Subscriptions", value: subs.length, icon: CreditCard, color: "text-indigo-600", bg: "bg-indigo-50" },
              { label: "Overdue", value: overdue.length, icon: AlertTriangle, color: overdue.length > 0 ? "text-red-600" : "text-gray-400", bg: overdue.length > 0 ? "bg-red-50" : "bg-gray-50" },
              { label: "Due in 7 Days", value: dueSoon.length, icon: Clock, color: dueSoon.length > 0 ? "text-amber-600" : "text-gray-400", bg: dueSoon.length > 0 ? "bg-amber-50" : "bg-gray-50" },
              { label: "Monthly Cost", value: fmtAmt(totalMonthly.toFixed(0)), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
            ].map(c => {
              const CI = c.icon;
              return (
                <div key={c.label} className="bg-white rounded-2xl px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                  <div className={`w-8 h-8 rounded-xl ${c.bg} flex items-center justify-center mb-2`}>
                    <CI className={`w-4 h-4 ${c.color}`} />
                  </div>
                  <p className={`text-xl font-black ${c.color}`}>{c.value}</p>
                  <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{c.label}</p>
                </div>
              );
            })}
          </div>

          {/* Urgent Alerts */}
          {(overdue.length > 0 || dueSoon.length > 0) && (
            <div className="space-y-2">
              {overdue.map(s => {
                const meta = TYPE_META[s.type] || TYPE_META.other;
                const Icon = meta.icon;
                return (
                  <div key={s.id} className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-red-800">{s.name} — OVERDUE</p>
                      <p className="text-[10px] text-red-500">{s.operator} · Due was {fmtDate(s.due_date)} · {fmtAmt(s.plan_amount)}</p>
                    </div>
                    <button onClick={() => setPayingSub(s)}
                      className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                      Pay Now
                    </button>
                  </div>
                );
              })}
              {dueSoon.map(s => {
                const meta = TYPE_META[s.type] || TYPE_META.other;
                const Icon = meta.icon;
                const days = daysUntil(s.due_date);
                return (
                  <div key={s.id} className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-amber-800">{s.name} — Due in {days === 0 ? "Today" : `${days} days`}</p>
                      <p className="text-[10px] text-amber-600">{s.operator} · {fmtDate(s.due_date)} · {fmtAmt(s.plan_amount)}</p>
                    </div>
                    <button onClick={() => setPayingSub(s)}
                      className="px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                      Pay
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, number, operator…"
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setTypeFilter("")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${!typeFilter ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                All
              </button>
              {(Object.keys(TYPE_META) as SubType[]).map(t => {
                const m = TYPE_META[t];
                const Icon = m.icon;
                return (
                  <button key={t} onClick={() => setTypeFilter(typeFilter === t ? "" : t)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors
                      ${typeFilter === t ? `${m.bg} ${m.color}` : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                    <Icon className="w-3 h-3" />{m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16"><RefreshCw className="w-5 h-5 animate-spin text-indigo-400" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-400">No subscriptions yet</p>
                <p className="text-xs text-gray-300 mt-1">Click "Add Subscription" to get started</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {["Type", "Name / Account", "Operator", "Plan", "Amount", "Due Date", "Status", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => {
                    const meta = TYPE_META[s.type] || TYPE_META.other;
                    const Icon = meta.icon;
                    const days = daysUntil(s.due_date);
                    const rowBg = days !== null && days < 0
                      ? "bg-red-50/30"
                      : days !== null && days <= 3
                      ? "bg-orange-50/30"
                      : days !== null && days <= 7
                      ? "bg-amber-50/20"
                      : i % 2 === 1 ? "bg-gray-50/20" : "bg-white";
                    return (
                      <tr key={s.id} onClick={() => setDetailSub(s)}
                        className={`border-b border-gray-50 hover:bg-indigo-50/50 transition-colors cursor-pointer ${rowBg}`}>
                        <td className="px-4 py-3">
                          <div className={`w-8 h-8 rounded-xl ${meta.bg} flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${meta.color}`} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold text-gray-800">{s.name}</p>
                          {s.mobile_or_account && <p className="text-[10px] text-gray-400 font-mono">{s.mobile_or_account}</p>}
                        </td>
                        <td className="px-4 py-3">
                          {s.operator ? (() => {
                            const os = OPERATOR_STYLE[s.operator];
                            return os ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${os.bg} ${os.text} ${os.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${os.dot}`} />
                                {s.operator}
                              </span>
                            ) : <span className="text-xs text-gray-600">{s.operator}</span>;
                          })() : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-500">{s.plan_name || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold text-emerald-700">{fmtAmt(s.plan_amount)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600">{fmtDate(s.due_date)}</span>
                        </td>
                        <td className="px-4 py-3"><DueBadge dueDate={s.due_date} /></td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setPayingSub(s)}
                              className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors" title="Mark as paid">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { setEditSub(s); setShowForm(true); }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors" title="Edit">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteSub(s.id)}
                              className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
