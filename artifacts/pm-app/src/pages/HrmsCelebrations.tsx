import { Layout } from "@/components/Layout";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Cake, Award, Calendar, RefreshCw, Loader2, Download,
  Sparkles, ChevronLeft, ChevronRight, PartyPopper, Heart, Send, Info, Wand2,
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

const THEME_META: Record<string, { label: string; colors: [string, string] }> = {
  "birthday-confetti":   { label: "Confetti Party",    colors: ["#ff6b9d", "#f8b500"] },
  "birthday-bloom":      { label: "Floral Bloom",       colors: ["#a855f7", "#ec4899"] },
  "birthday-sunset":     { label: "Sunset Glow",        colors: ["#f97316", "#fbbf24"] },
  "birthday-galaxy":     { label: "Galaxy Night",       colors: ["#1a1040", "#7c3aed"] },
  "birthday-tropical":   { label: "Tropical Fiesta",    colors: ["#059669", "#34d399"] },
  "birthday-rose-gold":  { label: "Rose Gold Glam",     colors: ["#e8a0bf", "#c9733a"] },
  "birthday-ocean":      { label: "Ocean Breeze",       colors: ["#0891b2", "#06b6d4"] },
  "birthday-midnight":   { label: "Midnight Spark",     colors: ["#0f172a", "#6366f1"] },
  "anniversary-navy":    { label: "Navy Classic",       colors: ["#1e3a5f", "#fbbf24"] },
  "anniversary-emerald": { label: "Emerald Milestone",  colors: ["#047857", "#fde68a"] },
  "anniversary-royal":   { label: "Royal Gold",         colors: ["#4c1d95", "#fcd34d"] },
  "anniversary-crimson": { label: "Crimson Prestige",   colors: ["#7f1d1d", "#fbbf24"] },
  "anniversary-sapphire":{ label: "Sapphire Elite",     colors: ["#1e3a8a", "#93c5fd"] },
  "anniversary-bronze":  { label: "Bronze Legacy",      colors: ["#78350f", "#fde68a"] },
  "anniversary-midnight":{ label: "Midnight Honor",     colors: ["#0f172a", "#e2e8f0"] },
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

function ThemeSwatch({ themeId, selected, onClick }: { themeId: string; selected: boolean; onClick: () => void }) {
  const meta = THEME_META[themeId];
  if (!meta) return null;
  const [c1, c2] = meta.colors;

  return (
    <button
      type="button"
      onClick={onClick}
      title={meta.label}
      className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all text-left ${
        selected
          ? "border-primary ring-2 ring-primary/30 bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/40 hover:bg-muted/60"
      }`}
    >
      <div
        className="w-8 h-8 rounded-lg shrink-0 shadow-sm"
        style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
      />
      <span className={`text-sm font-medium truncate ${selected ? "text-primary" : "text-foreground"}`}>
        {meta.label}
      </span>
      {selected && (
        <span className="ml-auto shrink-0 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1 4l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      )}
    </button>
  );
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
        className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-white max-w-full"
        style={{ width: 300, aspectRatio: "1080/1350" }}
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
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
      >
        <Download className="w-4 h-4" />
        Download card
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
  const [aiGenerating, setAiGenerating] = useState(false);
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

  const generateAiMessage = async () => {
    if (!selected) return;
    setAiGenerating(true);
    try {
      const d = await apiJson<{ message: string }>("/hrms/celebrations/generate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_name: selected.employee_name,
          name: selected.name,
          kind: selected.kind,
          years_of_service: selected.years_of_service,
          department: selected.department,
          designation: selected.designation,
        }),
      });
      setCustomMessage(d.message);
    } catch (e) {
      console.error("[celebrations] generate message failed:", e);
    } finally {
      setAiGenerating(false);
    }
  };

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
        {/* Header */}
        <div className="bg-card border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-3 w-full flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shrink-0 shadow-md">
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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
              title="Check Raven connection and today's count"
            >
              <Info className="w-4 h-4" />
              Check
            </button>
            <button
              type="button"
              onClick={postAllTodayToRaven}
              disabled={ravenPosting}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-sm"
              title="Post all of today's birthdays & anniversaries"
            >
              {ravenPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Post all today
            </button>
          </div>
          {ravenResult && (
            <p className="text-xs mt-2 text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-lg">
              {ravenResult}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-4">
            {(["today", "month"] as FilterMode[]).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {f === "today" ? "Today" : "This month"}
              </button>
            ))}
            {filter === "month" && (
              <div className="flex items-center gap-1 ml-2 border border-border rounded-lg overflow-hidden bg-card">
                <button
                  type="button"
                  className="p-1.5 hover:bg-muted transition-colors"
                  onClick={() => setMonth(m => (m <= 1 ? 12 : m - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-semibold min-w-[100px] text-center">{monthLabel}</span>
                <button
                  type="button"
                  className="p-1.5 hover:bg-muted transition-colors"
                  onClick={() => setMonth(m => (m >= 12 ? 1 : m + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={load}
              className="ml-auto p-2 rounded-lg border border-border hover:bg-muted transition-colors"
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
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
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
          {/* Left: employee list */}
          <div className="w-80 shrink-0 border-r border-border flex flex-col overflow-hidden bg-card/50">
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
              <div className="overflow-y-auto flex-1 p-2 space-y-0.5">
                {list.map(item => (
                  <button
                    key={`${item.kind}-${item.name}`}
                    type="button"
                    onClick={() => setSelected(item)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      selected?.name === item.name && selected?.kind === item.kind
                        ? "bg-primary/10 ring-1 ring-primary/30 shadow-sm"
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

          {/* Right: editor + preview */}
          <div className="flex-1 overflow-y-auto p-6 bg-muted/20">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground max-w-md mx-auto">
                <Heart className="w-12 h-12 mb-3 text-pink-400/60" />
                <p className="font-medium text-foreground">Select an employee</p>
                <p className="text-sm mt-1">
                  Choose someone from the list to preview and customise their wish card.
                </p>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
                {/* Controls */}
                <div className="flex-1 max-w-sm space-y-5">
                  {/* Employee name + kind badge */}
                  <div className="flex items-center gap-3 pb-1 border-b border-border">
                    <EmpAvatar src={selected.image} name={selected.employee_name} size={48} />
                    <div>
                      <p className="font-bold text-base leading-tight">{selected.employee_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {selected.kind === "birthday" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-pink-600 dark:text-pink-400">
                            <Cake className="w-3.5 h-3.5" /> Birthday
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                            <Award className="w-3.5 h-3.5" /> {selected.years_of_service} Year Anniversary
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Theme picker */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">
                      Wish Theme
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {themeOptions.map(t => (
                        <ThemeSwatch
                          key={t}
                          themeId={t}
                          selected={theme === t}
                          onClick={() => setTheme(t)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Custom message */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                        Message
                      </p>
                      <button
                        type="button"
                        onClick={generateAiMessage}
                        disabled={aiGenerating}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-violet-400/40 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-xs font-medium hover:bg-violet-100 dark:hover:bg-violet-900/50 disabled:opacity-50 transition-colors"
                        title="Generate an AI-crafted personalised message"
                      >
                        {aiGenerating
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Wand2 className="w-3 h-3" />}
                        {aiGenerating ? "Generating…" : "✨ AI Generate"}
                      </button>
                    </div>
                    <textarea
                      value={customMessage}
                      onChange={e => setCustomMessage(e.target.value)}
                      rows={4}
                      placeholder="Leave blank for default wish text, or generate with AI above"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                    />
                  </div>

                  {/* Send to Raven */}
                  <button
                    type="button"
                    onClick={postSelectedToRaven}
                    disabled={ravenOnePosting}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-md"
                  >
                    {ravenOnePosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send this wish to Raven
                  </button>
                </div>

                {/* Card preview */}
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
