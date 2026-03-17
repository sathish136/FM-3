import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { Play, ChevronRight, ChevronLeft, Maximize2, Download, Share2, Plus, Eye } from "lucide-react";
import { useState } from "react";

const slides = [
  {
    id: 1,
    title: "Q2 Business Overview",
    subtitle: "Marketing & Project Performance",
    bg: "from-blue-600 to-indigo-700",
    content: "Revenue targets, campaign results, and project milestones for Q2 2026",
    type: "cover",
  },
  {
    id: 2,
    title: "Campaign Results",
    subtitle: "Marketing Performance",
    bg: "from-violet-600 to-purple-700",
    content: "Spring Email Blast delivered 245 leads with 15% conversion rate",
    type: "stat",
    stats: [
      { label: "Total Leads", value: "1,042" },
      { label: "Conversions", value: "161" },
      { label: "Budget Used", value: "$20,800" },
      { label: "Active Campaigns", value: "3" },
    ],
  },
  {
    id: 3,
    title: "Project Status",
    subtitle: "Delivery Overview",
    bg: "from-emerald-500 to-teal-600",
    content: "5 projects in flight, 2 completed on schedule",
    type: "stat",
    stats: [
      { label: "Active Projects", value: "2" },
      { label: "Completed", value: "1" },
      { label: "On Hold", value: "1" },
      { label: "In Planning", value: "1" },
    ],
  },
  {
    id: 4,
    title: "Key Takeaways",
    subtitle: "Next Steps & Priorities",
    bg: "from-orange-500 to-rose-600",
    content: "Focus on Q2 Marketing Push and Mobile App Launch",
    type: "list",
    bullets: [
      "Launch mobile app beta by April 30",
      "Scale LinkedIn campaign budget by 20%",
      "Onboard 3 new enterprise leads",
      "Complete website redesign SEO audit",
    ],
  },
];

const decks = [
  { id: 1, title: "Q2 Business Overview", slides: 4, updated: "2 hours ago", views: 24 },
  { id: 2, title: "Product Roadmap 2026", slides: 8, updated: "Yesterday", views: 67 },
  { id: 3, title: "Investor Pitch Deck", slides: 12, updated: "3 days ago", views: 142 },
  { id: 4, title: "Marketing Strategy", slides: 6, updated: "1 week ago", views: 89 },
];

function SlidePreview({ slide, active }: { slide: typeof slides[0]; active: boolean }) {
  return (
    <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${slide.bg} aspect-video flex flex-col items-center justify-center p-8 text-white transition-all duration-300 ${active ? "ring-4 ring-primary ring-offset-2 ring-offset-background shadow-2xl scale-100" : "scale-95 opacity-70"}`}>
      <div className="text-center">
        <p className="text-sm font-medium text-white/70 mb-2 uppercase tracking-widest">{slide.subtitle}</p>
        <h2 className="text-2xl md:text-3xl font-bold mb-3">{slide.title}</h2>
        <p className="text-white/80 text-sm max-w-sm mx-auto">{slide.content}</p>
      </div>
      {slide.type === "stat" && slide.stats && (
        <div className="grid grid-cols-2 gap-3 mt-6 w-full max-w-sm">
          {slide.stats.map((s) => (
            <div key={s.label} className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-white/70">{s.label}</div>
            </div>
          ))}
        </div>
      )}
      {slide.type === "list" && slide.bullets && (
        <ul className="mt-6 space-y-2 w-full max-w-sm">
          {slide.bullets.map((b) => (
            <li key={b} className="flex items-center gap-2 text-sm text-white/90 bg-white/20 backdrop-blur rounded-lg px-3 py-2">
              <ChevronRight className="w-4 h-4 shrink-0" /> {b}
            </li>
          ))}
        </ul>
      )}
      <div className="absolute bottom-3 right-4 text-xs text-white/40">{slide.id} / {slides.length}</div>
    </div>
  );
}

export default function Presentation() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [presenting, setPresenting] = useState(false);

  const prev = () => setActiveSlide(i => Math.max(0, i - 1));
  const next = () => setActiveSlide(i => Math.min(slides.length - 1, i + 1));

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Presentations</h1>
            <p className="text-muted-foreground text-sm mt-1">Create and manage slide decks</p>
          </div>
          <button className="btn-primary">
            <Plus className="w-4 h-4" /> New Deck
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Slide Viewer */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-foreground">Q2 Business Overview</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPresenting(true)} className="btn-primary py-1.5 text-xs">
                    <Play className="w-3 h-3" /> Present
                  </button>
                  <button className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <SlidePreview slide={slides[activeSlide]} active={true} />

              <div className="flex items-center justify-between mt-4">
                <button onClick={prev} disabled={activeSlide === 0} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex gap-2">
                  {slides.map((_, i) => (
                    <button key={i} onClick={() => setActiveSlide(i)} className={`w-2 h-2 rounded-full transition-all ${i === activeSlide ? "bg-primary w-6" : "bg-border hover:bg-muted-foreground"}`} />
                  ))}
                </div>
                <button onClick={next} disabled={activeSlide === slides.length - 1} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Slide Thumbnails */}
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">All Slides</p>
              <div className="grid grid-cols-4 gap-3">
                {slides.map((slide, i) => (
                  <button key={slide.id} onClick={() => setActiveSlide(i)} className={`rounded-xl overflow-hidden aspect-video bg-gradient-to-br ${slide.bg} flex items-center justify-center text-white text-xs font-medium transition-all ${i === activeSlide ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "opacity-70 hover:opacity-100"}`}>
                    {slide.id}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Deck Library */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-foreground mb-4">All Decks</h3>
              <div className="space-y-3">
                {decks.map((deck) => (
                  <motion.div key={deck.id} whileHover={{ x: 2 }} className="flex items-start justify-between p-3 rounded-xl hover:bg-muted/60 cursor-pointer transition-colors group">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Maximize2 className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{deck.title}</p>
                        <p className="text-xs text-muted-foreground">{deck.slides} slides · {deck.updated}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="w-3 h-3" /> {deck.views}
                    </div>
                  </motion.div>
                ))}
              </div>
              <button className="w-full mt-3 py-2 rounded-xl border-2 border-dashed border-border text-muted-foreground text-sm hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> New Presentation
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
