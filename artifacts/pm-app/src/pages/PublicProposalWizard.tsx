import { useState, useEffect, useRef } from "react";
import {
  Building2, Droplets, ChevronRight, CheckCircle2,
  Send, Loader2, Mail, Phone, User, MapPin, MessageSquare,
  Globe, ShieldCheck,
} from "lucide-react";

const API = "/api";
const LOGO_URL = "https://res.cloudinary.com/dd8fsxba6/image/upload/v1755166473/logo-bg_less_yaefzj.png";

// ─── Country & city configuration ────────────────────────────────────────────
const COUNTRIES = [
  { code: "IND", name: "India",        prefix: "WTT-IND", city: "Chennai / Mumbai / Delhi",  phone: "+91 " },
  { code: "BGD", name: "Bangladesh",   prefix: "WTT-BAN", city: "Dhaka / Chittagong",        phone: "+880 " },
  { code: "ARE", name: "UAE",          prefix: "WTT-UAE", city: "Dubai / Abu Dhabi",          phone: "+971 " },
  { code: "LKA", name: "Sri Lanka",    prefix: "WTT-SRI", city: "Colombo / Kandy",            phone: "+94 " },
  { code: "NPL", name: "Nepal",        prefix: "WTT-NEP", city: "Kathmandu / Pokhara",        phone: "+977 " },
  { code: "QAT", name: "Qatar",        prefix: "WTT-QAT", city: "Doha",                       phone: "+974 " },
  { code: "SAU", name: "Saudi Arabia", prefix: "WTT-SAU", city: "Riyadh / Jeddah",            phone: "+966 " },
  { code: "MYS", name: "Malaysia",     prefix: "WTT-MYS", city: "Kuala Lumpur / Johor Bahru", phone: "+60 " },
  { code: "OMN", name: "Oman",         prefix: "WTT-OMN", city: "Muscat / Sohar",             phone: "+968 " },
  { code: "SGP", name: "Singapore",    prefix: "WTT-SGP", city: "Singapore",                  phone: "+65 " },
  { code: "OTHER", name: "Other",      prefix: "WTT-INT", city: "Your city",                  phone: "+" },
] as const;

type CountryCode = typeof COUNTRIES[number]["code"];
type PlantType = "STP" | "ETP";

interface FormData {
  plantType:      PlantType;
  countryCode:    CountryCode;
  customCountry:  string;
  customerName:   string;
  flowRate:       string;
  contactPerson:  string;
  email:          string;
  phone:          string;
  city:           string;
  remarks:        string;
}

const INIT: FormData = {
  plantType:      "STP",
  countryCode:    "IND",
  customCountry:  "",
  customerName:   "",
  flowRate:       "",
  contactPerson:  "",
  email:          "",
  phone:          "",
  city:           "",
  remarks:        "",
};

function countryFor(code: CountryCode) {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
}

