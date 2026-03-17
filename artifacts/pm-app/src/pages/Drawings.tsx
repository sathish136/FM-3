import { Layout } from "@/components/Layout";
import { useLocation } from "wouter";
import { Cog, Zap, Building2, Upload, FolderOpen, FileText, Search } from "lucide-react";
import { useState } from "react";

const TYPES = {
  mechanical: {
    label: "Design Mechanical",
    icon: Cog,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    accent: "bg-blue-600",
    description: "Mechanical engineering drawings, P&ID diagrams, equipment layouts and process designs.",
    categories: ["P&ID Diagrams", "Equipment Layout", "Piping Isometrics", "General Arrangement", "Fabrication Drawings"],
  },
  electrical: {
    label: "Design Electrical",
    icon: Zap,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    accent: "bg-amber-500",
    description: "Electrical single line diagrams, panel layouts, cable schedules and control schematics.",
    categories: ["Single Line Diagrams", "Panel Layouts", "Cable Schedules", "Control Schematics", "Earthing Layouts"],
  },
  civil: {
    label: "Design Civil",
    icon: Building2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    accent: "bg-emerald-600",
    description: "Civil and structural drawings, foundation plans, site layouts and architectural designs.",
    categories: ["Foundation Plans", "Structural Details", "Site Layout", "Architectural Drawings", "RCC Details"],
  },
};

const SAMPLE_FILES = [
  { name: "General Arrangement Drawing", rev: "Rev 3", date: "Mar 2026", size: "2.4 MB" },
  { name: "Equipment Layout Plan", rev: "Rev 2", date: "Feb 2026", size: "1.8 MB" },
  { name: "Detail Drawing - Section A", rev: "Rev 1", date: "Jan 2026", size: "980 KB" },
  { name: "Isometric View", rev: "Rev 4", date: "Mar 2026", size: "3.1 MB" },
  { name: "As-Built Drawing", rev: "Rev 0", date: "Dec 2025", size: "1.2 MB" },
];

export default function Drawings() {
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const type = location.endsWith("electrical")
    ? "electrical"
    : location.endsWith("civil")
    ? "civil"
    : "mechanical";

  const cfg = TYPES[type];
  const Icon = cfg.icon;

  const filteredFiles = SAMPLE_FILES.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-6 space-y-5 max-w-6xl">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${cfg.bg} ${cfg.border} border flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${cfg.color}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{cfg.label}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{cfg.description}</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
            <Upload className="w-4 h-4" /> Upload Drawing
          </button>
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
              activeCategory === null
                ? `${cfg.accent} text-white border-transparent`
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            All
          </button>
          {cfg.categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                activeCategory === cat
                  ? `${cfg.accent} text-white border-transparent`
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search + file list */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search drawings..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <span className="text-sm text-gray-400 ml-auto">{filteredFiles.length} files</span>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[2fr_100px_120px_80px_80px] gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>File Name</span>
            <span>Revision</span>
            <span>Date</span>
            <span>Size</span>
            <span className="text-right">Action</span>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredFiles.map((file, i) => (
              <div key={i} className="grid grid-cols-[2fr_100px_120px_80px_80px] gap-4 px-5 py-3.5 items-center hover:bg-gray-50 transition-colors group">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg ${cfg.bg} ${cfg.border} border flex items-center justify-center flex-shrink-0`}>
                    <FileText className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                </div>
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded w-fit">{file.rev}</span>
                <span className="text-sm text-gray-500">{file.date}</span>
                <span className="text-xs text-gray-400">{file.size}</span>
                <div className="flex justify-end">
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200">
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredFiles.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No drawings found</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
