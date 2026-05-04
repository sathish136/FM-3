import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft, Calendar, MessageSquare, FileText, Send,
  ClipboardList, Layers, Calculator, PhoneCall, Hash, Building2, Mail,
  Phone, MapPin, Globe, Briefcase, User as UserIcon, Activity,
  CalendarCheck, ChevronDown, RefreshCw, Eye, Download, X, Loader2, ShieldCheck,
  ExternalLink, FileImage, FileSpreadsheet, File as FileIcon,
  Search, Plus, Pencil, Check, FolderOpen, GitBranch,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
type ApiResp = { total_count: number; data: any[] };

/* ── Section: clean enterprise card ───────────────────────────────────── */
function Section({
  title, count, sub, icon: Icon, children, defaultOpen = true,
}: {
  title: string;
  count: number;
  sub?: React.ReactNode;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 hover:to-slate-50 transition-colors"
      >
        <span className="w-6 h-6 rounded-md bg-sky-50 border border-sky-100 inline-flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-sky-600" />
        </span>
        <span className="font-semibold text-[13px] text-slate-800">{title}</span>
        <span className="text-[10px] font-semibold tabular-nums text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
          {count}
        </span>
        {sub && <div className="ml-3 text-[11px] text-slate-500 hidden md:block">{sub}</div>}
        <div className="flex-1" />
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", !open && "-rotate-90")} />
      </button>
      {open && children}
    </div>
  );
}

