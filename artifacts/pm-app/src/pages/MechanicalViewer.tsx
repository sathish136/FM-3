import { Layout } from "@/components/Layout";
import { Box, Search, Droplets, ChevronDown, FilterX, ExternalLink } from "lucide-react";
import { useState, useMemo } from "react";
import { useListProjects } from "@workspace/api-client-react";

const ETP_SYSTEMS = [
  { id: "all",        label: "All Systems" },
  { id: "etp",        label: "ETP System" },
  { id: "stp",        label: "STP System" },
  { id: "wtp",        label: "WTP / RO System" },
  { id: "cooling",    label: "Cooling Tower" },
  { id: "fire",       label: "Fire Fighting" },
  { id: "hvac",       label: "HVAC" },
  { id: "air",        label: "Compressed Air" },
  { id: "chemical",   label: "Chemical Dosing" },
  { id: "instruments",label: "Instruments" },
  { id: "electrical", label: "Electrical" },
  { id: "utility",    label: "Utility" },
];

type ModelEntry = {
  id: string;
  projectId: number;
  projectName: string;
  erpnextName: string;
  system: string;
  label: string;
};

function buildModelEntries(projects: any[]): ModelEntry[] {
  const entries: ModelEntry[] = [];
  ETP_SYSTEMS.filter(s => s.id !== "all").forEach(sys => {
    projects.forEach(p => {
      entries.push({
        id: `${p.id}-${sys.id}`,
        projectId: p.id,
        projectName: p.name,
        erpnextName: (p as any).erpnextName || "",
        system: sys.id,
        label: sys.label,
      });
    });
  });
  return entries;
}

export default function MechanicalViewer() {
  const [projectSearch, setProjectSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedSystem, setSelectedSystem] = useState<string>("all");
  const [projectOpen, setProjectOpen] = useState(false);

  const { data: projects = [], isLoading } = useListProjects();

  const modelEntries = useMemo(() => buildModelEntries(projects), [projects]);

  const filteredEntries = useMemo(() => {
    return modelEntries.filter(e => {
      const matchProject = selectedProject === "all" || String(e.projectId) === selectedProject;
      const matchSystem  = selectedSystem  === "all" || e.system === selectedSystem;
      return matchProject && matchSystem;
    });
  }, [modelEntries, selectedProject, selectedSystem]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p: any) =>
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      ((p as any).erpnextName || "").toLowerCase().includes(projectSearch.toLowerCase())
    );
  }, [projects, projectSearch]);

  const selectedProjectLabel = selectedProject === "all"
    ? "All Projects"
    : (projects.find((p: any) => String(p.id) === selectedProject) as any)?.name ?? "All Projects";

  const selectedSystemLabel = ETP_SYSTEMS.find(s => s.id === selectedSystem)?.label ?? "All Systems";

  const hasFilters = selectedProject !== "all" || selectedSystem !== "all";

  function clearFilters() {
    setSelectedProject("all");
    setSelectedSystem("all");
    setProjectSearch("");
  }

  return (
    <Layout>
      <div className="p-6 max-w-6xl space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
            <Box className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mechanical 3D View</h1>
            <p className="text-sm text-gray-500">Filter by project and system to view 3D models</p>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Project dropdown */}
          <div className="relative">
            <button
              onClick={() => setProjectOpen(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-400 hover:shadow-sm transition-all min-w-[180px] justify-between"
            >
              <span className="truncate max-w-[160px]">{selectedProjectLabel}</span>
              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>
            {projectOpen && (
              <div className="absolute z-50 top-full mt-1 left-0 w-72 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search projects..."
                      value={projectSearch}
                      onChange={e => setProjectSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  <button
                    onClick={() => { setSelectedProject("all"); setProjectOpen(false); setProjectSearch(""); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${selectedProject === "all" ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700"}`}
                  >
                    All Projects
                  </button>
                  {isLoading ? (
                    <div className="px-4 py-3 text-sm text-gray-400">Loading…</div>
                  ) : (
                    filteredProjects.map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProject(String(p.id)); setProjectOpen(false); setProjectSearch(""); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${String(p.id) === selectedProject ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700"}`}
                      >
                        <span className="block text-[10px] font-mono text-blue-600">{(p as any).erpnextName || ""}</span>
                        <span>{p.name}</span>
                      </button>
                    ))
                  )}
                  {!isLoading && filteredProjects.length === 0 && (
                    <p className="px-4 py-3 text-sm text-gray-400">No projects found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* System dropdown */}
          <div className="relative">
            <select
              value={selectedSystem}
              onChange={e => setSelectedSystem(e.target.value)}
              className="appearance-none flex items-center gap-2 px-4 py-2 pr-8 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-400 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
            >
              {ETP_SYSTEMS.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 border border-dashed border-gray-300 hover:border-red-300 rounded-lg transition-all"
            >
              <FilterX className="w-4 h-4" />
              Clear filters
            </button>
          )}

          <span className="ml-auto text-sm text-gray-400">
            {filteredEntries.length} model{filteredEntries.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Active filter pills */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2">
            {selectedProject !== "all" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                <Box className="w-3 h-3" /> {selectedProjectLabel}
              </span>
            )}
            {selectedSystem !== "all" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 text-xs font-semibold">
                <Droplets className="w-3 h-3" /> {selectedSystemLabel}
              </span>
            )}
          </div>
        )}

        {/* Results grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Box className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">No models match your filters</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting the project or system selection</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEntries.map(entry => (
              <div
                key={entry.id}
                className="group bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold text-blue-700 font-mono mb-0.5 truncate">
                      {entry.erpnextName || "—"}
                    </span>
                    <span className="block text-sm font-semibold text-gray-800 truncate">
                      {entry.projectName}
                    </span>
                  </div>
                  <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-700 text-[10px] font-semibold">
                    {entry.label}
                  </span>
                </div>
                <button className="w-full flex items-center justify-center gap-2 mt-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-xs font-medium text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all">
                  <ExternalLink className="w-3.5 h-3.5" /> Open 3D Model
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Close project dropdown on outside click */}
      {projectOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setProjectOpen(false)} />
      )}
    </Layout>
  );
}
