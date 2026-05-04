// Auto-detect water-treatment plant schemas from a list of column names.
// Supports MBR (skid-based) and RO / Reject-RO (stage-based) layouts.

export type SkidConfig = {
  id: string;
  index: number;
  name: string;
  flow?: string;
  tmp?: string;            // MBR only — trans-membrane pressure
  pressure?: string;       // MBR only — generic stage pressure
  level?: string;
  totalizer?: string;
  totalizerDay?: string;
  bwTotalizer?: string;    // MBR only
  bwTotalizerDay?: string; // MBR only
  runHours?: string;
  // RO-stage extensions
  dp?: string;             // differential pressure across the stage
  inPressure?: string;     // stage inlet pressure
  outPressure?: string;    // stage outlet pressure
  recovery?: string;       // per-stage recovery %
};

export type FeedConfig = {
  flow?: string;
  level?: string;
  ph?: string;
  totalizer?: string;
  totalizerDay?: string;
};

export type BioConfig = { do?: string };

export type OverallConfig = {
  dayNet?: string;
  totalNet?: string;
  rpm?: string;
  recovery?: string;       // overall plant recovery (RO)
  runningTime?: string;    // cumulative plant run time (RO)
};

export type PlantSchema = {
  type: "mbr" | "ro" | "ro_reject" | "generic";
  typeLabel: string;
  unitLabel: string;       // "Skid" for MBR, "Stage" for RO / Reject-RO
  skids: SkidConfig[];
  feed: FeedConfig;
  bio: BioConfig;
  overall: OverallConfig;
  unmapped: string[];
};

const norm = (s: string) => s.toLowerCase();

function pickFirst(tags: string[], patterns: RegExp[]): string | undefined {
  for (const p of patterns) {
    const hit = tags.find((t) => p.test(norm(t)));
    if (hit) return hit;
  }
  return undefined;
}

// ──────────────────────────────────────────────────────────────────────
// Ordinal handling for stage tags like ro_1st_stg_fm, rej_2nd_stg_in
// ──────────────────────────────────────────────────────────────────────
const ORDINAL_TO_NUM: Record<string, number> = {
  "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "5th": 5,
  "6th": 6, "7th": 7, "8th": 8, "9th": 9, "10th": 10,
  "11th": 11, "12th": 12,
};
const NUM_TO_ORDINAL: Record<number, string> = Object.fromEntries(
  Object.entries(ORDINAL_TO_NUM).map(([k, v]) => [v, k]),
);
const ORD_ALT = Object.keys(ORDINAL_TO_NUM).join("|");

// ──────────────────────────────────────────────────────────────────────
// MBR (skid-based) detection — original logic preserved.
// ──────────────────────────────────────────────────────────────────────
function detectSkidIndices(tags: string[]): number[] {
  const found = new Set<number>();
  for (const t of tags) {
    const n = norm(t);
    const m =
      n.match(/(?:skid|sk|mbr|train|stream|line|stage|stg|membrane|mem)_?(\d+)/) ||
      n.match(/(?:tank)_?(\d+)/);
    if (m) {
      const idx = parseInt(m[1], 10);
      if (idx > 0 && idx < 50) found.add(idx);
    }
  }
  return [...found].sort((a, b) => a - b);
}

