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
  // Single string value for the OTP — much more mobile-friendly than 6 separate inputs
  const [otpValue, setOtpValue] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => otpInputRef.current?.focus(), 150);
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
      setOtpValue("");
      setStep("otp");
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setOtpValue(digits);
    if (digits.length === 6) {
      handleVerify(digits);
    }
  };

  const handleVerify = async (code?: string) => {
    const finalOtp = code ?? otpValue;
    if (finalOtp.length !== 6) return;
    setError("");
    setLoading(true);
    try {
      await verifyOtp(otpEmail, finalOtp);
    } catch (err: any) {
      setError(err.message || "Invalid code. Please try again.");
      setOtpValue("");
      setTimeout(() => otpInputRef.current?.focus(), 100);
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
      setOtpValue("");
      setResendCooldown(60);
      setTimeout(() => otpInputRef.current?.focus(), 150);
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
            <form onSubmit={handleCredentials} className="space-y-4" autoComplete="on">
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
            <form
              className="space-y-6"
              onSubmit={e => { e.preventDefault(); handleVerify(); }}
            >
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
                <label className="block text-gray-700 text-sm font-medium mb-3 text-center">
                  Enter verification code
                </label>
                {/* Single hidden input — works perfectly on mobile (SMS autofill, no focus jumping) */}
                <div className="relative flex justify-center">
                  <input
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otpValue}
                    onChange={e => handleOtpChange(e.target.value)}
                    disabled={loading}
                    aria-label="One-time password"
                    style={{
                      position: "absolute",
                      opacity: 0,
                      width: "100%",
                      height: "100%",
                      top: 0,
                      left: 0,
                      zIndex: 10,
                      fontSize: "16px", // prevents iOS zoom on focus
                      cursor: "text",
                    }}
                  />
                  {/* Visual 6-box display */}
                  <div
                    className="flex gap-2 justify-center"
                    onClick={() => otpInputRef.current?.focus()}
                  >
                    {Array.from({ length: 6 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-11 flex items-center justify-center text-xl font-bold rounded-xl border-2 transition-all select-none ${
                          i === otpValue.length && !loading
                            ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20"
                            : otpValue[i]
                            ? "border-gray-300 bg-white text-gray-900"
                            : "border-gray-200 bg-gray-50 text-gray-900"
                        }`}
                        style={{ height: "52px" }}
                      >
                        {otpValue[i] || ""}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otpValue.length !== 6}
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
                  onClick={() => { setStep("credentials"); setError(""); setOtpValue(""); }}
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
            </form>
          )}
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          © {new Date().getFullYear()} WTT INTERNATIONAL INDIA. All rights reserved.
        </p>
      </div>
    </div>
  );
}
