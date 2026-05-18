import {
  type CelebrationEmployee,
  type CelebrationKind,
  type WishThemeId,
  getThemesForKind,
  matchesMonthDay,
  renderCelebrationWishSvg,
  yearsOfService,
} from "./celebrationWishSvg";

const ERPNEXT_URL = process.env.ERPNEXT_URL?.replace(/\/$/, "");
const ERPNEXT_API_KEY = process.env.ERPNEXT_API_KEY;
const ERPNEXT_API_SECRET = process.env.ERPNEXT_API_SECRET;

export interface CelebrationEntry {
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
  default_theme: WishThemeId;
}

export function isCelebrationsConfigured(): boolean {
  return !!(ERPNEXT_URL && ERPNEXT_API_KEY && ERPNEXT_API_SECRET);
}

function authHeader(): string {
  return `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;
}

export async function fetchActiveEmployees(): Promise<any[]> {
  if (!isCelebrationsConfigured()) return [];
  const fields = JSON.stringify([
    "name", "employee_name", "department", "designation",
    "status", "date_of_joining", "date_of_birth", "image",
  ]);
  const filters = JSON.stringify([["Employee", "status", "=", "Active"]]);
  const params = new URLSearchParams({
    fields, filters, limit_page_length: "500", order_by: "employee_name asc",
  });
  const listResp = await fetch(`${ERPNEXT_URL}/api/resource/Employee?${params}`, {
    headers: { Authorization: authHeader() },
  });
  if (!listResp.ok) throw new Error(`ERPNext list error: ${listResp.status}`);
  const listJson = await listResp.json();
  const { applyEmployeeFilter } = await import("./erpnext");
  return applyEmployeeFilter((listJson.data ?? []) as any[]);
}

export function getCelebrationsForDate(
  employees: any[],
  asOf = new Date(),
  filter: "today" | "month" | "all" = "today",
): { birthdays: CelebrationEntry[]; anniversaries: CelebrationEntry[] } {
  const month = asOf.getMonth() + 1;
  const day = asOf.getDate();

  const mapEmp = (e: any, kind: CelebrationKind): CelebrationEntry => {
    const dateField = kind === "birthday" ? e.date_of_birth : e.date_of_joining;
    const yrs = kind === "anniversary" ? yearsOfService(e.date_of_joining, asOf) : null;
    const themes = getThemesForKind(kind);
    const themeIdx = (month + day + e.name.length) % themes.length;
    return {
      name: e.name,
      employee_name: e.employee_name,
      department: e.department ?? null,
      designation: e.designation ?? null,
      date_of_joining: e.date_of_joining ?? null,
      date_of_birth: e.date_of_birth ?? null,
      image: e.image ?? null,
      celebration_date: dateField,
      years_of_service: yrs,
      kind,
      default_theme: themes[themeIdx] ?? themes[0],
    };
  };

  const match = (dateStr: string | null) => {
    if (!dateStr) return false;
    if (filter === "all") return true;
    if (filter === "month") return matchesMonthDay(dateStr, month);
    return matchesMonthDay(dateStr, month, day);
  };

  const birthdays = employees
    .filter(e => match(e.date_of_birth))
    .map(e => mapEmp(e, "birthday"));
  const anniversaries = employees
    .filter(e => match(e.date_of_joining) && (yearsOfService(e.date_of_joining, asOf) ?? 0) >= 1)
    .map(e => mapEmp(e, "anniversary"));

  return { birthdays, anniversaries };
}

export async function loadEmployeePhotoDataUri(image: string | null): Promise<string | undefined> {
  if (!image || !ERPNEXT_URL) return undefined;
  try {
    const imgUrl = image.startsWith("http") ? image : `${ERPNEXT_URL}${image}`;
    const imgResp = await fetch(imgUrl, { headers: { Authorization: authHeader() } });
    if (!imgResp.ok) return undefined;
    const buf = Buffer.from(await imgResp.arrayBuffer());
    const ct = imgResp.headers.get("content-type") || "image/jpeg";
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export async function renderCelebrationCard(
  entry: CelebrationEntry,
  theme?: WishThemeId,
  customMessage?: string,
): Promise<string> {
  const employee: CelebrationEmployee = {
    name: entry.name,
    employee_name: entry.employee_name,
    department: entry.department,
    designation: entry.designation,
    date_of_joining: entry.date_of_joining,
    date_of_birth: entry.date_of_birth,
    image: entry.image,
  };
  const photoDataUri = await loadEmployeePhotoDataUri(entry.image);
  const themes = getThemesForKind(entry.kind);
  const picked = theme && themes.includes(theme) ? theme : entry.default_theme;
  return renderCelebrationWishSvg({
    kind: entry.kind,
    theme: picked,
    employee,
    yearsOfService: entry.years_of_service ?? undefined,
    customMessage,
    photoDataUri,
  });
}

export function buildWishCaption(entry: CelebrationEntry): string {
  const dept = (entry.department || "").replace(/ - WTT.*$/i, "").trim();
  if (entry.kind === "birthday") {
    return `🎂 Happy Birthday, ${entry.employee_name}!${dept ? `\n${dept}` : ""}\n\nWishing you a wonderful day from the WTT family! 🎉`;
  }
  const yrs = entry.years_of_service ?? 1;
  return `🏆 Work Anniversary — ${entry.employee_name} (${yrs} ${yrs === 1 ? "year" : "years"})${dept ? `\n${dept}` : ""}\n\nThank you for your dedication to WTT! 🙌`;
}

export async function getTodayCelebrations(): Promise<CelebrationEntry[]> {
  const employees = await fetchActiveEmployees();
  const { birthdays, anniversaries } = getCelebrationsForDate(employees, new Date(), "today");
  return [...birthdays, ...anniversaries];
}
