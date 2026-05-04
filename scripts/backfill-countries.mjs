// One-shot: re-classify the `country` column on every proposal row using
// the same rules as the new pdf_analyzer.py, applied to the stored raw_text.
import pg from "/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js";

const COUNTRIES = [
  "Bangladesh","India","Sri Lanka","Pakistan","Nepal","Bhutan","Maldives",
  "Afghanistan","China","Vietnam","Thailand","Indonesia","Malaysia","Singapore",
  "Philippines","Myanmar","Cambodia","Laos","Brunei","UAE","United Arab Emirates",
  "Saudi Arabia","Qatar","Kuwait","Oman","Bahrain","Iraq","Jordan","Lebanon",
  "Syria","Yemen","Turkey","Iran","Israel","Egypt","Libya","Tunisia","Algeria",
  "Morocco","Sudan","Ethiopia","Kenya","Tanzania","Uganda","Rwanda","Burundi",
  "South Africa","Zimbabwe","Zambia","Botswana","Namibia","Angola","Mozambique",
  "Madagascar","Mauritius","Seychelles","Ghana","Nigeria","USA","United States",
  "UK","United Kingdom","Germany","France","Italy","Spain","Portugal",
  "Netherlands","Belgium","Switzerland","Austria","Poland","Greece","Romania",
  "Ireland","Sweden","Norway","Denmark","Finland","Australia","New Zealand",
  "Japan","South Korea","Korea","Russia",
  "Mexico","El Salvador","Guatemala","Honduras","Nicaragua","Costa Rica",
  "Panama","Cuba","Dominican Republic","Haiti","Jamaica","Trinidad",
  "Colombia","Venezuela","Ecuador","Peru","Bolivia","Brazil","Chile",
  "Argentina","Uruguay","Paraguay","Canada",
];

const WTT_SELF = [
  "WTT INTERNATIONAL","WATER LOVING TECHNOLOGIES","WATERLOVINGTECHNOLOGIES",
  "BANGALORE","BENGALURU","KARNATAKA",
  "INFO@WTTINDIA","WTTINDIA.COM","WWW.WTTINDIA",
];

const CITY_HINTS = {
  DHAKA:"Bangladesh", CHITTAGONG:"Bangladesh", GAZIPUR:"Bangladesh",
  NARAYANGANJ:"Bangladesh", SAVAR:"Bangladesh", TONGI:"Bangladesh",
  ASHULIA:"Bangladesh", MIRPUR:"Bangladesh",
  ISTANBUL:"Turkey", ANKARA:"Turkey", IZMIR:"Turkey", BURSA:"Turkey",
  GAZIANTEP:"Turkey", KAHRAMANMARAS:"Turkey", KAYSERI:"Turkey",
  DENIZLI:"Turkey", ADANA:"Turkey",
  KARACHI:"Pakistan", LAHORE:"Pakistan", FAISALABAD:"Pakistan",
  COLOMBO:"Sri Lanka", KATUNAYAKE:"Sri Lanka",
  HANOI:"Vietnam", "HO CHI MINH":"Vietnam", SAIGON:"Vietnam",
  JAKARTA:"Indonesia", BANDUNG:"Indonesia", SURABAYA:"Indonesia",
  BANGKOK:"Thailand", "PHNOM PENH":"Cambodia",
  DUBAI:"UAE", "ABU DHABI":"UAE", SHARJAH:"UAE",
  RIYADH:"Saudi Arabia", JEDDAH:"Saudi Arabia",
  CAIRO:"Egypt", ALEXANDRIA:"Egypt",
  "ADDIS ABABA":"Ethiopia", NAIROBI:"Kenya",
  LAGOS:"Nigeria", ACCRA:"Ghana",
  GUANGZHOU:"China", SHENZHEN:"China", SHANGHAI:"China",
  CHENNAI:"India", MUMBAI:"India", TIRUPUR:"India", COIMBATORE:"India",
  AHMEDABAD:"India", SURAT:"India", DELHI:"India", "NEW DELHI":"India",
  GURGAON:"India", NOIDA:"India", KOLKATA:"India", PUNE:"India",
  HYDERABAD:"India", LUDHIANA:"India",
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function scanBlock(blockUpper) {
  let earliest = null;
  for (const c of COUNTRIES) {
    const m = blockUpper.match(new RegExp("\\b" + escapeRe(c.toUpperCase()) + "\\b"));
    if (m && (!earliest || m.index < earliest[0])) earliest = [m.index, c];
  }
  for (const [city, country] of Object.entries(CITY_HINTS)) {
    const m = blockUpper.match(new RegExp("\\b" + escapeRe(city) + "\\b"));
    if (m && (!earliest || m.index < earliest[0])) earliest = [m.index, country];
  }
  return earliest ? earliest[1] : null;
}

function detectCountry(text) {
  if (!text) return null;
  const upper = text.toUpperCase();

  const patterns = [
    /\bTO\b\s*[:\-]?\s*\n?([\s\S]{0,500}?)(?:SUBJECT|SUB[:\s]|REF[:\s]|DEAR\s|WE\s|GENTLEMEN|KIND\s+ATTN|ATTN[:\s])/,
    /\bM\s*\/?\s*S\.?\s+([\s\S]{0,400})/,
    /\bTO\b\s*[:\-]?\s*\n?([\s\S]{0,400})/,
  ];
  for (const p of patterns) {
    const m = upper.match(p);
    if (m) {
      const hit = scanBlock(m[1]);
      if (hit) return hit;
    }
  }

  const tag = text.match(/\bCountry\b[:\s]+([A-Z][A-Za-z ]{2,30})/);
  if (tag) {
    const cand = tag[1].trim().replace(/[.,;:]+$/, "");
    const canon = COUNTRIES.find(c => c.toUpperCase() === cand.toUpperCase());
    return canon || cand;
  }

  const cleaned = upper.split("\n")
    .filter(line => !WTT_SELF.some(kw => line.includes(kw)))
    .join("\n");
  return scanBlock(cleaned);
}

const c = new pg.Client({
  connectionString: "postgresql://postgres:wtt%40adm123@122.165.225.42:5432/flowmatrix",
});
await c.connect();
const { rows } = await c.query(
  "SELECT id, filename, country, raw_text FROM proposals ORDER BY id"
);

let changed = 0, skipped_no_text = 0;
for (const r of rows) {
  if (!r.raw_text) { skipped_no_text++; continue; }   // never blank out a known country
  const fresh = detectCountry(r.raw_text);
  if (!fresh) continue;
  const before = r.country || "—";
  if (fresh !== before) {
    await c.query("UPDATE proposals SET country = $1, updated_at = NOW() WHERE id = $2", [fresh, r.id]);
    changed++;
    console.log(`#${r.id.toString().padStart(3)}  ${before.padEnd(14)} -> ${fresh.padEnd(14)}  ${r.filename.slice(0, 70)}`);
  }
}
console.log(`\nUpdated ${changed} of ${rows.length} rows. Skipped ${skipped_no_text} rows with no raw_text (will reclassify on next sync).`);
await c.end();
