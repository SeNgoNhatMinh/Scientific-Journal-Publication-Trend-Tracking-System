import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Activity, Server, Database, Globe } from "lucide-react"

export default function AdminMonitoringPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">System Monitoring</h2>
        <p className="text-muted-foreground">Track API limits and service health.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-md shadow-sm border-white/20 dark:border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-blue-500" /> External API Rate Limits</CardTitle>
            <CardDescription>Track quotas for academic sources.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">OpenAlex API</span>
                <span className="text-muted-foreground">8,450 / 10,000 req (Weekly)</span>
              </div>
              <Progress value={84.5} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Semantic Scholar</span>
                <span className="text-muted-foreground">2,100 / 10,000 req (Daily)</span>
              </div>
              <Progress value={21} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Exa Research</span>
                <span className="text-muted-foreground">450 / 1,000 req (Monthly)</span>
              </div>
              <Progress value={45} className="h-2 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-md shadow-sm border-white/20 dark:border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5 text-purple-500" /> Internal Services Health</CardTitle>
            <CardDescription>Status of backend microservices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-muted/30 dark:bg-muted/10 rounded-lg border border-border/50 transition-colors hover:border-border">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                <div>
                  <p className="font-medium">Main Backend API (Node.js)</p>
                  <p className="text-xs text-muted-foreground">Uptime: 14d 2h 45m</p>
                </div>
              </div>
              <span className="text-sm font-mono text-muted-foreground">42ms</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted/30 dark:bg-muted/10 rounded-lg border border-border/50 transition-colors hover:border-border">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                <div>
                  <p className="font-medium">Database (MongoDB Atlas)</p>
                  <p className="text-xs text-muted-foreground">Storage: 2.1GB / 5GB</p>
                </div>
              </div>
              <span className="text-sm font-mono text-muted-foreground">12ms</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 dark:bg-muted/10 rounded-lg border border-border/50 transition-colors hover:border-border">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)] animate-pulse" />
                <div>
                  <p className="font-medium">AI Service (Python FastAPI)</p>
                  <p className="text-xs text-muted-foreground">High load detected</p>
                </div>
              </div>
              <span className="text-sm font-mono text-muted-foreground">1.4s</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