function findSkidTag(
  tags: string[],
  index: number,
  metric: "flow" | "tmp" | "pressure" | "level" | "totalizer" | "totalizerDay" | "bwTotalizer" | "bwTotalizerDay" | "runHours",
): string | undefined {
  const i = index.toString();
  const skidPart = `(?:skid_?${i}|sk_?${i}|mbr_?tank_?${i}|mbr_?${i}|train_?${i}|stream_?${i}|line_?${i}|stage_?${i}|stg_?${i})`;

  const metricPats: Record<string, RegExp[]> = {
    flow: [
      new RegExp(`^${skidPart}_?(?:fm|flow|flowrate|flow_rate)$`),
      new RegExp(`^${skidPart}_(?:fm|flow)`),
      new RegExp(`(?:fm|flow|flowrate)_?${skidPart}$`),
    ],
    tmp: [
      new RegExp(`^${skidPart}_?(?:tmp|trans_?membrane(?:_pressure)?)$`),
      new RegExp(`^${skidPart}_tmp`),
      new RegExp(`tmp_?${skidPart}$`),
    ],
    pressure: [
      new RegExp(`^${skidPart}_?(?:pt|press|pressure)$`),
      new RegExp(`^${skidPart}_(?:pt|press|pressure)`),
      new RegExp(`(?:pt|press|pressure)_?${skidPart}$`),
    ],
    level: [
      new RegExp(`^${skidPart}_?(?:lt|lvl|level)$`),
      new RegExp(`^${skidPart}_(?:lt|lvl|level)`),
      new RegExp(`(?:lt|lvl|level)_?${skidPart}$`),
    ],
    bwTotalizerDay: [
      new RegExp(`^${skidPart}_total_(?:fm|flow)_bw_day$`),
      new RegExp(`^${skidPart}_(?:bw|backwash)_(?:total|totalizer).*day$`),
      new RegExp(`${skidPart}.*bw.*day$`),
    ],
    bwTotalizer: [
      new RegExp(`^${skidPart}_total_(?:fm|flow)_bw$`),
      new RegExp(`^${skidPart}_(?:bw|backwash)_(?:total|totalizer)$`),
      new RegExp(`${skidPart}.*(?:bw|backwash)$`),
    ],
    totalizerDay: [
      new RegExp(`^${skidPart}_total_(?:fm|flow)_day$`),
      new RegExp(`^${skidPart}_(?:total|totalizer).*day$`),
      new RegExp(`${skidPart}.*total.*day$`),
    ],
    totalizer: [
      new RegExp(`^${skidPart}_total_(?:fm|flow)$`),
      new RegExp(`^${skidPart}_(?:total|totalizer)$`),
      new RegExp(`${skidPart}.*(?:total|totalizer)$`),
    ],
    runHours: [
      new RegExp(`^${skidPart}_(?:total_)?(?:time|run_?hours|run_?time|hrs|hours)$`),
      new RegExp(`${skidPart}_total_time$`),
    ],
  };

  return pickFirst(tags, metricPats[metric]);
}

function detectSkid(tags: string[], idx: number): SkidConfig {
  return {
    id: `skid${idx}`,
    index: idx,
    name: `Skid ${idx}`,
    flow: findSkidTag(tags, idx, "flow"),
    tmp: findSkidTag(tags, idx, "tmp"),
    pressure: findSkidTag(tags, idx, "pressure"),
    level: findSkidTag(tags, idx, "level"),
    bwTotalizerDay: findSkidTag(tags, idx, "bwTotalizerDay"),
    bwTotalizer: findSkidTag(tags, idx, "bwTotalizer"),
    totalizerDay: findSkidTag(tags, idx, "totalizerDay"),
    totalizer: findSkidTag(tags, idx, "totalizer"),
    runHours: findSkidTag(tags, idx, "runHours"),
  };
}

function detectFeed(tags: string[]): FeedConfig {
  const isFeedScope = (t: string) => /^(nt|feed|inlet|raw|eq|equal|inflow|in_)_/.test(norm(t)) || /^nt_/.test(norm(t));
  const feedTags = tags.filter(isFeedScope);
  return {
    flow: pickFirst(feedTags, [/_(fm|flow)$/, /_(fm|flow)_/]),
    level: pickFirst(feedTags, [/_(lt|lvl|level)$/]),
    ph: pickFirst(feedTags, [/_ph$/, /_(p_?h)$/]),
    totalizer: pickFirst(feedTags, [/_total_(fm|flow)$/, /_total$/, /_total_(fm|flow)_overall$/]),
    totalizerDay: pickFirst(feedTags, [/_total_(fm|flow)_day$/, /_(total|totalizer).*day$/]),
  };
}

function detectBio(tags: string[]): BioConfig {
  return { do: pickFirst(tags, [/^bio_?do$/, /^do$/, /_do$/, /dissolved_?oxygen/]) };
}

