import { useState, useEffect } from "react";
import {
  Building2, Droplets, ChevronRight, CheckCircle2,
  Send, Loader2, Mail, Phone, User, Hash, MapPin,
} from "lucide-react";

const API = "/api";

const LOGO_URL = "https://res.cloudinary.com/dd8fsxba6/image/upload/v1755166473/logo-bg_less_yaefzj.png";

interface FormData {
  customerName: string;
  flowRate: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
}

const INIT: FormData = {
  customerName: "",
  flowRate: "",
  contactPerson: "",
  email: "",
  phone: "",
  city: "",
};

export default function PublicProposalWizard() {
  const [form, setForm] = useState<FormData>(INIT);
  const [flowRates, setFlowRates] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ wttNumber: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = (f: Partial<FormData>) => setForm((p) => ({ ...p, ...f }));

  useEffect(() => {
    fetch(`${API}/proposal-wizard/flow-rates`)
      .then((r) => r.json())
      .then((d) => setFlowRates(d.flowRates || []))
      .catch(() => {});
  }, []);

  const canSubmit =
    form.customerName.trim() &&
    form.flowRate &&
    form.contactPerson.trim() &&
    form.email.trim().includes("@");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${API}/proposal-wizard/send-public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowRate: form.flowRate,
          customerName: form.customerName.trim(),
          toEmail: form.email.trim(),
          contactPerson: form.contactPerson.trim(),
          phone: form.phone.trim(),
          city: form.city.trim() || "Bangladesh",
          country: "Bangladesh",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setResult({ wttNumber: data.wttNumber });
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 flex flex-col items-center justify-center p-4">
        <img src={LOGO_URL} alt="WTT International" className="h-16 object-contain mb-6" />
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-10 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Proposal Sent!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Your proposal documents have been sent to <strong>{form.email}</strong>. Please check your inbox (and spam folder).
          </p>
          <div className="bg-indigo-50 rounded-2xl px-6 py-4 mb-6 border border-indigo-100">
            <p className="text-xs text-indigo-500 font-medium uppercase tracking-wide mb-1">Your Proposal Reference</p>
            <p className="text-2xl font-bold text-indigo-700 tracking-wider font-mono">{result.wttNumber}</p>
          </div>
          <p className="text-xs text-gray-400 mb-6">
            Please quote this reference number in all future correspondence with WTT International.
          </p>
          <button
            onClick={() => { setResult(null); setForm(INIT); }}
            className="text-sm text-indigo-600 hover:underline font-medium"
          >
            Submit another request →
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 WTT INTERNATIONAL
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 flex flex-col items-center justify-center p-4">

      {/* Centered logo — login page style */}
      <div className="flex flex-col items-center mb-8 text-center">
        <img
          src={LOGO_URL}
          alt="WTT International"
          className="h-16 object-contain mb-4"
        />
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Bangladesh Proposal Request</h1>
        <p className="text-sm text-gray-500 mt-1.5 max-w-sm">
          Fill in your details and we'll email your customised STP proposal documents instantly.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 w-full max-w-xl space-y-5">

        {/* Flow Rate */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Select Flow Rate <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
            <select
              value={form.flowRate}
              onChange={(e) => update({ flowRate: e.target.value })}
              required
              className="w-full pl-10 pr-10 py-3 text-sm border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 appearance-none cursor-pointer font-medium text-gray-700"
            >
              <option value="">— Choose STP capacity —</option>
              {flowRates.map((fr) => (
                <option key={fr} value={fr}>{fr}</option>
              ))}
            </select>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none rotate-90" />
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* Company + Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Company / Organisation <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={form.customerName}
                onChange={(e) => update({ customerName: e.target.value })}
                placeholder="M/s. Company Name"
                required
                className="w-full pl-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Contact Person <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={form.contactPerson}
                onChange={(e) => update({ contactPerson: e.target.value })}
                placeholder="Full name"
                required
                className="w-full pl-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => update({ email: e.target.value })}
                placeholder="you@company.com"
                required
                className="w-full pl-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update({ phone: e.target.value })}
                placeholder="+880 17..."
                className="w-full pl-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* City — country is fixed to Bangladesh */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">City</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={form.city}
              onChange={(e) => update({ city: e.target.value })}
              placeholder="Dhaka"
              className="w-full pl-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* What you'll receive */}
        {form.flowRate && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" /> Documents you will receive
            </p>
            <ul className="text-xs text-indigo-800 space-y-1">
              <li>• Technical Specification — {form.flowRate}</li>
              <li>• OPEX (Operating Cost) Sheet — {form.flowRate}</li>
              <li>• Proposal Terms &amp; Conditions — {form.flowRate}</li>
            </ul>
            <p className="text-[11px] text-indigo-500 mt-2">
              All documents will be personalised for <strong>{form.customerName || "your company"}</strong> and sent to <strong>{form.email || "your email"}</strong>.
            </p>
          </div>
        )}

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit || sending}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md transition-colors"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "Preparing & Sending…" : "Send My Proposal Documents"}
        </button>

        <p className="text-center text-[11px] text-gray-400">
          Your proposal will be sent directly to your email. No account required.
        </p>
      </form>

      <p className="text-center text-xs text-gray-400 mt-6">
        © 2026 WTT INTERNATIONAL
      </p>
    </div>
  );
}
