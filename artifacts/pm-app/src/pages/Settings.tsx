import { Layout } from "@/components/Layout";
import { useState, useEffect } from "react";
import { Shield, Bell, Palette, Globe, Key, Plus, Trash2, Sun, Moon, Check, PanelLeft, Grid3x3, MessageSquare, Mail, MonitorCheck, Loader2, Send, ChevronRight, FileText, User, Phone, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme, THEME_PRESETS } from "@/hooks/useTheme";
import { useNavStyle } from "@/hooks/useNavStyle";
import { UserManagementContent } from "@/pages/UserManagement";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const settingsSections = [
  { id: "users", label: "User Management", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "drawing-recipients", label: "Drawing Recipients", icon: FileText },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "integrations", label: "Integrations", icon: Globe },
  { id: "api", label: "API Keys", icon: Key },
];

const EVENT_TYPES = [
  { key: "task_assigned", label: "Task Assigned", desc: "When a task is assigned to you" },
  { key: "project_update", label: "Project Updates", desc: "When project status changes" },
  { key: "new_lead", label: "New Leads", desc: "When a new lead comes in" },
  { key: "new_message", label: "New Messages", desc: "When you receive a chat message" },
  { key: "campaign_report", label: "Campaign Reports", desc: "Weekly campaign performance" },
  { key: "purchase_order", label: "Purchase Orders", desc: "New or updated purchase orders" },
] as const;

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${checked ? "bg-primary" : "bg-border"}`}>
      <span className={`w-4 h-4 rounded-full bg-white shadow absolute top-1 transition-all ${checked ? "left-6" : "left-1"}`} />
    </button>
  );
}

function NotificationsSettings() {
  const { user } = useAuth();
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const [notifWhatsapp, setNotifWhatsapp] = useState(false);
  const [notifWhatsappPhone, setNotifWhatsappPhone] = useState("");
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSystem, setNotifSystem] = useState(true);
  const [notifEvents, setNotifEvents] = useState<string[]>(["task_assigned", "project_update", "new_lead", "new_message"]);

  useEffect(() => {
    if (!user?.email) return;
    fetch(`${BASE}/api/notifications/settings?email=${encodeURIComponent(user.email)}`)
      .then(r => r.json())
      .then(d => {
        setNotifWhatsapp(d.notifWhatsapp ?? false);
        setNotifWhatsappPhone(d.notifWhatsappPhone ?? "");
        setNotifEmail(d.notifEmail ?? true);
        setNotifSystem(d.notifSystem ?? true);
        setNotifEvents(d.notifEvents ?? ["task_assigned", "project_update", "new_lead", "new_message"]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.email, BASE]);

  const save = async () => {
    if (!user?.email) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/notifications/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, notifWhatsapp, notifWhatsappPhone, notifEmail, notifSystem, notifEvents }),
      });
      if (res.ok) toast.success("Notification settings saved");
      else toast.error("Failed to save settings");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const testChannel = async (channel: string) => {
    if (!user?.email) return;
    if (channel === "whatsapp" && !notifWhatsappPhone) {
      toast.error("Enter a WhatsApp phone number first");
      return;
    }
    setTesting(channel);
    try {
      const res = await fetch(`${BASE}/api/notifications/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, channel, phone: notifWhatsappPhone }),
      });
      const data = await res.json();
      if (data.success) toast.success(`Test ${channel} notification sent!`);
      else toast.error(`Test failed: ${data.error || "Unknown error"}`);
    } catch {
      toast.error("Test failed");
    } finally {
      setTesting(null);
    }
  };

  const toggleEvent = (key: string) => {
    setNotifEvents(prev => prev.includes(key) ? prev.filter(e => e !== key) : [...prev, key]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading settings…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Notification Channels</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Choose how you want to be notified</p>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>

      {/* WhatsApp Channel */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">WhatsApp</p>
              <p className="text-xs text-muted-foreground">Send notifications via WhatsApp</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {notifWhatsapp && (
              <button
                onClick={() => testChannel("whatsapp")}
                disabled={testing === "whatsapp"}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1.5 transition-colors"
              >
                {testing === "whatsapp" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Test
              </button>
            )}
            <Toggle checked={notifWhatsapp} onChange={() => setNotifWhatsapp(p => !p)} />
          </div>
        </div>
        {notifWhatsapp && (
          <div className="px-5 py-4">
            <label className="text-xs font-medium text-muted-foreground block mb-2">WhatsApp Phone Number</label>
            <input
              type="tel"
              value={notifWhatsappPhone}
              onChange={e => setNotifWhatsappPhone(e.target.value)}
              placeholder="+91 9876543210"
              className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-xs text-muted-foreground mt-1.5">Include country code (e.g. +91 for India)</p>
          </div>
        )}
      </div>

      {/* Email Channel */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Mail className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Email</p>
              <p className="text-xs text-muted-foreground">Send to {user?.email || "your email address"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {notifEmail && (
              <button
                onClick={() => testChannel("email")}
                disabled={testing === "email"}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1.5 transition-colors"
              >
                {testing === "email" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Test
              </button>
            )}
            <Toggle checked={notifEmail} onChange={() => setNotifEmail(p => !p)} />
          </div>
        </div>
      </div>

      {/* System / In-App Channel */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <MonitorCheck className="w-4 h-4 text-violet-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">In-App Notifications</p>
              <p className="text-xs text-muted-foreground">Show alerts inside the application</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {notifSystem && (
              <button
                onClick={() => testChannel("system")}
                disabled={testing === "system"}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1.5 transition-colors"
              >
                {testing === "system" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Test
              </button>
            )}
            <Toggle checked={notifSystem} onChange={() => setNotifSystem(p => !p)} />
          </div>
        </div>
      </div>

      {/* Event Types */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Notification Events</h2>
        <p className="text-xs text-muted-foreground mb-3">Choose which events trigger notifications across all channels</p>
        <div className="bg-card border border-border rounded-2xl shadow-sm divide-y divide-border">
          {EVENT_TYPES.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-medium text-foreground text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Toggle checked={notifEvents.includes(key)} onChange={() => toggleEvent(key)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface DrawingRecipient {
  id: number;
  employee_id: string;
  name: string;
  company_email: string;
  official_mobile: string;
  notify_email: boolean;
  notify_whatsapp: boolean;
}

function DrawingRecipientsSettings() {
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const [recipients, setRecipients] = useState<DrawingRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchedEmployee, setFetchedEmployee] = useState<{ employeeId: string; name: string; companyEmail: string; officialMobile: string } | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`${BASE}/api/drawing-approval-recipients`)
      .then(r => r.ok ? r.json() : [])
      .then(setRecipients)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const fetchEmployee = async () => {
    if (!employeeId.trim()) return;
    setFetching(true);
    setFetchError("");
    setFetchedEmployee(null);
    try {
      const r = await fetch(`${BASE}/api/erpnext-employee/${encodeURIComponent(employeeId.trim())}`);
      const d = await r.json();
      if (r.ok) {
        setFetchedEmployee({ employeeId: d.employeeId || employeeId.trim().toUpperCase(), name: d.name, companyEmail: d.companyEmail, officialMobile: d.officialMobile });
      } else {
        setFetchError(d.error || "Employee not found");
      }
    } catch {
      setFetchError("Failed to fetch employee");
    } finally {
      setFetching(false);
    }
  };

  const addRecipient = async () => {
    if (!fetchedEmployee) return;
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/api/drawing-approval-recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: fetchedEmployee.employeeId,
          name: fetchedEmployee.name,
          companyEmail: fetchedEmployee.companyEmail,
          officialMobile: fetchedEmployee.officialMobile,
          notifyEmail,
          notifyWhatsapp,
        }),
      });
      if (r.ok) {
        toast.success("Recipient added");
        setAddMode(false);
        setEmployeeId("");
        setFetchedEmployee(null);
        setNotifyEmail(true);
        setNotifyWhatsapp(true);
        load();
      } else {
        const d = await r.json();
        toast.error(d.error || "Failed to add");
      }
    } catch {
      toast.error("Failed to add recipient");
    } finally {
      setSaving(false);
    }
  };

  const updateRecipient = async (id: number, patch: Partial<DrawingRecipient>) => {
    try {
      const r = await fetch(`${BASE}/api/drawing-approval-recipients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (r.ok) {
        const updated = await r.json();
        setRecipients(prev => prev.map(rec => rec.id === id ? { ...rec, ...updated } : rec));
      }
    } catch {
      toast.error("Failed to update");
    }
  };

  const deleteRecipient = async (id: number) => {
    try {
      await fetch(`${BASE}/api/drawing-approval-recipients/${id}`, { method: "DELETE" });
      setRecipients(prev => prev.filter(r => r.id !== id));
      toast.success("Recipient removed");
    } catch {
      toast.error("Failed to remove");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Drawing Approval Recipients</h2>
          <p className="text-xs text-muted-foreground mt-0.5">People who receive notifications when a drawing is approved. Notifications include a FlowMatriX link — no file attachment.</p>
        </div>
        <button
          onClick={() => setAddMode(true)}
          className="btn-primary flex items-center gap-2 text-sm flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Recipient
        </button>
      </div>

      {/* Add form */}
      {addMode && (
        <div className="bg-card border border-border rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-primary" />
            <p className="font-semibold text-sm text-foreground">Add ERP Employee</p>
          </div>
          <p className="text-xs text-muted-foreground">Search by employee ID (e.g. WTT948) or full name to auto-fill their details from ERPNext.</p>

          <div className="flex gap-2">
            <input
              value={employeeId}
              onChange={e => { setEmployeeId(e.target.value); setFetchedEmployee(null); setFetchError(""); }}
              onKeyDown={e => e.key === "Enter" && fetchEmployee()}
              placeholder="Employee ID (WTT948) or name"
              className="flex-1 px-3 py-2 text-sm border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={fetchEmployee}
              disabled={fetching || !employeeId.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Fetch
            </button>
          </div>

          {fetchError && <p className="text-xs text-destructive">{fetchError}</p>}

          {fetchedEmployee && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase mb-0.5">Name</p>
                  <p className="text-sm font-semibold text-foreground">{fetchedEmployee.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase mb-0.5">Employee ID</p>
                  <p className="text-sm font-mono text-foreground">{fetchedEmployee.employeeId}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase mb-0.5">Company Email</p>
                  <p className="text-xs text-foreground truncate">{fetchedEmployee.companyEmail || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase mb-0.5">Official Mobile</p>
                  <p className="text-xs text-foreground">{fetchedEmployee.officialMobile || "—"}</p>
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-xs font-medium text-foreground mb-2">Notify via</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setNotifyEmail(p => !p)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all ${notifyEmail ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}
                  >
                    <Mail className="w-3.5 h-3.5" /> Email
                    {notifyEmail && <Check className="w-3 h-3 ml-1" />}
                  </button>
                  <button
                    onClick={() => setNotifyWhatsapp(p => !p)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all ${notifyWhatsapp ? "border-green-500 bg-green-50 text-green-700" : "border-border text-muted-foreground"}`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                    {notifyWhatsapp && <Check className="w-3 h-3 ml-1" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setAddMode(false); setEmployeeId(""); setFetchedEmployee(null); }}
                  className="flex-1 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addRecipient}
                  disabled={saving}
                  className="flex-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? "Adding…" : "Add Recipient"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recipients list */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : recipients.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">No recipients yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add ERP employees who should receive drawing approval notifications.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          {recipients.map((r, i) => (
            <div key={r.id} className={`p-5 ${i > 0 ? "border-t border-border" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">{(r.name || r.employee_id).charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm">{r.name || r.employee_id}</p>
                    <p className="text-xs text-muted-foreground font-mono">{r.employee_id}</p>
                  </div>
                </div>
                <button
                  onClick={() => deleteRecipient(r.id)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{r.company_email || "No email"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{r.official_mobile || "No phone"}</span>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => updateRecipient(r.id, { notifyEmail: !r.notify_email, notifyWhatsapp: r.notify_whatsapp })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${r.notify_email ? "border-primary/40 bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/40"}`}
                >
                  <Mail className="w-3 h-3" />
                  Email {r.notify_email ? "ON" : "OFF"}
                </button>
                <button
                  onClick={() => updateRecipient(r.id, { notifyWhatsapp: !r.notify_whatsapp, notifyEmail: r.notify_email })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${r.notify_whatsapp ? "border-green-500/40 bg-green-50 text-green-700" : "border-border text-muted-foreground hover:border-muted-foreground/40"}`}
                >
                  <MessageSquare className="w-3 h-3" />
                  WhatsApp {r.notify_whatsapp ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function APIKeys() {
  const keys = [
    { name: "Production API Key", key: "pk_live_••••••••••••••••••Kx9m", created: "Jan 12, 2026", lastUsed: "Today" },
    { name: "Development Key", key: "pk_test_••••••••••••••••••Hj4n", created: "Feb 3, 2026", lastUsed: "Yesterday" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">API Keys</h2>
        <button className="btn-primary"><Plus className="w-4 h-4" /> Generate Key</button>
      </div>
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {keys.map((k, i) => (
          <div key={i} className={`p-5 flex items-center justify-between ${i > 0 ? "border-t border-border" : ""}`}>
            <div>
              <p className="font-medium text-foreground text-sm">{k.name}</p>
              <p className="text-xs font-mono text-muted-foreground mt-1">{k.key}</p>
              <p className="text-xs text-muted-foreground mt-1">Created {k.created} · Last used {k.lastUsed}</p>
            </div>
            <button className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppearanceSettings() {
  const { theme, themeIndex, setTheme, darkMode, toggleDarkMode } = useTheme();
  const { navStyle, setNavStyle } = useNavStyle();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Appearance</h2>

      {/* Navigation Style */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5">
          <p className="text-sm font-semibold text-foreground mb-1">Navigation Style</p>
          <p className="text-xs text-muted-foreground mb-4">Choose how you navigate between modules. This is saved as your personal default.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Classic Sidebar */}
            <button
              onClick={() => setNavStyle("sidebar")}
              className={`relative flex flex-col gap-3 p-4 rounded-2xl border-2 text-left transition-all ${navStyle === "sidebar" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}`}
            >
              {navStyle === "sidebar" && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </span>
              )}
              {/* Mini preview */}
              <div className="w-full h-20 rounded-xl bg-slate-900 flex overflow-hidden ring-1 ring-white/10">
                <div className="w-8 bg-slate-800 flex flex-col items-center py-2 gap-1.5 shrink-0">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={`w-4 h-1 rounded-full ${i === 0 ? "bg-indigo-400" : "bg-slate-600"}`} />
                  ))}
                </div>
                <div className="flex-1 bg-slate-50 dark:bg-slate-900 p-2">
                  <span className="block w-3/4 h-2 rounded bg-slate-200 dark:bg-slate-700 mb-1.5" />
                  <span className="block w-1/2 h-2 rounded bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <PanelLeft className={`w-4 h-4 ${navStyle === "sidebar" ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className={`text-sm font-semibold ${navStyle === "sidebar" ? "text-primary" : "text-foreground"}`}>Classic Sidebar</p>
                  <p className="text-xs text-muted-foreground">Persistent sidebar with grouped links</p>
                </div>
              </div>
            </button>

            {/* App Launcher */}
            <button
              onClick={() => setNavStyle("launcher")}
              className={`relative flex flex-col gap-3 p-4 rounded-2xl border-2 text-left transition-all ${navStyle === "launcher" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}`}
            >
              {navStyle === "launcher" && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </span>
              )}
              {/* Mini preview */}
              <div className="w-full h-20 rounded-xl bg-slate-50 dark:bg-slate-900 ring-1 ring-border overflow-hidden flex flex-col">
                <div className="h-5 bg-white dark:bg-slate-800 border-b border-border flex items-center px-2 gap-1.5">
                  <span className="w-3 h-3 rounded bg-indigo-500/30 flex items-center justify-center">
                    <Grid3x3 className="w-2 h-2 text-indigo-500" />
                  </span>
                  <span className="w-10 h-1.5 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="flex-1 p-2 grid grid-cols-4 gap-1 content-start">
                  {[...Array(8)].map((_, i) => (
                    <span key={i} className="flex flex-col items-center gap-0.5">
                      <span className={`w-5 h-5 rounded-lg ${["bg-sky-400/20","bg-blue-400/20","bg-indigo-400/20","bg-violet-400/20","bg-rose-400/20","bg-amber-400/20","bg-emerald-400/20","bg-cyan-400/20"][i]}`} />
                      <span className="w-4 h-0.5 rounded bg-slate-200 dark:bg-slate-700" />
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Grid3x3 className={`w-4 h-4 ${navStyle === "launcher" ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className={`text-sm font-semibold ${navStyle === "launcher" ? "text-primary" : "text-foreground"}`}>App Launcher Grid</p>
                  <p className="text-xs text-muted-foreground">Open a grid of all apps from the header</p>
                </div>
              </div>
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 px-1">Changes take effect immediately and are saved to your browser.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border">
          <p className="text-sm font-semibold text-foreground mb-1">Color Mode</p>
          <p className="text-xs text-muted-foreground mb-4">Choose between light and dark interface</p>
          <div className="flex gap-3">
            <button
              onClick={() => { if (darkMode) toggleDarkMode(); }}
              className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${!darkMode ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}`}
            >
              <Sun className={`w-5 h-5 ${!darkMode ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-sm font-medium ${!darkMode ? "text-primary" : "text-muted-foreground"}`}>Light</span>
              {!darkMode && <Check className="w-3.5 h-3.5 text-primary" />}
            </button>
            <button
              onClick={() => { if (!darkMode) toggleDarkMode(); }}
              className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${darkMode ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}`}
            >
              <Moon className={`w-5 h-5 ${darkMode ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-sm font-medium ${darkMode ? "text-primary" : "text-muted-foreground"}`}>Dark</span>
              {darkMode && <Check className="w-3.5 h-3.5 text-primary" />}
            </button>
          </div>
        </div>

        <div className="p-5">
          <p className="text-sm font-semibold text-foreground mb-1">Accent Color</p>
          <p className="text-xs text-muted-foreground mb-4">Pick a color theme for the interface</p>
          <div className="grid grid-cols-4 gap-3">
            {THEME_PRESETS.map((preset, i) => (
              <button
                key={preset.name}
                onClick={() => setTheme(i)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${i === themeIndex ? "border-primary" : "border-border hover:border-muted-foreground/40"}`}
              >
                <span className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: preset.accent }} />
                <span className="text-xs font-medium text-muted-foreground">{preset.name}</span>
                {i === themeIndex && <Check className="w-3 h-3 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState("users");

  const renderContent = () => {
    switch (activeSection) {
      case "notifications": return <NotificationsSettings />;
      case "drawing-recipients": return <DrawingRecipientsSettings />;
      case "appearance": return <AppearanceSettings />;
      case "api": return <APIKeys />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              {settingsSections.find(s => s.id === activeSection) && (() => {
                const Icon = settingsSections.find(s => s.id === activeSection)!.icon;
                return <Icon className="w-7 h-7" />;
              })()}
            </div>
            <p className="font-medium text-foreground">{settingsSections.find(s => s.id === activeSection)?.label}</p>
            <p className="text-sm mt-1">This section is coming soon.</p>
          </div>
        );
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Page header */}
        <div className="px-6 pt-6 pb-0">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your workspace and preferences</p>

          {/* Top Tab Bar */}
          <nav className="flex gap-1 mt-4 border-b border-border">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <motion.div key={activeSection} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="h-full">
            {activeSection === "users" ? (
              <UserManagementContent />
            ) : (
              <div className="px-6 py-6">
                {renderContent()}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
