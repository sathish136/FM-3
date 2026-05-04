// Lightweight, server-side plant-type heuristics. Mirrors the deeper
// detector that lives in `artifacts/pm-app/src/pages/SiteDbAnalyze/plantSchemas.ts`
// but only returns enough information to power the System Overview list:
//
//   { type, label, unitLabel, stageOrSkidCount, hasFeed, hasOverallRecovery }
//
// We intentionally do NOT replicate the full instrument-by-instrument mapping
// here — the page already calls the frontend detector when the user opens
// a specific table. The goal of the system overview is to *classify* tables
// at a glance.

export type PlantType =
  | "mbr" | "ro" | "ro_reject" | "uf" | "mbbr"
  | "mee" | "dm" | "etp" | "stp" | "boiler"
  | "softener" | "dosing" | "generic";

export type PlantClassification = {
  type: PlantType;
  label: string;       // human-readable (e.g. "RO Plant", "MBR Plant")
  unitLabel: string;   // "Stage" for RO/Reject/MEE, "Skid" otherwise
  unitCount: number;   // detected stages or skids (0 = unknown)
  hasFeed: boolean;
  hasOverallRecovery: boolean;
  hasRunHours: boolean;
  hasBackwash: boolean;
  signals: string[];   // short textual hints used in UI tooltips
};

const norm = (s: string) => (s || "").toLowerCase();

// Ordinal helpers for stage tags (1st, 2nd, …)
const ORD = "1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|11th|12th";

function uniqueIndices(tags: string[], rxList: RegExp[]): Set<number> {
  const set = new Set<number>();
  for (const t of tags) {
    const n = norm(t);
    for (const rx of rxList) {
      const m = n.match(rx);
      if (m) {
        // Either an ordinal like "1st" → 1, or a digit
        const tok = m[1];
        const i = ORD_TO_NUM[tok] ?? parseInt(tok, 10);
        if (i > 0 && i < 50) set.add(i);
        break;
      }
    }
  }
  return set;
}

const ORD_TO_NUM: Record<string, number> = {
  "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "5th": 5,
  "6th": 6, "7th": 7, "8th": 8, "9th": 9, "10th": 10,
  "11th": 11, "12th": 12,
};

