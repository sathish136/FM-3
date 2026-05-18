import { Layout } from "@/components/Layout";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Cake, Award, Calendar, RefreshCw, Loader2, Download,
  Sparkles, ChevronLeft, ChevronRight, PartyPopper, Heart, Send, Info,
} from "lucide-react";
import { apiFetch, apiJson } from "@/lib/apiClient";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type CelebrationKind = "birthday" | "anniversary";
type FilterMode = "today" | "month";

interface CelebrationItem {
  name: string;
  employee_name: string;
  department: string | null;
  designation: string | null;
  date_of_joining: string | null;
  date_of_birth: string | null;
  image: string | null;
  celebration_date: string | null;
  years_of_service: number | null;
  kind: CelebrationKind;
  default_theme: string;
}

const THEME_LABELS: Record<string, string> = {
  "birthday-confetti": "Confetti Party",
  "birthday-bloom": "Floral Bloom",
  "birthday-sunset": "Sunset Glow",
  "anniversary-navy": "Navy Classic",
  "anniversary-emerald": "Emerald Milestone",
  "anniversary-royal": "Royal Gold",
};

function formatCelebrationDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function EmpAvatar({ src, name, size = 40 }: { src: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  const initials = name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
  const proxied = src ? `${BASE}/api/hrms/image-proxy?path=${encodeURIComponent(src)}` : null;
  const style = { width: size, height: size, borderRadius: "50%", flexShrink: 0 as const, objectFit: "cover" as const };
  if (!proxied || err) {
    return (
      <div
        style={{
          ...style,
          background: "linear-gradient(135deg,#f472b6,#a855f7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.36,
          fontWeight: 700,
          color: "#fff",
        }}
      >
        {initials || "?"}
      </div>
    );
  }
  return <img src={proxied} alt={name} style={style} onError={() => setErr(true)} />;
}

function WishCardPreview({
  item,
  theme,
  customMessage,
}: {
  item: CelebrationItem;
  theme: string;
  customMessage: string;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setError(null);
    apiFetch("/hrms/celebrations/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee: {
          name: item.name,
          employee_name: item.employee_name,
          department: item.department,
          designation: item.designation,
          date_of_joining: item.date_of_joining,
          date_of_birth: item.date_of_birth,
          image: item.image,
        },
        kind: item.kind,
        theme,
        yearsOfService: item.years_of_service ?? undefined,
        customMessage: customMessage || undefined,
      }),
    })
      .then(async r => {
        if (!r.ok) {
          const t = await r.text();
          try {
            const j = JSON.parse(t) as { error?: string };
            throw new Error(j.error || r.statusText);
          } catch {
            throw new Error(t.slice(0, 120) || r.statusText);
          }
        }
        return r.text();
      })
      .then(html => {
        if (!cancelled) setSvg(html);
      })
      .catch(e => {
        if (!cancelled) setError(e.message ?? "Failed to render");
      });
    return () => { cancelled = true; };
  }, [item, theme, customMessage]);

  const download = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.kind}-${item.employee_name.replace(/\s+/g, "-")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={hostRef}
        className="rounded-2xl overflow-hidden shadow-xl border border-border bg-white max-w-full"
        style={{ width: 320, aspectRatio: "1080/1350" }}
      >
        {error && (
          <div className="flex items-center justify-center h-full text-sm text-rose-600 p-4 text-center">
            {error}
          </div>
        )}
        {!error && !svg && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        {svg && (
          <div
            className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>
      <button
        type="button"
        onClick={download}
        disabled={!svg}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
      >
        <Download className="w-4 h-4" />
        Download wish card
      </button>
    </div>
  );
}

export default function HrmsCelebrations() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [filter, setFilter] = useState<FilterMode>("month");
  const [tab, setTab] = useState<"all" | CelebrationKind>("all");
  const [loading, setLoading] = useState(true);
  const [birthdays, setBirthdays] = useState<CelebrationItem[]>([]);
  const [anniversaries, setAnniversaries] = useState<CelebrationItem[]>([]);
  const [themes, setThemes] = useState<{ birthday: string[]; anniversary: string[] }>({
    birthday: [],
    anniversary: [],
  });
  const [selected, setSelected] = useState<CelebrationItem | null>(null);
  const [theme, setTheme] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [ravenPosting, setRavenPosting] = useState(false);
  const [ravenOnePosting, setRavenOnePosting] = useState(false);
  const [ravenResult, setRavenResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({
        month: String(month),
        filter,
      });
      const d = await apiJson<{
        birthdays?: CelebrationItem[];
        anniversaries?: CelebrationItem[];
        themes?: { birthday: string[]; anniversary: string[] };
      }>(`/hrms/celebrations?${p}`);
      setBirthdays(d.birthdays ?? []);
      setAnniversaries(d.anniversaries ?? []);
      setThemes(d.themes ?? { birthday: [], anniversary: [] });
    } catch (e) {
      console.error("[celebrations] load failed:", e);
      setBirthdays([]);
      setAnniversaries([]);
    } finally {
      setLoading(false);
    }
  }, [month, filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (selected) {
      setTheme(selected.default_theme);
      setCustomMessage("");
    }
  }, [selected]);

  const list =
    tab === "birthday"
      ? birthdays
      : tab === "anniversary"
        ? anniversaries
        : [...birthdays, ...anniversaries].sort((a, b) =>
            a.employee_name.localeCompare(b.employee_name),
          );

  const themeOptions =
    selected?.kind === "anniversary" ? themes.anniversary : themes.birthday;

  const monthLabel = new Date(2000, month - 1, 1).toLocaleString("en", { month: "long" });

  const postAllTodayToRaven = async () => {
    setRavenPosting(true);
    setRavenResult(null);
    try {
      const d = await apiJson<{ posted: number; skipped: number; failed: number }>(
        "/hrms/celebrations/post-raven?force=1",
        { method: "POST" },
      );
      setRavenResult(`Posted ${d.posted} wish(es) to Raven (${d.skipped} skipped, ${d.failed} failed)`);
    } catch (e) {
      setRavenResult(e instanceof Error ? e.message : String(e));
    } finally {
      setRavenPosting(false);
    }
  };

  const checkRavenStatus = async () => {
    setRavenResult(null);
    try {
      const d = await apiJson<{
        channelId?: string;
        todayCount?: number;
        postHour?: number;
        timezone?: string;
        enabled?: boolean;
      }>("/hrms/celebrations/raven-status");
      setRavenResult(
        `Raven OK · channel: ${d.channelId ?? "—"} · today: ${d.todayCount ?? 0} · auto ${d.postHour}:00 ${d.timezone} · enabled: ${d.enabled}`,
      );
    } catch (e) {
      setRavenResult(e instanceof Error ? e.message : String(e));
    }
  };

  const postSelectedToRaven = async () => {
    if (!selected) return;
    setRavenOnePosting(true);
    setRavenResult(null);
    try {
      const d = await apiJson<{ messageId?: string }>("/hrms/celebrations/post-raven-one", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selected,
          theme: theme || selected.default_theme,
          customMessage: customMessage || undefined,
          force: true,
        }),
      });
      if (d.messageId === "skipped") {
        setRavenResult(`${selected.employee_name}: already posted today`);
      } else {
        setRavenResult(`Sent ${selected.employee_name} to Raven ✓`);
      }
    } catch (e) {
      setRavenResult(e instanceof Error ? e.message : String(e));
    } finally {
      setRavenOnePosting(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="bg-card border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-3 w-full flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shrink-0">
              <PartyPopper className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <h1 className="text-lg font-bold text-foreground">Birthdays & Anniversaries</h1>
              <p className="text-xs text-muted-foreground">
                Auto-posts to Raven at 9:00 AM · themed wish cards with photo
              </p>
            </div>
            <button
              type="button"
              onClick={checkRavenStatus}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted"
              title="Check Raven connection and today's count"
            >
              <Info className="w-4 h-4" />
              Check
            </button>
            <button
              type="button"
              onClick={postAllTodayToRaven}
              disabled={ravenPosting}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 disabled:opacity-50"
              title="Post all of today's birthdays & anniversaries"
            >
              {ravenPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Post all today
            </button>
          </div>
          {ravenResult && <p className="text-xs mt-2 text-muted-foreground">{ravenResult}</p>}

          <div className="flex flex-wrap items-center gap-2 mt-4">
            {(["today", "month"] as FilterMode[]).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {f === "today" ? "Today" : "This month"}
              </button>
            ))}
            {filter === "month" && (
              <div className="flex items-center gap-1 ml-2 border border-border rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="p-1.5 hover:bg-muted"
                  onClick={() => setMonth(m => (m <= 1 ? 12 : m - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-semibold min-w-[100px] text-center">{monthLabel}</span>
                <button
                  type="button"
                  className="p-1.5 hover:bg-muted"
                  onClick={() => setMonth(m => (m >= 12 ? 1 : m + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={load}
              className="ml-auto p-2 rounded-lg border border-border hover:bg-muted"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="flex gap-2 mt-3">
            {[
              { id: "all" as const, label: "All", icon: Sparkles, count: birthdays.length + anniversaries.length },
              { id: "birthday" as const, label: "Birthdays", icon: Cake, count: birthdays.length },
              { id: "anniversary" as const, label: "Anniversaries", icon: Award, count: anniversaries.length },
            ].map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                type="button"
                onClick={() => { setTab(id); setSelected(null); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                  tab === id
                    ? id === "birthday"
                      ? "bg-pink-500/15 border-pink-500/40 text-pink-700 dark:text-pink-300"
                      : id === "anniversary"
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-200"
                        : "bg-primary/15 border-primary/40 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                <span className="opacity-70">({count})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="w-96 shrink-0 border-r border-border flex flex-col overflow-hidden bg-card/50">
            {loading ? (
              <div className="flex items-center justify-center flex-1">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : list.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 p-6 text-center text-muted-foreground">
                <Calendar className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-sm">No celebrations for this period.</p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 p-2 space-y-1">
                {list.map(item => (
                  <button
                    key={`${item.kind}-${item.name}`}
                    type="button"
                    onClick={() => setSelected(item)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                      selected?.name === item.name && selected?.kind === item.kind
                        ? "bg-primary/10 ring-1 ring-primary/30"
                        : "hover:bg-muted/80"
                    }`}
                  >
                    <EmpAvatar src={item.image} name={item.employee_name} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{item.employee_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {item.department?.replace(/ - WTT.*$/i, "") || item.designation || "—"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.kind === "birthday" ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-pink-600 dark:text-pink-400 font-medium">
                            <Cake className="w-3 h-3" />
                            {formatCelebrationDate(item.date_of_birth)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                            <Award className="w-3 h-3" />
                            {item.years_of_service} yr · {formatCelebrationDate(item.date_of_joining)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-muted/20">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground max-w-md mx-auto">
                <Heart className="w-12 h-12 mb-3 text-pink-400/60" />
                <p className="font-medium text-foreground">Select an employee</p>
                <p className="text-sm mt-1">
                  Choose someone from the list to preview and download their personalized wish card.
                </p>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
                <div className="flex-1 max-w-md space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Wish theme
                    </label>
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      {themeOptions.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTheme(t)}
                          className={`px-3 py-2 rounded-lg text-sm text-left border transition-colors ${
                            theme === t
                              ? "border-primary bg-primary/10 font-medium"
                              : "border-border hover:bg-muted"
                          }`}
                        >
                          {THEME_LABELS[t] || t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Custom message (optional)
                    </label>
                    <textarea
                      value={customMessage}
                      onChange={e => setCustomMessage(e.target.value)}
                      rows={3}
                      placeholder="Leave blank for default wish text"
                      className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={postSelectedToRaven}
                    disabled={ravenOnePosting}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
                  >
                    {ravenOnePosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send this wish to Raven
                  </button>
                </div>
                <WishCardPreview
                  item={selected}
                  theme={theme || selected.default_theme}
                  customMessage={customMessage}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
