import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import Kanban from "@/pages/Kanban";
import Campaigns from "@/pages/Campaigns";
import Leads from "@/pages/Leads";
import Team from "@/pages/Team";
import ViewerOptions from "@/pages/ViewerOptions";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/projects" component={Projects} />
      <Route path="/tasks" component={Kanban} />
      <Route path="/campaigns" component={Campaigns} />
      <Route path="/leads" component={Leads} />
      <Route path="/team" component={Team} />
      <Route path="/viewer-options" component={ViewerOptions} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
