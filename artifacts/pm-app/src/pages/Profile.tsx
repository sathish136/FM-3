import { Layout } from "@/components/Layout";
import {
  User, Mail, Phone, Building2, Briefcase, Calendar, MapPin,
  Shield, Globe, Clock, Hash, BadgeCheck, Users, ChevronRight,
  Loader2, AlertCircle, RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface FullProfile {
  email: string;
  full_name: string;
  photo: string | null;
  mobile_no: string | null;
  phone: string | null;
  username: string | null;
  language: string | null;
  time_zone: string | null;
  last_login: string | null;
  enabled: number;
  employee_number: string | null;
  designation: string | null;
  department: string | null;
  company: string | null;
  branch: string | null;
  date_of_joining: string | null;
  employment_type: string | null;
  gender: string | null;
  date_of_birth: string | null;
  employee_status: string | null;
  reports_to: string | null;
  grade: string | null;
  personal_email: string | null;
}

function fmtDate(s: string | null): string {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return s; }
}

function fmtDateTime(s: string | null): string {
  if (!s) return "—";
  try { return new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return s; }
}

function InfoRow({ icon: Icon, label, value, highlight }: {
  icon: React.ElementType; label: string; value: string | null; highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-sm font-semibold mt-0.5 truncate ${highlight ? "text-blue-600" : "text-foreground"}`}>
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-blue-500 inline-block" />
        {title}
      </h3>
      <div className="space-y-0">{children}</div>
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const fetchProfile = async () => {
    if (!user?.email) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/auth/profile?email=${encodeURIComponent(user.email)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProfile(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, [user?.email]);

  const initials = (profile?.full_name || user?.full_name || "?")
    .split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  const photoUrl = profile?.photo
    ? `${BASE}/api/auth/photo?url=${encodeURIComponent(profile.photo)}`
    : user?.photo || null;

  return (
    <Layout>
      <div className="max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Complete employee & account information</p>
          </div>
          <button
            onClick={fetchProfile}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {loading && !profile ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm">Loading profile from ERPNext…</p>
          </div>
        ) : error && !profile ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-sm font-medium text-red-500">{error}</p>
            <button onClick={fetchProfile} className="text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left column: Avatar card ── */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
                {/* Avatar */}
                <div className="relative mb-4">
                  {photoUrl && !imgError ? (
                    <img
                      src={photoUrl}
                      alt={profile?.full_name}
                      onError={() => setImgError(true)}
                      className="w-28 h-28 rounded-full object-cover ring-4 ring-blue-100 shadow-lg"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg ring-4 ring-blue-100">
                      {initials}
                    </div>
                  )}
                  {(profile?.employee_status === "Active" || !profile?.employee_status) && (
                    <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white" title="Active" />
                  )}
                </div>

                <h2 className="text-lg font-bold text-foreground leading-tight">{profile?.full_name || user?.full_name || "—"}</h2>
                {profile?.designation && (
                  <p className="text-sm text-blue-600 font-medium mt-0.5">{profile.designation}</p>
                )}
                {profile?.department && (
                  <p className="text-xs text-muted-foreground mt-0.5">{profile.department}</p>
                )}

                {/* Status badges */}
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full text-xs font-semibold text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {profile?.employee_status || "Active"}
                  </span>
                  {profile?.employment_type && (
                    <span className="px-3 py-1 bg-blue-50 rounded-full text-xs font-semibold text-blue-700 border border-blue-200">
                      {profile.employment_type}
                    </span>
                  )}
                </div>

                {/* Employee ID */}
                {profile?.employee_number && (
                  <div className="mt-4 w-full bg-muted/50 rounded-xl px-4 py-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Employee ID</p>
                    <p className="text-base font-bold text-foreground mt-0.5 font-mono">{profile.employee_number}</p>
                  </div>
                )}
              </div>

              {/* Quick contacts */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quick Contact</h3>
                {(profile?.mobile_no || profile?.phone) && (
                  <a href={`tel:${profile.mobile_no || profile.phone}`}
                    className="flex items-center gap-3 text-sm text-foreground hover:text-blue-600 transition-colors">
                    <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{profile.mobile_no || profile.phone}</span>
                  </a>
                )}
                <a href={`mailto:${profile?.email || user?.email}`}
                  className="flex items-center gap-3 text-sm text-foreground hover:text-blue-600 transition-colors">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{profile?.email || user?.email}</span>
                </a>
                {profile?.company && (
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{profile.company}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right columns: Detail cards ── */}
            <div className="lg:col-span-2 space-y-5">

              {/* Work Information */}
              <SectionCard title="Work Information">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  <InfoRow icon={Briefcase} label="Designation" value={profile?.designation} highlight />
                  <InfoRow icon={Users} label="Department" value={profile?.department} />
                  <InfoRow icon={Building2} label="Company" value={profile?.company} />
                  <InfoRow icon={MapPin} label="Branch / Location" value={profile?.branch} />
                  <InfoRow icon={Calendar} label="Date of Joining" value={fmtDate(profile?.date_of_joining ?? null)} />
                  <InfoRow icon={Briefcase} label="Employment Type" value={profile?.employment_type} />
                  {profile?.reports_to && (
                    <InfoRow icon={ChevronRight} label="Reports To" value={profile.reports_to} />
                  )}
                  {profile?.grade && (
                    <InfoRow icon={BadgeCheck} label="Grade" value={profile.grade} />
                  )}
                </div>
              </SectionCard>

              {/* Personal Information */}
              <SectionCard title="Personal Information">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  <InfoRow icon={User} label="Gender" value={profile?.gender} />
                  <InfoRow icon={Calendar} label="Date of Birth" value={fmtDate(profile?.date_of_birth ?? null)} />
                  <InfoRow icon={Phone} label="Mobile" value={profile?.mobile_no} />
                  <InfoRow icon={Mail} label="Personal Email" value={profile?.personal_email} />
                </div>
              </SectionCard>

              {/* Account Information */}
              <SectionCard title="Account Information">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  <InfoRow icon={Mail} label="Login Email" value={profile?.email || user?.email} />
                  <InfoRow icon={Hash} label="Username" value={profile?.username} />
                  <InfoRow icon={Globe} label="Language" value={profile?.language} />
                  <InfoRow icon={Clock} label="Time Zone" value={profile?.time_zone} />
                  <InfoRow icon={Clock} label="Last Login" value={fmtDateTime(profile?.last_login ?? null)} />
                  <InfoRow icon={Shield} label="Account Status"
                    value={profile?.enabled === 0 ? "Disabled" : "Enabled"} />
                </div>
              </SectionCard>

              {/* System note */}
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">Managed via ERPNext</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Your profile is synced from the central ERP system. Contact your HR administrator to update personal details.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </Layout>
  );
}
