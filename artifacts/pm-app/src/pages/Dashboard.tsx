import { useGetAnalyticsSummary } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Layout } from "@/components/Layout";
import { Users, Target, Briefcase, Zap, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

export default function Dashboard() {
  const { data: summary, isLoading, error } = useGetAnalyticsSummary();

  if (isLoading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-card rounded-2xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-card rounded-2xl"></div>)}
          </div>
          <div className="h-96 bg-card rounded-2xl"></div>
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
    { label: "Total Leads", value: summary.totalLeads, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Conversions", value: summary.totalConversions, icon: Target, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Active Projects", value: summary.activeProjects, icon: Briefcase, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Total Spent", value: formatCurrency(summary.totalSpent), icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-card border border-border">
          <div className="absolute inset-0 z-0">
            <img 
              src={`${import.meta.env.BASE_URL}images/dashboard-bg.png`} 
              alt="Dashboard abstract background" 
              className="w-full h-full object-cover opacity-40 mix-blend-overlay"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent"></div>
          </div>
          <div className="relative z-10 p-8 sm:p-12">
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-2">Welcome back, Team.</h1>
            <p className="text-muted-foreground max-w-lg">
              Here's what's happening with your projects and marketing campaigns today. 
              You have <strong className="text-white">{summary.pendingTasks} pending tasks</strong> requiring attention.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {statCards.map((stat, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 hover:border-white/10 transition-colors group">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <h3 className="text-2xl sm:text-3xl font-display font-bold text-white mt-1">{stat.value}</h3>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-display font-bold text-white mb-6">Monthly Leads Growth</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.monthlyLeads || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col">
            <h3 className="text-lg font-display font-bold text-white mb-6">Budget Overview</h3>
            <div className="flex-1 flex flex-col justify-center gap-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Total Budget</span>
                  <span className="font-medium text-white">{formatCurrency(summary.totalBudget)}</span>
                </div>
                <div className="h-3 bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full bg-white/20 w-full rounded-full"></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Amount Spent</span>
                  <span className="font-medium text-white">{formatCurrency(summary.totalSpent)}</span>
                </div>
                <div className="h-3 bg-black/40 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" 
                    style={{ width: `${Math.min(100, (summary.totalSpent / Math.max(1, summary.totalBudget)) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-sm text-primary font-medium">Conversion Rate</p>
                <p className="text-2xl font-display font-bold text-white mt-1">
                  {summary.conversionRate ? `${(summary.conversionRate * 100).toFixed(1)}%` : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
