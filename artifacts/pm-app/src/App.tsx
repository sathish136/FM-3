import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { ShieldOff, Mail } from "lucide-react";

import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import Kanban from "@/pages/Kanban";
import Campaigns from "@/pages/Campaigns";
import Leads from "@/pages/Leads";
import Team from "@/pages/Team";
import ViewerOptions from "@/pages/ViewerOptions";
import MechanicalViewer from "@/pages/MechanicalViewer";
import MeetingMinutes from "@/pages/MeetingMinutes";
import SheetsHome from "@/pages/SheetsHome";
import Sheets from "@/pages/Sheets";
import Presentation from "@/pages/Presentation";
import PptxPreviewPage from "@/pages/PptxPreviewPage";
import Design2D from "@/pages/Design2D";
import Drawings from "@/pages/Drawings";
import Design3D from "@/pages/Design3D";
import PID from "@/pages/PID";
import Gallery from "@/pages/Gallery";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import MaterialRequest from "@/pages/MaterialRequest";
import PurchaseOrder from "@/pages/PurchaseOrder";
import UserManagement from "@/pages/UserManagement";
import HRMS from "@/pages/HRMS";
import AttendanceCheckin from "@/pages/AttendanceCheckin";
import LeaveRequest from "@/pages/LeaveRequest";
import ClaimRequest from "@/pages/ClaimRequest";
import Recruitment from "@/pages/Recruitment";
import ProjectBoard from "@/pages/ProjectBoard";
import Email from "@/pages/Email";
import EmailSettings from "@/pages/EmailSettings";
import Chat from "@/pages/Chat";
import HRIncidents from "@/pages/HRIncidents";
import HrAnalytics from "@/pages/HrAnalytics";
import Nesting from "@/pages/Nesting";
import ProjectDrawings from "@/pages/ProjectDrawings";
import CivilDrawingAI from "@/pages/CivilDrawingAI";
import ProjectTimeline from "@/pages/ProjectTimeline";
import SiteData from "@/pages/SiteData";
import PlantOverview from "@/pages/PlantOverview";
import SmartInbox from "@/pages/SmartInbox";
import Marketing from "@/pages/Marketing";
import PurchaseDashboard from "@/pages/PurchaseDashboard";
import StoresDashboard from "@/pages/StoresDashboard";
import PaymentTracker from "@/pages/PaymentTracker";
import MisReport from "@/pages/MisReport";
import CCTV from "@/pages/CCTV";
import CalendarPage from "@/pages/Calendar";
import EmployeePerformance from "@/pages/EmployeePerformance";
import TeamPerformanceDashboard from "@/pages/TeamPerformanceDashboard";
import TaskSummary from "@/pages/TaskSummary";
import DailyReporting from "@/pages/DailyReporting";
import LogisticsDashboard from "@/pages/LogisticsDashboard";
import ProcessProposalDashboard from "@/pages/ProcessProposalDashboard";
import FinanceDashboard from "@/pages/FinanceDashboard";
import StockReports from "@/pages/StockReports";
import TaskManagement from "@/pages/TaskManagement";
import TeamPulse from "@/pages/TeamPulse";
import TeamReporting from "@/pages/TeamReporting";
import EmpAgent from "@/pages/EmpAgent";
import { SlideshowProvider } from "@/contexts/SlideshowContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const ADMIN_EMAILS = ["edp@wttindia.com", "venkat@wttindia.com"];

type PermStatus = "loading" | "allowed" | "no-record" | "blocked";

