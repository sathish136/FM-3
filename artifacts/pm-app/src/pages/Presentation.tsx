import { Layout } from "@/components/Layout";
import { Play, ChevronRight, ChevronLeft, Download, Share2, Plus, Eye, Layers, BarChart2, CheckSquare, FileText } from "lucide-react";
import { useState } from "react";

const slideColors = [
  { bg: "bg-[#1a56db]", num: "bg-[#1648c0]" },
  { bg: "bg-[#4338ca]", num: "bg-[#3730a3]" },
  { bg: "bg-[#047857]", num: "bg-[#065f46]" },
  { bg: "bg-[#b45309]", num: "bg-[#92400e]" },
];

const slideIcons = [Layers, BarChart2, CheckSquare, FileText];

const slides = [
  {
    id: 1,
    title: "Q2 Business Overview",
    subtitle: "Marketing & Project Performance",
    content: "Revenue targets, campaign results, and project milestones for Q2 2026",
    type: "cover",
  },
  {
    id: 2,
    title: "Campaign Results",
    subtitle: "Marketing Performance",
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
  const i = slide.id - 1;
  const color = slideColors[i % slideColors.length];
  const Icon = slideIcons[i % slideIcons.length];
  return (
    <div className={`relative rounded-xl overflow-hidden ${color.bg} aspect-video flex flex-col items-center justify-center p-8 text-white transition-all duration-300 ${active ? "ring-2 ring-blue-300 ring-offset-2 shadow-lg" : "opacity-80"}`}>
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
        <p className="text-xs font-semibold text-white/60 mb-2 uppercase tracking-widest">{slide.subtitle}</p>
        <h2 className="text-xl md:text-2xl font-bold mb-3">{slide.title}</h2>
        <p className="text-white/75 text-sm">{slide.content}</p>
      </div>
      {slide.type === "stat" && slide.stats && (
        <div className="grid grid-cols-2 gap-2 mt-6 w-full max-w-sm">
          {slide.stats.map((s) => (
            <div key={s.label} className="bg-white/15 rounded-lg p-3 text-center">
              <div className="text-lg font-bold">{s.value}</div>
              <div className="text-xs text-white/60">{s.label}</div>
            </div>
          ))}
        </div>
      )}
      {slide.type === "list" && slide.bullets && (
        <ul className="mt-5 space-y-1.5 w-full max-w-xs">
          {slide.bullets.map((b) => (
            <li key={b} className="flex items-center gap-2 text-xs text-white/85 bg-white/15 rounded px-3 py-2">
              <ChevronRight className="w-3.5 h-3.5 shrink-0" /> {b}
            </li>
          ))}
        </ul>
      )}
      <div className="absolute bottom-3 right-4 text-xs text-white/30 font-medium">{slide.id} / {slides.length}</div>
    </div>
  );
}

export default function Presentation() {
  const [activeSlide, setActiveSlide] = useState(0);

  const prev = () => setActiveSlide(i => Math.max(0, i - 1));
  const next = () => setActiveSlide(i => Math.min(slides.length - 1, i + 1));

  return (
    <Layout>
      <div className="p-6 space-y-5 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Presentations</h1>
            <p className="text-sm text-gray-500 mt-0.5">Create and manage slide decks</p>
          </div>
          <button className="btn-primary">
            <Plus className="w-4 h-4" /> New Deck
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Slide Viewer */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 text-sm">Q2 Business Overview</h2>
                <div className="flex items-center gap-2">
                  <button className="btn-primary py-1.5 text-xs">
                    <Play className="w-3 h-3" /> Present
                  </button>
                  <button className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors">
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <SlidePreview slide={slides[activeSlide]} active={true} />

              <div className="flex items-center justify-between mt-4">
                <button onClick={prev} disabled={activeSlide === 0}
                  className="p-2 rounded border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex gap-2">
                  {slides.map((_, i) => (
                    <button key={i} onClick={() => setActiveSlide(i)}
                      className={`h-1.5 rounded-full transition-all ${i === activeSlide ? "bg-blue-600 w-6" : "bg-gray-200 w-1.5 hover:bg-gray-400"}`} />
                  ))}
                </div>
                <button onClick={next} disabled={activeSlide === slides.length - 1}
                  className="p-2 rounded border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Thumbnails */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">All Slides</p>
              <div className="grid grid-cols-4 gap-2">
                {slides.map((slide, i) => {
                  const color = slideColors[i % slideColors.length];
                  return (
                    <button key={slide.id} onClick={() => setActiveSlide(i)}
                      className={`rounded-lg overflow-hidden aspect-video ${color.bg} flex items-center justify-center text-white text-xs font-bold transition-all ${i === activeSlide ? "ring-2 ring-blue-500 ring-offset-1" : "opacity-60 hover:opacity-90"}`}>
                      {slide.id}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Deck Library */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">All Decks</h3>
            <div className="space-y-2">
              {decks.map((deck) => (
                <div key={deck.id} className="flex items-start justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group border border-transparent hover:border-gray-200">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{deck.title}</p>
                      <p className="text-xs text-gray-400">{deck.slides} slides · {deck.updated}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Eye className="w-3 h-3" /> {deck.views}
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-3 py-2 rounded-lg border-2 border-dashed border-gray-200 text-gray-400 text-sm hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> New Presentation
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