function detectOverall(tags: string[], skidCount: number): OverallConfig {
  return {
    dayNet: pickFirst(tags, [
      /(?:overall|all_?skids?|combined|net).*day.*(?:net|value|total)$/,
      /(?:day|daily).*(?:net_?value|net_?total|production)$/,
      new RegExp(`mbr.*${skidCount}.*(?:skid|skides).*day.*(?:net|value)`),
    ]),
    totalNet: pickFirst(tags, [
      /(?:overall|all_?skids?).*(?:net_?value|net_?total)$/,
      new RegExp(`mbr.*${skidCount}_?skid.*(?:net|overall)`),
    ]),
    rpm: pickFirst(tags, [/^rpm$/, /_rpm$/, /pump.*rpm/]),
  };
}

// ──────────────────────────────────────────────────────────────────────
// RO / Reject-RO (stage-based) detection.
//
// Tag conventions handled:
//   ro_1st_stg_fm | _in | _out | _dp        — per-stage instrument
//   ro_1st_reco                              — per-stage recovery
//   ro_stg1_tot_fm | ro_stg1_tot_fm_day      — per-stage totalizer
//   ro_feed | ro_feed_lt | ro_feed_ph        — common feed
//   ro_feed_tot_fm | ro_feed_tot_fm_day      — feed totalizer
//   ro_reco | ro_running_time                — overall
//
// Reject-RO swaps the prefix:
//   rej_<ord>_stg_(fm|in|out)  rej_<ord>_db  rej_<ord>_reco
//   r_ro_stg<n>_tot_fm[_day]   r_ro_feed_tot_fm[_day]   rro_total_running_time
// ──────────────────────────────────────────────────────────────────────
type RoPrefix = "ro" | "rej";
type RoConfig = { stagePrefix: string; totPrefix: string };

const RO_CFG: Record<RoPrefix, RoConfig> = {
  ro:  { stagePrefix: "ro",  totPrefix: "ro" },
  rej: { stagePrefix: "rej", totPrefix: "r_ro" },
};

function detectRoStageIndices(tags: string[], prefix: RoPrefix): number[] {
  const found = new Set<number>();
  const cfg = RO_CFG[prefix];
  const stageRe = new RegExp(`^${cfg.stagePrefix}_(${ORD_ALT})_(?:stg|stage)_(?:fm|in|out|dp|db)$`);
  const recoRe  = new RegExp(`^${cfg.stagePrefix}_(${ORD_ALT})_(?:reco|recovery|dp|db)$`);
  const totRe   = new RegExp(`^${cfg.totPrefix}_stg(\\d+)_tot_(?:fm|flow)(?:_day)?$`);
  for (const t of tags) {
    const n = norm(t);
    let m = n.match(stageRe);
    if (m) { found.add(ORDINAL_TO_NUM[m[1]]); continue; }
    m = n.match(recoRe);
    if (m) { found.add(ORDINAL_TO_NUM[m[1]]); continue; }
    m = n.match(totRe);
    if (m) {
      const idx = parseInt(m[1], 10);
      if (idx > 0 && idx < 50) found.add(idx);
    }
  }
  return [...found].sort((a, b) => a - b);
}

function detectRoStage(tags: string[], idx: number, prefix: RoPrefix): SkidConfig {
  const cfg = RO_CFG[prefix];
  const ord = NUM_TO_ORDINAL[idx];
  const sp = cfg.stagePrefix;
  const tp = cfg.totPrefix;

  const find = (re: RegExp) => tags.find(t => re.test(norm(t)));

  // Per-stage instruments (the ordinal forms — only present if ord is known)
  const ordPart = ord ? `(?:${idx}|${ord})` : `${idx}`;

  const flow         = find(new RegExp(`^${sp}_${ordPart}_(?:stg|stage)_(?:fm|flow)$`));
  const inPressure   = find(new RegExp(`^${sp}_${ordPart}_(?:stg|stage)_in$`));
  const outPressure  = find(new RegExp(`^${sp}_${ordPart}_(?:stg|stage)_out$`));
  const dp           = find(new RegExp(`^${sp}_${ordPart}_(?:(?:stg|stage)_)?(?:dp|db)$`));
  const recovery     = find(new RegExp(`^${sp}_${ordPart}_(?:reco|recovery)$`));
  const totalizer    = find(new RegExp(`^${tp}_stg${idx}_tot_(?:fm|flow)$`));
  const totalizerDay = find(new RegExp(`^${tp}_stg${idx}_tot_(?:fm|flow)_day$`));

  return {
    id: `stage${idx}`,
    index: idx,
    name: `Stage ${idx}`,
    flow,
    inPressure,
    outPressure,
    dp,
    recovery,
    totalizer,
    totalizerDay,
  };
}

