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

/** All active ERP employees — skips applyEmployeeFilter (incl. Production/O&M/Project/MD). */
export async function fetchActiveEmployees(): Promise<any[]> {
  if (!isCelebrationsConfigured()) return [];
  const fields = JSON.stringify([
    "name", "employee_name", "department", "designation",
    "status", "date_of_joining", "date_of_birth", "image",
  ]);
  const filters = JSON.stringify([["Employee", "status", "=", "Active"]]);
  const PAGE = 500;
  const all: any[] = [];
  for (let start = 0; ; start += PAGE) {
    const params = new URLSearchParams({
      fields,
      filters,
      limit_page_length: String(PAGE),
      limit_start: String(start),
      order_by: "employee_name asc",
    });
    const listResp = await fetch(`${ERPNEXT_URL}/api/resource/Employee?${params}`, {
      headers: { Authorization: authHeader() },
    });
    if (!listResp.ok) throw new Error(`ERPNext list error: ${listResp.status}`);
    const listJson = await listResp.json();
    const batch = (listJson.data ?? []) as any[];
    all.push(...batch);
    if (batch.length < PAGE) break;
  }
  return all;
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

// ─── AI-style message generation ─────────────────────────────────────────────

const BIRTHDAY_OPENERS = [
  "Wishing you a birthday as bright and brilliant as you are",
  "May this special day bring you all the joy you bring to those around you",
  "Here's to celebrating the amazing person you are",
  "Today is all about you — and you absolutely deserve it",
  "Another year of greatness — may this one be your best yet",
  "The WTT family is so lucky to have someone as wonderful as you",
  "May your birthday be filled with warmth, laughter, and everything you love",
  "On your special day, we celebrate not just your birthday, but the incredible person you are",
  "You make every day at WTT brighter — today, we celebrate you",
  "Wishing you a day as remarkable as the impact you make every single day",
];

const BIRTHDAY_MIDDLE = [
  "Your dedication and positive energy inspire everyone around you.",
  "Your talent and hard work make a real difference at WTT.",
  "The passion and commitment you bring every day is truly appreciated.",
  "Your smile and enthusiasm light up the entire workplace.",
  "You bring so much value and warmth to our team.",
  "Your creativity and drive never cease to amaze us.",
  "The team is so much better because of your contributions.",
  "Your kindness and professionalism set a wonderful example for all of us.",
];

const BIRTHDAY_CLOSERS = [
  "Have a spectacular birthday celebration! 🎂",
  "May this year bring you new heights of happiness and success! 🎉",
  "Enjoy every moment of your special day to the fullest! 🎈",
  "From the entire WTT family — many happy returns of the day! 🥳",
  "Here's to a fantastic year ahead filled with joy and achievement! ✨",
  "May all your birthday wishes come true! 🌟",
  "Sending you lots of love and best wishes today and always! 💫",
];

const ANNIVERSARY_OPENERS = [
  "Congratulations on this incredible milestone",
  "Today we celebrate your journey with the WTT family",
  "What an amazing achievement — thank you for choosing WTT",
  "Your commitment and loyalty to WTT have been truly inspiring",
  "We are so grateful to have you as part of our team",
  "Today marks another year of your outstanding contributions to WTT",
  "Your dedication to WTT is something we deeply cherish and admire",
  "Celebrating the day you became an invaluable part of the WTT family",
];

const ANNIVERSARY_MIDDLE = [
  "Your expertise and dedication have been the backbone of our success.",
  "Every year with you on the team has made WTT stronger and better.",
  "Your contributions have left a lasting mark on everything we do.",
  "The energy and passion you bring are what make WTT truly special.",
  "Through your hard work and perseverance, you've helped shape WTT into what it is today.",
  "Your professionalism and commitment are an inspiration to the entire team.",
  "You have grown with WTT, and WTT has grown because of you.",
];

const ANNIVERSARY_CLOSERS = [
  "Thank you for your continued dedication — here's to many more years together! 🏆",
  "Wishing you continued success and fulfillment in the years ahead! 🌟",
  "Here's to celebrating many more milestones with you! 🎊",
  "The WTT family is so proud to have you — congratulations! ✨",
  "May this anniversary be a reminder of the incredible journey ahead! 💫",
  "Your best years at WTT are still ahead — congratulations! 🥂",
];

/** Generates a varied, personalized wish message for a celebration. */
export function generateCelebrationMessage(entry: CelebrationEntry): string {
  const first = entry.employee_name.split(" ")[0] || entry.employee_name;
  // Use a hash of the name + today's date for variety that is consistent per person per day
  const today = new Date();
  const seed = entry.name.length + today.getDate() + today.getMonth() * 31 + (entry.years_of_service ?? 0);

  function pick<T>(arr: T[], offset = 0): T {
    return arr[(seed + offset) % arr.length];
  }

  if (entry.kind === "birthday") {
    const opener = pick(BIRTHDAY_OPENERS, 0);
    const middle = pick(BIRTHDAY_MIDDLE, 3);
    const closer = pick(BIRTHDAY_CLOSERS, 7);
    return `${opener}, ${first}!\n${middle}\n${closer}`;
  }

  const years = entry.years_of_service ?? 1;
  const yearLabel = years === 1 ? "1 remarkable year" : `${years} remarkable years`;
  const opener = pick(ANNIVERSARY_OPENERS, 0);
  const middle = pick(ANNIVERSARY_MIDDLE, 3);
  const closer = pick(ANNIVERSARY_CLOSERS, 5);
  return `${opener}, ${first} — ${yearLabel} with WTT!\n${middle}\n${closer}`;
}

/** Build a short caption for Raven channel messages. */
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
