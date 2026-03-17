import { Layout } from "@/components/Layout";
import { Link } from "wouter";
import { Box, Settings, Sliders, Palette, Video, Maximize } from "lucide-react";
import { useState } from "react";

export default function ViewerOptions() {
  const [viewMode, setViewMode] = useState("shaded");
  const [bgColor, setBgColor] = useState("dark");
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary" />
            3D Viewer Options
          </h1>
          <p className="text-muted-foreground mt-1">Configure default settings for the STEP file viewer.</p>
        </div>
        <Link href="/" className="btn-primary flex items-center gap-2">
          <Box className="w-4 h-4" /> Open Viewer Tool
        </Link>
      </div>

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

        {/* Preview Area Mockup */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden relative min-h-[500px] flex items-center justify-center">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] opacity-20 bg-cover bg-center grayscale mix-blend-luminosity"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
          
          <div className="relative z-10 text-center space-y-6">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-primary/20 flex items-center justify-center border border-primary/30 backdrop-blur-sm">
              <Box className="w-12 h-12 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-display font-bold text-white mb-2">Ready for 3D Assets</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                These settings will apply when you open the dedicated STEP file viewer tool.
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
