import { Layout } from "@/components/Layout";
import { Upload, Search, Grid, List, Download, Share2, Trash2, Plus, Image, FileText, Film, FolderOpen } from "lucide-react";
import { useState } from "react";

type FileType = "all" | "images" | "documents" | "videos";

const assets = [
  { id: 1, name: "campaign-hero.png",    type: "image",    size: "2.4 MB", date: "Mar 15, 2026", tags: ["marketing"], iconBg: "bg-blue-50",   iconColor: "text-blue-600" },
  { id: 2, name: "product-demo.mp4",     type: "video",    size: "18.7 MB", date: "Mar 14, 2026", tags: ["product"],   iconBg: "bg-violet-50", iconColor: "text-violet-600" },
  { id: 3, name: "brand-guide.pdf",      type: "document", size: "4.1 MB", date: "Mar 12, 2026", tags: ["brand"],     iconBg: "bg-red-50",    iconColor: "text-red-600" },
  { id: 4, name: "team-photo.jpg",       type: "image",    size: "3.2 MB", date: "Mar 11, 2026", tags: ["team"],      iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  { id: 5, name: "q1-report.pdf",        type: "document", size: "1.8 MB", date: "Mar 10, 2026", tags: ["reports"],   iconBg: "bg-amber-50",  iconColor: "text-amber-600" },
  { id: 6, name: "logo-variants.png",    type: "image",    size: "0.8 MB", date: "Mar 9, 2026",  tags: ["brand"],     iconBg: "bg-pink-50",   iconColor: "text-pink-600" },
  { id: 7, name: "explainer-video.mp4",  type: "video",    size: "42.3 MB", date: "Mar 8, 2026", tags: ["marketing"], iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
  { id: 8, name: "office-shoot.jpg",     type: "image",    size: "5.1 MB", date: "Mar 7, 2026",  tags: ["office"],    iconBg: "bg-teal-50",   iconColor: "text-teal-600" },
  { id: 9, name: "contract-template.pdf",type: "document", size: "0.3 MB", date: "Mar 6, 2026",  tags: ["legal"],     iconBg: "bg-orange-50", iconColor: "text-orange-600" },
];

const typeIcons: Record<string, React.ElementType> = {
  image: Image,
  document: FileText,
  video: Film,
};

export default function Gallery() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterType, setFilterType] = useState<FileType>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);

  const filtered = assets.filter((a) => {
    if (filterType !== "all" && a.type + "s" !== filterType) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleSelect = (id: number) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <Layout>
      <div className="p-6 space-y-5 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Files</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your project files and media assets</p>
          </div>
          <button className="btn-primary">
            <Upload className="w-4 h-4" /> Upload Files
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Files", value: assets.length, icon: FolderOpen, color: "text-blue-600 bg-blue-50" },
            { label: "Storage Used", value: "78.7 MB", icon: Download, color: "text-violet-600 bg-violet-50" },
            { label: "Shared Files", value: "3", icon: Share2, color: "text-emerald-600 bg-emerald-50" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            {(["all", "images", "documents", "videos"] as FileType[]).map((t) => (
              <button key={t} onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${filterType === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-gray-800" : "text-gray-400"}`}><Grid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow-sm text-gray-800" : "text-gray-400"}`}><List className="w-4 h-4" /></button>
          </div>
          {selected.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-gray-500">{selected.length} selected</span>
              <button onClick={() => setSelected([])} className="text-xs text-blue-600 hover:underline">Clear</button>
              <button className="p-1.5 rounded text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
              <button className="p-1.5 rounded text-gray-500 hover:bg-gray-100 transition-colors"><Download className="w-4 h-4" /></button>
            </div>
          )}
        </div>

        {/* Grid View */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            <button className="aspect-square border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all">
              <Plus className="w-7 h-7" />
              <span className="text-xs font-medium">Upload</span>
            </button>
            {filtered.map((asset) => {
              const Icon = typeIcons[asset.type];
              const isSelected = selected.includes(asset.id);
              return (
                <div
                  key={asset.id}
                  onClick={() => toggleSelect(asset.id)}
                  className={`group relative aspect-square bg-gray-50 border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2 ring-blue-500 border-blue-300" : "border-gray-200"}`}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
                    <div className={`w-12 h-12 rounded-xl ${asset.iconBg} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${asset.iconColor}`} />
                    </div>
                    <p className="text-xs text-gray-600 font-medium truncate w-full text-center">{asset.name}</p>
                    <p className="text-[10px] text-gray-400">{asset.size}</p>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={e => { e.stopPropagation(); }} className="p-1 bg-white rounded shadow-sm text-gray-500 hover:text-gray-700"><Download className="w-3 h-3" /></button>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 left-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">✓</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Modified</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((asset) => {
                  const Icon = typeIcons[asset.type];
                  const isSelected = selected.includes(asset.id);
                  return (
                    <tr key={asset.id} onClick={() => toggleSelect(asset.id)}
                      className={`cursor-pointer transition-colors hover:bg-gray-50 ${isSelected ? "bg-blue-50" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${asset.iconBg} flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${asset.iconColor}`} />
                          </div>
                          <span className="font-medium text-gray-900">{asset.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-500">{asset.type}</td>
                      <td className="px-4 py-3 text-gray-500">{asset.size}</td>
                      <td className="px-4 py-3 text-gray-500">{asset.date}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><Download className="w-3.5 h-3.5" /></button>
                          <button className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