function ProtectedRoutes() {
  const { user, loading, logout } = useAuth();
  const [permStatus, setPermStatus] = useState<PermStatus>("loading");

  useEffect(() => {
    if (!user) return;
    if (ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      setPermStatus("allowed");
      return;
    }
    setPermStatus("loading");
    fetch(`${BASE}/api/user-permissions`)
      .then(r => r.ok ? r.json() : [])
      .then((rows: { email: string; hasAccess: boolean }[]) => {
        const record = rows.find(r => r.email === user.email);
        if (!record) setPermStatus("no-record");
        else if (!record.hasAccess) setPermStatus("blocked");
        else setPermStatus("allowed");
      })
      .catch(() => setPermStatus("no-record"));
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Login />;

  if (permStatus === "loading") {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (permStatus === "no-record" || permStatus === "blocked") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 max-w-sm w-full p-10 flex flex-col items-center text-center gap-5">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
            <ShieldOff className="w-8 h-8 text-slate-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 mb-1">Access Not Configured</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              {permStatus === "blocked"
                ? "Your account has been blocked. Please contact your administrator."
                : "Your account hasn't been set up yet. Please contact your administrator to get access."}
            </p>
          </div>
          <a
            href="mailto:admin@wttint.com"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
          >
            <Mail className="w-4 h-4" />
            Contact Admin
          </a>
          <button onClick={logout} className="text-xs text-slate-400 hover:text-slate-600 transition-colors mt-1">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/projects" component={Projects} />
      <Route path="/tasks" component={Kanban} />
      <Route path="/pid" component={PID} />
      <Route path="/campaigns" component={Campaigns} />
      <Route path="/leads" component={Leads} />
      <Route path="/meeting-minutes" component={MeetingMinutes} />
      <Route path="/sheets" component={SheetsHome} />
      <Route path="/sheets/:id" component={Sheets} />
      <Route path="/team" component={Team} />
      <Route path="/viewer-options" component={ViewerOptions} />
      <Route path="/viewer-options/mechanical" component={MechanicalViewer} />
      <Route path="/presentation" component={Presentation} />
      <Route path="/design-2d" component={Design2D} />
      <Route path="/drawings/mechanical" component={Drawings} />
      <Route path="/drawings/electrical" component={Drawings} />
      <Route path="/drawings/civil" component={Drawings} />
      <Route path="/design-3d" component={Design3D} />
      <Route path="/gallery" component={Gallery} />
      <Route path="/settings" component={Settings} />
      <Route path="/profile" component={Profile} />
      <Route path="/material-request" component={MaterialRequest} />
      <Route path="/purchase-order" component={PurchaseOrder} />
      <Route path="/user-management" component={UserManagement} />
      <Route path="/hrms" component={HRMS} />
      <Route path="/hrms/checkin" component={AttendanceCheckin} />
      <Route path="/hrms/leave-request" component={LeaveRequest} />
      <Route path="/hrms/claims" component={ClaimRequest} />
      <Route path="/hrms/recruitment" component={Recruitment} />
      <Route path="/project-board" component={ProjectBoard} />
      <Route path="/email" component={Email} />
      <Route path="/email-settings" component={EmailSettings} />
      <Route path="/chat" component={Chat} />
      <Route path="/hrms/incidents" component={HRIncidents} />
      <Route path="/hrms/analytics" component={HrAnalytics} />
      <Route path="/nesting" component={Nesting} />
      <Route path="/project-drawings" component={ProjectDrawings} />
      <Route path="/civil-drawing-ai" component={CivilDrawingAI} />
      <Route path="/project-timeline" component={ProjectTimeline} />
      <Route path="/site-data" component={SiteData} />
      <Route path="/plant-overview" component={PlantOverview} />
      <Route path="/smart-inbox" component={SmartInbox} />
      <Route path="/marketing" component={Marketing} />
      <Route path="/purchase-dashboard" component={PurchaseDashboard} />
      <Route path="/stores-dashboard" component={StoresDashboard} />
      <Route path="/payment-tracker" component={PaymentTracker} />
      <Route path="/mis-report" component={MisReport} />
      <Route path="/cctv" component={CCTV} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/hrms/performance" component={EmployeePerformance} />
      <Route path="/hrms/team-performance" component={TeamPerformanceDashboard} />
      <Route path="/hrms/task-summary" component={TaskSummary} />
      <Route path="/hrms/daily-reporting" component={DailyReporting} />
      <Route path="/logistics-dashboard" component={LogisticsDashboard} />
      <Route path="/process-proposal" component={ProcessProposalDashboard} />
      <Route path="/finance-dashboard" component={FinanceDashboard} />
      <Route path="/stock-reports" component={StockReports} />
      <Route path="/task-management" component={TaskManagement} />
      <Route path="/team-pulse" component={TeamPulse} />
      <Route path="/team-reporting" component={TeamReporting} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={base}>
            <SlideshowProvider>
              <Switch>
                <Route path="/pptx-viewer" component={PptxPreviewPage} />
                <Route path="/emp-agent" component={EmpAgent} />
                <Route component={ProtectedRoutes} />
              </Switch>
            </SlideshowProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