export function classifyPlant(rawCols: string[]): PlantClassification {
  const cols = (rawCols || []).filter(Boolean);
  const lc = cols.map(norm);
  const all = lc.join(" ");
  const signals: string[] = [];

  const has = (rx: RegExp) => lc.some(t => rx.test(t));

  // ── Reject-RO ───────────────────────────────────────────────────────
  const rejStageHits = lc.filter(t =>
    new RegExp(`^rej_(?:${ORD})_`).test(t) ||
    /^r_ro_stg\d+_tot/.test(t) ||
    /^rej_recovery$/.test(t) ||
    /^rej_feed/.test(t)
  ).length;

  // ── RO ──────────────────────────────────────────────────────────────
  const roStageHits = lc.filter(t =>
    new RegExp(`^ro_(?:${ORD})_`).test(t) ||
    /^ro_stg\d+_tot/.test(t) ||
    /^ro_reco$/.test(t) ||
    /^ro_feed/.test(t)
  ).length;

  if (rejStageHits >= 4 && rejStageHits >= roStageHits) {
    const stages = uniqueIndices(lc, [
      new RegExp(`^rej_(${ORD})_`),
      /^r_ro_stg(\d+)_tot/,
    ]);
    signals.push("Reject-RO tags (rej_*_stg / r_ro_stgN_tot)");
    return finalize("ro_reject", "Reject RO Plant", "Stage", stages.size, lc, signals);
  }
  if (roStageHits >= 4) {
    const stages = uniqueIndices(lc, [
      new RegExp(`^ro_(${ORD})_`),
      /^ro_stg(\d+)_tot/,
    ]);
    signals.push("RO stage tags (ro_*_stg / ro_stgN_tot)");
    return finalize("ro", "RO Plant", "Stage", stages.size, lc, signals);
  }

  // ── MBR ─────────────────────────────────────────────────────────────
  if (
    /\b(mbr|membrane|biofilter|bio_?do|bio_?reactor)\b/.test(all) ||
    has(/^skid_\d+_(?:fm|tmp|pt|lt|total_fm)/)
  ) {
    const skids = uniqueIndices(lc, [
      /^(?:mbr_)?skid_(\d+)_/,
      /^mbr_(\d+)_/,
      /^skid_(\d+)_/,
    ]);
    signals.push("MBR/skid tags (skid_N_*, bio_do)");
    return finalize("mbr", "MBR Plant", "Skid", skids.size, lc, signals);
  }

  // ── UF (ultrafiltration) ────────────────────────────────────────────
  if (
    /\buf_|ultrafilt|^uf$/.test(all) ||
    has(/^uf_skid_\d+/) ||
    has(/^uf_\d+_/)
  ) {
    const skids = uniqueIndices(lc, [/^uf_skid_(\d+)_/, /^uf_(\d+)_/]);
    signals.push("UF tags (uf_*)");
    return finalize("uf", "UF Plant", "Skid", skids.size, lc, signals);
  }

  // ── MBBR ────────────────────────────────────────────────────────────
  if (/\bmbbr\b/.test(all)) {
    const tanks = uniqueIndices(lc, [/^mbbr_(\d+)_/, /^mbbr_tank_(\d+)/]);
    signals.push("MBBR reactor tags");
    return finalize("mbbr", "MBBR Plant", "Tank", tanks.size, lc, signals);
  }

  // ── MEE ─────────────────────────────────────────────────────────────
  if (/\bmee\b|effect|evap/.test(all)) {
    const effects = uniqueIndices(lc, [/^effect_(\d+)/, /^mee_(\d+)/, /eff_(\d+)/]);
    signals.push("MEE / multi-effect evaporator");
    return finalize("mee", "MEE Plant", "Effect", effects.size, lc, signals);
  }

  // ── DM (demineralization) ───────────────────────────────────────────
  if (/\bdm_|deminer|cation|anion/.test(all)) {
    const trains = uniqueIndices(lc, [/^dm_train_(\d+)/, /^dm_(\d+)_/]);
    signals.push("DM / cation-anion train");
    return finalize("dm", "DM Plant", "Train", trains.size, lc, signals);
  }

  // ── STP / ETP ───────────────────────────────────────────────────────
  if (/\b(stp|sewage)\b/.test(all)) {
    signals.push("STP (sewage treatment)");
    return finalize("stp", "STP Plant", "Skid", 0, lc, signals);
  }
  if (/\b(etp|effluent)\b/.test(all)) {
    signals.push("ETP (effluent treatment)");
    return finalize("etp", "ETP Plant", "Skid", 0, lc, signals);
  }

  // ── Boiler ──────────────────────────────────────────────────────────
  if (/\bboiler\b/.test(all) || has(/steam_(?:flow|pressure)/)) {
    signals.push("Boiler / steam tags");
    return finalize("boiler", "Boiler", "Boiler", 0, lc, signals);
  }

  // ── Softener / Dosing ───────────────────────────────────────────────
  if (/soften|salt_regen/.test(all)) {
    signals.push("Softener tags");
    return finalize("softener", "Softener", "Train", 0, lc, signals);
  }
  if (/^dose_|_dosing$|chemical_dosing/.test(all)) {
    signals.push("Chemical dosing tags");
    return finalize("dosing", "Dosing System", "Pump", 0, lc, signals);
  }

  // Soft hint: anything mentioning permeate / reject / membrane → still RO-ish
  if (/permeate|reject|membrane.*ro/.test(all)) {
    signals.push("Generic RO-like (no stage prefix found)");
    return finalize("ro", "RO Plant", "Stage", 0, lc, signals);
  }

  signals.push("No plant-specific tag pattern matched");
  return finalize("generic", "Process Plant", "Skid", 0, lc, signals);
}

function finalize(
  type: PlantType,
  label: string,
  unitLabel: string,
  unitCount: number,
  lc: string[],
  signals: string[],
): PlantClassification {
  const hasFeed = lc.some(t =>
    /^(?:feed|inlet|raw|nt)_/.test(t) ||
    /^ro_feed/.test(t) ||
    /^rej_feed/.test(t),
  );
  const hasOverallRecovery = lc.some(t =>
    /^(?:overall_)?recovery$/.test(t) ||
    /^ro_reco$/.test(t) ||
    /^rej_recovery$/.test(t) ||
    /overall_recovery/.test(t),
  );
  const hasRunHours = lc.some(t =>
    /(?:run_?hours?|run_?time|running_time|total_time|hrs|hours)$/.test(t),
  );
  const hasBackwash = lc.some(t =>
    /(?:bw|backwash)/.test(t),
  );
  return { type, label, unitLabel, unitCount, hasFeed, hasOverallRecovery, hasRunHours, hasBackwash, signals };
}

// Convenience badge color used by the system overview UI
export function plantBadgeColor(type: PlantType): string {
  switch (type) {
    case "mbr":       return "violet";
    case "ro":        return "sky";
    case "ro_reject": return "rose";
    case "uf":        return "cyan";
    case "mbbr":      return "emerald";
    case "mee":       return "amber";
    case "dm":        return "indigo";
    case "stp":       return "lime";
    case "etp":       return "orange";
    case "boiler":    return "red";
    case "softener":  return "teal";
    case "dosing":    return "fuchsia";
    default:          return "slate";
  }
}
