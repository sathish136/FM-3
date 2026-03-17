import { Layout } from "@/components/Layout";
import {
  Box, ChevronRight, Search, ArrowLeft,
  Droplets, Waves, Wind, Flame, Thermometer,
  Gauge, FlaskConical, Cpu, Zap, Settings2,
} from "lucide-react";
import { useState } from "react";
import { useListProjects } from "@workspace/api-client-react";

const SYSTEMS = [
  { id: "etp",       label: "ETP System",        icon: Droplets,    color: "text-cyan-600",    bg: "bg-cyan-50",    border: "border-cyan-200" },
  { id: "stp",       label: "STP System",        icon: Waves,       color: "text-blue-600",    bg: "bg-blue-50",    border: "border-blue-200" },
  { id: "wtp",       label: "WTP / RO System",   icon: Droplets,    color: "text-sky-600",     bg: "bg-sky-50",     border: "border-sky-200" },
  { id: "cooling",   label: "Cooling Tower",     icon: Wind,        color: "text-teal-600",    bg: "bg-teal-50",    border: "border-teal-200" },
  { id: "fire",      label: "Fire Fighting",     icon: Flame,       color: "text-red-600",     bg: "bg-red-50",     border: "border-red-200" },
  { id: "hvac",      label: "HVAC",              icon: Thermometer, color: "text-orange-600",  bg: "bg-orange-50",  border: "border-orange-200" },
  { id: "air",       label: "Compressed Air",    icon: Gauge,       color: "text-violet-600",  bg: "bg-violet-50",  border: "border-violet-200" },
  { id: "chemical",  label: "Chemical Dosing",   icon: FlaskConical,color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  { id: "instruments",label: "Instruments",      icon: Cpu,         color: "text-indigo-600",  bg: "bg-indigo-50",  border: "border-indigo-200" },
  { id: "electrical",label: "Electrical",        icon: Zap,         color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-200" },
  { id: "utility",   label: "Utility",           icon: Settings2,   color: "text-gray-600",    bg: "bg-gray-100",   border: "border-gray-200" },
];

type Project = { id: number; name: string; erpnextName: string };
type System  = typeof SYSTEMS[number];

function ProjectList({ onSelect }: { onSelect: (p: Project) => void }) {
  const [search, setSearch] = useState("");
  const { data: projects = [], isLoading } = useListProjects();

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    ((p as any).erpnextName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
          <Box className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">3D Viewer</h1>
          <p className="text-sm text-gray-500">Select a project to view its 3D models</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Project grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect({ id: p.id, name: p.name, erpnextName: (p as any).erpnextName || "" })}
              className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
                <Box className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold text-blue-700 font-mono mb-0.5">
                  {(p as any).erpnextName || "—"}
                </span>
                <span className="block text-sm font-medium text-gray-800 truncate">{p.name}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-10">No projects found</p>
      )}
    </div>
  );
}

function SystemList({
  project,
  onBack,
  onSelect,
}: {
  project: Project;
  onBack: () => void;
  onSelect: (s: System) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> All Projects
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
        <span className="text-sm font-semibold text-gray-700 font-mono">{project.erpnextName}</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Select a system to view its 3D models</p>
      </div>

      {/* System grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {SYSTEMS.map(sys => {
          const Icon = sys.icon;
          return (
            <button
              key={sys.id}
              onClick={() => onSelect(sys)}
              className={`group flex flex-col items-center gap-3 p-5 bg-white border ${sys.border} rounded-xl hover:shadow-md transition-all text-center`}
            >
              <div className={`w-11 h-11 rounded-xl ${sys.bg} ${sys.border} border flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${sys.color}`} />
              </div>
              <span className="text-sm font-semibold text-gray-800 leading-tight">{sys.label}</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ModelView({
  project,
  system,
  onBackToProject,
  onBackToProjects,
}: {
  project: Project;
  system: System;
  onBackToProject: () => void;
  onBackToProjects: () => void;
}) {
  const Icon = system.icon;
  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={onBackToProjects} className="text-gray-400 hover:text-gray-700 transition-colors">All Projects</button>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
        <button onClick={onBackToProject} className="text-gray-500 hover:text-gray-800 font-mono font-semibold transition-colors">{project.erpnextName}</button>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
        <span className="text-gray-800 font-semibold">{system.label}</span>
      </div>

      {/* Viewer placeholder */}
      <div className={`rounded-2xl border ${system.border} ${system.bg} min-h-[480px] flex flex-col items-center justify-center gap-4`}>
        <div className={`w-16 h-16 rounded-2xl bg-white border ${system.border} flex items-center justify-center shadow-sm`}>
          <Icon className={`w-8 h-8 ${system.color}`} />
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-800">{system.label}</p>
          <p className="text-sm text-gray-500 mt-1">
            3D models for <span className="font-semibold font-mono">{project.erpnextName}</span> — {project.name}
          </p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-gray-200 shadow-sm text-sm font-medium text-gray-700 hover:shadow-md transition-all">
          <Box className="w-4 h-4" /> Load 3D Models
        </button>
      </div>
    </div>
  );
}

export default function ViewerOptions() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);

  return (
    <Layout>
      <div className="p-6 max-w-6xl">
        {!selectedProject && (
          <ProjectList onSelect={p => { setSelectedProject(p); setSelectedSystem(null); }} />
        )}
        {selectedProject && !selectedSystem && (
          <SystemList
            project={selectedProject}
            onBack={() => setSelectedProject(null)}
            onSelect={setSelectedSystem}
          />
        )}
        {selectedProject && selectedSystem && (
          <ModelView
            project={selectedProject}
            system={selectedSystem}
            onBackToProject={() => setSelectedSystem(null)}
            onBackToProjects={() => { setSelectedProject(null); setSelectedSystem(null); }}
          />
        )}
      </div>
    </Layout>
  );
}
