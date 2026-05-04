import { Layout } from "@/components/Layout";
import {
  Search, Save, Loader2, UserCheck, MapPin,
  X, RefreshCw, Globe, Key, Eye, EyeOff, Users, Check, ChevronDown,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ErpAgent {
  erp_name: string;
  agent_name: string;
  region: string;
  agent_login_id: string | null;
  has_password: boolean;
  password_plain: string | null;
  lead_ids: string[];
}

interface AgentLead {
  name: string;
  company_name: string;
  country: string;
  state: string;
  city: string;
  contact_person: string;
  lead_owner: string;
  lead_status: string;
  next_follow_up: string;
  mobile_no?: string;
}

const STATUS_BADGE: Record<string, string> = {
  Open:        "bg-blue-50 text-blue-700 border-blue-200",
  Converted:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  Opportunity: "bg-violet-50 text-violet-700 border-violet-200",
  Quotation:   "bg-amber-50 text-amber-700 border-amber-200",
  Closed:      "bg-gray-100 text-gray-600 border-gray-200",
  Replied:     "bg-teal-50 text-teal-700 border-teal-200",
};

function AgentAvatar({ agent, size = "sm" }: { agent: ErpAgent; size?: "sm" | "md" }) {
  const dim = size === "md" ? "w-9 h-9 text-sm" : "w-7 h-7 text-xs";
  const initials = agent.agent_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700"];
  const color = colors[agent.erp_name.charCodeAt(0) % colors.length];
  return (
    <div className={`${dim} ${color} rounded-full flex items-center justify-center shrink-0 font-bold border border-border`}>
      {initials}
    </div>
  );
}

/* ── Multi-select country dropdown ─────────────────────────────────────────── */
function CountryMultiSelect({
  allCountries,
  selected,
  onChange,
}: {
  allCountries: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const allSelected = selected.length === 0;
  const label = allSelected
    ? "All Countries"
    : selected.length === 1
      ? selected[0]
      : `${selected.length} countries`;

  function toggleAll() { onChange([]); }
  function toggle(c: string) {
    onChange(selected.includes(c) ? selected.filter(x => x !== c) : [...selected, c]);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 pl-3 pr-2 py-2 text-xs rounded-lg border border-border bg-muted text-foreground hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-violet-300 min-w-[140px] w-44 justify-between"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">{label}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 right-0 w-56 bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-60 overflow-y-auto py-1">
            {/* All option */}
            <button
              type="button"
              onClick={toggleAll}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted transition-colors ${allSelected ? "text-violet-700 font-semibold" : "text-foreground"}`}
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${allSelected ? "bg-violet-600 border-violet-600" : "border-border"}`}>
                {allSelected && <Check className="w-2.5 h-2.5 text-white" />}
              </span>
              All Countries
            </button>
            <div className="h-px bg-border mx-3 my-1" />
            {allCountries.map(c => {
              const isOn = selected.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggle(c)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted transition-colors ${isOn ? "text-violet-700 font-semibold" : "text-foreground"}`}
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isOn ? "bg-violet-600 border-violet-600" : "border-border"}`}>
                    {isOn && <Check className="w-2.5 h-2.5 text-white" />}
                  </span>
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────────── */
export default function AgentManagement() {
  const { toast } = useToast();

  const [agents, setAgents] = useState<ErpAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [agentSearch, setAgentSearch] = useState("");

  const [selectedAgent, setSelectedAgent] = useState<ErpAgent | null>(null);

  const [allLeads, setAllLeads] = useState<AgentLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [assignedLeads, setAssignedLeads] = useState<string[]>([]);
  const [leadSearch, setLeadSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [credLoginId, setCredLoginId] = useState("");
  const [credPassword, setCredPassword] = useState("");
  const [credShowPwd, setCredShowPwd] = useState(false);
  const [credSaving, setCredSaving] = useState(false);

  function loadAgents() {
    setLoading(true);
    fetch(`${BASE}/api/erp-agents`)
      .then(r => r.ok ? r.json() : [])
      .then((data: ErpAgent[]) => {
        const sorted = [...data].sort((a, b) => {
          const aHas = !!a.agent_login_id;
          const bHas = !!b.agent_login_id;
          if (aHas && !bHas) return -1;
          if (!aHas && bHas) return 1;
          return a.agent_name.localeCompare(b.agent_name);
        });
        setAgents(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAgents();
    setLoadingLeads(true);
    fetch(`${BASE}/api/sales-dashboard/open_leads`)
      .then(r => r.ok ? r.json() : { data: [] })
      .then(d => setAllLeads(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingLeads(false));
  }, []);

  useEffect(() => {
    if (!selectedAgent) {
      setAssignedLeads([]);
      setCredLoginId("");
      setCredPassword("");
      return;
    }
    setAssignedLeads(selectedAgent.lead_ids ?? []);
    setCredLoginId(selectedAgent.agent_login_id ?? "");
    setCredPassword(selectedAgent.password_plain ?? "");
  }, [selectedAgent?.erp_name]);

  async function saveAssignments() {
    if (!selectedAgent) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/erp-agents/${encodeURIComponent(selectedAgent.erp_name)}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_ids: assignedLeads }),
      });
      if (!res.ok) throw new Error(await res.text());
      setAgents(prev => prev.map(a =>
        a.erp_name === selectedAgent.erp_name ? { ...a, lead_ids: assignedLeads } : a
      ));
      setSelectedAgent(prev => prev ? { ...prev, lead_ids: assignedLeads } : prev);
      toast({ title: `Lead assignments saved for ${selectedAgent.agent_name}` });
    } catch (e) {
      toast({ title: "Failed to save assignments", description: String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function saveCredentials() {
    if (!selectedAgent || !credLoginId.trim()) return;
    setCredSaving(true);
    try {
      const body: Record<string, string> = {
        login_id: credLoginId.trim(),
        agent_name: selectedAgent.agent_name,
      };
      if (credPassword) body.password = credPassword;
      const res = await fetch(`${BASE}/api/erp-agents/${encodeURIComponent(selectedAgent.erp_name)}/credentials`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      const newHasPwd = credPassword ? true : selectedAgent.has_password;
      const updatedAgent = {
        ...selectedAgent,
        agent_login_id: credLoginId.trim(),
        has_password: newHasPwd,
        password_plain: credPassword || selectedAgent.password_plain,
      };
      setAgents(prev => prev.map(a =>
        a.erp_name === selectedAgent.erp_name ? updatedAgent : a
      ).sort((a, b) => {
        const aHas = !!a.agent_login_id; const bHas = !!b.agent_login_id;
        if (aHas && !bHas) return -1; if (!aHas && bHas) return 1;
        return a.agent_name.localeCompare(b.agent_name);
      }));
      setSelectedAgent(updatedAgent);
      toast({ title: "Login credentials saved successfully" });
    } catch (e) {
      toast({ title: "Failed to save credentials", description: String(e), variant: "destructive" });
    } finally {
      setCredSaving(false);
    }
  }

  function toggleLead(id: string) {
    setAssignedLeads(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const filteredAgents = agents.filter(a =>
    (a.agent_name + a.region + (a.agent_login_id ?? "")).toLowerCase().includes(agentSearch.toLowerCase())
  );

  const allCountries = Array.from(new Set(allLeads.map(l => l.country).filter(Boolean))).sort();

  const filteredLeads = allLeads.filter(l => {
    const matchCountry = countryFilter.length === 0 || countryFilter.includes(l.country);
    if (!leadSearch.trim()) return matchCountry;
    const q = leadSearch.toLowerCase();
    return matchCountry && (l.company_name + l.name + l.country + l.contact_person + l.city).toLowerCase().includes(q);
  });

  const configuredCount = agents.filter(a => !!a.agent_login_id).length;

  return (
    <Layout>
      <div className="flex flex-col h-full overflow-hidden">

        {/* ── Header ── */}
        <div className="shrink-0 bg-card border-b border-border px-6 py-4 flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#1a3fbd] flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">Agent Management</h1>
              <p className="text-[10px] text-muted-foreground">
                {agents.length} agents from ERPNext ·{" "}
                <span className="text-blue-600 font-semibold">{configuredCount}</span> with login credentials
              </p>
            </div>
          </div>
          <button onClick={loadAgents} disabled={loading}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Left: Agent List ── */}
          <div className="w-72 shrink-0 bg-card border-r border-border flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-foreground">ERPNext Agents</p>
                <span className="text-[10px] text-muted-foreground">{filteredAgents.length} shown</span>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={agentSearch}
                  onChange={e => setAgentSearch(e.target.value)}
                  placeholder="Search by name or region…"
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAgents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-4">
                  <Users className="w-6 h-6 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">No agents found</p>
                </div>
              ) : filteredAgents.map(agent => {
                const isSel = selectedAgent?.erp_name === agent.erp_name;
                const hasCreds = !!agent.agent_login_id;
                return (
                  <div key={agent.erp_name}
                    onClick={() => setSelectedAgent(agent)}
                    className={`w-full flex items-center gap-3 px-4 py-3 border-b border-border/50 transition-colors cursor-pointer select-none ${isSel ? "bg-accent" : "hover:bg-muted/50"}`}
                  >
                    <AgentAvatar agent={agent} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${isSel ? "text-primary" : "text-foreground"}`}>{agent.agent_name}</p>
                      {agent.region && (
                        <p className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5 shrink-0" />{agent.region}
                        </p>
                      )}
                      {hasCreds ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 font-semibold mt-0.5">
                          <Key className="w-2.5 h-2.5" /> {agent.agent_login_id}
                        </span>
                      ) : (
                        <span className="text-[9px] text-amber-500 font-medium mt-0.5 block">No login set</span>
                      )}
                    </div>
                    <div className={`shrink-0 w-2 h-2 rounded-full ${hasCreds ? "bg-emerald-400" : "bg-slate-200"}`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right: Detail Panel ── */}
          {!selectedAgent ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2 max-w-xs">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto">
                  <UserCheck className="w-7 h-7 text-blue-500" />
                </div>
                <p className="text-sm font-semibold text-foreground">Select an agent to configure</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  All agents are pulled from ERPNext Agent Details. Select one to set their FlowMatrix login and assign leads.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

              {/* Agent header */}
              <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <AgentAvatar agent={selectedAgent} size="md" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-foreground">{selectedAgent.agent_name}</p>
                      {selectedAgent.agent_login_id && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-wide">
                          <Key className="w-2.5 h-2.5" /> Login configured
                        </span>
                      )}
                    </div>
                    {selectedAgent.region && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{selectedAgent.region}
                      </p>
                    )}
                  </div>
                </div>
                <button onClick={saveAssignments} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a3fbd] hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-60">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Save Leads ({assignedLeads.length})
                </button>
              </div>

              {/* Credentials strip */}
              <div className="shrink-0 border-b border-border bg-blue-50/50 px-6 py-3 flex flex-wrap items-end gap-4">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
                    <Key className="w-3.5 h-3.5 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-blue-900">FlowMatrix Login Credentials</p>
                    <p className="text-[10px] text-blue-500">
                      {selectedAgent.has_password
                        ? `Login: ${selectedAgent.agent_login_id} · Password set`
                        : selectedAgent.agent_login_id
                          ? `Login: ${selectedAgent.agent_login_id} · No password yet`
                          : "No credentials — agent cannot log in yet"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 flex-1">
                  {/* Login ID */}
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide px-0.5">Login ID</label>
                    <input
                      value={credLoginId}
                      onChange={e => setCredLoginId(e.target.value)}
                      placeholder="e.g. technotex"
                      className="px-3 py-1.5 text-xs rounded-lg border border-border bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 min-w-[130px] w-36"
                    />
                  </div>

                  {/* Password */}
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide px-0.5">Password</label>
                    <div className="relative">
                      <input
                        type={credShowPwd ? "text" : "password"}
                        value={credPassword}
                        onChange={e => setCredPassword(e.target.value)}
                        placeholder="Set password…"
                        className="px-3 py-1.5 pr-8 text-xs rounded-lg border border-border bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 min-w-[130px] w-40"
                      />
                      <button type="button" onClick={() => setCredShowPwd(p => !p)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {credShowPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={saveCredentials}
                    disabled={credSaving || !credLoginId.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a3fbd] hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50 mt-4">
                    {credSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Key className="w-3 h-3" />}
                    Save Login
                  </button>
                </div>
              </div>

              {/* 2-panel: Assigned Leads | All Leads Picker */}
              <div className="flex flex-1 min-h-0 overflow-hidden">

                {/* Assigned Leads Panel */}
                <div className="w-72 shrink-0 border-r border-border flex flex-col overflow-hidden bg-card">
                  <div className="p-4 border-b border-border">
                    <p className="text-xs font-bold text-foreground">Assigned Leads</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {assignedLeads.length} lead{assignedLeads.length !== 1 ? "s" : ""} assigned
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {assignedLeads.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center py-12">
                        <p className="text-xs text-muted-foreground">No leads assigned yet</p>
                        <p className="text-[10px] text-muted-foreground/60">Pick leads from the panel on the right.</p>
                      </div>
                    ) : assignedLeads.map(id => {
                      const lead = allLeads.find(l => l.name === id);
                      return (
                        <div key={id} className="flex items-start gap-2 px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate text-foreground">{lead?.company_name || id}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{id}</p>
                            {lead?.country && (
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5 flex items-center gap-1 flex-wrap">
                                <MapPin className="w-2.5 h-2.5 inline shrink-0" />
                                {lead.city || lead.state || lead.country}
                                {lead.lead_status && (
                                  <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[8px] font-semibold border ${STATUS_BADGE[lead.lead_status] ?? "bg-muted text-muted-foreground border-border"}`}>
                                    {lead.lead_status}
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                          <button onClick={() => toggleLead(id)}
                            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors border border-rose-200">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* All Leads Picker */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-border bg-card space-y-2 shrink-0">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-foreground">All Open Leads</p>
                        <p className="text-[10px] text-muted-foreground">Click to assign or unassign</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {filteredLeads.length} of {allLeads.length} leads
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                          value={leadSearch}
                          onChange={e => setLeadSearch(e.target.value)}
                          placeholder="Search by company, contact…"
                          className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                        />
                      </div>
                      <CountryMultiSelect
                        allCountries={allCountries}
                        selected={countryFilter}
                        onChange={setCountryFilter}
                      />
                    </div>

                    {/* Active country chips */}
                    {countryFilter.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {countryFilter.map(c => (
                          <span key={c}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold border border-blue-200">
                            {c}
                            <button onClick={() => setCountryFilter(prev => prev.filter(x => x !== c))}
                              className="hover:text-blue-900 transition-colors">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                        <button onClick={() => setCountryFilter([])}
                          className="text-[10px] text-muted-foreground hover:text-foreground underline transition-colors">
                          Clear all
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {loadingLeads ? (
                      <div className="flex items-center justify-center h-32">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredLeads.length === 0 ? (
                      <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                        No leads match the current filter
                      </div>
                    ) : filteredLeads.map(lead => {
                      const isAssigned = assignedLeads.includes(lead.name);
                      return (
                        <button key={lead.name} onClick={() => toggleLead(lead.name)}
                          className={`w-full flex items-center gap-3 px-4 py-3 border-b border-border/40 text-left transition-colors ${isAssigned ? "bg-blue-50/60 hover:bg-blue-50" : "hover:bg-muted/40"}`}>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isAssigned ? "bg-[#1a3fbd] border-[#1a3fbd]" : "border-border"}`}>
                            {isAssigned && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{lead.company_name || lead.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{lead.name}</p>
                          </div>
                          {lead.country && (
                            <span className="text-[10px] text-muted-foreground hidden sm:flex items-center gap-0.5 shrink-0">
                              <MapPin className="w-2.5 h-2.5" />{lead.city || lead.state || lead.country}
                            </span>
                          )}
                          {lead.lead_status && (
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${STATUS_BADGE[lead.lead_status] ?? "bg-muted text-muted-foreground border-border"}`}>
                              {lead.lead_status}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
