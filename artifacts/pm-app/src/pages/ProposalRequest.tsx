import { useState } from "react";
import {
  ChevronRight, ChevronLeft, CheckCircle2, Building2, Droplets,
  User, Mail, Phone, MapPin, Globe, Send, Loader2, Beaker,
  Layers, Cpu,
} from "lucide-react";

const API = "/api";

const COUNTRIES = [
  "India","Bangladesh","Sri Lanka","Pakistan","Nepal","UAE","Saudi Arabia",
  "Qatar","Kuwait","Oman","Bahrain","Singapore","Malaysia","Indonesia",
  "Vietnam","Thailand","Philippines","Myanmar","Other",
];

type Step = 1 | 2 | 3;

interface FormData {
  systemOption: 1 | 2;
  flowRate: string;
  companyName: string;
  address: string;
  city: string;
  country: string;
  contactPerson: string;
  email: string;
  phone: string;
}

const INIT: FormData = {
  systemOption: 1,
  flowRate: "",
  companyName: "",
  address: "",
  city: "",
  country: "India",
  contactPerson: "",
  email: "",
  phone: "",
};

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: "Choose System" },
    { n: 2, label: "Flow Details" },
    { n: 3, label: "Your Details" },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                step > s.n
                  ? "bg-green-500 border-green-500 text-white"
                  : step === s.n
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-gray-300 text-gray-400"
              }`}
            >
              {step > s.n ? <CheckCircle2 className="w-5 h-5" /> : s.n}
            </div>
            <span className={`text-[11px] font-medium whitespace-nowrap ${step === s.n ? "text-blue-600" : "text-gray-400"}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-16 h-0.5 mb-4 mx-1 transition-all ${step > s.n ? "bg-green-500" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function Step1({ data, onChange }: { data: FormData; onChange: (f: Partial<FormData>) => void }) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Choose Your Treatment System</h2>
        <p className="text-sm text-gray-500 mt-1">Select the system that best fits your project needs</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Option 1 */}
        <button
          type="button"
          onClick={() => onChange({ systemOption: 1 })}
          className={`relative text-left p-5 rounded-2xl border-2 transition-all ${
            data.systemOption === 1
              ? "border-blue-500 bg-blue-50 shadow-md"
              : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/30"
          }`}
        >
          {data.systemOption === 1 && (
            <div className="absolute top-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Droplets className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Option 1</p>
              <p className="text-base font-bold text-gray-900">Standard STP</p>
            </div>
          </div>
          <ul className="text-xs text-gray-600 space-y-1.5">
            <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">•</span>Rotary Brush Screener</li>
            <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">•</span>Dissolved Air Flotation (DAF)</li>
            <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">•</span>Equalization &amp; Neutralization</li>
            <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">•</span>Biological Oxidation System</li>
            <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">•</span>Lamella Settler + UV System</li>
            <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">•</span>Screw Press for Sludge</li>
          </ul>
          <div className="mt-3 pt-3 border-t border-blue-100">
            <p className="text-[11px] text-gray-500">Outlet: BOD &lt;30, COD &lt;70, TSS &lt;50 mg/L</p>
          </div>
        </button>

        {/* Option 2 */}
        <button
          type="button"
          onClick={() => onChange({ systemOption: 2 })}
          className={`relative text-left p-5 rounded-2xl border-2 transition-all ${
            data.systemOption === 2
              ? "border-purple-500 bg-purple-50 shadow-md"
              : "border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50/30"
          }`}
        >
          {data.systemOption === 2 && (
            <div className="absolute top-3 right-3 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Layers className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Option 2</p>
              <p className="text-base font-bold text-gray-900">STP + MBR Advanced</p>
            </div>
          </div>
          <ul className="text-xs text-gray-600 space-y-1.5">
            <li className="flex items-start gap-1.5"><span className="text-purple-400 mt-0.5">•</span>All systems from Option 1</li>
            <li className="flex items-start gap-1.5"><span className="text-purple-400 mt-0.5">•</span>+ Submerged Ceramic MBR System</li>
            <li className="flex items-start gap-1.5"><span className="text-purple-400 mt-0.5">•</span>Higher filtration quality</li>
            <li className="flex items-start gap-1.5"><span className="text-purple-400 mt-0.5">•</span>Reduced fouling potential</li>
            <li className="flex items-start gap-1.5"><span className="text-purple-400 mt-0.5">•</span>Suitable for reuse applications</li>
          </ul>
          <div className="mt-3 pt-3 border-t border-purple-100">
            <p className="text-[11px] text-gray-500">Outlet: BOD &lt;25, COD &lt;60, TSS &lt;5 mg/L</p>
          </div>
        </button>
      </div>
    </div>
  );
}

function Step2({ data, onChange }: { data: FormData; onChange: (f: Partial<FormData>) => void }) {
  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Flow &amp; Process Details</h2>
        <p className="text-sm text-gray-500 mt-1">Tell us about your wastewater characteristics</p>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Flow Rate (M³/Day) <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
          <input
            type="number"
            min="1"
            value={data.flowRate}
            onChange={(e) => onChange({ flowRate: e.target.value })}
            placeholder="e.g. 500"
            className="w-full pl-10 pr-16 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">M³/Day</span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">Enter the total daily sewage / wastewater volume to be treated.</p>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Beaker className="w-4 h-4 text-gray-500" />
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Standard Inlet Quality (Reference)</p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-gray-600">
          {[["pH","8 – 9"],["BOD","300 mg/L"],["COD","700 mg/L"],["TDS","1500 mg/L"],["TSS","200 mg/L"],["TKN","60 mg/L"],["Temperature","30–35 °C"],["Oil & Grease","10 mg/L"]].map(([k,v])=>(
            <div key={k} className="flex justify-between">
              <span className="text-gray-500">{k}</span>
              <span className="font-medium text-gray-700">{v}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-2">These are reference values used for design. If your values differ significantly, please mention in the notes.</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Additional Notes (optional)</label>
        <textarea
          value={data.phone === "__notes__" ? "" : ""}
          onChange={() => {}}
          placeholder="Any specific requirements, site conditions, or questions..."
          rows={3}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Selected: <strong>Option {data.systemOption}</strong> — {data.systemOption === 1 ? "Standard STP" : "STP + MBR Advanced"}
            &nbsp;at <strong>{data.flowRate || "—"} M³/Day</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

function Step3({ data, onChange, notes, onNotesChange }: {
  data: FormData;
  onChange: (f: Partial<FormData>) => void;
  notes: string;
  onNotesChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Your Contact Details</h2>
        <p className="text-sm text-gray-500 mt-1">We'll use this to prepare and send your proposal</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Company Name <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={data.companyName}
            onChange={(e) => onChange({ companyName: e.target.value })}
            placeholder="M/s. Company Name"
            className="w-full pl-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Address</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <textarea
            value={data.address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="Street address, area..."
            rows={2}
            className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            City <span className="text-red-500">*</span>
          </label>
          <input
            value={data.city}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder="City"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Country</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={data.country}
              onChange={(e) => onChange({ country: e.target.value })}
              className="w-full pl-10 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Contact Person <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={data.contactPerson}
            onChange={(e) => onChange({ contactPerson: e.target.value })}
            placeholder="Full name"
            className="w-full pl-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Email <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={data.email}
              onChange={(e) => onChange({ email: e.target.value })}
              placeholder="email@company.com"
              className="w-full pl-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              placeholder="+91 98765 43210"
              className="w-full pl-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes / Special Requirements</label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Any specific project requirements, site conditions, or questions..."
          rows={2}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>
    </div>
  );
}

export default function ProposalRequest() {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(INIT);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ proposal_no: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const update = (f: Partial<FormData>) => setForm((p) => ({ ...p, ...f }));

  const canNext = () => {
    if (step === 1) return true;
    if (step === 2) return form.flowRate.trim() !== "" && Number(form.flowRate) > 0;
    if (step === 3) {
      return (
        form.companyName.trim() !== "" &&
        form.city.trim() !== "" &&
        form.contactPerson.trim() !== "" &&
        form.email.trim() !== ""
      );
    }
    return true;
  };

  const submit = async () => {
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(`${API}/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: form.companyName,
          address: form.address,
          city: form.city,
          country: form.country,
          contact_person: form.contactPerson,
          email: form.email,
          phone: form.phone,
          system_option: form.systemOption,
          flow_rate: form.flowRate,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Submission failed");
      setSubmitted(data);
    } catch (e: any) {
      setErr(e.message);
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-10 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Received!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Thank you, <strong>{form.contactPerson}</strong>. Our team will prepare your proposal and contact you at <strong>{form.email}</strong> shortly.
          </p>
          <div className="bg-blue-50 rounded-2xl px-6 py-4 mb-6 border border-blue-100">
            <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-1">Your Reference Number</p>
            <p className="text-2xl font-bold text-blue-700 tracking-wider">{submitted.proposal_no}</p>
          </div>
          <p className="text-xs text-gray-400">
            WTT International Private Limited will send you a detailed Techno-Commercial Proposal for a <strong>{form.systemOption === 1 ? "Standard STP" : "STP + MBR"}</strong> of capacity <strong>{form.flowRate} M³/Day</strong>.
          </p>
          <button
            onClick={() => { setSubmitted(null); setForm(INIT); setNotes(""); setStep(1); }}
            className="mt-6 text-sm text-blue-600 hover:underline"
          >
            Submit another request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center font-black text-white text-sm">
            WTT
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">WTT International Private Limited</p>
            <p className="text-xs text-gray-500">Water Treatment Technology</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900">Request a Proposal</h1>
          <p className="text-sm text-gray-500 mt-1.5">
            Get a detailed Techno-Commercial Proposal for your Sewage Treatment Plant project
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
          <StepIndicator step={step} />

          {step === 1 && <Step1 data={form} onChange={update} />}
          {step === 2 && <Step2 data={form} onChange={update} />}
          {step === 3 && <Step3 data={form} onChange={update} notes={notes} onNotesChange={setNotes} />}

          {err && (
            <div className="mt-4 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {err}
            </div>
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={() => setStep((s) => (s > 1 ? (s - 1) as Step : s))}
              disabled={step === 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-0 transition"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            {step < 3 ? (
              <button
                onClick={() => setStep((s) => (s + 1) as Step)}
                disabled={!canNext()}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={submitting || !canNext()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? "Submitting…" : "Submit Request"}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} WTT International Private Limited · Bengaluru, India
        </p>
      </main>
    </div>
  );
}
