import { Layout } from "@/components/Layout";
import { useState } from "react";
import { Shield, Bell, Palette, Globe, Key, Plus, Trash2, Sun, Moon, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme, THEME_PRESETS } from "@/hooks/useTheme";
import { UserManagementContent } from "@/pages/UserManagement";

const settingsSections = [
  { id: "users", label: "User Management", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "integrations", label: "Integrations", icon: Globe },
  { id: "api", label: "API Keys", icon: Key },
];

function NotificationsSettings() {
  const [settings, setSettings] = useState({
    emailAlerts: true, pushNotifications: true, projectUpdates: true,
    taskAssignments: true, campaignReports: false, weeklyDigest: true,
    mentionsOnly: false, newLeads: true,
  });

  const toggle = (key: keyof typeof settings) => setSettings(p => ({ ...p, [key]: !p[key] }));

  const items = [
    { key: "emailAlerts", label: "Email Alerts", desc: "Receive alerts via email" },
    { key: "pushNotifications", label: "Push Notifications", desc: "Browser push notifications" },
    { key: "projectUpdates", label: "Project Updates", desc: "When projects change status" },
    { key: "taskAssignments", label: "Task Assignments", desc: "When tasks are assigned to you" },
    { key: "campaignReports", label: "Campaign Reports", desc: "Weekly campaign performance" },
    { key: "weeklyDigest", label: "Weekly Digest", desc: "Summary every Monday morning" },
    { key: "newLeads", label: "New Leads", desc: "When new leads come in" },
  ] as const;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Notification Preferences</h2>
      <div className="bg-card border border-border rounded-2xl shadow-sm divide-y divide-border">
        {items.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="font-medium text-foreground text-sm">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <button onClick={() => toggle(key)} className={`w-11 h-6 rounded-full transition-all relative ${settings[key] ? "bg-primary" : "bg-border"}`}>
              <span className={`w-4 h-4 rounded-full bg-white shadow absolute top-1 transition-all ${settings[key] ? "left-6" : "left-1"}`} />
            </button>
          </div>
        ))}
      </div>
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

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Appearance</h2>

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
      case "users": return (
        <div className="h-[620px] rounded-2xl overflow-hidden border border-border shadow-sm">
          <UserManagementContent />
        </div>
      );
      case "notifications": return <NotificationsSettings />;
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your workspace and preferences</p>
        </div>

        {/* Top Tab Bar */}
        <div className="border-b border-border">
          <nav className="flex gap-1">
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
        <motion.div key={activeSection} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
          {renderContent()}
        </motion.div>
      </div>
    </Layout>
  );
}
