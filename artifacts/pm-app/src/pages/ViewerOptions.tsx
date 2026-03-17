import { Layout } from "@/components/Layout";
import { Box, Settings, Sliders, Palette, Video, Maximize, Search, ChevronDown, Briefcase, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useListProjects } from "@workspace/api-client-react";

function ProjectDropdown({
  selectedProject,
  onSelect,
}: {
  selectedProject: { id: number; name: string; erpnextName: string } | null;
  onSelect: (p: { id: number; name: string; erpnextName: string } | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const { data: projects = [], isLoading } = useListProjects();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    ((p as any).erpnextName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm hover:bg-white/10 transition-all min-w-[220px] max-w-[300px] backdrop-blur-sm"
      >
        <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className={`flex-1 truncate text-left ${selectedProject ? "text-white font-medium" : "text-gray-400"}`}>
          {selectedProject ? selectedProject.name : "Filter by Project"}
        </span>
        {selectedProject ? (
          <X
            className="w-3.5 h-3.5 text-gray-400 hover:text-white flex-shrink-0"
            onClick={e => { e.stopPropagation(); onSelect(null); setOpen(false); }}
          />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 z-50 w-80 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                autoFocus
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-3 text-sm text-gray-500">Loading projects...</div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">No projects found</div>
            ) : (
              filtered.map(p => (
                <button
                  key={p.id}
                  onClick={() => { onSelect({ id: p.id, name: p.name, erpnextName: (p as any).erpnextName || "" }); setOpen(false); setSearch(""); }}
                  className={`w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors flex items-center gap-2.5 ${selectedProject?.id === p.id ? "bg-primary/10" : ""}`}
                >
                  <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono flex-shrink-0">
                    {(p as any).erpnextName || "—"}
                  </span>
                  <span className="text-sm text-gray-200 truncate">{p.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ViewerOptions() {
  const [viewMode, setViewMode] = useState("shaded");
  const [bgColor, setBgColor] = useState("dark");
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [selectedProject, setSelectedProject] = useState<{ id: number; name: string; erpnextName: string } | null>(null);

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary" />
            3D Viewer Options
          </h1>
          <p className="text-muted-foreground mt-1">Configure default settings for the STEP file viewer.</p>
        </div>
        <ProjectDropdown selectedProject={selectedProject} onSelect={setSelectedProject} />
      </div>

      {/* Active project banner */}
      {selectedProject && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 mb-5 bg-primary/10 border border-primary/20 rounded-lg text-sm">
          <Briefcase className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-gray-300">Viewing 3D files for:</span>
          <span className="font-bold text-blue-400 font-mono text-xs bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">{selectedProject.erpnextName}</span>
          <span className="font-semibold text-white truncate">{selectedProject.name}</span>
          <button onClick={() => setSelectedProject(null)} className="ml-auto text-gray-500 hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-display font-bold text-white flex items-center gap-2 mb-6">
              <Sliders className="w-5 h-5 text-primary" /> Display Mode
            </h3>
            <div className="space-y-3">
              {['shaded', 'wireframe', 'flat', 'edges'].map(mode => (
                <label key={mode} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:bg-white/5 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="viewMode"
                    value={mode}
                    checked={viewMode === mode}
                    onChange={(e) => setViewMode(e.target.value)}
                    className="w-4 h-4 text-primary focus:ring-primary bg-black/50 border-white/20"
                  />
                  <span className="text-sm font-medium text-white capitalize">{mode}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-display font-bold text-white flex items-center gap-2 mb-6">
              <Palette className="w-5 h-5 text-primary" /> Environment
            </h3>
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-3">Background Color</p>
              <div className="flex gap-3">
                {[
                  { id: 'dark', hex: '#09090b', border: 'border-white/20' },
                  { id: 'navy', hex: '#1e1e2d', border: 'border-white/20' },
                  { id: 'light', hex: '#f4f4f5', border: 'border-black/20' },
                  { id: 'white', hex: '#ffffff', border: 'border-black/20' }
                ].map(bg => (
                  <button
                    key={bg.id}
                    onClick={() => setBgColor(bg.id)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${bgColor === bg.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background border-transparent' : bg.border}`}
                    style={{ backgroundColor: bg.hex }}
                    title={bg.id}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-4 pt-4 border-t border-white/5">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-white">Show Grid</span>
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="w-4 h-4 text-primary rounded focus:ring-primary bg-black/50 border-white/20"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-white">Show Axes</span>
                <input
                  type="checkbox"
                  checked={showAxes}
                  onChange={(e) => setShowAxes(e.target.checked)}
                  className="w-4 h-4 text-primary rounded focus:ring-primary bg-black/50 border-white/20"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden relative min-h-[500px] flex items-center justify-center">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] opacity-20 bg-cover bg-center grayscale mix-blend-luminosity"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>

          <div className="relative z-10 text-center space-y-6">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-primary/20 flex items-center justify-center border border-primary/30 backdrop-blur-sm">
              <Box className="w-12 h-12 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-display font-bold text-white mb-2">
                {selectedProject ? `${selectedProject.erpnextName} — 3D Files` : "Ready for 3D Assets"}
              </h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {selectedProject
                  ? `Showing 3D design files for ${selectedProject.name}.`
                  : "Select a project to browse its 3D design files."}
              </p>
            </div>

            <div className="inline-flex items-center gap-6 px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Mode</span>
                <span className="text-sm text-white capitalize">{viewMode}</span>
              </div>
              <div className="w-px h-8 bg-white/10"></div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Theme</span>
                <span className="text-sm text-white capitalize">{bgColor}</span>
              </div>
              <div className="w-px h-8 bg-white/10"></div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Grid</span>
                <span className="text-sm text-white">{showGrid ? 'On' : 'Off'}</span>
              </div>
            </div>
          </div>

          <div className="absolute top-4 right-4 flex gap-2">
            <button className="p-2 bg-black/40 hover:bg-black/60 rounded-lg text-white backdrop-blur-md border border-white/10 transition-colors">
              <Video className="w-4 h-4" />
            </button>
            <button className="p-2 bg-black/40 hover:bg-black/60 rounded-lg text-white backdrop-blur-md border border-white/10 transition-colors">
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
