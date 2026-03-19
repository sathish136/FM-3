import { Layout } from "@/components/Layout";
import {
  User, Mail, Phone, Building2, Briefcase, Calendar, MapPin,
  Shield, Globe, Clock, Hash, BadgeCheck, Users,
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

// A single field tile — icon, label, value stacked
function Field({ icon: Icon, label, value, accent }: {
  icon: React.ElementType; label: string; value: string | null; accent?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${accent ? "text-blue-500" : "text-muted-foreground"}`} />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider leading-none mb-1">{label}</p>
        <p className={`text-sm font-medium leading-snug break-words ${accent ? "text-blue-600" : "text-foreground"}`}>
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

// Section card — title bar + field grid
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-blue-500 shrink-0" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}

// Two-column field grid — even rows, no stray borders
function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-5">
      {children}
    </div>
  );
}

// Thin horizontal divider between field groups inside a section
function Divider() {
  return <hr className="border-border/50 my-4" />;
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
      setProfile(await res.json());
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
      <div className="max-w-5xl space-y-5">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Complete employee &amp; account information</p>
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
            <button onClick={fetchProfile} className="text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors">Retry</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">

            {/* ── Left: Identity card ── */}
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
                {/* Avatar */}
                <div className="relative mb-4">
                  {photoUrl && !imgError ? (
                    <img src={photoUrl} alt={profile?.full_name} onError={() => setImgError(true)}
                      className="w-24 h-24 rounded-full object-cover ring-4 ring-blue-100 shadow-md" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md ring-4 ring-blue-100">
                      {initials}
                    </div>
                  )}
                  <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${profile?.employee_status === "Active" || !profile?.employee_status ? "bg-emerald-500" : "bg-gray-400"}`} />
                </div>

                <h2 className="text-base font-bold text-foreground leading-tight">{profile?.full_name || user?.full_name || "—"}</h2>

                {profile?.designation && (
                  <p className="text-xs font-semibold text-blue-600 mt-1 leading-snug">{profile.designation}</p>
                )}
                {profile?.department && (
                  <p className="text-xs text-muted-foreground mt-0.5">{profile.department}</p>
                )}

                <div className="flex flex-wrap gap-2 justify-center mt-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {profile?.employee_status || "Active"}
                  </span>
                  {profile?.employment_type && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {profile.employment_type}
                    </span>
                  )}
                </div>

                {profile?.employee_number && (
                  <div className="mt-4 w-full rounded-xl bg-muted/60 px-4 py-3 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Employee ID</p>
                    <p className="text-sm font-bold font-mono text-foreground mt-0.5">{profile.employee_number}</p>
                  </div>
                )}
              </div>

              {/* Quick contact */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Quick Contact</p>
                {(profile?.mobile_no || profile?.phone) && (
                  <a href={`tel:${profile.mobile_no || profile.phone}`}
                    className="flex items-center gap-2.5 text-sm text-foreground hover:text-blue-600 transition-colors">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>{profile.mobile_no || profile.phone}</span>
                  </a>
                )}
                <div className="flex items-center gap-2.5 text-sm text-foreground">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{profile?.email || user?.email}</span>
                </div>
                {profile?.company && (
                  <div className="flex items-center gap-2.5 text-sm text-foreground">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{profile.company}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: Detail sections ── */}
            <div className="space-y-4">

              {/* Work Information */}
              <Section title="Work Information">
                <FieldGrid>
                  <Field icon={Briefcase} label="Designation" value={profile?.designation} accent />
                  <Field icon={Users} label="Department" value={profile?.department} />
                  <Field icon={Building2} label="Company" value={profile?.company} />
                  <Field icon={MapPin} label="Branch / Location" value={profile?.branch} />
                  <Field icon={Calendar} label="Date of Joining" value={fmtDate(profile?.date_of_joining ?? null)} />
                  <Field icon={Briefcase} label="Employment Type" value={profile?.employment_type} />
                </FieldGrid>
                {(profile?.reports_to || profile?.grade) && (
                  <>
                    <Divider />
                    <FieldGrid>
                      {profile?.reports_to && <Field icon={Users} label="Reports To" value={profile.reports_to} />}
                      {profile?.grade && <Field icon={BadgeCheck} label="Grade" value={profile.grade} />}
                    </FieldGrid>
                  </>
                )}
              </Section>

              {/* Personal Information */}
              <Section title="Personal Information">
                <FieldGrid>
                  <Field icon={User} label="Gender" value={profile?.gender} />
                  <Field icon={Calendar} label="Date of Birth" value={fmtDate(profile?.date_of_birth ?? null)} />
                  <Field icon={Phone} label="Mobile" value={profile?.mobile_no} />
                  <Field icon={Mail} label="Personal Email" value={profile?.personal_email} />
                </FieldGrid>
              </Section>

              {/* Account Information */}
              <Section title="Account Information">
                <FieldGrid>
                  <Field icon={Mail} label="Login Email" value={profile?.email || user?.email} />
                  <Field icon={Hash} label="Username" value={profile?.username} />
                  <Field icon={Globe} label="Language" value={profile?.language} />
                  <Field icon={Clock} label="Time Zone" value={profile?.time_zone} />
                  <Field icon={Clock} label="Last Login" value={fmtDateTime(profile?.last_login ?? null)} />
                  <Field icon={Shield} label="Account Status" value={profile?.enabled === 0 ? "Disabled" : "Enabled"} />
                </FieldGrid>
              </Section>

              {/* ERPNext note */}
              <div className="flex items-start gap-3 bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3">
                <Shield className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-600">
                  Profile is synced from ERPNext. Contact your HR administrator to update personal or employment details.
                </p>
              </div>

            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
