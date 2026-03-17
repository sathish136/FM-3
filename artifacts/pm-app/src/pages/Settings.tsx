import { Layout } from "@/components/Layout";
import { useState } from "react";
import { Users, Shield, Bell, Palette, Globe, Key, Plus, Trash2, Mail, ChevronRight, Check, UserPlus, Edit2 } from "lucide-react";
import { motion } from "framer-motion";

const settingsSections = [
  { id: "users", label: "User Management", icon: Users },
  { id: "roles", label: "Roles & Permissions", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "integrations", label: "Integrations", icon: Globe },
  { id: "api", label: "API Keys", icon: Key },
];

const mockUsers = [
  { id: 1, name: "Alice Chen", email: "alice@company.com", role: "Admin", department: "Product", status: "active", lastActive: "2 hours ago" },
  { id: 2, name: "Bob Smith", email: "bob@company.com", role: "Editor", department: "Engineering", status: "active", lastActive: "1 day ago" },
  { id: 3, name: "Carol Davis", email: "carol@company.com", role: "Editor", department: "Marketing", status: "active", lastActive: "3 hours ago" },
  { id: 4, name: "Dave Wilson", email: "dave@company.com", role: "Viewer", department: "Engineering", status: "inactive", lastActive: "1 week ago" },
  { id: 5, name: "Eve Martinez", email: "eve@company.com", role: "Editor", department: "Design", status: "active", lastActive: "30 min ago" },
  { id: 6, name: "Frank Lee", email: "frank@company.com", role: "Admin", department: "Marketing", status: "active", lastActive: "5 hours ago" },
  { id: 7, name: "Grace Kim", email: "grace@company.com", role: "Viewer", department: "Sales", status: "pending", lastActive: "Never" },
];

const roles = [
  { name: "Admin", desc: "Full access to all features and settings", count: 2, color: "bg-red-100 text-red-700" },
  { name: "Editor", desc: "Can create and edit content, manage projects", count: 3, color: "bg-blue-100 text-blue-700" },
  { name: "Viewer", desc: "Read-only access to projects and reports", count: 2, color: "bg-green-100 text-green-700" },
];

const statusColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-700",
};

function UserManagement() {
  const [search, setSearch] = useState("");
  const filtered = mockUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground">{mockUsers.length} members in your workspace</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Mail className="w-4 h-4" /> Invite by Email
          </button>
          <button className="btn-primary">
            <UserPlus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="w-full max-w-sm px-4 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Department</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Last Active</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((user) => (
              <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/70 to-violet-500/70 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {user.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${roles.find(r => r.name === user.role)?.color}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{user.department}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[user.status]}`}>
                    {user.status === "active" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />}
                    {user.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{user.lastActive}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-4">Roles & Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div key={role.name} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${role.color}`}>{role.name}</span>
                <span className="text-sm font-bold text-foreground">{role.count}</span>
              </div>
              <p className="text-sm text-muted-foreground">{role.desc}</p>
              <button className="mt-4 w-full text-xs text-primary hover:underline text-left">Edit permissions →</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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

export default function Settings() {
  const [activeSection, setActiveSection] = useState("users");

  const renderContent = () => {
    switch (activeSection) {
      case "users": return <UserManagement />;
      case "notifications": return <NotificationsSettings />;
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar Nav */}
          <div className="md:col-span-1">
            <nav className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              {settingsSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button key={section.id} onClick={() => setActiveSection(section.id)} className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors border-b border-border last:border-0 ${isActive ? "bg-primary/8 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                    <Icon className="w-4 h-4" />
                    {section.label}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="md:col-span-3">
            <motion.div key={activeSection} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
              {renderContent()}
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
