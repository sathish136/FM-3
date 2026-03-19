import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

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
import UserManagement from "@/pages/UserManagement";
import HRMS from "@/pages/HRMS";
import ProjectBoard from "@/pages/ProjectBoard";
import Email from "@/pages/Email";
import EmailSettings from "@/pages/EmailSettings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Login />;

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
      <Route path="/user-management" component={UserManagement} />
      <Route path="/hrms" component={HRMS} />
      <Route path="/project-board" component={ProjectBoard} />
      <Route path="/email" component={Email} />
      <Route path="/email-settings" component={EmailSettings} />
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
            <Switch>
              <Route path="/pptx-viewer" component={PptxPreviewPage} />
              <Route component={ProtectedRoutes} />
            </Switch>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
