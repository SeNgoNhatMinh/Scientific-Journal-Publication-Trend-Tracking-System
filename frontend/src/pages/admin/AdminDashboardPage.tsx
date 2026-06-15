import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Database, Activity, FileText } from "lucide-react"

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
        <p className="text-muted-foreground">Monitor system activity and key metrics.</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-md shadow-sm border-white/20 dark:border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,248</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-md shadow-sm border-white/20 dark:border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Corpus Runs</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">8 currently ingesting</p>
          </CardContent>
        </Card>
        <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-md shadow-sm border-white/20 dark:border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved Papers</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14,203</div>
            <p className="text-xs text-muted-foreground">+1.2k this week</p>
          </CardContent>
        </Card>
        <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-md shadow-sm border-white/20 dark:border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">99.9%</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1 bg-white/60 dark:bg-black/40 backdrop-blur-md shadow-sm border-white/20 dark:border-white/10">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">User started Corpus Run: "Quantum Logic"</p>
                    <p className="text-xs text-muted-foreground">2 minutes ago</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1 bg-white/60 dark:bg-black/40 backdrop-blur-md shadow-sm border-white/20 dark:border-white/10">
          <CardHeader>
            <CardTitle>System Load</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] flex items-center justify-center border-2 border-dashed border-border/50 rounded-md bg-muted/10">
            <p className="text-muted-foreground">Chart Placeholder</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
