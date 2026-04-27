// Auto-detect water-treatment plant schemas from a list of column names.
// Currently models: MBR, generic. RO/UF can be added with the same pattern.

export type SkidConfig = {
  id: string;
  index: number;
  name: string;
  flow?: string;
  tmp?: string;
  pressure?: string;
  level?: string;
  totalizer?: string;
  totalizerDay?: string;
  bwTotalizer?: string;
  bwTotalizerDay?: string;
  runHours?: string;
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
};

export type PlantSchema = {
  type: "mbr" | "ro" | "generic";
  typeLabel: string;
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

function detectSkidIndices(tags: string[]): number[] {
  const found = new Set<number>();
  for (const t of tags) {
    const n = norm(t);
    // skid1_, skid_1_, sk1_, sk_1_, mbr1_, mbr_tank1_, train1_, stream1_
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

  // Build a list of regexes that match "this skid only" + metric kind.
  // We try strict first, then looser.
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
    // Backwash totalizers MUST be checked first or "total" pattern will steal them
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
  const flow = findSkidTag(tags, idx, "flow");
  const tmp = findSkidTag(tags, idx, "tmp");
  const pressure = findSkidTag(tags, idx, "pressure");
  const level = findSkidTag(tags, idx, "level");
  const bwTotalizerDay = findSkidTag(tags, idx, "bwTotalizerDay");
  const bwTotalizer = findSkidTag(tags, idx, "bwTotalizer");
  const totalizerDay = findSkidTag(tags, idx, "totalizerDay");
  const totalizer = findSkidTag(tags, idx, "totalizer");
  const runHours = findSkidTag(tags, idx, "runHours");

  return {
    id: `skid${idx}`,
    index: idx,
    name: `Skid ${idx}`,
    flow,
    tmp,
    pressure,
    level,
    totalizer,
    totalizerDay,
    bwTotalizer,
    bwTotalizerDay,
    runHours,
  };
}

function detectFeed(tags: string[]): FeedConfig {
  // Feed / neutralization / equalization tank markers
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

function detectType(tags: string[]): { type: PlantSchema["type"]; label: string } {
  const all = tags.map(norm).join(" ");
  if (/\b(mbr|membrane|biofilter|bio_?do|bio_?reactor)\b/.test(all)) {
    return { type: "mbr", label: "MBR Plant" };
  }
  if (/\b(reco|recovery|permeate|reject|membrane.*ro|ro_)\b/.test(all)) {
    return { type: "ro", label: "RO Plant" };
  }
  return { type: "generic", label: "Process Plant" };
}

export function detectPlantSchema(rawTags: string[]): PlantSchema {
  const tags = rawTags.filter(Boolean);
  const skidIdx = detectSkidIndices(tags);
  const skids = skidIdx.map((i) => detectSkid(tags, i));

  // Filter out empty skids (no metrics found)
  const realSkids = skids.filter(
    (s) => s.flow || s.tmp || s.pressure || s.level || s.totalizer || s.runHours,
  );

  const feed = detectFeed(tags);
  const bio = detectBio(tags);
  const overall = detectOverall(tags, realSkids.length);
  const { type, label } = detectType(tags);

  // Compute unmapped tags (anything not used above)
  const used = new Set<string>();
  realSkids.forEach((s) => {
    [s.flow, s.tmp, s.pressure, s.level, s.totalizer, s.totalizerDay, s.bwTotalizer, s.bwTotalizerDay, s.runHours].forEach((v) => v && used.add(v));
  });
  [feed.flow, feed.level, feed.ph, feed.totalizer, feed.totalizerDay, bio.do, overall.dayNet, overall.totalNet, overall.rpm].forEach(
    (v) => v && used.add(v),
  );
  const unmapped = tags.filter((t) => !used.has(t));

  return { type, typeLabel: label, skids: realSkids, feed, bio, overall, unmapped };
}

// ──────────────────────────────────────────────────────────────────────
// Helpers / formatters used by the dashboard
export function metricUnit(metric: "flow" | "tmp" | "pressure" | "level" | "totalizer" | "runHours" | "ph" | "do"): string {
  switch (metric) {
    case "flow": return "m³/h";
    case "tmp": return "bar";
    case "pressure": return "bar";
    case "level": return "%";
    case "totalizer": return "m³";
    case "runHours": return "h";
    case "ph": return "pH";
    case "do": return "mg/L";
  }
}

export type MetricKind = "flow" | "tmp" | "pressure" | "level" | "totalizer" | "runHours";

// Normal operating bands per metric for status colouring (rough industry defaults).
// Customers can override later via per-tag thresholds.
export function metricStatus(metric: MetricKind, value: number): "ok" | "warn" | "critical" {
  if (!isFinite(value)) return "ok";
  switch (metric) {
    case "tmp":
      if (value > 0.45) return "critical";
      if (value > 0.30) return "warn";
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
  }
}
