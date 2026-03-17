import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { Upload, Search, Filter, Grid, List, Download, Share2, Trash2, Plus, Image, FileText, Film } from "lucide-react";
import { useState } from "react";

type FileType = "all" | "images" | "documents" | "videos";

const assets = [
  { id: 1, name: "campaign-hero.png", type: "image", size: "2.4 MB", date: "Mar 15, 2026", tags: ["marketing", "spring"], color: "from-blue-400 to-cyan-500", thumb: "🖼" },
  { id: 2, name: "product-demo.mp4", type: "video", size: "18.7 MB", date: "Mar 14, 2026", tags: ["product", "demo"], color: "from-violet-400 to-purple-500", thumb: "🎬" },
  { id: 3, name: "brand-guide.pdf", type: "document", size: "4.1 MB", date: "Mar 12, 2026", tags: ["brand", "docs"], color: "from-red-400 to-orange-500", thumb: "📄" },
  { id: 4, name: "team-photo.jpg", type: "image", size: "3.2 MB", date: "Mar 11, 2026", tags: ["team", "event"], color: "from-green-400 to-emerald-500", thumb: "🖼" },
  { id: 5, name: "q1-report.pdf", type: "document", size: "1.8 MB", date: "Mar 10, 2026", tags: ["reports", "q1"], color: "from-yellow-400 to-amber-500", thumb: "📊" },
  { id: 6, name: "logo-variants.png", type: "image", size: "0.8 MB", date: "Mar 9, 2026", tags: ["brand", "logo"], color: "from-pink-400 to-rose-500", thumb: "🎨" },
  { id: 7, name: "explainer-video.mp4", type: "video", size: "42.3 MB", date: "Mar 8, 2026", tags: ["marketing", "video"], color: "from-indigo-400 to-blue-500", thumb: "🎬" },
  { id: 8, name: "office-shoot.jpg", type: "image", size: "5.1 MB", date: "Mar 7, 2026", tags: ["team", "office"], color: "from-teal-400 to-cyan-500", thumb: "🖼" },
  { id: 9, name: "contract-template.pdf", type: "document", size: "0.3 MB", date: "Mar 6, 2026", tags: ["docs", "legal"], color: "from-orange-400 to-amber-500", thumb: "📄" },
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

  const toggleSelect = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gallery</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your media assets and files</p>
          </div>
          <button className="btn-primary">
            <Upload className="w-4 h-4" /> Upload Files
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Files", value: "9", icon: Grid, color: "text-blue-600 bg-blue-50" },
            { label: "Storage Used", value: "78.7 MB", icon: Download, color: "text-violet-600 bg-violet-50" },
            { label: "Shared Files", value: "3", icon: Share2, color: "text-emerald-600 bg-emerald-50" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>
          <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
            {(["all", "images", "documents", "videos"] as FileType[]).map((t) => (
              <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filterType === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
            <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}><Grid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}><List className="w-4 h-4" /></button>
          </div>
          {selected.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-muted-foreground">{selected.length} selected</span>
              <button onClick={() => setSelected([])} className="text-xs text-primary hover:underline">Clear</button>
              <button className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
              <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"><Download className="w-4 h-4" /></button>
            </div>
          )}
        </div>

        {/* Grid View */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {/* Upload Card */}
            <button className="aspect-square border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all group">
              <Plus className="w-8 h-8" />
              <span className="text-xs font-medium">Upload</span>
            </button>
            {filtered.map((asset) => {
              const Icon = typeIcons[asset.type];
              const isSelected = selected.includes(asset.id);
              return (
                <motion.div key={asset.id} whileHover={{ y: -2 }} onClick={() => toggleSelect(asset.id)} className={`group relative aspect-square bg-gradient-to-br ${asset.color} rounded-2xl overflow-hidden cursor-pointer transition-all ${isSelected ? "ring-3 ring-primary ring-offset-2 ring-offset-background" : ""}`}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl">{asset.thumb}</span>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-end p-3">
                    <div className="w-full opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                      <p className="text-white text-xs font-medium truncate">{asset.name}</p>
                      <p className="text-white/70 text-[10px]">{asset.size}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">✓</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Size</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((asset) => {
                  const Icon = typeIcons[asset.type];
                  const isSelected = selected.includes(asset.id);
                  return (
                    <tr key={asset.id} onClick={() => toggleSelect(asset.id)} className={`hover:bg-muted/40 cursor-pointer transition-colors ${isSelected ? "bg-primary/5" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${asset.color} flex items-center justify-center text-white`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-foreground">{asset.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{asset.type}</td>
                      <td className="px-4 py-3 text-muted-foreground">{asset.size}</td>
                      <td className="px-4 py-3 text-muted-foreground">{asset.date}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Download className="w-3.5 h-3.5" /></button>
                          <button className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
