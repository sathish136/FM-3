import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { Activity, Radio, WifiOff, AlertTriangle } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface TagDef {
  id: string;
  label: string;
  unit?: string;
  decimals?: number;
  alarmLow?: number;
  alarmHigh?: number;
  goodLow?: number;
  goodHigh?: number;
}

interface SectionDef {
  title?: string;
  tags: TagDef[];
}

interface SiteDef {
  id: string;
  name: string;
  sections: SectionDef[];
}

interface TagValue {
  value: number | null;
  timestamp: number;
  source: string;
  status: "normal" | "good" | "alarm" | "offline";
}

type ValuesMap = Record<string, TagValue>;

// Systems shown in this order
const SYSTEM_ORDER = [
  "Biological", "CTS", "MBR", "Main RO", "RO", "Reject RO", "UF", "DEC", "SF", "NF",
];

const SYSTEM_COLORS: Record<string, { accent: string; headerBg: string; headerText: string; rowAlt: string; border: string }> = {
  "Biological": { accent: "#10b981", headerBg: "#052e16", headerText: "#6ee7b7", rowAlt: "#0a1f13", border: "#166534" },
  "CTS":        { accent: "#38bdf8", headerBg: "#082f49", headerText: "#7dd3fc", rowAlt: "#0c1e2e", border: "#0c4a6e" },
  "MBR":        { accent: "#a78bfa", headerBg: "#2e1065", headerText: "#c4b5fd", rowAlt: "#1a0e38", border: "#4c1d95" },
  "RO":         { accent: "#60a5fa", headerBg: "#1e3a5f", headerText: "#93c5fd", rowAlt: "#0f1f33", border: "#1e40af" },
  "Main RO":    { accent: "#60a5fa", headerBg: "#1e3a5f", headerText: "#93c5fd", rowAlt: "#0f1f33", border: "#1e40af" },
  "Reject RO":  { accent: "#fb923c", headerBg: "#431407", headerText: "#fdba74", rowAlt: "#1f0d04", border: "#9a3412" },
  "UF":         { accent: "#22d3ee", headerBg: "#083344", headerText: "#67e8f9", rowAlt: "#071f28", border: "#0e7490" },
};

const DEFAULT_COLOR = { accent: "#94a3b8", headerBg: "#1e293b", headerText: "#cbd5e1", rowAlt: "#0f172a", border: "#334155" };

function getColor(sys: string) {
  return SYSTEM_COLORS[sys] ?? DEFAULT_COLOR;
}

function getSystemNames(sites: SiteDef[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const sys of SYSTEM_ORDER) {
    for (const site of sites)
      for (const sec of site.sections)
        if ((sec.title ?? "") === sys && !seen.has(sys)) { seen.add(sys); result.push(sys); }
  }
  for (const site of sites)
    for (const sec of site.sections) {
      const t = sec.title ?? "(General)";
      if (!seen.has(t)) { seen.add(t); result.push(t); }
    }
  return result;
}

function getSitesBySystem(sysName: string, sites: SiteDef[]): { site: SiteDef; section: SectionDef }[] {
  const result: { site: SiteDef; section: SectionDef }[] = [];
  for (const site of sites)
    for (const sec of site.sections)
      if ((sec.title ?? "(General)") === sysName)
        result.push({ site, section: sec });
  return result;
}

// Collect all unique parameter labels across all sections of a system
function getSystemTags(entries: { site: SiteDef; section: SectionDef }[]): TagDef[] {
  const seen = new Set<string>();
  const tags: TagDef[] = [];
  for (const { section } of entries)
    for (const tag of section.tags)
      if (!seen.has(tag.label)) { seen.add(tag.label); tags.push(tag); }
  return tags;
}

// Find the tag in a section matching a label
function findTag(section: SectionDef, label: string): TagDef | undefined {
  return section.tags.find(t => t.label === label);
}

function valueColor(status: TagValue["status"] | undefined) {
  if (status === "alarm")   return "#f87171";
  if (status === "good")    return "#34d399";
  if (status === "offline") return "#374151";
  return "#e2e8f0";
}

function statusDotColor(status: TagValue["status"] | undefined) {
  if (status === "alarm")   return "#ef4444";
  if (status === "good")    return "#10b981";
  if (status === "offline") return "#374151";
  return "#f59e0b";
}

