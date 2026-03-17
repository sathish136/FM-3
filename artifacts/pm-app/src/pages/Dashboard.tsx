import { useGetAnalyticsSummary } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Layout } from "@/components/Layout";
import { Users, Target, Briefcase, Zap, AlertCircle, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

export default function Dashboard() {
  const { data: summary, isLoading, error } = useGetAnalyticsSummary();

  if (isLoading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-6">
          <div className="h-36 bg-card rounded-2xl border border-border" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-card rounded-2xl border border-border" />)}
          </div>
          <div className="h-80 bg-card rounded-2xl border border-border" />
        </div>
      </Layout>
    );
  }

  if (error || !summary) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <AlertCircle className="w-12 h-12 mb-4 text-destructive/50" />
          <p>Failed to load analytics dashboard.</p>
        </div>
      </Layout>
    );
  }

  const statCards = [
    { label: "Total Leads", value: summary.totalLeads, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Conversions", value: summary.totalConversions, icon: Target, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Active Projects", value: summary.activeProjects, icon: Briefcase, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Total Spent", value: formatCurrency(summary.totalSpent), icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  const budgetPercent = Math.min(100, (summary.totalSpent / Math.max(1, summary.totalBudget)) * 100);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-violet-600 shadow-lg">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent)]" />
          <div className="relative z-10 p-8 sm:p-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Welcome back, Team. 👋</h1>
            <p className="text-white/80 max-w-lg text-sm">
              Here's what's happening with your projects and marketing campaigns today.{" "}
              {summary.pendingTasks > 0 && (
                <strong className="text-white">{summary.pendingTasks} pending tasks</strong>
              )}{" "}
              {summary.pendingTasks > 0 && "requiring attention."}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${stat.bg} group-hover:scale-105 transition-transform`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{stat.value}</h3>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-semibold text-foreground mb-5">Monthly Leads Growth</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.monthlyLeads?.length ? summary.monthlyLeads : [
                  { month: "Jan", count: 42 }, { month: "Feb", count: 58 }, { month: "Mar", count: 91 },
                  { month: "Apr", count: 76 }, { month: "May", count: 115 }, { month: "Jun", count: 134 },
                ]} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(221 83% 53%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(221 83% 53%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(215 16% 60%)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(215 16% 60%)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderColor: 'hsl(214 32% 88%)', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    itemStyle={{ color: 'hsl(222 47% 11%)' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="hsl(221 83% 53%)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col">
            <h3 className="text-base font-semibold text-foreground mb-5">Budget Overview</h3>
            <div className="flex-1 flex flex-col justify-center gap-5">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Total Budget</span>
                  <span className="font-semibold text-foreground">{formatCurrency(summary.totalBudget)}</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary/30 w-full rounded-full" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Amount Spent</span>
                  <span className="font-semibold text-foreground">{formatCurrency(summary.totalSpent)}</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                    style={{ width: `${budgetPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-primary/8 border border-primary/15">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-bold text-primary mt-0.5">
                    {summary.conversionRate ? `${(summary.conversionRate).toFixed(1)}%` : "—"}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-xl text-center">
                  <p className="text-lg font-bold text-foreground">{summary.completedTasks}</p>
                  <p className="text-xs text-muted-foreground">Done Tasks</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-xl text-center">
                  <p className="text-lg font-bold text-foreground">{summary.activeCampaigns}</p>
                  <p className="text-xs text-muted-foreground">Campaigns</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
