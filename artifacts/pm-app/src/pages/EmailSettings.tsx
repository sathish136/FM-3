import { Layout } from "@/components/Layout";
import {
  Mail, Plus, Pencil, Trash2, Check, X, Loader2,
  Star, User, Eye, EyeOff, ShieldCheck, AlertCircle, ChevronDown,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

const BASE = "/api";

type ErpUser = { email: string; full_name: string };

type EmailAccount = {
  id: number;
  displayName: string;
  emailAddress: string;
  gmailUser: string;
  gmailAppPassword: string;
  assignedTo: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  displayName: string;
  emailAddress: string;
  gmailUser: string;
  gmailAppPassword: string;
  assignedTo: string;
  isDefault: boolean;
};

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${BASE}${path}`, opts);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function UserDropdown({
  value,
  onChange,
  users,
  loadingUsers,
}: {
  value: string;
  onChange: (v: string) => void;
  users: ErpUser[];
  loadingUsers: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const selected = users.find(u => u.email === value);
  const label = selected ? `${selected.full_name} (${selected.email})` : value || "Select a user…";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 pr-8 outline-none bg-gray-50 text-left text-gray-700 hover:border-blue-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition flex items-center gap-2">
        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className={`flex-1 truncate ${!selected && !value ? "text-gray-400" : ""}`}>{label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 absolute right-3" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users…"
              className="w-full text-sm px-2.5 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
              className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 italic">
              — None / unassigned —
            </button>
            {loadingUsers && (
              <div className="flex items-center gap-2 px-3 py-3 text-xs text-gray-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading users…
              </div>
            )}
            {!loadingUsers && filtered.length === 0 && (
              <p className="px-3 py-3 text-xs text-gray-400">No users found.</p>
            )}
            {filtered.map(u => (
              <button
                key={u.email}
                type="button"
                onClick={() => { onChange(u.email); setOpen(false); setSearch(""); }}
                className={`w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors ${value === u.email ? "bg-blue-50" : ""}`}>
                <p className="text-sm font-medium text-gray-800 truncate">{u.full_name}</p>
                <p className="text-xs text-gray-400 truncate">{u.email}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AccountForm({
  initial,
  onSave,
  onCancel,
  isEdit,
  users,
  loadingUsers,
}: {
  initial: FormState;
  onSave: (f: FormState) => Promise<void>;
  onCancel: () => void;
  isEdit: boolean;
  users: ErpUser[];
  loadingUsers: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof FormState, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.displayName || !form.emailAddress || !form.gmailUser || !form.gmailAppPassword) {
      setError("All fields except Assigned User and Default are required.");
      return;
    }
    setSaving(true); setError("");
    try {
      await onSave(form);
    } catch (e: any) {
      setError(e.message || "Save failed");
    }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
      <h3 className="text-sm font-bold text-gray-800">{isEdit ? "Edit Email Account" : "Add New Email Account"}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Display Name *</label>
          <input
            value={form.displayName}
            onChange={e => set("displayName", e.target.value)}
            placeholder="e.g. Company Gmail"
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50 transition"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email Address *</label>
          <input
            value={form.emailAddress}
            onChange={e => set("emailAddress", e.target.value)}
            placeholder="you@gmail.com"
            type="email"
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50 transition"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Gmail Username *</label>
          <input
            value={form.gmailUser}
            onChange={e => set("gmailUser", e.target.value)}
            placeholder="you@gmail.com"
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50 transition"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">
            App Password * {isEdit && <span className="text-gray-400 font-normal">(leave as ••• to keep current)</span>}
          </label>
          <div className="relative">
            <input
              value={form.gmailAppPassword}
              onChange={e => set("gmailAppPassword", e.target.value)}
              type={showPass ? "text" : "password"}
              placeholder={isEdit ? "Leave unchanged or enter new" : "xxxx xxxx xxxx xxxx"}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 pr-10 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50 transition"
            />
            <button
              type="button"
              onClick={() => setShowPass(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">
            Assigned User <span className="font-normal text-gray-400">(from ERPNext)</span>
          </label>
          <UserDropdown
            value={form.assignedTo}
            onChange={v => set("assignedTo", v)}
            users={users}
            loadingUsers={loadingUsers}
          />
        </div>
        <div className="flex items-center gap-3 pt-5">
          <button
            type="button"
            onClick={() => set("isDefault", !form.isDefault)}
            className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${form.isDefault ? "bg-blue-600" : "bg-gray-200"}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.isDefault ? "translate-x-4" : ""}`} />
          </button>
          <label className="text-sm text-gray-700 font-medium cursor-pointer" onClick={() => set("isDefault", !form.isDefault)}>
            Set as default account
          </label>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold shadow transition-colors">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {saving ? "Saving…" : "Save Account"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function EmailSettings() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [erpUsers, setErpUsers] = useState<ErpUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<EmailAccount | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const data = await apiFetch("/email-settings");
      setAccounts(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const loadErpUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await apiFetch("/erpnext-users");
      setErpUsers(Array.isArray(data) ? data : []);
    } catch {
      setErpUsers([]);
    }
    setLoadingUsers(false);
  };

  useEffect(() => {
    load();
    loadErpUsers();
  }, []);

  const emptyForm = (): FormState => ({
    displayName: "",
    emailAddress: "",
    gmailUser: "",
    gmailAppPassword: "",
    assignedTo: user?.email ?? "",
    isDefault: false,
  });

  const handleAdd = async (form: FormState) => {
    const row = await apiFetch("/email-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setAccounts(prev => {
      const updated = form.isDefault ? prev.map(a => ({ ...a, isDefault: false })) : prev;
      return [...updated, row];
    });
    setAdding(false);
  };

  const handleEdit = async (form: FormState) => {
    if (!editing) return;
    const row = await apiFetch(`/email-settings/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setAccounts(prev => {
      const updated = form.isDefault ? prev.map(a => ({ ...a, isDefault: false })) : prev;
      return updated.map(a => (a.id === editing.id ? row : a));
    });
    setEditing(null);
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await apiFetch(`/email-settings/${id}`, { method: "DELETE" });
      setAccounts(prev => prev.filter(a => a.id !== id));
    } catch {}
    setDeletingId(null);
  };

  const findErpUser = (email: string | null) =>
    email ? erpUsers.find(u => u.email === email) : null;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              Email Settings
            </h1>
            <p className="text-sm text-gray-500 mt-1">Configure Gmail accounts and assign them to ERPNext users.</p>
          </div>
          {!adding && !editing && (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Account
            </button>
          )}
        </div>

        {/* How it works note */}
        <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
          <ShieldCheck className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
          <div className="text-xs text-indigo-700 leading-relaxed">
            <strong>Gmail App Passwords</strong> — Go to your Google Account → Security → 2-Step Verification → App Passwords. Generate a password for "Mail" and paste it here. Your main Google password is never stored.
          </div>
        </div>

        {/* Add form */}
        {adding && (
          <AccountForm
            initial={emptyForm()}
            onSave={handleAdd}
            onCancel={() => setAdding(false)}
            isEdit={false}
            users={erpUsers}
            loadingUsers={loadingUsers}
          />
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading accounts…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && accounts.length === 0 && !adding && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-gray-300" />
            </div>
            <h3 className="text-sm font-semibold text-gray-600 mb-1">No email accounts configured</h3>
            <p className="text-xs text-gray-400">Click "Add Account" to set up a Gmail account for sending and receiving email.</p>
          </div>
        )}

        {/* Account list */}
        <div className="space-y-3">
          {accounts.map(account => {
            const assignedUser = findErpUser(account.assignedTo);
            return (
              <div key={account.id}>
                {editing?.id === account.id ? (
                  <AccountForm
                    initial={{
                      displayName: account.displayName,
                      emailAddress: account.emailAddress,
                      gmailUser: account.gmailUser,
                      gmailAppPassword: account.gmailAppPassword,
                      assignedTo: account.assignedTo ?? "",
                      isDefault: account.isDefault,
                    }}
                    onSave={handleEdit}
                    onCancel={() => setEditing(null)}
                    isEdit={true}
                    users={erpUsers}
                    loadingUsers={loadingUsers}
                  />
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {account.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-gray-900 text-sm truncate">{account.displayName}</p>
                        {account.isDefault && (
                          <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5">
                            <Star className="w-2.5 h-2.5 fill-current" /> Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{account.emailAddress}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                        <span>Gmail: <span className="font-medium text-gray-600">{account.gmailUser}</span></span>
                        {account.assignedTo && (
                          <>
                            <span className="text-gray-200">•</span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span className="font-medium text-gray-600">
                                {assignedUser ? assignedUser.full_name : account.assignedTo}
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditing(account)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        disabled={deletingId === account.id}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        title="Delete">
                        {deletingId === account.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