/* ── Filterable table ─────────────────────────────────────────────────── */
type Col = {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
  filterValue?: (row: any) => string;
  cellClassName?: string;
};
function FilterTable({
  cols, rows, emptyLabel, rowClassName, searchPlaceholder,
}: {
  cols: Col[];
  rows: any[];
  emptyLabel: string;
  rowClassName?: (row: any, index: number) => string | undefined;
  searchPlaceholder?: string;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      cols.some((c) => {
        const cell = c.filterValue ? c.filterValue(r) : String(r[c.key] ?? "");
        return cell.toLowerCase().includes(q);
      })
    );
  }, [rows, search, cols]);

  if (rows.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-[11px] text-gray-400 italic">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/50 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder ?? "Search this list…"}
            className="w-full text-[12px] pl-8 pr-8 py-1.5 rounded-md border border-slate-200 bg-white focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 placeholder:text-slate-400 transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 inline-flex items-center justify-center rounded hover:bg-slate-100"
              aria-label="Clear search"
            >
              <X className="w-3 h-3 text-slate-500" />
            </button>
          )}
        </div>
        <span className="text-[11px] text-slate-500 tabular-nums">
          {search ? `${filtered.length} / ${rows.length}` : `${rows.length} total`}
        </span>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-xs border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider w-10 border-b border-slate-200">#</th>
              {cols.map((c) => (
                <th
                  key={c.key}
                  className="px-3 py-2 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap border-b border-slate-200"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={cols.length + 1} className="px-4 py-8 text-center text-[12px] text-slate-400 italic">
                  No matches for "{search}".
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => {
                const extra = rowClassName?.(r, i);
                return (
                <tr
                  key={i}
                  className={cn(
                    "hover:bg-sky-50/40 transition-colors",
                    !extra && i % 2 !== 0 && "bg-slate-50/40",
                    extra,
                  )}
                >
                  <td className="px-3 py-2 border-b border-slate-100 text-[11px] text-slate-400 tabular-nums">{i + 1}</td>
                  {cols.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "border-b border-slate-100 text-[12px] text-slate-700 align-top",
                        c.cellClassName ?? "px-3 py-2",
                      )}
                    >
                      {c.render ? (
                        c.render(r)
                      ) : (
                        <div className="whitespace-pre-wrap break-words leading-snug" title={String(r[c.key] ?? "")}>
                          {String(r[c.key] ?? "—") || "—"}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Compact info field ───────────────────────────────────────────────── */
function Field({ label, value, full }: { label: string; value: any; full?: boolean }) {
  const v = String(value ?? "").trim();
  return (
    <div className={cn("min-w-0", full && "sm:col-span-2 lg:col-span-3")}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </div>
      <div className="text-[13px] text-slate-800 break-words leading-snug font-medium">
        {v || <span className="text-slate-300 font-normal">—</span>}
      </div>
    </div>
  );
}

/* ── Status pill ──────────────────────────────────────────────────────── */
function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const color =
    s.includes("hot") ? "bg-rose-50 text-rose-700 border-rose-200" :
    s.includes("warm") ? "bg-amber-50 text-amber-700 border-amber-200" :
    s.includes("cold") ? "bg-sky-50 text-sky-700 border-sky-200" :
    s.includes("won") || s.includes("converted") ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    s.includes("lost") || s.includes("dead") ? "bg-gray-100 text-gray-600 border-gray-200" :
    "bg-slate-50 text-slate-700 border-slate-200";
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border", color)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}

/* ── Text / number helpers ────────────────────────────────────────────── */
function decodeHtml(s: string): string {
  if (!s) return "";
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function formatComments(raw: any): string {
  if (!raw) return "";
  if (typeof raw === "string") return decodeHtml(raw);
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .map((c: any) => {
      if (!c) return "";
      if (typeof c === "string") return decodeHtml(c);
      const text = decodeHtml(String(c.comment ?? c.text ?? c.message ?? ""));
      const who = c.employee_name ?? c.commented_by ?? c.author ?? c.owner ?? "";
      const when = (c.creation ?? c.date ?? "").toString().slice(0, 10);
      const tag = [who, when].filter(Boolean).join(" · ");
      return tag ? `${text}\n— ${tag}` : text;
    })
    .filter(Boolean)
    .join("\n\n");
}

const fmtNum = (n: any, decimals = 0): string => {
  if (n === null || n === undefined || n === "") return "";
  const num = typeof n === "number" ? n : Number(String(n).replace(/[^\d.\-]/g, ""));
  if (!Number.isFinite(num)) return String(n);
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/* ── Attachment helpers ───────────────────────────────────────────────── */
type AttachmentItem = { name: string; path: string };

function normaliseAttachments(raw: any): AttachmentItem[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .map((a: any): AttachmentItem | null => {
      if (!a) return null;
      if (typeof a === "string") {
        if (!a.trim()) return null;
        return { name: a.split("/").pop() || a, path: a };
      }
      const path = a.file_url ?? a.url ?? a.path ?? "";
      const name = a.file_name ?? a.name ?? (path ? String(path).split("/").pop() : "") ?? "";
      if (!path) return null;
      return { name: String(name || path), path: String(path) };
    })
    .filter((x): x is AttachmentItem => x !== null);
}

function fileExt(name: string): string {
  const m = /\.([a-zA-Z0-9]{1,5})$/.exec(name);
  return m && m[1] ? m[1].toLowerCase() : "";
}

function FileTypeBadge({ name }: { name: string }) {
  const ext = fileExt(name);
  const map: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
    pdf:  { label: "PDF",  cls: "bg-rose-50 text-rose-700 border-rose-200", Icon: FileText },
    doc:  { label: "DOC",  cls: "bg-blue-50 text-blue-700 border-blue-200", Icon: FileText },
    docx: { label: "DOCX", cls: "bg-blue-50 text-blue-700 border-blue-200", Icon: FileText },
    xls:  { label: "XLS",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: FileSpreadsheet },
    xlsx: { label: "XLSX", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: FileSpreadsheet },
    ppt:  { label: "PPT",  cls: "bg-orange-50 text-orange-700 border-orange-200", Icon: FileText },
    pptx: { label: "PPTX", cls: "bg-orange-50 text-orange-700 border-orange-200", Icon: FileText },
    png:  { label: "PNG",  cls: "bg-violet-50 text-violet-700 border-violet-200", Icon: FileImage },
    jpg:  { label: "JPG",  cls: "bg-violet-50 text-violet-700 border-violet-200", Icon: FileImage },
    jpeg: { label: "JPEG", cls: "bg-violet-50 text-violet-700 border-violet-200", Icon: FileImage },
    gif:  { label: "GIF",  cls: "bg-violet-50 text-violet-700 border-violet-200", Icon: FileImage },
    webp: { label: "WEBP", cls: "bg-violet-50 text-violet-700 border-violet-200", Icon: FileImage },
    zip:  { label: "ZIP",  cls: "bg-amber-50 text-amber-700 border-amber-200", Icon: FileIcon },
  };
  const meta = map[ext] ?? { label: (ext || "FILE").toUpperCase(), cls: "bg-slate-50 text-slate-600 border-slate-200", Icon: FileIcon };
  const { Icon } = meta;
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border tracking-wide shrink-0", meta.cls)}>
      <Icon className="w-2.5 h-2.5" />
      {meta.label}
    </span>
  );
}

/* ── Clamped text with "Show more / less" toggle ──────────────────────── */
function ClampedText({
  text, lines = 8, minWidth = 280,
}: {
  text: string;
  lines?: number;
  minWidth?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Measure on next frame to ensure layout has settled
    const id = requestAnimationFrame(() => {
      setOverflowing(el.scrollHeight > el.clientHeight + 1);
    });
    return () => cancelAnimationFrame(id);
  }, [text, lines, expanded]);

  const safe = String(text ?? "").trim();
  if (!safe) return <span className="text-slate-300">—</span>;

  const clampStyle: React.CSSProperties = expanded
    ? {}
    : {
        display: "-webkit-box",
        WebkitLineClamp: lines,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      };

  return (
    <div className="space-y-1" style={{ minWidth, maxWidth: 480 }}>
      <div
        ref={ref}
        className="whitespace-pre-wrap break-words leading-relaxed text-[12px] text-slate-700"
        style={clampStyle}
        title={safe}
      >
        {safe}
      </div>
      {(overflowing || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-600 hover:text-sky-800 hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

function AttachmentList({
  items, onDownload, onView,
}: {
  items: AttachmentItem[];
  onDownload: (item: AttachmentItem) => void;
  onView: (item: AttachmentItem) => void;
}) {
  if (items.length === 0) return <span className="text-slate-300">—</span>;
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((it, idx) => (
        <div
          key={idx}
          className="group flex items-center gap-2 min-w-0 rounded-md border border-slate-200 bg-white px-2 py-1.5 hover:border-sky-300 hover:bg-sky-50/30 transition-colors"
        >
          <FileTypeBadge name={it.name} />
          <span className="truncate text-[11px] text-slate-700 font-medium flex-1 min-w-0" title={it.name}>{it.name}</span>
          <button
            type="button"
            onClick={() => onView(it)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white hover:border-sky-600 text-[10px] font-semibold transition-colors shrink-0"
            title="Preview file"
          >
            <Eye className="w-3 h-3" /> View
          </button>
          <button
            type="button"
            onClick={() => onDownload(it)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 text-[10px] font-semibold transition-colors shrink-0"
            title="Download (verification code required)"
          >
            <Download className="w-3 h-3" /> Download
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── In-app File Viewer modal ─────────────────────────────────────────── */
function FileViewerModal({
  item, onClose, onDownload,
}: {
  item: AttachmentItem;
  onClose: () => void;
  onDownload: (item: AttachmentItem) => void;
}) {
  const viewUrl = `${BASE}/api/sales-dashboard/file_view?path=${encodeURIComponent(item.path)}&name=${encodeURIComponent(item.name)}`;
  const ext = fileExt(item.name);
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
  const isPdf = ext === "pdf";
  const isOffice = ["xlsx", "xls", "docx", "doc", "pptx", "ppt"].includes(ext);
  const isText = ["txt", "csv", "log", "json", "xml", "md"].includes(ext);
  const canPreview = isImage || isPdf || isOffice || isText;

  // For Office Online viewer we need an absolute, publicly-reachable URL.
  // Microsoft fetches the file from this URL on its servers, so it must be
  // accessible without our cookies / auth.
  const absoluteViewUrl = useMemo(() => {
    if (typeof window === "undefined") return viewUrl;
    try {
      return new URL(viewUrl, window.location.origin).href;
    } catch {
      return viewUrl;
    }
  }, [viewUrl]);

  const officeEmbedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteViewUrl)}`;
  const officeAltUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(absoluteViewUrl)}`;
  const [officeFallback, setOfficeFallback] = useState(false);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white shrink-0">
          <FileTypeBadge name={item.name} />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-slate-900 truncate" title={item.name}>
              {item.name}
            </div>
            <div className="text-[10px] text-slate-500 truncate" title={item.path}>
              {item.path}
            </div>
          </div>
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[11px] font-semibold transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-3 h-3" /> Open in new tab
          </a>
          <button
            type="button"
            onClick={() => onDownload(item)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-semibold transition-colors"
            title="Download (verification required)"
          >
            <Download className="w-3 h-3" /> Download
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 bg-slate-100 relative">
          {canPreview ? (
            isImage ? (
              <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                <img
                  src={viewUrl}
                  alt={item.name}
                  className="max-w-full max-h-full object-contain shadow-lg rounded bg-white"
                />
              </div>
            ) : isOffice ? (
              <>
                <iframe
                  key={officeFallback ? "google" : "office"}
                  src={officeFallback ? officeAltUrl : officeEmbedUrl}
                  title={item.name}
                  className="w-full h-full bg-white"
                />
                <button
                  type="button"
                  onClick={() => setOfficeFallback((v) => !v)}
                  className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/95 backdrop-blur border border-slate-300 text-slate-700 hover:bg-slate-50 text-[11px] font-semibold shadow-md"
                  title="Switch preview engine"
                >
                  <RefreshCw className="w-3 h-3" />
                  {officeFallback ? "Try Microsoft viewer" : "Try Google viewer"}
                </button>
              </>
            ) : (
              <iframe
                src={viewUrl}
                title={item.name}
                className="w-full h-full bg-white"
              />
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mb-4">
                <FileIcon className="w-8 h-8 text-slate-500" />
              </div>
              <div className="text-[14px] font-semibold text-slate-800 mb-1">
                Preview not available
              </div>
              <div className="text-[12px] text-slate-500 mb-4 max-w-md">
                This file type ({ext.toUpperCase() || "unknown"}) cannot be previewed in the browser. Open it in a new tab or download it to view.
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-[12px] font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open in new tab
                </a>
                <button
                  type="button"
                  onClick={() => onDownload(item)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 text-[12px] font-semibold"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── OTP download modal ───────────────────────────────────────────────── */
function OtpDownloadModal({
  item, email, onClose,
}: {
  item: AttachmentItem;
  email: string;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<"sending" | "input" | "verifying">("sending");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const requestOtp = async () => {
    setStage("sending");
    setError(null);
    setInfo(null);
    try {
      const r = await fetch(`${BASE}/api/sales-dashboard/file_otp_request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, path: item.path, name: item.name }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.success) {
        throw new Error(j.message || "Failed to send code");
      }
      setMaskedEmail(j.masked_email || email);
      setInfo(`A 6-digit code was sent to ${j.masked_email || email}.`);
      setStage("input");
    } catch (e: any) {
      setError(e?.message || "Could not send code");
      setStage("input");
    }
  };

  // Auto-trigger send on mount
  useEffect(() => { requestOtp(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

  const verifyAndDownload = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setStage("verifying");
    setError(null);
    try {
      const url =
        `${BASE}/api/sales-dashboard/file_download` +
        `?path=${encodeURIComponent(item.path)}` +
        `&email=${encodeURIComponent(email)}` +
        `&otp=${encodeURIComponent(otp)}` +
        `&name=${encodeURIComponent(item.name)}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({} as any));
        throw new Error(j.error || "Verification failed");
      }
      const blob = await resp.blob();
      const a = document.createElement("a");
      const objUrl = URL.createObjectURL(blob);
      a.href = objUrl;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
      onClose();
    } catch (e: any) {
      setError(e?.message || "Verification failed");
      setStage("input");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-gray-200">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-gray-800">Confirm download</h3>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-400"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-[12px] text-gray-600">
            <div className="mb-1 text-gray-500">File</div>
            <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-gray-800 break-all">
              {item.name}
            </div>
          </div>

          {stage === "sending" && (
            <div className="flex items-center gap-2 text-[12px] text-gray-600 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Sending verification code to your email…
            </div>
          )}

          {stage !== "sending" && (
            <div className="space-y-2">
              {info && (
                <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1.5">
                  {info}
                </div>
              )}
              <label className="block text-[11px] font-semibold text-gray-700">
                Verification code (sent to {maskedEmail || email})
              </label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoFocus
                placeholder="000000"
                className="w-full text-center tracking-[0.5em] font-mono text-lg border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-sky-500"
              />
              {error && (
                <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1.5">
                  {error}
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={requestOtp}
                  className="text-[11px] text-sky-700 hover:underline"
                >
                  Resend code
                </button>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded text-[12px] border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={stage === "verifying" || otp.length !== 6}
                  onClick={verifyAndDownload}
                  className="px-3 py-1.5 rounded text-[12px] bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                >
                  {stage === "verifying" ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" /> Verifying…
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3" /> Verify & download
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export default function LeadFollowUpHistory() {
  const params = useParams<{ name: string }>();
  const [, navigate] = useLocation();
  const leadName = decodeURIComponent(params?.name ?? "");

  const fetchJson = async (url: string) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Failed: ${url}`);
    return r.json();
  };

  // Open leads (used as a primary source for the lead profile if available)
  const q = useQuery<ApiResp>({
    queryKey: ["sales-dashboard", "open_leads"],
    queryFn: () => fetchJson(`${BASE}/api/sales-dashboard/open_leads`),
    staleTime: 60_000,
  });

  const enabled = !!leadName;
  const ln = encodeURIComponent(leadName);

  // Lead remarks / detail – works for any lead, not only "open" ones
  const qRemarks = useQuery<{ total_count: number; data: any[] }>({
    queryKey: ["sales-dashboard", "lead_remarks", leadName],
    queryFn: () => fetchJson(`${BASE}/api/sales-dashboard/lead_remarks?reference_name=${ln}`),
    enabled,
    staleTime: 60_000,
  });

  const qFollowups = useQuery<{ total_count: number; employee_wise_count: any[]; data: any[] }>({
    queryKey: ["sales-dashboard", "followups_by_lead", leadName],
    queryFn: () => fetchJson(`${BASE}/api/sales-dashboard/followups_by_lead?lead_name=${ln}`),
    enabled,
    staleTime: 60_000,
  });

  const qProposals = useQuery<{ lead_id: string; proposal_sent_date: string | null; proposal_count: number; proposals: any[] }>({
    queryKey: ["sales-dashboard", "proposals_by_lead", leadName],
    queryFn: () => fetchJson(`${BASE}/api/sales-dashboard/proposals_by_lead?lead_name=${ln}`),
    enabled,
    staleTime: 60_000,
  });

  const qPropReqs = useQuery<{ total_count: number; data: any[] }>({
    queryKey: ["sales-dashboard", "proposal_requests_by_lead", leadName],
    queryFn: () => fetchJson(`${BASE}/api/sales-dashboard/proposal_requests_by_lead?lead_name=${ln}`),
    enabled,
    staleTime: 60_000,
  });

  const qStartup = useQuery<{ total_count: number; data: any[] }>({
    queryKey: ["sales-dashboard", "startup_sheets_by_lead", leadName],
    queryFn: () => fetchJson(`${BASE}/api/sales-dashboard/startup_sheets_by_lead?lead_name=${ln}`),
    enabled,
    staleTime: 60_000,
  });

  const qCostTools = useQuery<{ total_count: number; data: any[] }>({
    queryKey: ["sales-dashboard", "cost_working_tools_by_lead", leadName],
    queryFn: () => fetchJson(`${BASE}/api/sales-dashboard/cost_working_tools_by_lead?lead_name=${ln}`),
    enabled,
    staleTime: 60_000,
  });

  // Look up the lead owner's user record (avatar + display name)
  const ownerEmail = String((q.data?.data ?? []).find((r: any) => String(r.name ?? "") === leadName)?.lead_owner ?? "")
    || String(qRemarks.data?.data?.[0]?.lead_owner ?? "");
  const ownerSearch = ownerEmail ? ownerEmail.split("@")[0] : "";
  const qOwner = useQuery<{ id: string; name: string; avatar: string | null }[]>({
    queryKey: ["users", "mention", ownerSearch],
    queryFn: () => fetchJson(`${BASE}/api/users/mention?q=${encodeURIComponent(ownerSearch)}`),
    enabled: !!ownerEmail,
    staleTime: 5 * 60_000,
  });
  const ownerUser = useMemo(() => {
    if (!ownerEmail) return null;
    const list = qOwner.data ?? [];
    return list.find((u) => String(u.id ?? "").toLowerCase() === ownerEmail.toLowerCase()) ?? null;
  }, [qOwner.data, ownerEmail]);

  // Build a `lead` profile preferring open_leads, falling back to lead_remarks rows
  const lead: any = useMemo(() => {
    const fromOpen = q.data?.data?.find((r: any) => String(r.name ?? "") === leadName);
    if (fromOpen) return fromOpen;
    const remark = qRemarks.data?.data?.[0];
    if (remark && typeof remark === "object") {
      return {
        name: remark.name ?? remark.lead_id ?? leadName,
        company_name: remark.company_name ?? "",
        email_id: remark.email_id ?? remark.email ?? "",
        contact_no_1: remark.contact_no_1 ?? remark.mobile_number ?? remark.phone ?? "",
        contact_no_2: remark.contact_no_2 ?? "",
        capacity: remark.capacity ?? "",
        requirement: remark.requirement ?? remark.requirements ?? "",
        next_follow_up: (remark.next_follow_up ?? "").toString().slice(0, 10),
        country: remark.country ?? "",
        state: remark.state ?? "",
        city: remark.city ?? "",
        address: remark.address ?? "",
        remarks: remark.remarks ?? remark.notes ?? "",
        lead_owner: remark.lead_owner ?? "",
        lead_status: remark.lead_status ?? remark.status ?? "",
        source: remark.source ?? "",
        industry: remark.industry ?? "",
        designation: remark.designation ?? "",
        contact_person: remark.contact_person ?? remark.poc ?? remark.lead_name ?? "",
        website: remark.website ?? "",
        date: (remark.creation_date ?? remark.creation ?? "").toString().slice(0, 10),
      };
    }
    return null;
  }, [q.data, qRemarks.data, leadName]);

  // True if any per-lead endpoint returned data, even when the profile is missing
  const hasAnyDetailData =
    (qFollowups.data?.total_count ?? 0) > 0 ||
    (qProposals.data?.proposal_count ?? 0) > 0 ||
    (qPropReqs.data?.total_count ?? 0) > 0 ||
    (qStartup.data?.total_count ?? 0) > 0 ||
    (qCostTools.data?.total_count ?? 0) > 0;

  // Render-time lead used in the JSX below: real if present, otherwise a stub
  const displayLead: any = lead ?? (hasAnyDetailData ? { name: leadName } : null);

  // Calls by primary contact number
  const contact = String(lead?.contact_no_1 ?? "").trim();
  const qCalls = useQuery<{ total_count: number; data: any[] }>({
    queryKey: ["sales-dashboard", "call_conversation", contact],
    queryFn: () => fetchJson(`${BASE}/api/sales-dashboard/call_conversation?contact=${encodeURIComponent(contact)}`),
    enabled: !!contact,
    staleTime: 60_000,
  });

  const isLoading = q.isLoading || qRemarks.isLoading;
  const isFetching =
    q.isFetching || qRemarks.isFetching || qFollowups.isFetching ||
    qProposals.isFetching || qPropReqs.isFetching ||
    qStartup.isFetching || qCostTools.isFetching || qCalls.isFetching;

  const refetchAll = () => {
    q.refetch(); qRemarks.refetch(); qFollowups.refetch();
    qProposals.refetch(); qPropReqs.refetch();
    qStartup.refetch(); qCostTools.refetch();
    qCalls.refetch();
  };

  const goBack = () => navigate("/sales-dashboard");

  // ── Download-OTP + File viewer modal state ───────────────────────────
  const { user } = useAuth();
  const [downloadItem, setDownloadItem] = useState<AttachmentItem | null>(null);
  const [viewerItem, setViewerItem] = useState<AttachmentItem | null>(null);
  const openDownload = (it: AttachmentItem) => {
    if (!user?.email) {
      alert("You must be signed in to download attachments.");
      return;
    }
    setDownloadItem(it);
  };
  const openViewer = (it: AttachmentItem) => setViewerItem(it);
  const renderAttachments = (row: any, key: string) => (
    <AttachmentList
      items={(row[key] ?? []) as AttachmentItem[]}
      onDownload={openDownload}
      onView={openViewer}
    />
  );
  const filterAttachments = (row: any, key: string) =>
    ((row[key] ?? []) as AttachmentItem[]).map((a) => a.name).join(" ");

  // ── Library proposals: match by company name ─────────────────────────
  const companyName = String(lead?.company_name ?? "").trim();
  const qLibraryProposals = useQuery<{ proposals: any[]; total: number }>({
    queryKey: ["proposals-library-by-company", companyName],
    queryFn: async () => {
      if (!companyName) return { proposals: [], total: 0 };
      const params = new URLSearchParams({ search: companyName });
      const res = await fetch(`${BASE}/api/proposals?${params}`);
      if (!res.ok) return { proposals: [], total: 0 };
      return res.json();
    },
    enabled: !!companyName,
    staleTime: 60_000,
  });
  const libraryProposalRows = useMemo(() => {
    return (qLibraryProposals.data?.proposals ?? []).map((p: any) => ({
      id: p.id,
      filename: p.filename ?? "",
      number: p.number ?? "—",
      revision: p.revision ?? "—",
      proposalDate: p.proposalDate ?? "—",
      country: p.country ?? "—",
      pageCount: p.pageCount ?? "—",
      hasFile: !!p.hasFile,
    }));
  }, [qLibraryProposals.data]);

  // ── Active tab state (sections are now tabs) ─────────────────────────
  type TabId = "followups" | "proposals" | "proposal_requests" | "startup" | "cost" | "calls" | "library_proposals";
  const [activeTab, setActiveTab] = useState<TabId>("followups");
  const [leadInfoOpen, setLeadInfoOpen] = useState(true);

  // ── Add-remark composer state + mutation ─────────────────────────────
  const queryClient = useQueryClient();
  const [remarkComposerOpen, setRemarkComposerOpen] = useState(false);
  const [remarkDraft, setRemarkDraft] = useState("");
  const [remarkError, setRemarkError] = useState<string | null>(null);
  const saveRemark = useMutation({
    mutationFn: async (text: string) => {
      const targetName = displayLead?.name || ln;
      if (!targetName) throw new Error("Lead reference is missing.");
      const res = await fetch(`${BASE}/api/sales-dashboard/save_lead_remarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_name: targetName,
          remark: text,
          author: user?.full_name || user?.email || "",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to save remark");
      }
      return json;
    },
    onSuccess: () => {
      setRemarkDraft("");
      setRemarkComposerOpen(false);
      setRemarkError(null);
      queryClient.invalidateQueries({ queryKey: ["sales-dashboard", "lead_remarks", leadName] });
      queryClient.invalidateQueries({ queryKey: ["sales-dashboard", "open_leads"] });
    },
    onError: (err: any) => {
      setRemarkError(err?.message || "Could not save remark.");
    },
  });

  // Normalised follow-up rows
  const followupRows = useMemo(() => {
    return (qFollowups.data?.data ?? []).map((f: any) => ({
      date: (f.date ?? f.follow_up_date ?? "").toString().slice(0, 10),
      employee_name: f.employee_name ?? f.employee ?? "",
      representative: f.wtt_representative ?? f.representative ?? f.our_representative ?? "",
      client_representative: f.client_side_representative ?? f.client_representative ?? "",
      mode_of_conversation: f.mode_of_communication ?? f.mode_of_conversation ?? "",
      conversation: f.conversation ?? f.remarks ?? "",
    }));
  }, [qFollowups.data]);

  const proposalRows = useMemo(() => {
    return (qProposals.data?.proposals ?? []).map((p: any) => ({
      remarks: p.remarks ?? p.comments ?? "",
      attachment: normaliseAttachments(p.attachment ?? p.file_url ?? p.attachments),
    }));
  }, [qProposals.data]);

  const proposalReqRows = useMemo(() => {
    return (qPropReqs.data?.data ?? []).map((p: any) => ({
      proposal_request_id: p.name ?? p.proposal_request_id ?? "",
      company_name: p.company_name ?? "",
      email_id: p.e_mail_id ?? p.email_id ?? "",
      phone: p.mobile_number ?? p.phone ?? "",
      capacity: p.plant_capacity_m3day ?? p.capacity ?? "",
      comments: formatComments(p.comments),
      attachments: normaliseAttachments(p.attachments),
    }));
  }, [qPropReqs.data]);

  const startupRows = useMemo(() => {
    return (qStartup.data?.data ?? []).map((s: any) => ({
      startup_sheet_id: s.name ?? s.startup_sheet_id ?? "",
      proposal_request_id: s.proposal_request_id ?? s.proposal_request ?? "",
      project: s.project ?? s.project_name ?? "",
      revision: s.revision ?? "",
      comments: formatComments(s.comments),
      attachments: normaliseAttachments(s.attachments),
    }));
  }, [qStartup.data]);

  const costRows = useMemo(() => {
    const toNum = (n: any): number => {
      if (n === null || n === undefined || n === "") return 0;
      const v = typeof n === "number" ? n : Number(String(n).replace(/[^\d.\-]/g, ""));
      return Number.isFinite(v) ? v : 0;
    };
    return (qCostTools.data?.data ?? []).map((c: any) => {
      const parent = {
        costing_id: c.name ?? c.costing_id ?? "",
        startup_sheet_id: c.startup_sheet_id ?? c.project_startup_sheet ?? "",
        proposal_request_id: c.proposal_request_id ?? "",
        revision: c.revision ?? "",
        attachments: normaliseAttachments(c.attachments),
      };
      const sub = Array.isArray(c.standard_cost) ? c.standard_cost : [];
      let systems: { name: string; inr: any; eur: any; usd: any }[] = [];
      if (sub.length === 0) {
        systems = [{
          name: c.system_name ?? c.system ?? "—",
          inr: c.total_cost_inr ?? c.total_cost ?? "",
          eur: c.total_price_eur ?? "",
          usd: c.total_price_usd ?? "",
        }];
      } else {
        systems = sub.map((s: any) => ({
          name: s.system_name ?? s.system ?? "",
          inr: s.total_cost ?? s.total_cost_inr ?? "",
          eur: s.total_price_eur ?? "",
          usd: s.total_price_usd ?? "",
        }));
      }
      const totalInr = systems.reduce((acc, s) => acc + toNum(s.inr), 0);
      const totalEur = systems.reduce((acc, s) => acc + toNum(s.eur), 0);
      const totalUsd = systems.reduce((acc, s) => acc + toNum(s.usd), 0);
      return { ...parent, systems, totalInr, totalEur, totalUsd };
    });
  }, [qCostTools.data]);

  const callRows = useMemo(() => {
    const apiCalls = (qCalls.data?.data ?? []).map((log: any) => ({
      call_date: log.call_date ?? log.date ?? "",
      extension: log.extension ?? log.phone_number ?? log.contact ?? contact,
      call_type: log.call_type ?? "",
      summary: log.summary ?? log.notes ?? log.call_type ?? "",
    }));
    if (apiCalls.length > 0) return apiCalls;
    if (lead?.remarks) {
      return [{
        call_date: lead.date ?? lead.next_follow_up ?? "—",
        extension: lead.contact_no_1 ?? "—",
        call_type: "Outgoing",
        summary: String(lead.remarks),
      }];
    }
    return [];
  }, [qCalls.data, lead, contact]);

  return (
    <Layout>
      <div className="p-4 space-y-4 w-full">

        {/* ── Toolbar + Header card ── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50">
            <button
              onClick={goBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 hover:border-slate-400 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <div className="h-5 w-px bg-slate-300" />
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Lead Follow-up History</span>
            <div className="flex-1" />
            {isFetching && (
              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline-flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Syncing…
              </span>
            )}
            <button
              onClick={refetchAll}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-slate-600 hover:text-sky-700 bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={cn("w-3 h-3", isFetching && "animate-spin")} />
              Refresh
            </button>
          </div>

          {/* Lead identity strip */}
          <div className="px-5 py-4 bg-gradient-to-br from-white via-sky-50/30 to-white">
            <div className="flex items-start gap-4 flex-wrap">
              {/* Avatar with initials */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white inline-flex items-center justify-center shrink-0 shadow-md ring-2 ring-white">
                {(() => {
                  const src = String(lead?.company_name || leadName || "?").trim();
                  const initials = src
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0]?.toUpperCase() ?? "")
                    .join("") || "•";
                  return <span className="text-[15px] font-bold tracking-wide">{initials}</span>;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-[18px] font-bold text-slate-900 truncate tracking-tight">
                    {lead?.company_name || (isLoading ? "Loading…" : leadName || "Unknown Lead")}
                  </h1>
                  {lead?.lead_status && <StatusPill status={lead.lead_status} />}
                </div>
                <div className="text-[12px] text-slate-500 mt-1 flex items-center gap-x-3 gap-y-1.5 flex-wrap">
                  <span className="font-mono px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-700 font-semibold">
                    {lead?.name || leadName}
                  </span>
                  {lead?.industry && (
                    <span className="inline-flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-slate-400" />
                      <span>{lead.industry}</span>
                    </span>
                  )}
                  {(lead?.city || lead?.state || lead?.country) && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {[lead?.city, lead?.state, lead?.country].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {lead?.email_id && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {lead.email_id}
                    </span>
                  )}
                  {lead?.contact_no_1 && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {lead.contact_no_1}
                    </span>
                  )}
                  {lead?.contact_person && (
                    <span className="inline-flex items-center gap-1">
                      <UserIcon className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-700 font-medium">{lead.contact_person}</span>
                      {lead?.designation && (
                        <span className="text-slate-400">· {lead.designation}</span>
                      )}
                    </span>
                  )}
                  {lead?.website && (
                    <a
                      href={String(lead.website).startsWith("http") ? lead.website : `https://${lead.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 hover:underline"
                    >
                      <Globe className="w-3 h-3" />
                      {String(lead.website).replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  )}
                </div>
              </div>

              {/* Stat cards */}
              <div className="flex items-stretch gap-2 flex-wrap">
                {lead?.lead_owner && (() => {
                  const ownerName = ownerUser?.name || String(lead.lead_owner);
                  const initials = ownerName
                    .split(/[\s@._-]+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((s: string) => s[0]?.toUpperCase() ?? "")
                    .join("") || "?";
                  return (
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                      {ownerUser?.avatar ? (
                        <img
                          src={ownerUser.avatar}
                          alt={ownerName}
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-sky-100 shrink-0"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 inline-flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-sky-100 shrink-0">
                          {initials}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Owner</div>
                        <div className="text-[12px] font-semibold text-slate-800 leading-tight truncate max-w-[160px]" title={ownerName}>
                          {ownerName}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {lead?.next_follow_up && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-amber-200 shadow-sm">
                    <span className="w-7 h-7 rounded-md bg-amber-50 inline-flex items-center justify-center">
                      <CalendarCheck className="w-3.5 h-3.5 text-amber-600" />
                    </span>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-amber-600 font-semibold">Next Followup</div>
                      <div className="text-[12px] font-semibold text-slate-800 leading-tight">{lead.next_follow_up}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-emerald-200 shadow-sm">
                  <span className="w-7 h-7 rounded-md bg-emerald-50 inline-flex items-center justify-center">
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                  </span>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-emerald-600 font-semibold">Activity</div>
                    <div className="text-[12px] font-semibold text-slate-800 leading-tight tabular-nums">{callRows.length} calls</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Loading / Not found states ── */}
        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-[12px] text-slate-500 shadow-sm">
            <RefreshCw className="w-5 h-5 mx-auto mb-3 animate-spin text-sky-500" />
            <div className="font-medium">Loading lead details…</div>
          </div>
        ) : !displayLead ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 inline-flex items-center justify-center">
              <Building2 className="w-6 h-6 text-slate-400" />
            </div>
            <div className="text-[14px] font-semibold text-slate-800 mb-1">Lead not found</div>
            <div className="text-[12px] text-slate-500 mb-4">"{leadName}" is not in the open leads dataset.</div>
            <button
              onClick={goBack}
              className="px-4 py-2 rounded-md text-[12px] font-semibold text-white bg-slate-800 hover:bg-slate-900 transition-colors"
            >
              Back to Sales Dashboard
            </button>
          </div>
        ) : (
          <>
            {/* ── Lead profile + Remarks ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setLeadInfoOpen((o) => !o)}
                  className="w-full px-3 py-1.5 border-b border-slate-200 bg-gradient-to-r from-sky-50/60 via-white to-white flex items-center gap-2 hover:bg-sky-50/50 transition-colors"
                  aria-expanded={leadInfoOpen}
                >
                  <span className="w-5 h-5 rounded bg-sky-100 inline-flex items-center justify-center">
                    <UserIcon className="w-3 h-3 text-sky-700" />
                  </span>
                  <span className="font-semibold text-[11.5px] text-slate-800">Lead Information</span>
                  <span className="text-[9.5px] text-slate-400 font-medium uppercase tracking-wider">
                    {leadInfoOpen ? "Hide" : "Show all"}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 text-slate-500 ml-auto transition-transform",
                      !leadInfoOpen && "-rotate-90",
                    )}
                  />
                </button>
                {leadInfoOpen && (() => {
                  const Mini = ({ label, value, full }: { label: string; value: any; full?: boolean }) => {
                    const v = String(value ?? "").trim();
                    return (
                      <div className={cn("min-w-0 flex flex-col", full && "col-span-2 sm:col-span-3 lg:col-span-6")}>
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 leading-tight">{label}</span>
                        <span className="text-[11.5px] text-slate-800 break-words leading-snug truncate" title={v || undefined}>
                          {v || <span className="text-slate-300">—</span>}
                        </span>
                      </div>
                    );
                  };
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-3 gap-y-1.5 px-3 py-2">
                      <Mini label="Lead ID"        value={displayLead?.name} />
                      <Mini label="Company"        value={displayLead?.company_name} />
                      <Mini label="Industry"       value={displayLead?.industry} />
                      <Mini label="Contact"        value={displayLead?.contact_person} />
                      <Mini label="Designation"    value={displayLead?.designation} />
                      <Mini label="Capacity"       value={displayLead?.capacity} />
                      <Mini label="Email"          value={displayLead?.email_id} />
                      <Mini label="Contact 1"      value={displayLead?.contact_no_1} />
                      <Mini label="Contact 2"      value={displayLead?.contact_no_2} />
                      <Mini label="Website"        value={displayLead?.website} />
                      <Mini label="Source"         value={displayLead?.source} />
                      <Mini label="Lead Owner"     value={displayLead?.lead_owner} />
                      <Mini label="Country"        value={displayLead?.country} />
                      <Mini label="State"          value={displayLead?.state} />
                      <Mini label="City"           value={displayLead?.city} />
                      <Mini label="Created"        value={displayLead?.date} />
                      <Mini label="Next Followup"  value={displayLead?.next_follow_up} />
                      <Mini label="Address"        value={displayLead?.address} full />
                      <Mini label="Requirement"    value={displayLead?.requirement} full />
                    </div>
                  );
                })()}
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-200 bg-gradient-to-r from-amber-50/60 via-white to-white flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-amber-100 inline-flex items-center justify-center">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                    </span>
                    <span className="font-semibold text-[13px] text-slate-800">Remarks</span>
                  </div>
                  {!remarkComposerOpen && (
                    <button
                      type="button"
                      onClick={() => { setRemarkComposerOpen(true); setRemarkError(null); }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-600 text-white text-[11px] font-medium hover:bg-amber-700 active:bg-amber-800 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add Remark
                    </button>
                  )}
                </div>
                <div className="p-5 flex-1 space-y-3">
                  {remarkComposerOpen && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 space-y-2">
                      <textarea
                        value={remarkDraft}
                        onChange={(e) => setRemarkDraft(e.target.value)}
                        placeholder="Type your remark here…"
                        rows={3}
                        autoFocus
                        disabled={saveRemark.isPending}
                        className="w-full text-[13px] text-slate-800 px-3 py-2 rounded-md border border-amber-200 bg-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 resize-y placeholder:text-slate-400 disabled:opacity-60"
                      />
                      {remarkError && (
                        <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1">
                          {remarkError}
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10.5px] text-slate-500">
                          Saving as <span className="font-medium text-slate-700">{user?.full_name || user?.email || "you"}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRemarkComposerOpen(false);
                              setRemarkDraft("");
                              setRemarkError(null);
                            }}
                            disabled={saveRemark.isPending}
                            className="px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const t = remarkDraft.trim();
                              if (!t) { setRemarkError("Please type a remark."); return; }
                              setRemarkError(null);
                              saveRemark.mutate(t);
                            }}
                            disabled={saveRemark.isPending}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-amber-600 text-white text-[11px] font-medium hover:bg-amber-700 active:bg-amber-800 disabled:opacity-60 transition-colors"
                          >
                            {saveRemark.isPending ? (
                              <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
                            ) : (
                              <><Check className="w-3 h-3" /> Save Remark</>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {displayLead?.remarks ? (
                    <div className="text-[13px] text-slate-800 whitespace-pre-wrap leading-relaxed border-l-2 border-amber-300 pl-3 italic bg-amber-50/30 py-2 rounded-r max-h-64 overflow-auto">
                      {String(displayLead.remarks)}
                    </div>
                  ) : !remarkComposerOpen ? (
                    <div className="text-[12px] text-slate-400 italic">No remarks recorded.</div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* ── Tabbed sections ─────────────────────────────────────── */}
            {(() => {
              const tabs: {
                id: TabId;
                label: string;
                icon: React.ElementType;
                count: number;
                sub?: React.ReactNode;
                cols: Col[];
                rows: any[];
                emptyLabel: string;
                rowClassName?: (row: any, index: number) => string | undefined;
                searchPlaceholder?: string;
              }[] = [
                {
                  id: "followups",
                  label: "Follow-ups",
                  icon: Calendar,
                  count: followupRows.length,
                  searchPlaceholder: "Search follow-ups by date, employee, conversation…",
                  cols: [
                    { key: "date",                 label: "Date" },
                    { key: "employee_name",        label: "Employee" },
                    { key: "representative",       label: "Representative" },
                    { key: "client_representative",label: "Client Rep." },
                    { key: "mode_of_conversation", label: "Mode" },
                    {
                      key: "conversation",
                      label: "Conversation",
                      render: (r) => <ClampedText text={String(r.conversation ?? "")} lines={6} minWidth={320} />,
                      filterValue: (r) => String(r.conversation ?? ""),
                    },
                  ],
                  rows: followupRows,
                  emptyLabel: "No follow-up records found.",
                },
                {
                  id: "proposals",
                  label: "Proposals",
                  icon: Send,
                  count: proposalRows.length,
                  searchPlaceholder: "Search proposals by ID, status, remarks…",
                  sub: (
                    <span>
                      Proposal sent:{" "}
                      <span className="text-gray-700 font-medium">
                        {qProposals.data?.proposal_sent_date || "—"}
                      </span>
                    </span>
                  ),
                  cols: [
                    {
                      key: "remarks",
                      label: "Remarks",
                      render: (r) => <ClampedText text={String(r.remarks ?? "")} lines={6} minWidth={340} />,
                      filterValue: (r) => String(r.remarks ?? ""),
                    },
                    {
                      key: "attachment",
                      label: "Attachment",
                      render: (r) => renderAttachments(r, "attachment"),
                      filterValue: (r) => filterAttachments(r, "attachment"),
                    },
                  ],
                  rows: proposalRows,
                  emptyLabel: "No proposals issued for this lead.",
                },
                {
                  id: "library_proposals",
                  label: "Library Proposals",
                  icon: FolderOpen,
                  count: libraryProposalRows.length,
                  searchPlaceholder: "Search library proposals by number, revision, date…",
                  sub: companyName ? (
                    <span>Matched to <span className="font-medium text-gray-700">{companyName}</span> in proposal library</span>
                  ) : undefined,
                  cols: [
                    {
                      key: "number",
                      label: "Proposal No.",
                      render: (r) => (
                        <div className="flex items-center gap-1.5 px-3 py-2">
                          <GitBranch className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                          <span className="font-mono text-xs font-semibold text-indigo-700">{r.number}</span>
                        </div>
                      ),
                      filterValue: (r) => String(r.number),
                      cellClassName: "p-0",
                    },
                    {
                      key: "revision",
                      label: "Rev.",
                      render: (r) => <div className="px-3 py-2 text-xs">{r.revision}</div>,
                      filterValue: (r) => String(r.revision),
                      cellClassName: "p-0",
                    },
                    {
                      key: "proposalDate",
                      label: "Date",
                      render: (r) => <div className="px-3 py-2 text-xs">{r.proposalDate}</div>,
                      filterValue: (r) => String(r.proposalDate),
                      cellClassName: "p-0",
                    },
                    {
                      key: "country",
                      label: "Country",
                      render: (r) => <div className="px-3 py-2 text-xs">{r.country}</div>,
                      filterValue: (r) => String(r.country),
                      cellClassName: "p-0",
                    },
                    {
                      key: "filename",
                      label: "File",
                      render: (r) => (
                        <div className="px-3 py-2 flex items-center gap-2">
                          {r.hasFile ? (
                            <>
                              <a
                                href={`/api/proposals/${r.id}/file`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100"
                              >
                                <Eye className="h-3 w-3" /> View
                              </a>
                              <a
                                href={`/api/proposals/${r.id}/file?download=1`}
                                download={r.filename}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                <Download className="h-3 w-3" /> Download
                              </a>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 italic">no file</span>
                          )}
                        </div>
                      ),
                      filterValue: (r) => String(r.filename),
                      cellClassName: "p-0",
                    },
                  ],
                  rows: libraryProposalRows,
                  emptyLabel: companyName
                    ? `No proposals found in the library for "${companyName}".`
                    : "Company name not available — cannot search library.",
                },
                {
                  id: "proposal_requests",
                  label: "Proposal Requests",
                  icon: ClipboardList,
                  count: proposalReqRows.length,
                  searchPlaceholder: "Search requests by ID, company, capacity, comments…",
                  sub: displayLead?.name ? (
                    <span>
                      Linked to{" "}
                      <span className="text-gray-700 font-medium font-mono">{displayLead.name}</span>
                    </span>
                  ) : undefined,
                  cols: [
                    { key: "proposal_request_id", label: "Request ID" },
                    { key: "company_name",        label: "Company" },
                    { key: "email_id",            label: "Email" },
                    { key: "phone",               label: "Phone" },
                    { key: "capacity",            label: "Capacity" },
                    {
                      key: "comments",
                      label: "Comments",
                      render: (r) => <ClampedText text={String(r.comments ?? "")} lines={8} minWidth={360} />,
                      filterValue: (r) => String(r.comments ?? ""),
                    },
                    {
                      key: "attachments",
                      label: "Files",
                      render: (r) => renderAttachments(r, "attachments"),
                      filterValue: (r) => filterAttachments(r, "attachments"),
                    },
                  ],
                  rows: proposalReqRows,
                  emptyLabel: "No proposal requests on file.",
                },
                {
                  id: "startup",
                  label: "Startup Sheets",
                  icon: Layers,
                  count: startupRows.length,
                  searchPlaceholder: "Search startup sheets by ID, project, status…",
                  cols: [
                    { key: "startup_sheet_id",    label: "Sheet ID" },
                    { key: "proposal_request_id", label: "Request ID" },
                    { key: "project",             label: "Project" },
                    { key: "revision",            label: "Rev." },
                    {
                      key: "comments",
                      label: "Comments",
                      render: (r) => <ClampedText text={String(r.comments ?? "")} lines={8} minWidth={360} />,
                      filterValue: (r) => String(r.comments ?? ""),
                    },
                    {
                      key: "attachments",
                      label: "Files",
                      render: (r) => renderAttachments(r, "attachments"),
                      filterValue: (r) => filterAttachments(r, "attachments"),
                    },
                  ],
                  rows: startupRows,
                  emptyLabel: "No startup sheets created.",
                },
                {
                  id: "cost",
                  label: "Cost Workings",
                  icon: Calculator,
                  count: costRows.length,
                  searchPlaceholder: "Search costings, systems…",
                  cols: [
                    {
                      key: "costing_id",
                      label: "Costing ID",
                      render: (r) => (
                        <div className="px-3 py-2.5">
                          <span className="text-sky-700 font-medium">{r.costing_id || "—"}</span>
                        </div>
                      ),
                      cellClassName: "p-0",
                      filterValue: (r) => String(r.costing_id ?? ""),
                    },
                    {
                      key: "startup_sheet_id",
                      label: "Sheet ID",
                      render: (r) => (
                        <div className="px-3 py-2.5">{r.startup_sheet_id || "—"}</div>
                      ),
                      cellClassName: "p-0",
                      filterValue: (r) => String(r.startup_sheet_id ?? ""),
                    },
                    {
                      key: "proposal_request_id",
                      label: "Req. ID",
                      render: (r) => (
                        <div className="px-3 py-2.5">{r.proposal_request_id || "—"}</div>
                      ),
                      cellClassName: "p-0",
                      filterValue: (r) => String(r.proposal_request_id ?? ""),
                    },
                    {
                      key: "revision",
                      label: "Rev.",
                      render: (r) => (
                        <div className="px-3 py-2.5">{r.revision || "—"}</div>
                      ),
                      cellClassName: "p-0",
                      filterValue: (r) => String(r.revision ?? ""),
                    },
                    {
                      key: "system_name",
                      label: "System",
                      cellClassName: "p-0",
                      render: (r) => (
                        <div className="flex flex-col">
                          {r.systems.map((s: any, i: number) => (
                            <div
                              key={i}
                              className="px-3 py-2 border-b border-slate-100 last:border-b-0"
                            >
                              {s.name || "—"}
                            </div>
                          ))}
                          <div className="px-3 py-2 bg-violet-50 border-t border-violet-200">
                            <span className="inline-flex items-center gap-1.5 text-violet-800 font-semibold tracking-wide uppercase text-[11px]">
                              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                              Total
                            </span>
                          </div>
                        </div>
                      ),
                      filterValue: (r) => r.systems.map((s: any) => s.name).join(" "),
                    },
                    {
                      key: "totalInr",
                      label: "Cost (INR)",
                      cellClassName: "p-0",
                      render: (r) => (
                        <div className="flex flex-col">
                          {r.systems.map((s: any, i: number) => (
                            <div
                              key={i}
                              className="px-3 py-2 border-b border-slate-100 last:border-b-0 text-right tabular-nums"
                            >
                              {fmtNum(s.inr)}
                            </div>
                          ))}
                          <div className="px-3 py-2 bg-violet-50 border-t border-violet-200 flex items-baseline justify-end gap-1.5 tabular-nums">
                            <span className="font-semibold text-slate-900">{fmtNum(r.totalInr)}</span>
                            <span className="text-[10px] font-semibold tracking-wider text-emerald-600">INR</span>
                          </div>
                        </div>
                      ),
                      filterValue: (r) => fmtNum(r.totalInr),
                    },
                    {
                      key: "totalEur",
                      label: "Price (EUR)",
                      cellClassName: "p-0",
                      render: (r) => (
                        <div className="flex flex-col">
                          {r.systems.map((s: any, i: number) => (
                            <div
                              key={i}
                              className="px-3 py-2 border-b border-slate-100 last:border-b-0 text-right tabular-nums"
                            >
                              {fmtNum(s.eur)}
                            </div>
                          ))}
                          <div className="px-3 py-2 bg-violet-50 border-t border-violet-200 flex items-baseline justify-end gap-1.5 tabular-nums">
                            <span className="font-semibold text-slate-900">{fmtNum(r.totalEur)}</span>
                            <span className="text-[10px] font-semibold tracking-wider text-amber-600">EUR</span>
                          </div>
                        </div>
                      ),
                      filterValue: (r) => fmtNum(r.totalEur),
                    },
                    {
                      key: "totalUsd",
                      label: "Price (USD)",
                      cellClassName: "p-0",
                      render: (r) => (
                        <div className="flex flex-col">
                          {r.systems.map((s: any, i: number) => (
                            <div
                              key={i}
                              className="px-3 py-2 border-b border-slate-100 last:border-b-0 text-right tabular-nums"
                            >
                              {fmtNum(s.usd)}
                            </div>
                          ))}
                          <div className="px-3 py-2 bg-violet-50 border-t border-violet-200 flex items-baseline justify-end gap-1.5 tabular-nums">
                            <span className="font-semibold text-slate-900">{fmtNum(r.totalUsd)}</span>
                            <span className="text-[10px] font-semibold tracking-wider text-sky-600">USD</span>
                          </div>
                        </div>
                      ),
                      filterValue: (r) => fmtNum(r.totalUsd),
                    },
                    {
                      key: "attachments",
                      label: "Files",
                      render: (r) => (
                        <div className="px-3 py-2.5">{renderAttachments(r, "attachments")}</div>
                      ),
                      cellClassName: "p-0",
                      filterValue: (r) => filterAttachments(r, "attachments"),
                    },
                  ],
                  rows: costRows,
                  emptyLabel: "No cost workings prepared.",
                },
                {
                  id: "calls",
                  label: "Calls",
                  icon: PhoneCall,
                  count: callRows.length,
                  searchPlaceholder: "Search calls by date, number, summary…",
                  sub: displayLead?.contact_no_1 ? (
                    <span>
                      Contact{" "}
                      <span className="text-gray-700 font-medium">{displayLead.contact_no_1}</span>
                    </span>
                  ) : undefined,
                  cols: [
                    { key: "call_date", label: "Call Date" },
                    { key: "extension", label: "Extension" },
                    { key: "call_type", label: "Type" },
                    {
                      key: "summary",
                      label: "Summary",
                      render: (r) => <ClampedText text={String(r.summary ?? "")} lines={6} minWidth={320} />,
                      filterValue: (r) => String(r.summary ?? ""),
                    },
                  ],
                  rows: callRows,
                  emptyLabel: "No call records yet.",
                },
              ];

              const active = tabs.find((t) => t.id === activeTab) ?? tabs[0]!;
              const ActiveIcon = active.icon;

              return (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  {/* Tab strip */}
                  <div className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
                    <div
                      role="tablist"
                      aria-label="Lead activity sections"
                      className="flex items-stretch overflow-x-auto px-2"
                    >
                      {tabs.map((t) => {
                        const Icon = t.icon;
                        const isActive = t.id === active.id;
                        return (
                          <button
                            key={t.id}
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => setActiveTab(t.id)}
                            className={cn(
                              "group relative inline-flex items-center gap-2 px-4 py-3 text-[12px] font-semibold whitespace-nowrap border-b-2 transition-all",
                              isActive
                                ? "border-sky-600 text-sky-700 bg-white"
                                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-white/70"
                            )}
                          >
                            <Icon className={cn("w-4 h-4 transition-colors", isActive ? "text-sky-600" : "text-slate-400 group-hover:text-slate-600")} />
                            <span>{t.label}</span>
                            <span
                              className={cn(
                                "inline-flex items-center justify-center min-w-[22px] h-[20px] px-1.5 text-[10px] font-bold rounded-full tabular-nums border transition-colors",
                                isActive
                                  ? "bg-sky-600 text-white border-sky-600"
                                  : "bg-slate-100 text-slate-600 border-slate-200 group-hover:bg-slate-200"
                              )}
                            >
                              {t.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active panel header */}
                  <div className="px-4 py-3 flex items-center gap-2 border-b border-slate-100 bg-white">
                    <span className="w-7 h-7 rounded-md bg-sky-50 inline-flex items-center justify-center shrink-0">
                      <ActiveIcon className="w-3.5 h-3.5 text-sky-600" />
                    </span>
                    <span className="font-semibold text-[13px] text-slate-800">{active.label}</span>
                    <span className="text-[10px] font-bold tabular-nums text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
                      {active.count}
                    </span>
                    {active.sub && (
                      <div className="ml-3 text-[11px] text-slate-500">{active.sub}</div>
                    )}
                  </div>

                  {/* Active panel body */}
                  <FilterTable
                    cols={active.cols}
                    rows={active.rows}
                    emptyLabel={active.emptyLabel}
                    rowClassName={active.rowClassName}
                    searchPlaceholder={active.searchPlaceholder}
                  />
                </div>
              );
            })()}
          </>
        )}

        {viewerItem && (
          <FileViewerModal
            item={viewerItem}
            onClose={() => setViewerItem(null)}
            onDownload={(it) => {
              setViewerItem(null);
              openDownload(it);
            }}
          />
        )}

        {downloadItem && user?.email && (
          <OtpDownloadModal
            item={downloadItem}
            email={user.email}
            onClose={() => setDownloadItem(null)}
          />
        )}
      </div>
    </Layout>
  );
}