function detectRoFeed(tags: string[], prefix: RoPrefix): FeedConfig {
  const cfg = RO_CFG[prefix];
  const sp = cfg.stagePrefix;
  const tp = cfg.totPrefix;
  const find = (re: RegExp) => tags.find(t => re.test(norm(t)));

  return {
    flow:         find(new RegExp(`^${sp}_feed$`)),
    level:        find(new RegExp(`^${sp}_feed_(?:lt|lvl|level)$`)),
    ph:           find(new RegExp(`^${sp}_(?:feed_)?ph(?:_out)?$`)) ||
                  find(new RegExp(`^${sp}_ph_out$`)) ||
                  find(/^ph_out$/),
    totalizer:    find(new RegExp(`^${tp}_feed_tot_(?:fm|flow)$`)),
    totalizerDay: find(new RegExp(`^${tp}_feed_tot_(?:fm|flow)_day$`)),
  };
}

function detectRoOverall(tags: string[], prefix: RoPrefix): OverallConfig {
  const cfg = RO_CFG[prefix];
  const sp = cfg.stagePrefix;
  const find = (re: RegExp) => tags.find(t => re.test(norm(t)));

  return {
    recovery:    find(new RegExp(`^${sp}_(?:reco|recovery)$`)),
    runningTime: find(new RegExp(`^${sp}_(?:running|run|total)_time$`)) ||
                 find(/^rro_total_running_time$/) ||
                 find(/_running_time$/),
  };
}

// ──────────────────────────────────────────────────────────────────────
// Plant-type detection
// ──────────────────────────────────────────────────────────────────────
function detectType(tags: string[]): { type: PlantSchema["type"]; label: string; unitLabel: string } {
  const lc = tags.map(norm);
  const all = lc.join(" ");

  const rejStageHits = lc.filter(t =>
    /^rej_(?:1st|2nd|3rd|4th|5th|6th|7th|8th)_/.test(t) ||
    /^r_ro_stg\d+_tot/.test(t) ||
    /^rej_recovery$/.test(t) ||
    /^rej_feed/.test(t)
  ).length;

  const roStageHits = lc.filter(t =>
    /^ro_(?:1st|2nd|3rd|4th|5th|6th|7th|8th)_/.test(t) ||
    /^ro_stg\d+_tot/.test(t) ||
    /^ro_reco$/.test(t) ||
    /^ro_feed/.test(t)
  ).length;

  // Reject-RO wins if it has more reject-prefixed stage tags than RO ones
  if (rejStageHits >= 4 && rejStageHits >= roStageHits) {
    return { type: "ro_reject", label: "Reject RO Plant", unitLabel: "Stage" };
  }
  if (roStageHits >= 4) {
    return { type: "ro", label: "RO Plant", unitLabel: "Stage" };
  }

  if (/\b(mbr|membrane|biofilter|bio_?do|bio_?reactor)\b/.test(all)) {
    return { type: "mbr", label: "MBR Plant", unitLabel: "Skid" };
  }
  if (/\b(reco|recovery|permeate|reject|membrane.*ro|ro_)\b/.test(all)) {
    return { type: "ro", label: "RO Plant", unitLabel: "Stage" };
  }
  return { type: "generic", label: "Process Plant", unitLabel: "Skid" };
}

