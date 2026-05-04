import { Router } from "express";

const router = Router();

// Cache news for 30 minutes per country set
const cache: Map<string, { ts: number; items: NewsItem[] }> = new Map();
const CACHE_TTL = 30 * 60 * 1000;

interface NewsItem {
  title: string;
  url: string;
  source: string;
  published: string;
  snippet: string;
}

function isEnglish(text: string): boolean {
  if (!text) return false;
  // Rough heuristic: ASCII + basic Latin chars make up most of the string
  const asciiCount = [...text].filter(c => c.charCodeAt(0) < 256).length;
  return asciiCount / text.length > 0.8;
}

async function fetchGdeltNews(country: string): Promise<NewsItem[]> {
  const query = encodeURIComponent(`water treatment industry "${country}"`);
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=12&format=json&timespan=30d&sort=DateDesc&sourcelang=english`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json() as any;
    const articles: any[] = data?.articles ?? [];
    return articles
      .map(a => ({
        title: (a.title || "").trim(),
        url: a.url || "",
        source: a.domain || "",
        published: a.seendate ? a.seendate.substring(0, 10) : "",
        snippet: "",
      }))
      .filter(a => a.title && a.url && isEnglish(a.title));
  } catch {
    return [];
  }
}

async function fetchRssNews(country: string): Promise<NewsItem[]> {
  const q = encodeURIComponent(`water ${country}`);
  const rss = `https://news.google.com/rss/search?q=${q}+water+industry&hl=en-IN&gl=IN&ceid=IN:en`;
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rss)}&count=6`;
  try {
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json() as any;
    const items: any[] = data?.items ?? [];
    return items.map(i => ({
      title: (i.title || "").replace(/<[^>]+>/g, "").trim(),
      url: i.link || i.guid || "",
      source: i.author || data?.feed?.title || "",
      published: i.pubDate ? i.pubDate.substring(0, 10) : "",
      snippet: (i.description || "").replace(/<[^>]+>/g, "").trim().substring(0, 120),
    })).filter(i => i.title && i.url);
  } catch {
    return [];
  }
}

router.get("/", async (req, res) => {
  try {
    const raw = (req.query.countries as string) || "";
    const countries = raw.split(",").map(c => c.trim()).filter(Boolean);
    if (countries.length === 0) {
      return res.json({ items: [] });
    }

    const cacheKey = countries.sort().join(",");
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return res.json({ items: cached.items });
    }

    // Fetch for up to 3 countries concurrently
    const targets = countries.slice(0, 3);
    const results = await Promise.all(
      targets.map(c => fetchGdeltNews(c).then(items => items.length ? items : fetchRssNews(c)))
    );

    // Merge + deduplicate by URL
    const seen = new Set<string>();
    const merged: NewsItem[] = [];
    for (const list of results) {
      for (const item of list) {
        if (!seen.has(item.url)) {
          seen.add(item.url);
          merged.push(item);
        }
      }
    }
    // Sort by published date desc
    merged.sort((a, b) => (b.published > a.published ? 1 : -1));
    const top = merged.slice(0, 12);

    cache.set(cacheKey, { ts: Date.now(), items: top });
    return res.json({ items: top });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch news" });
  }
});

export default router;
