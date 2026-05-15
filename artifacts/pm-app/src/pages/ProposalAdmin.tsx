import { useState, useEffect, type ReactNode } from "react";
import { Layout } from "@/components/Layout";
import {
  FileText, RefreshCw, Eye, CheckCircle2, Clock,
  Search, Loader2, Building2, MapPin, Mail,
  Phone, User, Droplets, Layers, SlidersHorizontal,
  X, ExternalLink, AlertCircle, Trash2, Send, AlertTriangle,
} from "lucide-react";

const API = "/api";

type Status = "new" | "in_review" | "sent";

interface ProposalRow {
  id: number;
  proposal_no: string;
  company_name: string;
  address: string;
  city: string;
  country: string;
  contact_person: string;
  email: string;
  phone: string;
  system_option: number;
  flow_rate: string;
  status: Status;
  notes: string;
  created_at: string;
  updated_at: string;
}

const STATUS_META: Record<Status, { label: string; color: string; icon: ReactNode }> = {
  new: {
    label: "New",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Clock className="w-3 h-3" />,
  },
  in_review: {
    label: "In Review",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <Eye className="w-3 h-3" />,
  },
  sent: {
    label: "Sent",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
};

function StatusBadge({ status }: { status: Status }) {
  const m = STATUS_META[status] || STATUS_META.new;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${m.color}`}>
      {m.icon} {m.label}
    </span>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function ConfirmDialog({ title, message, onConfirm, onCancel, loading }: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-base font-bold text-gray-900 text-center mb-1">{title}</h3>
        <p className="text-sm text-gray-500 text-center mb-6">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailPanel({ proposal, onClose, onStatusChange, onDelete }: {
  proposal: ProposalRow;
  onClose: () => void;
  onStatusChange: (id: number, status: Status) => void;
  onDelete: (id: number) => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendResult, setResendResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const changeStatus = async (s: Status) => {
    setUpdating(true);
    try {
      const res = await fetch(`${API}/proposals/${proposal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: s }),
      });
      if (res.ok) onStatusChange(proposal.id, s);
    } finally {
      setUpdating(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendResult(null);
    try {
      const res = await fetch(`${API}/proposal-wizard/requests/${proposal.id}/resend`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Resend failed");
      setResendResult({ ok: true, msg: `Resent to ${proposal.email}` });
      onStatusChange(proposal.id, "sent");
    } catch (e: any) {
      setResendResult({ ok: false, msg: e.message || "Resend failed" });
    } finally {
      setResending(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`${API}/proposals/${proposal.id}`, { method: "DELETE" });
      if (res.ok) {
        onDelete(proposal.id);
        onClose();
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex">
        <div className="flex-1 bg-black/40" onClick={onClose} />
        <div className="w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-y-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div>
              <h2 className="text-base font-bold text-gray-900">{proposal.proposal_no}</h2>
              <p className="text-xs text-gray-500">{formatDate(proposal.created_at)}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-5 flex-1">
            {/* Status */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(STATUS_META) as Status[]).map((s) => (
                  <button
                    key={s}
                    disabled={updating}
                    onClick={() => changeStatus(s)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                      proposal.status === s
                        ? STATUS_META[s].color + " shadow-sm"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {updating && proposal.status !== s ? <Loader2 className="w-3 h-3 animate-spin" /> : STATUS_META[s].icon}
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>
            </div>

            {/* System + Flow */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 space-y-2">
              <div className="flex items-center gap-2">
                {proposal.system_option === 2
                  ? <Layers className="w-4 h-4 text-blue-500" />
                  : <Droplets className="w-4 h-4 text-blue-500" />}
                <span className="text-sm font-semibold text-gray-800">
                  Option {proposal.system_option} — {proposal.system_option === 1 ? "Standard STP" : "STP + MBR Advanced"}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Flow Rate: <strong className="text-gray-900">{proposal.flow_rate} M³/Day</strong>
              </p>
            </div>

            {/* Company */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Company</p>
              <div className="space-y-1.5 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="font-semibold">{proposal.company_name}</span>
                </div>
                {proposal.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>{proposal.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{proposal.city}, {proposal.country}</span>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Contact</p>
              <div className="space-y-1.5 text-sm text-gray-700">
                <div className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" />{proposal.contact_person}</div>
                <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /><a href={`mailto:${proposal.email}`} className="text-blue-600 hover:underline">{proposal.email}</a></div>
                {proposal.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{proposal.phone}</div>}
              </div>
            </div>

            {/* Notes */}
            {proposal.notes && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 border border-gray-100">{proposal.notes}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 px-5 py-4 border-t border-gray-100 bg-white space-y-3">

            {/* Resend result */}
            {resendResult && (
              <div className={`flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border ${
                resendResult.ok
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}>
                {resendResult.ok
                  ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  : <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
                {resendResult.msg}
              </div>
            )}

            {/* Resend button */}
            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition disabled:opacity-60"
            >
              {resending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing &amp; Resending…</>
                : <><Send className="w-4 h-4" /> Resend Proposal Email</>}
            </button>

            {/* Email target */}
            <p className="text-center text-xs text-gray-400">
              Will be sent to <span className="font-medium text-gray-600">{proposal.email}</span>
            </p>

            {/* Delete button */}
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition"
            >
              <Trash2 className="w-4 h-4" />
              Delete Record
            </button>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Proposal"
          message={`Are you sure you want to delete ${proposal.proposal_no}? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          loading={deleting}
        />
      )}
    </>
  );
}

export default function ProposalAdmin() {
  const [rows, setRows] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | Status>("all");
  const [selected, setSelected] = useState<ProposalRow | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/proposals`);
      if (res.ok) setRows(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = (id: number, status: Status) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    setSelected((prev) => prev?.id === id ? { ...prev, status } : prev);
  };

  const handleDelete = (id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const deleteRow = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${API}/proposals/${id}`, { method: "DELETE" });
      if (res.ok) handleDelete(id);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const filtered = rows.filter((r) => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.company_name.toLowerCase().includes(q) ||
        r.proposal_no.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.contact_person.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    all: rows.length,
    new: rows.filter((r) => r.status === "new").length,
    in_review: rows.filter((r) => r.status === "in_review").length,
    sent: rows.filter((r) => r.status === "sent").length,
  };

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Proposal Requests</h1>
            <p className="text-xs text-gray-500">Customer-submitted proposal requests from the portal</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <a
              href="/pm-app/proposal-wizard"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white bg-blue-600 hover:bg-blue-700 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open Proposal Wizard
            </a>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, proposal no…"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
            {(["all", "new", "in_review", "sent"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  filterStatus === s
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {s === "all" ? "All" : STATUS_META[s].label} ({counts[s]})
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <FileText className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No proposals found</p>
              {rows.length === 0 && (
                <p className="text-xs mt-1 text-gray-400">
                  Share the{" "}
                  <a href="/pm-app/proposal-wizard" target="_blank" className="text-blue-500 hover:underline">
                    Proposal Wizard
                  </a>{" "}
                  to start receiving requests
                </p>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Proposal No</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">System</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Flow</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-50 hover:bg-blue-50/30 transition cursor-pointer"
                    onClick={() => setSelected(row)}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">{row.proposal_no}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{row.company_name}</p>
                      <p className="text-xs text-gray-400">{row.contact_person}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{row.city}, {row.country}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.system_option === 2
                          ? "bg-blue-100 text-blue-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {row.system_option === 2 ? <Layers className="w-3 h-3" /> : <Droplets className="w-3 h-3" />}
                        Option {row.system_option}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{row.flow_rate} M³/Day</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(row.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelected(row)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600 transition"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(row.id)}
                          disabled={deletingId === row.id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-red-500 border border-red-100 hover:border-red-300 hover:bg-red-50 transition disabled:opacity-50"
                        >
                          {deletingId === row.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Trash2 className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <DetailPanel
          proposal={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}

      {confirmDeleteId !== null && (
        <ConfirmDialog
          title="Delete Proposal"
          message={`Delete ${rows.find(r => r.id === confirmDeleteId)?.proposal_no}? This cannot be undone.`}
          onConfirm={() => deleteRow(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
          loading={deletingId === confirmDeleteId}
        />
      )}
    </Layout>
  );
}