// ──────────────────────────────────────────────────────────────────────
export function detectPlantSchema(rawTags: string[]): PlantSchema {
  const tags = rawTags.filter(Boolean);
  const { type, label, unitLabel } = detectType(tags);

  let skids: SkidConfig[] = [];
  let feed: FeedConfig;
  let bio: BioConfig;
  let overall: OverallConfig;

  if (type === "ro" || type === "ro_reject") {
    const prefix: RoPrefix = type === "ro_reject" ? "rej" : "ro";
    const idx = detectRoStageIndices(tags, prefix);
    const all = idx.map(i => detectRoStage(tags, i, prefix));
    // Keep only stages that have at least one mapped instrument
    skids = all.filter(s =>
      s.flow || s.inPressure || s.outPressure || s.dp || s.recovery || s.totalizer || s.totalizerDay,
    );
    feed = detectRoFeed(tags, prefix);
    bio = {};
    overall = detectRoOverall(tags, prefix);
  } else {
    const skidIdx = detectSkidIndices(tags);
    const all = skidIdx.map(i => detectSkid(tags, i));
    skids = all.filter(
      s => s.flow || s.tmp || s.pressure || s.level || s.totalizer || s.runHours,
    );
    feed = detectFeed(tags);
    bio = detectBio(tags);
    overall = detectOverall(tags, skids.length);
  }

  // Compute unmapped tags (anything not used above)
  const used = new Set<string>();
  skids.forEach(s => {
    [
      s.flow, s.tmp, s.pressure, s.level, s.totalizer, s.totalizerDay,
      s.bwTotalizer, s.bwTotalizerDay, s.runHours,
      s.dp, s.inPressure, s.outPressure, s.recovery,
    ].forEach(v => v && used.add(v));
  });
  [
    feed.flow, feed.level, feed.ph, feed.totalizer, feed.totalizerDay,
    bio.do, overall.dayNet, overall.totalNet, overall.rpm,
    overall.recovery, overall.runningTime,
  ].forEach(v => v && used.add(v));
  const unmapped = tags.filter(t => !used.has(t));

  return { type, typeLabel: label, unitLabel, skids, feed, bio, overall, unmapped };
}

// ──────────────────────────────────────────────────────────────────────
// Helpers / formatters used by the dashboard
export function metricUnit(metric: "flow" | "tmp" | "pressure" | "level" | "totalizer" | "runHours" | "ph" | "do" | "dp" | "recovery"): string {
  switch (metric) {
    case "flow": return "m³/h";
    case "tmp": return "bar";
    case "pressure": return "bar";
    case "dp": return "bar";
    case "level": return "%";
    case "totalizer": return "m³";
    case "runHours": return "h";
    case "ph": return "pH";
    case "do": return "mg/L";
    case "recovery": return "%";
  }
}

export type MetricKind = "flow" | "tmp" | "pressure" | "level" | "totalizer" | "runHours" | "dp" | "recovery";

export function metricStatus(metric: MetricKind, value: number): "ok" | "warn" | "critical" {
  if (!isFinite(value)) return "ok";
  switch (metric) {
    case "tmp":
      if (value > 0.45) return "critical";
      if (value > 0.30) return "warn";
      return "ok";
    case "dp":
      // Typical RO DP: >1.0 bar is warn, >1.5 bar is critical (per stage)
      if (value > 1.5) return "critical";
      if (value > 1.0) return "warn";
      return "ok";
    case "pressure":
      if (value > 2.5 || value < 0) return "warn";
      return "ok";
    case "level":
      if (value > 95 || value < 5) return "critical";
      if (value > 90 || value < 10) return "warn";
      return "ok";
    case "flow":
      if (value <= 0) return "warn";
      return "ok";
    case "recovery":
      if (value < 50) return "warn";
      return "ok";
    default:
      return "ok";
  }
}

export function metricLabel(metric: MetricKind): string {
  switch (metric) {
    case "flow": return "Flow";
    case "tmp": return "TMP";
    case "pressure": return "Pressure";
    case "level": return "Level";
    case "totalizer": return "Totalizer";
    case "runHours": return "Run Hours";
    case "dp": return "ΔP";
    case "recovery": return "Recovery";
  }
}
