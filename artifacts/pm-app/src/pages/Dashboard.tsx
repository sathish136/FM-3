import { useListProjects, useGetAnalyticsSummary } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Link } from "wouter";
import {
  FolderOpen, Loader2, CheckCircle2, AlertCircle,
  RefreshCw, Box, RotateCcw, Maximize, Upload,
  ExternalLink,
} from "lucide-react";

const statusColors: Record<string, string> = {
  active:    "bg-blue-50 text-blue-700 border border-blue-200",
  planning:  "bg-amber-50 text-amber-700 border border-amber-200",
  on_hold:   "bg-orange-50 text-orange-700 border border-orange-200",
  completed: "bg-green-50 text-green-700 border border-green-200",
};

const statusLabel: Record<string, string> = {
  active:    "On going",
  planning:  "Open",
  on_hold:   "On Hold",
  completed: "Completed",
};

export default function Dashboard() {
  const { data: projects, isLoading: projectsLoading, refetch } = useListProjects();
  const { data: summary, isLoading: summaryLoading } = useGetAnalyticsSummary();

  const isLoading = projectsLoading || summaryLoading;

  const totalProjects = projects?.length ?? 0;
  const ongoing = projects?.filter(p => p.status === "active").length ?? 0;
  const inProgress = projects?.filter(p => p.status === "planning").length ?? 0;
  const completed = projects?.filter(p => p.status === "completed").length ?? 0;

  const recentOngoing = projects?.filter(p => p.status === "active" || p.status === "planning").slice(0, 5) ?? [];

  const statCards = [
    {
      label: "Total Projects",
      value: totalProjects,
      icon: FolderOpen,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Ongoing Projects",
      value: ongoing,
      icon: Loader2,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-500",
    },
    {
      label: "In Progress",
      value: inProgress,
      icon: RefreshCw,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-400",
    },
    {
      label: "Completed",
      value: completed,
      icon: CheckCircle2,
      iconBg: "bg-green-100",
      iconColor: "text-green-500",
    },
  ];

  return (
    <Layout>
      <div className="p-6 space-y-5 max-w-6xl">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              WTT-Project Management System – Real-time project data
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1a56db] hover:bg-[#1648c0] text-white text-sm font-medium rounded transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* Stat Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 h-24 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => (
              <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                <div>
                  <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                  <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent Ongoing Projects */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">Recent Ongoing Projects</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {isLoading ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">Loading projects...</div>
            ) : recentOngoing.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">No ongoing projects</div>
            ) : (
              recentOngoing.map((project) => (
                <div key={project.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <span className="text-sm text-gray-800 font-medium truncate max-w-xs">{project.name}</span>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm text-gray-500 font-medium w-10 text-right">{project.progress}%</span>
                    <span className={`text-xs px-2.5 py-1 rounded font-medium ${statusColors[project.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {statusLabel[project.status] ?? project.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          {!isLoading && projects && projects.length > 5 && (
            <div className="px-5 py-3 border-t border-gray-100">
              <Link href="/projects" className="text-sm text-[#1a56db] hover:underline font-medium">
                View all {projects.length} ongoing projects →
              </Link>
            </div>
          )}
        </div>

        {/* 3D Model Viewer Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#1a56db] flex items-center justify-center">
                <Box className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">3D Model Viewer</p>
                <p className="text-xs text-gray-500">Upload and visualize your 3D models</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <RotateCcw className="w-3.5 h-3.5" /> Reset View
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <Maximize className="w-3.5 h-3.5" /> Fullscreen
              </button>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a56db] hover:bg-[#1648c0] text-white rounded text-sm font-medium transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Browse Files
              </a>
            </div>
          </div>

          {/* Embedded viewer preview */}
          <div className="mx-5 mb-5 rounded-lg border border-gray-200 overflow-hidden bg-[#0f0f1a] h-56 flex items-center justify-center relative">
            <div className="text-center text-gray-400">
              <Box className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm opacity-60">Open the 3D viewer to load a STEP file</p>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-[#1a56db] text-white rounded text-xs font-medium hover:bg-[#1648c0] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Launch 3D Viewer
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
