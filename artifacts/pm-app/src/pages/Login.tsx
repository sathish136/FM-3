import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, Loader2, User, Lock, LogIn, ShieldCheck, RefreshCw, ArrowLeft } from "lucide-react";

export default function Login() {
  const { login, verifyOtp } = useAuth();

  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [usr, setUsr] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [otpEmail, setOtpEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(usr.trim(), pwd);
      setOtpEmail(result.email);
      setMaskedEmail(result.maskedEmail);
      setOtp(["", "", "", "", "", ""]);
      setStep("otp");
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpInput = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = cleaned;
    setOtp(next);
    if (cleaned && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    if (next.every(d => d !== "") && cleaned) {
      handleVerify(next.join(""));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(""));
      handleVerify(text);
    }
  };

  const handleVerify = async (code?: string) => {
    const finalOtp = code ?? otp.join("");
    if (finalOtp.length !== 6) return;
    setError("");
    setLoading(true);
    try {
      await verifyOtp(otpEmail, finalOtp);
    } catch (err: any) {
      setError(err.message || "Invalid code. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setLoading(true);
    try {
      await login(usr.trim(), pwd);
      setOtp(["", "", "", "", "", ""]);
      setResendCooldown(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #e8f0fe 0%, #f0f4ff 40%, #e3eeff 70%, #dbeafe 100%)" }}
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 text-center">
          <img
            src="https://res.cloudinary.com/dd8fsxba6/image/upload/v1755166473/logo-bg_less_yaefzj.png"
            alt="WTT International"
            className="h-40 w-auto object-contain mb-4"
          />
          <h1 className="text-4xl font-black tracking-tight leading-none flex items-baseline gap-0">
            <span style={{ color: "#0a2463" }}>FlowMatri</span>
            <span style={{ color: "#0ea5e9", fontSize: "1.35em", lineHeight: 1 }}>x</span>
          </h1>
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gray-400 mt-2 mb-3">Project Management</p>
          <p className="text-gray-500 text-sm">
            {step === "credentials" ? "Sign in to your account" : "Two-Factor Authentication"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-start gap-2">
              <span className="mt-0.5 shrink-0">⚠️</span>
              {error}
            </div>
          )}

          {step === "credentials" ? (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1.5">Username or Email</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={usr}
                    onChange={e => setUsr(e.target.value)}
                    placeholder="Enter your username"
                    required
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1.5">Password</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPwd ? "text" : "password"}
                    value={pwd}
                    onChange={e => setPwd(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <button type="button" className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all flex items-center justify-center gap-2 shadow-md mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: loading ? "#4a7fc1" : "linear-gradient(135deg, #1a56db, #0a2463)" }}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                ) : (
                  <><LogIn className="w-4 h-4" /> Sign In</>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                  <ShieldCheck className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">We sent a 6-digit code to</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{maskedEmail}</p>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-medium mb-3 text-center">Enter verification code</label>
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpInput(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      disabled={loading}
                      className="w-11 h-13 text-center text-xl font-bold rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all disabled:opacity-50"
                      style={{ height: "52px" }}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleVerify()}
                disabled={loading || otp.some(d => !d)}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: loading ? "#4a7fc1" : "linear-gradient(135deg, #1a56db, #0a2463)" }}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                ) : (
                  <><ShieldCheck className="w-4 h-4" /> Verify & Sign In</>
                )}
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => { setStep("credentials"); setError(""); setOtp(["", "", "", "", "", ""]); }}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          © {new Date().getFullYear()} WTT INTERNATIONAL INDIA. All rights reserved.
        </p>
      </div>
    </div>
  );
}
