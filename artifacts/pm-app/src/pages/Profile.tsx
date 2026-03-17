import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { Camera, Mail, Phone, MapPin, Briefcase, Edit2, Save, Shield, Clock, Activity, Star } from "lucide-react";
import { useState } from "react";

const recentActivity = [
  { action: "Updated project status", target: "Website Redesign", time: "2 hours ago", type: "project" },
  { action: "Created campaign", target: "Spring Email Blast", time: "Yesterday", type: "campaign" },
  { action: "Added lead", target: "Sarah Johnson", time: "2 days ago", type: "lead" },
  { action: "Completed task", target: "Design new homepage mockup", time: "3 days ago", type: "task" },
  { action: "Invited team member", target: "Grace Kim", time: "1 week ago", type: "team" },
];

const typeColors: Record<string, string> = {
  project: "bg-blue-100 text-blue-600",
  campaign: "bg-violet-100 text-violet-600",
  lead: "bg-emerald-100 text-emerald-600",
  task: "bg-amber-100 text-amber-600",
  team: "bg-rose-100 text-rose-600",
};

const stats = [
  { label: "Projects Led", value: "8", icon: Briefcase, color: "text-blue-600 bg-blue-50" },
  { label: "Tasks Completed", value: "47", icon: Star, color: "text-amber-600 bg-amber-50" },
  { label: "Campaigns Run", value: "12", icon: Activity, color: "text-violet-600 bg-violet-50" },
  { label: "Years Active", value: "2", icon: Clock, color: "text-emerald-600 bg-emerald-50" },
];

export default function Profile() {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "John Smith",
    email: "john.smith@company.com",
    phone: "+1 (555) 012-3456",
    location: "San Francisco, CA",
    role: "Product Manager",
    department: "Product",
    bio: "Passionate product manager with 8+ years of experience building SaaS products. I love turning complex problems into elegant solutions.",
  });

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your personal information and preferences</p>
          </div>
          <button onClick={() => setEditing(!editing)} className={editing ? "btn-primary" : "flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"}>
            {editing ? <><Save className="w-4 h-4" /> Save Changes</> : <><Edit2 className="w-4 h-4" /> Edit Profile</>}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Avatar Card */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  JS
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-card border border-border rounded-full flex items-center justify-center shadow-sm hover:bg-muted transition-colors">
                  <Camera className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <h2 className="text-lg font-bold text-foreground">{form.name}</h2>
              <p className="text-sm text-muted-foreground">{form.role}</p>
              <p className="text-xs text-muted-foreground mt-1">{form.department}</p>
              <div className="flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-emerald-50 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-emerald-700">Active</span>
              </div>
              <div className="mt-4 p-3 bg-muted/50 rounded-xl w-full text-left">
                <div className="flex items-center gap-1.5 mb-1">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Admin</span>
                </div>
                <p className="text-xs text-muted-foreground">Full workspace access</p>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-4">Activity Overview</h3>
              <div className="grid grid-cols-2 gap-3">
                {stats.map((s) => (
                  <div key={s.label} className={`rounded-xl p-3 ${s.color.split(" ")[1]}`}>
                    <s.icon className={`w-4 h-4 mb-1 ${s.color.split(" ")[0]}`} />
                    <div className={`text-xl font-bold ${s.color.split(" ")[0]}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Info + Activity */}
          <div className="lg:col-span-2 space-y-4">
            {/* Edit Form */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-semibold text-foreground mb-5">Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: "name", label: "Full Name", icon: null },
                  { key: "role", label: "Job Title", icon: null },
                  { key: "email", label: "Email", icon: Mail },
                  { key: "phone", label: "Phone", icon: Phone },
                  { key: "department", label: "Department", icon: Briefcase },
                  { key: "location", label: "Location", icon: MapPin },
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
                    <div className="relative">
                      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />}
                      <input
                        value={form[key as keyof typeof form]}
                        onChange={update(key as keyof typeof form)}
                        disabled={!editing}
                        className={`w-full text-sm rounded-xl border px-3 py-2.5 transition-all focus:outline-none ${Icon ? "pl-9" : ""} ${editing ? "bg-background border-border focus:ring-2 focus:ring-primary/40 focus:border-primary" : "bg-muted/30 border-transparent text-foreground cursor-default"}`}
                      />
                    </div>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Bio</label>
                  <textarea
                    value={form.bio}
                    onChange={update("bio")}
                    disabled={!editing}
                    rows={3}
                    className={`w-full text-sm rounded-xl border px-3 py-2.5 resize-none transition-all focus:outline-none ${editing ? "bg-background border-border focus:ring-2 focus:ring-primary/40 focus:border-primary" : "bg-muted/30 border-transparent text-foreground cursor-default"}`}
                  />
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-semibold text-foreground mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {recentActivity.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${typeColors[item.type]}`}>
                      {item.type[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        {item.action} <span className="font-medium">"{item.target}"</span>
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{item.time}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