export default function PublicProposalWizard() {
  const [form, setForm]           = useState<FormData>(INIT);
  const [flowRates, setFlowRates] = useState<string[]>([]);

  // OTP state
  const [otpSent,      setOtpSent]      = useState(false);
  const [otpSending,   setOtpSending]   = useState(false);
  const [otpCode,      setOtpCode]      = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [emailVerified,setEmailVerified]= useState(false);
  const [otpError,     setOtpError]     = useState<string | null>(null);
  const [otpCooldown,  setOtpCooldown]  = useState(0);

  // Submit state
  const [sending, setSending] = useState(false);
  const [result,  setResult]  = useState<{ wttNumber: string } | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const cooldownRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoOtpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update  = (f: Partial<FormData>) => setForm((p) => ({ ...p, ...f }));
  const country = countryFor(form.countryCode);
  const isOtherCountry = form.countryCode === "OTHER";
  const resolvedCountryName = isOtherCountry
    ? form.customCountry.trim()
    : country.name;

  // Load flow rates
  useEffect(() => {
    fetch(`${API}/proposal-wizard/flow-rates`)
      .then((r) => r.json())
      .then((d) => setFlowRates(d.flowRates || []))
      .catch(() => {});
  }, []);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const phoneValid = /^\+?[\d\s\-().]{7,15}$/.test(form.phone.trim());

  // ── Auto-send OTP when a valid email is entered (1.5 s debounce) ─────────
  useEffect(() => {
    // Reset OTP state on every email change
    setOtpSent(false);
    setEmailVerified(false);
    setOtpCode("");
    setOtpError(null);
    setOtpCooldown(0);
    if (autoOtpTimer.current) clearTimeout(autoOtpTimer.current);

    if (!emailValid) return;

    // Wait 1.5 s after the user stops typing, then fire automatically
    autoOtpTimer.current = setTimeout(() => {
      sendOtp(form.email.trim());
    }, 1500);

    return () => {
      if (autoOtpTimer.current) clearTimeout(autoOtpTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.email]);

  // Cooldown countdown ticker
  useEffect(() => {
    if (otpCooldown <= 0) return;
    cooldownRef.current = setInterval(
      () => setOtpCooldown((n) => Math.max(0, n - 1)),
      1000,
    );
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, [otpCooldown]);

  const canSubmit =
    form.customerName.trim() &&
    (form.plantType === "ETP" || form.flowRate) &&
    form.contactPerson.trim() &&
    emailValid &&
    emailVerified &&
    phoneValid &&
    form.city.trim() &&
    (!isOtherCountry || form.customCountry.trim().length >= 2);

  // ── Send OTP ───────────────────────────────────────────────────────────────
  const sendOtp = async (email: string) => {
    if (otpSending || otpCooldown > 0) return;
    setOtpSending(true);
    setOtpError(null);
    try {
      const res = await fetch(`${API}/proposal-wizard/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      setOtpSent(true);
      setOtpCooldown(60);
    } catch (err: any) {
      setOtpError(err.message || "Could not send verification code");
    } finally {
      setOtpSending(false);
    }
  };

  // ── Verify OTP ────────────────────────────────────────────────────────────
  const verifyOtp = async () => {
    if (!otpCode.trim() || otpVerifying) return;
    setOtpVerifying(true);
    setOtpError(null);
    try {
      const res = await fetch(`${API}/proposal-wizard/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim(), otp: otpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      setEmailVerified(true);
      setOtpError(null);
    } catch (err: any) {
      setOtpError(err.message || "Incorrect code. Please try again.");
    } finally {
      setOtpVerifying(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
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
          flowRate:      form.flowRate,
          customerName:  form.customerName.trim(),
          toEmail:       form.email.trim(),
          contactPerson: form.contactPerson.trim(),
          phone:         form.phone.trim(),
          city:          form.city.trim(),
          country:       resolvedCountryName,
          countryCode:   form.countryCode,
          plantType:     form.plantType,
          notes:         form.remarks.trim(),
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

  // ── Success screen ────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 flex flex-col items-center justify-center p-4">
        <img src={LOGO_URL} alt="WTT International" className="h-24 object-contain mb-6" />
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-10 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Proposal Sent!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Your proposal documents have been sent to <strong>{form.email}</strong>. Please check your inbox (and spam folder).
          </p>
          <div className="bg-blue-50 rounded-2xl px-6 py-4 mb-6 border border-blue-100">
            <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-1">Your Proposal Reference</p>
            <p className="text-2xl font-bold text-blue-700 tracking-wider font-mono">{result.wttNumber}</p>
          </div>
          <p className="text-xs text-gray-400 mb-6">
            Please quote this reference number in all future correspondence with WTT International.
          </p>
          <button
            onClick={() => { setResult(null); setForm(INIT); setEmailVerified(false); setOtpSent(false); setOtpCode(""); }}
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            Submit another request →
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">© 2026 WTT INTERNATIONAL PVT LTD</p>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 flex flex-col items-center justify-center py-8 px-4">

      {/* Logo + heading */}
      <div className="flex flex-col items-center mb-6 text-center">
        <img src={LOGO_URL} alt="WTT International" className="h-20 object-contain mb-4" />
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
          {form.plantType === "ETP" ? "Effluent Treatment Plant" : "Sewage Treatment Plant"} Proposal
        </h1>
        <p className="text-sm text-gray-500 mt-1.5 max-w-sm">
          Fill in your details and we'll email your customised {form.plantType} proposal documents instantly.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 sm:p-8 w-full max-w-xl space-y-5">

        {/* ── Plant Type + Country (side by side) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Plant Type dropdown */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Plant Type <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none rotate-90" />
              <select
                value={form.plantType}
                onChange={(e) => {
                  const pt = e.target.value as PlantType;
                  update({ plantType: pt, flowRate: pt === "ETP" ? "" : form.flowRate });
                }}
                required
                className="w-full px-3 pr-10 py-3 text-sm border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 appearance-none cursor-pointer font-medium text-gray-700"
              >
                <option value="STP">STP — Sewage Treatment</option>
                <option value="ETP">ETP — Effluent Treatment</option>
              </select>
            </div>
          </div>

          {/* Country dropdown */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Country <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />
              <select
                value={form.countryCode}
                onChange={(e) => {
                  const cc = e.target.value as CountryCode;
                  update({
                    countryCode: cc,
                    customCountry: cc === "OTHER" ? form.customCountry : "",
                    city: "",
                    phone: "",
                  });
                }}
                required
                className="w-full pl-10 pr-10 py-3 text-sm border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 appearance-none cursor-pointer font-medium text-gray-700"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none rotate-90" />
            </div>
            {isOtherCountry && (
              <input
                type="text"
                value={form.customCountry}
                onChange={(e) => update({ customCountry: e.target.value })}
                placeholder="Type country name (e.g. Kenya, Vietnam)"
                required
                className="mt-2 w-full px-3 py-2.5 text-sm border-2 border-blue-200 rounded-xl bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
              />
            )}
          </div>
        </div>

        {/* ── Flow Rate (STP only) ── */}
        {form.plantType === "STP" && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Select Flow Rate <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />
              <select
                value={form.flowRate}
                onChange={(e) => update({ flowRate: e.target.value })}
                required
                className="w-full pl-10 pr-10 py-3 text-sm border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 appearance-none cursor-pointer font-medium text-gray-700"
              >
                <option value="">— Choose STP capacity —</option>
                {flowRates.map((fr) => (
                  <option key={fr} value={fr}>{fr}</option>
                ))}
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none rotate-90" />
            </div>
          </div>
        )}

        <div className="border-t border-gray-100" />

        {/* ── Company + Contact ── */}
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
                className="w-full pl-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full pl-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* ── Email + auto-OTP ── */}
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
              disabled={emailVerified}
              className={`w-full pl-10 pr-10 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                emailVerified
                  ? "bg-green-50 border-green-300 text-green-800"
                  : "border-gray-200"
              }`}
            />
            {/* Right icon: spinner while sending, tick when verified */}
            {otpSending && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 animate-spin" />
            )}
            {emailVerified && (
              <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
            )}
          </div>

          {/* Status lines */}
          {emailVerified && (
            <p className="text-xs text-green-600 mt-1 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Email verified successfully
            </p>
          )}
          {otpSending && (
            <p className="text-[11px] text-blue-500 mt-1">Sending verification code…</p>
          )}
          {otpSent && !emailVerified && !otpSending && (
            <p className="text-[11px] text-gray-400 mt-1">
              A 6-digit code was sent to <strong>{form.email}</strong>. Check your inbox (and spam).
              {otpCooldown === 0 && (
                <button
                  type="button"
                  onClick={() => sendOtp(form.email.trim())}
                  className="ml-1.5 text-blue-500 hover:underline font-medium"
                >
                  Resend
                </button>
              )}
              {otpCooldown > 0 && (
                <span className="ml-1.5 text-gray-400">Resend in {otpCooldown}s</span>
              )}
            </p>
          )}

          {/* OTP entry — shown after code is sent and email not yet verified */}
          {otpSent && !emailVerified && (
            <div className="mt-2.5 flex gap-2 items-center">
              <input
                type="text"
                inputMode="numeric"
                value={otpCode}
                onChange={(e) => {
                  setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setOtpError(null);
                }}
                placeholder="Enter 6-digit code"
                maxLength={6}
                autoFocus
                className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest text-center"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), verifyOtp())}
              />
              <button
                type="button"
                onClick={verifyOtp}
                disabled={otpCode.length < 6 || otpVerifying}
                className="px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                {otpVerifying
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <ShieldCheck className="w-3.5 h-3.5" />}
                Verify
              </button>
            </div>
          )}

          {otpError && (
            <p className="text-xs text-red-500 mt-1">{otpError}</p>
          )}
        </div>

        {/* ── Phone + City ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Phone <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update({ phone: e.target.value })}
                placeholder={country.phone + "..."}
                required
                className={`w-full pl-10 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  form.phone && !phoneValid ? "border-red-400 bg-red-50" : "border-gray-200"
                }`}
              />
            </div>
            {form.phone && !phoneValid && (
              <p className="text-xs text-red-500 mt-1">Enter a valid phone number (7–15 digits)</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              City <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={form.city}
                onChange={(e) => update({ city: e.target.value })}
                placeholder={country.city}
                required
                className="w-full pl-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* ── Remarks ── */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Remarks</label>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <textarea
              value={form.remarks}
              onChange={(e) => update({ remarks: e.target.value })}
              placeholder="Brief requirement or message…"
              rows={3}
              className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit || sending}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md transition-colors"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "Preparing & Sending…" : `Send My ${form.plantType} Proposal Documents`}
        </button>

        <p className="text-center text-[11px] text-gray-400">
          Your proposal will be sent directly to your verified email. No account required.
        </p>
      </form>

      <p className="text-center text-xs text-gray-400 mt-6">© 2026 WTT INTERNATIONAL PVT LTD</p>
    </div>
  );
}
