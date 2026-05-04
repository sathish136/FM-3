import { Layout } from "@/components/Layout";
import { Panel, OPEN_LEAD_COLS } from "@/pages/SalesDashboard";
import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type DirUser = { id: string; name: string; avatar: string | null };

const COLOR_PALETTE = [
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-indigo-600",
  "from-violet-500 to-fuchsia-600",
  "from-cyan-500 to-blue-600",
  "from-lime-500 to-green-600",
  "from-yellow-500 to-amber-600",
];
function colorFor(s: string): string {
  let h = 0;
  for (let i = 0; i < (s ?? "").length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return COLOR_PALETTE[h % COLOR_PALETTE.length]!;
}
function initialsFor(name: string): string {
  return (
    name
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export default function Leads() {
  const { data, isFetching, refetch } = useQuery<{ total_count: number; data: any[] }>({
    queryKey: ["sales-dashboard", "open_leads"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/sales-dashboard/open_leads`);
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    },
    staleTime: 60_000,
  });
  const total = data?.total_count ?? 0;

  // Fetch the full user directory once so we can resolve lead_owner emails into avatars.
  const { data: users } = useQuery<DirUser[]>({
    queryKey: ["users", "mention", "all", 1000],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/users/mention?q=&limit=1000`);
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    },
    staleTime: 5 * 60_000,
  });

  const userMap = useMemo(() => {
    const m = new Map<string, DirUser>();
    (users ?? []).forEach((u) => m.set(String(u.id ?? "").toLowerCase(), u));
    return m;
  }, [users]);

  // Insert an Owner column right after Lead ID
  const cols = useMemo(() => {
    const next = [...OPEN_LEAD_COLS];
    if (!next.some((c) => c.key === "lead_owner")) {
      next.splice(1, 0, { key: "lead_owner", label: "Owner" });
    }
    return next;
  }, []);

  const renderCell = (col: string, row: any) => {
    if (col === "lead_owner") {
      const email = String(row.lead_owner ?? "").trim();
      if (!email) return <span className="text-slate-300">—</span>;
      const u = userMap.get(email.toLowerCase());
      const display = u?.name || email;
      const initials = initialsFor(display);
      return (
        <div className="flex items-center gap-2 min-w-0">
          {u?.avatar ? (
            <img
              src={u.avatar}
              alt={display}
              title={display}
              className="w-7 h-7 rounded-full object-cover ring-2 ring-white shadow-sm shrink-0"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                img.style.display = "none";
                img.nextElementSibling?.classList.remove("hidden");
              }}
            />
          ) : null}
          <span
            className={cn(
              "w-7 h-7 rounded-full bg-gradient-to-br text-white text-[10px] font-bold inline-flex items-center justify-center ring-2 ring-white shadow-sm shrink-0",
              colorFor(email),
              u?.avatar && "hidden",
            )}
            title={display}
          >
            {initials}
          </span>
          <span className="truncate text-[12.5px] text-slate-700" title={display}>{display}</span>
        </div>
      );
    }
    return undefined;
  };

  return (
    <Layout>
      <div className="p-5 space-y-4 w-full bg-gradient-to-b from-slate-50 to-white min-h-full">
        {/* ── Header ── */}
        <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/60 via-white to-teal-50/40 pointer-events-none" />
          <div className="relative flex items-center justify-between flex-wrap gap-4 px-5 py-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/20">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-900 leading-tight tracking-tight">Open Leads</h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wide">
                    <Sparkles className="w-2.5 h-2.5" /> Live
                  </span>
                </div>
                <p className="text-[12px] text-slate-500 mt-0.5">All currently open sales leads from ERP — click any row to drill in.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-white/70 backdrop-blur border border-emerald-200 px-3.5 py-2 rounded-xl shadow-sm">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="text-[12px] font-semibold text-emerald-700">Total Leads</span>
                <span className="text-base font-extrabold text-emerald-900 tabular-nums">
                  {isFetching && !data ? "…" : total.toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex items-center gap-1.5 text-[12px] text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl hover:bg-blue-100 transition-colors font-semibold shadow-sm disabled:opacity-60"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} /> Refresh
              </button>
            </div>
          </div>
        </div>

        {/* ── Open Leads Table ── */}
        <Panel
          k="open_leads"
          cols={cols}
          renderCell={renderCell}
          height={typeof window !== "undefined" ? window.innerHeight - 200 : 720}
          enableLocationFilter
          enableDetailsView
          size="comfortable"
        />
      </div>
    </Layout>
  );
}
