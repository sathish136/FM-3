import { useState, useMemo, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  FileText, Search, RefreshCw, Building2, Globe,
  Filter, Download, FolderOpen, TrendingUp,
  Eye, ChevronRight, ChevronDown, GitBranch, Calendar, Link2,
} from "lucide-react";
import * as XLSX from "xlsx";

type Proposal = {
  id: number;
  filename: string;
  customerName: string | null;
  revision: string | null;
  number: string | null;
  proposalDate: string | null;
  country: string | null;
  fileSize: number | null;
  fileMtime: string | null;
  sourceHost: string | null;
  sourcePath: string | null;
  storagePath?: string | null;
  hasFile?: boolean;
  pageCount: number | null;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse = {
  proposals: Proposal[];
  total: number;
  countries: Record<string, number>;
  customers: Record<string, number>;
};

const COUNTRY_CODES: Record<string, string> = {
  Bangladesh:"BD", India:"IN", "Sri Lanka":"LK", Pakistan:"PK",
  Nepal:"NP", Bhutan:"BT", Maldives:"MV", Afghanistan:"AF",
  China:"CN", Vietnam:"VN", Thailand:"TH", Indonesia:"ID",
  Malaysia:"MY", Singapore:"SG", Philippines:"PH", Myanmar:"MM",
  Cambodia:"KH", Laos:"LA", Brunei:"BN", UAE:"AE",
  "United Arab Emirates":"AE", "Saudi Arabia":"SA", Qatar:"QA",
  Kuwait:"KW", Oman:"OM", Bahrain:"BH", Iraq:"IQ", Jordan:"JO",
  Lebanon:"LB", Syria:"SY", Yemen:"YE", Turkey:"TR", Iran:"IR",
  Israel:"IL", Egypt:"EG", Libya:"LY", Tunisia:"TN", Algeria:"DZ",
  Morocco:"MA", Sudan:"SD", Ethiopia:"ET", Kenya:"KE",
  Tanzania:"TZ", Uganda:"UG", Rwanda:"RW", Burundi:"BI",
  "South Africa":"ZA", Zimbabwe:"ZW", Zambia:"ZM", Botswana:"BW",
  Namibia:"NA", Angola:"AO", Mozambique:"MZ", Madagascar:"MG",
  Mauritius:"MU", Seychelles:"SC", Ghana:"GH", Nigeria:"NG",
  USA:"US", "United States":"US", UK:"GB", "United Kingdom":"GB",
  Germany:"DE", France:"FR", Italy:"IT", Spain:"ES",
  Portugal:"PT", Netherlands:"NL", Belgium:"BE", Switzerland:"CH",
  Austria:"AT", Poland:"PL", Greece:"GR", Romania:"RO",
  Ireland:"IE", Sweden:"SE", Norway:"NO", Denmark:"DK", Finland:"FI",
  Australia:"AU", "New Zealand":"NZ", Japan:"JP",
  "South Korea":"KR", Korea:"KR", Russia:"RU",
  Mexico:"MX", "El Salvador":"SV", Guatemala:"GT", Honduras:"HN",
  Nicaragua:"NI", "Costa Rica":"CR", Panama:"PA", Cuba:"CU",
  "Dominican Republic":"DO", Haiti:"HT", Jamaica:"JM",
  Trinidad:"TT", Colombia:"CO", Venezuela:"VE", Ecuador:"EC",
  Peru:"PE", Bolivia:"BO", Brazil:"BR", Chile:"CL",
  Argentina:"AR", Uruguay:"UY", Paraguay:"PY", Canada:"CA",
};

function countryFlag(country: string | null): string {
  if (!country) return "🌐";
  const code = COUNTRY_CODES[country];
  if (!code) return "🌐";
  return String.fromCodePoint(
    0x1F1E6 + code.charCodeAt(0) - 65,
    0x1F1E6 + code.charCodeAt(1) - 65,
  );
}

function formatBytes(n: number | null) {
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

type RevisionRow = Proposal;
type ProjectGroup = { number: string; revisions: RevisionRow[] };
type CustomerGroup = {
  customer: string;
  country: string | null;
  projects: ProjectGroup[];
  totalRevisions: number;
};

type SlimLead = { name: string; company_name: string; country: string; status: string };

function normalizeName(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function findMatchingLead(customer: string, leadMap: Map<string, SlimLead[]>): SlimLead | null {
  const norm = normalizeName(customer);
  // exact normalized match first
  if (leadMap.has(norm)) return leadMap.get(norm)![0];
  // partial: customer contains lead name or vice versa
  for (const [key, leads] of leadMap) {
    if (norm.includes(key) || key.includes(norm)) return leads[0];
  }
  return null;
}

export default function ProposalLibrary() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("All");
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  function toggleCustomer(key: string) {
    setExpandedCustomers(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleProject(key: string) {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const { data, isLoading, refetch, isFetching } = useQuery<ApiResponse>({
    queryKey: ["/api/proposals", search, country],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (country && country !== "All") params.set("country", country);
      const res = await fetch(`/api/proposals?${params}`);
      if (!res.ok) throw new Error("Failed to load proposals");
      return res.json();
    },
  });

  const { data: leadsData } = useQuery<{ leads: SlimLead[] }>({
    queryKey: ["/api/marketing/leads-slim"],
    queryFn: async () => {
      const res = await fetch("/api/marketing/leads-slim");
      if (!res.ok) return { leads: [] };
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  const leadMap = useMemo<Map<string, SlimLead[]>>(() => {
    const map = new Map<string, SlimLead[]>();
    for (const lead of leadsData?.leads ?? []) {
      const key = normalizeName(lead.company_name);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(lead);
    }
    return map;
  }, [leadsData]);

  const proposals = data?.proposals ?? [];
  const countries = data?.countries ?? {};
  const customers = data?.customers ?? {};

  const countryList = useMemo(
    () => ["All", ...Object.keys(countries).sort()],
    [countries],
  );

  const stats = useMemo(() => {
    const totalSize = proposals.reduce((s, p) => s + (Number(p.fileSize) || 0), 0);
    const uniqueCustomers = new Set(proposals.map(p => p.customerName).filter(Boolean)).size;
    const uniqueCountries = new Set(proposals.map(p => p.country).filter(Boolean)).size;
    const revs: Record<string, number> = {};
    for (const p of proposals) revs[p.revision || "?"] = (revs[p.revision || "?"] || 0) + 1;
    return { totalSize, uniqueCustomers, uniqueCountries, revs };
  }, [proposals]);

  // Build tree: Customer → Project Number → Revisions
  const grouped = useMemo<CustomerGroup[]>(() => {
    const map = new Map<string, Map<string, RevisionRow[]>>();
    for (const p of proposals) {
      const cust = p.customerName || "Unknown Customer";
      const proj = p.number || "Unknown";
      if (!map.has(cust)) map.set(cust, new Map());
      const projMap = map.get(cust)!;
      if (!projMap.has(proj)) projMap.set(proj, []);
      projMap.get(proj)!.push(p);
    }
    const result: CustomerGroup[] = [];
    for (const [customer, projMap] of map) {
      const projects: ProjectGroup[] = [];
      for (const [number, revisions] of projMap) {
        const sorted = [...revisions].sort((a, b) => {
          const ra = parseInt(a.revision || "0", 10);
          const rb = parseInt(b.revision || "0", 10);
          return ra - rb;
        });
        projects.push({ number, revisions: sorted });
      }
      projects.sort((a, b) => a.number.localeCompare(b.number));
      const allRevs = projects.flatMap(p => p.revisions);
      const country = allRevs.find(r => r.country)?.country ?? null;
      result.push({
        customer,
        country,
        projects,
        totalRevisions: allRevs.length,
      });
    }
    result.sort((a, b) => a.customer.localeCompare(b.customer));
    return result;
  }, [proposals]);

  // Expand all customers by default whenever grouped data changes
  useEffect(() => {
    if (grouped.length === 0) return;
    setExpandedCustomers(new Set(grouped.map(cg => cg.customer)));
  }, [grouped]);

  function exportExcel() {
    const rows = proposals.map(p => ({
      Filename: p.filename,
      Customer: p.customerName || "",
      Number: p.number || "",
      Revision: p.revision || "",
      Date: p.proposalDate || "",
      Country: p.country || "",
      Size: formatBytes(p.fileSize),
      Pages: p.pageCount ?? "",
      Source: p.sourceHost || "",
      Path: p.sourcePath || "",
      "Last Synced": p.updatedAt,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Proposals");
    XLSX.writeFile(wb, `proposal-library-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 p-6">
        <div className="mx-auto max-w-[1600px] space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-200">
                  <FolderOpen className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Proposal Library</h1>
                  <p className="text-sm text-slate-500">
                    Auto-synced from your local proposal folder via the desktop sync client
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                onClick={exportExcel}
                disabled={!proposals.length}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-md hover:opacity-95 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export Excel
              </button>
            </div>
          </div>

          {/* Slim stats strip */}
          <div className="flex flex-wrap items-center gap-6 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm text-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-violet-500" />
              <span className="font-bold text-slate-800">{proposals.length}</span>
              <span className="text-slate-500">proposals</span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-500" />
              <span className="font-bold text-slate-800">{stats.uniqueCustomers}</span>
              <span className="text-slate-500">customers</span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-amber-500" />
              <span className="font-bold text-slate-800">{stats.uniqueCountries}</span>
              <span className="text-slate-500">countries</span>
            </div>
            {/* Country flag chips */}
            {Object.keys(countries).length > 0 && (
              <>
                <div className="h-4 w-px bg-slate-200" />
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(countries)
                    .sort((a, b) => b[1] - a[1])
                    .map(([c, n]) => (
                      <span
                        key={c}
                        onClick={() => setCountry(country === c ? "All" : c)}
                        className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                          country === c
                            ? "border-violet-400 bg-violet-100 text-violet-800"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-violet-300 hover:bg-violet-50"
                        }`}
                      >
                        <span className="text-sm leading-none">{countryFlag(c)}</span>
                        {c}
                        <span className="text-slate-400">·{n}</span>
                      </span>
                    ))}
                </div>
              </>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search filename, customer, or proposal number…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              >
                {countryList.map(c => (
                  <option key={c} value={c}>
                    {c === "All" ? "All countries" : `${countryFlag(c)} ${c}${countries[c] ? ` (${countries[c]})` : ""}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Empty / Loading / Tree */}
          {isLoading ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white">
              <RefreshCw className="h-6 w-6 animate-spin text-violet-500" />
            </div>
          ) : proposals.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {/* Tree body */}
              <div className="max-h-[calc(100vh-440px)] divide-y divide-slate-100 overflow-auto">
                {grouped.map((cg) => {
                  const custOpen = expandedCustomers.has(cg.customer);
                  const matchedLead = findMatchingLead(cg.customer, leadMap);
                  return (
                    <div key={cg.customer}>
                      {/* ── Level 1: Customer ── */}
                      <div className="flex items-center hover:bg-violet-50/40">
                        <button
                          onClick={() => toggleCustomer(cg.customer)}
                          className="flex flex-1 items-center gap-2 px-4 py-3 text-left"
                        >
                          {custOpen
                            ? <ChevronDown className="h-4 w-4 flex-shrink-0 text-violet-500" />
                            : <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />}
                          <Building2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                          <span className="truncate font-semibold text-slate-900">{cg.customer}</span>
                        </button>
                        {matchedLead && (
                          <button
                            onClick={() => setLocation(`/sales-dashboard/lead/${encodeURIComponent(matchedLead.name)}`)}
                            title={`Open CRM lead: ${matchedLead.name}`}
                            className="mr-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            <Link2 className="h-3 w-3" />
                            CRM Lead
                          </button>
                        )}
                      </div>

                      {/* ── Level 2: Project Numbers ── */}
                      {custOpen && cg.projects.map((pg) => {
                        const projKey = `${cg.customer}||${pg.number}`;
                        const olderOpen = expandedProjects.has(projKey);
                        // latest = highest revision number (last after ascending sort)
                        const latest = pg.revisions[pg.revisions.length - 1];
                        const older = pg.revisions.slice(0, pg.revisions.length - 1);

                        const RevActions = ({ rev }: { rev: RevisionRow }) => (
                          <span className="flex items-center gap-1.5">
                            {rev.hasFile ? (
                              <>
                                <a
                                  href={`/api/proposals/${rev.id}/file`}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="View PDF"
                                  className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  View
                                </a>
                                <a
                                  href={`/api/proposals/${rev.id}/file?download=1`}
                                  download={rev.filename}
                                  title="Download PDF"
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  Download
                                </a>
                              </>
                            ) : (
                              <span
                                title="Re-run the sync client to upload this PDF."
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-400"
                              >
                                no file
                              </span>
                            )}
                          </span>
                        );

                        return (
                          <div key={pg.number}>
                            {/* Project row — shows latest revision inline */}
                            <div className="grid grid-cols-[260px_1fr_140px_120px_80px_180px] items-center gap-2 border-t border-slate-100 bg-slate-50/40 py-2.5 pl-10 pr-4">
                              {/* Project number */}
                              <span className="flex items-center gap-2">
                                <GitBranch className="h-3.5 w-3.5 flex-shrink-0 text-indigo-400" />
                                <span className="font-mono text-sm font-semibold text-indigo-700">{pg.number}</span>
                              </span>
                              {/* Latest revision label */}
                              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                <FileText className="h-3.5 w-3.5 flex-shrink-0 text-rose-400" />
                                <span className="font-medium text-slate-700">Revision {latest.revision ?? "?"}</span>
                              </span>
                              {/* Date */}
                              <span className="text-xs text-slate-600">
                                {latest.proposalDate ? (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3 text-slate-400" />
                                    {latest.proposalDate}
                                  </span>
                                ) : "—"}
                              </span>
                              {/* Country with flag */}
                              <span className="text-xs">
                                {latest.country ? (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                                    <span>{countryFlag(latest.country)}</span>
                                    {latest.country}
                                  </span>
                                ) : "—"}
                              </span>
                              {/* Pages */}
                              <span className="text-xs text-slate-500">{latest.pageCount ?? "—"}</span>
                              {/* Actions */}
                              <RevActions rev={latest} />
                            </div>

                            {/* "N older revisions" toggle — only if there are older ones */}
                            {older.length > 0 && (
                              <>
                                <button
                                  onClick={() => toggleProject(projKey)}
                                  className="flex w-full items-center gap-1.5 border-t border-dashed border-slate-100 bg-white py-1.5 pl-16 pr-4 text-[11px] text-slate-400 hover:text-violet-600"
                                >
                                  {olderOpen
                                    ? <ChevronDown className="h-3 w-3" />
                                    : <ChevronRight className="h-3 w-3" />}
                                  {older.length} older revision{older.length > 1 ? "s" : ""}
                                </button>

                                {/* Older revisions */}
                                {olderOpen && [...older].reverse().map((rev) => (
                                  <div
                                    key={rev.id}
                                    className="grid grid-cols-[260px_1fr_140px_120px_80px_180px] items-center gap-2 border-t border-dashed border-slate-100 bg-white py-2.5 pl-10 pr-4 opacity-75 hover:opacity-100"
                                  >
                                    <span />
                                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                      <FileText className="h-3 w-3 flex-shrink-0 text-slate-300" />
                                      Revision {rev.revision ?? "?"}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      {rev.proposalDate ? (
                                        <span className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3 text-slate-300" />
                                          {rev.proposalDate}
                                        </span>
                                      ) : "—"}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      {rev.country ? `${countryFlag(rev.country)} ${rev.country}` : "—"}
                                    </span>
                                    <span className="text-xs text-slate-400">{rev.pageCount ?? "—"}</span>
                                    <RevActions rev={rev} />
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 py-2 text-xs text-slate-500">
                <span>{grouped.length} customer(s) · {proposals.length} proposal(s)</span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Click a customer or project number to expand
                </span>
              </div>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100">
        <FolderOpen className="h-8 w-8 text-violet-600" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">No proposals synced yet</h3>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        Run the desktop sync client on your file-server PC to push PDF metadata
        from <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">C:\Users\IT\Desktop\proposal</code> into this dashboard.
      </p>
      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left font-mono text-xs text-slate-700">
        <div className="text-slate-500"># on the file-server PC (folder is auto-detected)</div>
        <div>cd clients\proposal-sync</div>
        <div>pip install -r requirements.txt</div>
        <div>python sync_client.py --api-url https://your-flowmatrix-host</div>
      </div>
    </div>
  );
}