function SystemTable({
  sysName,
  entries,
  values,
}: {
  sysName: string;
  entries: { site: SiteDef; section: SectionDef }[];
  values: ValuesMap;
}) {
  const col = getColor(sysName);
  const tags = getSystemTags(entries);
  const alarmSites = entries.filter(({ section }) =>
    section.tags.some(t => values[t.id]?.status === "alarm")
  ).length;

  return (
    <div style={{ border: `1px solid ${col.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
      {/* System header */}
      <div style={{ background: col.headerBg, padding: "8px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: col.accent, display: "inline-block", flexShrink: 0 }} />
        <span style={{ color: col.headerText, fontWeight: 900, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {sysName}
        </span>
        <span style={{ color: col.accent, fontSize: 10, fontWeight: 700, opacity: 0.8 }}>
          {entries.length} site{entries.length !== 1 ? "s" : ""}
        </span>
        {alarmSites > 0 && (
          <span style={{ marginLeft: "auto", color: "#f87171", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            ⚠ {alarmSites} alarm
          </span>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", background: "#0d1117" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {/* Parameter column header */}
              <th style={{
                textAlign: "left", padding: "7px 12px",
                color: "#64748b", fontWeight: 700, fontSize: 10,
                textTransform: "uppercase", letterSpacing: "0.05em",
                borderBottom: `1px solid ${col.border}`,
                background: "#0d1117",
                minWidth: 130, width: 140,
              }}>
                Parameter
              </th>
              {entries.map(({ site }) => {
                const hasAlarm = entries.find(e => e.site.id === site.id)?.section.tags.some(
                  t => values[t.id]?.status === "alarm"
                );
                return (
                  <th key={site.id} style={{
                    textAlign: "center", padding: "7px 10px",
                    color: hasAlarm ? "#f87171" : col.headerText,
                    fontWeight: 800, fontSize: 11,
                    borderBottom: `1px solid ${col.border}`,
                    borderLeft: `1px solid ${col.border}`,
                    background: hasAlarm ? "#1f0505" : col.headerBg,
                    whiteSpace: "nowrap",
                    minWidth: 110,
                  }}>
                    {hasAlarm && <span style={{ marginRight: 4 }}>⚠</span>}
                    {site.name}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {tags.map((tag, i) => (
              <tr key={tag.id} style={{ background: i % 2 === 1 ? col.rowAlt : "transparent" }}>
                {/* Parameter label */}
                <td style={{
                  padding: "6px 12px",
                  color: "#94a3b8",
                  fontWeight: 600,
                  fontSize: 11,
                  borderBottom: `1px solid ${col.border}22`,
                  whiteSpace: "nowrap",
                }}>
                  {tag.label}
                  {tag.unit && <span style={{ color: "#475569", marginLeft: 3, fontSize: 9 }}>({tag.unit})</span>}
                </td>
                {/* Values per site */}
                {entries.map(({ site, section }) => {
                  const matchTag = findTag(section, tag.label);
                  const v = matchTag ? values[matchTag.id] : undefined;
                  const val = v?.value;
                  const status = v?.status;
                  const displayVal = val !== null && val !== undefined
                    ? val.toFixed(matchTag?.decimals ?? 1)
                    : "—";

                  return (
                    <td key={site.id} style={{
                      padding: "6px 10px",
                      textAlign: "center",
                      borderBottom: `1px solid ${col.border}22`,
                      borderLeft: `1px solid ${col.border}33`,
                      background: status === "alarm" ? "#2d0808" : undefined,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: statusDotColor(status),
                          display: "inline-block", flexShrink: 0,
                          animation: status === "alarm" ? "pulse 1s infinite" : undefined,
                        }} />
                        <span style={{
                          color: valueColor(status),
                          fontWeight: 700,
                          fontFamily: "monospace",
                          fontSize: 13,
                        }}>
                          {displayVal}
                          {matchTag?.unit && val !== null && val !== undefined
                            ? <span style={{ color: "#475569", fontSize: 9, marginLeft: 2 }}>{matchTag.unit}</span>
                            : null}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PlantOverview() {
  const [sites, setSites] = useState<SiteDef[]>([]);
  const [values, setValues] = useState<ValuesMap>({});
  const [connected, setConnected] = useState(false);
  const [isSimulated, setIsSimulated] = useState(true);
  const [pushCount, setPushCount] = useState(0);
  const [secAgo, setSecAgo] = useState(0);
  const lastPushAt = useRef<number>(Date.now());

  useEffect(() => {
    fetch(`${BASE}/api/site-data/config`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.sites) setSites(data.sites); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const es = new EventSource(`${BASE}/api/site-data/stream`);
    es.addEventListener("values", (e) => {
      try {
        const data = JSON.parse(e.data);
        setValues(data.values ?? {});
        setIsSimulated(data.isSimulated ?? true);
        setPushCount(c => c + 1);
        lastPushAt.current = Date.now();
        setSecAgo(0);
      } catch {}
    });
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    return () => { es.close(); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setSecAgo(Math.round((Date.now() - lastPushAt.current) / 1000));
    }, 500);
    return () => clearInterval(t);
  }, []);

  const systemNames = getSystemNames(sites);

  const totalAlarms = Object.values(values).filter(v => v.status === "alarm").length;

  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "#0d1117" }}>
        {/* Header */}
        <div style={{ borderBottom: "1px solid #1e293b", padding: "10px 16px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Activity style={{ width: 16, height: 16, color: "#22d3ee" }} />
            <span style={{ color: "#f1f5f9", fontWeight: 900, fontSize: 14, letterSpacing: "0.05em" }}>SYSTEM OVERVIEW</span>
            {isSimulated && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 99, background: "#78350f33", border: "1px solid #92400e88", color: "#fbbf24", letterSpacing: "0.06em" }}>
                SIMULATED
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, marginLeft: "auto" }}>
            {connected
              ? <Radio style={{ width: 13, height: 13, color: "#22d3ee" }} />
              : <WifiOff style={{ width: 13, height: 13, color: "#475569" }} />}
            <span style={{ color: connected ? "#22d3ee" : "#475569", fontWeight: 700 }}>
              {connected ? "LIVE" : "Connecting…"}
            </span>
            <span style={{ color: "#334155" }}>·</span>
            <span style={{ color: "#64748b" }}>#{pushCount} · {secAgo}s ago</span>
            {totalAlarms > 0 && (
              <>
                <span style={{ color: "#334155" }}>·</span>
                <span style={{ color: "#f87171", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                  <AlertTriangle style={{ width: 12, height: 12 }} /> {totalAlarms} alarms
                </span>
              </>
            )}
          </div>
        </div>

        {/* Tables */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
          {sites.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "#475569", fontSize: 13 }}>
              Loading site configuration…
            </div>
          ) : (
            systemNames.map(sysName => {
              const entries = getSitesBySystem(sysName, sites);
              if (entries.length === 0) return null;
              return (
                <SystemTable
                  key={sysName}
                  sysName={sysName}
                  entries={entries}
                  values={values}
                />
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
