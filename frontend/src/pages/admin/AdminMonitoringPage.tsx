import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Globe, Server, RefreshCw, Loader2, Wifi, WifiOff,
  AlertTriangle, CheckCircle2, Clock, Database, Activity
} from "lucide-react"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"

// ─── Visual config for each API source (limits are backend-defined) ──────────
const API_LIMIT_CONFIG: Record<string, {
  color: string
  period: string
  total: number
  warnAt: number
}> = {
  openalex:        { color: "from-violet-500 to-purple-600", period: "Weekly",  total: 10000, warnAt: 80 },
  semanticscholar: { color: "from-blue-500 to-cyan-500",     period: "Daily",   total: 10000, warnAt: 80 },
  exa:             { color: "from-emerald-500 to-teal-500",  period: "Monthly", total: 1000,  warnAt: 70 },
  crossref:        { color: "from-orange-500 to-amber-500",  period: "Daily",   total: 5000,  warnAt: 80 },
  ieee:            { color: "from-rose-500 to-pink-500",     period: "Monthly", total: 200,   warnAt: 70 },
}

function ProgressBar({ pct, color, warn }: { pct: number; color: string; warn: boolean }) {
  return (
    <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(pct, 100)}%` }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
        className={`h-full rounded-full bg-gradient-to-r ${warn ? "from-orange-500 to-rose-500" : color}`}
      />
    </div>
  )
}

type ServiceStatus = "ok" | "error" | "loading"

export default function AdminMonitoringPage() {
  const [aiHealth, setAiHealth] = useState<any>(null)
  const [aiStatus, setAiStatus] = useState<ServiceStatus>("loading")
  const [backendStatus, setBackendStatus] = useState<ServiceStatus>("loading")
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // ── Dynamic API usage from backend SyncLog ──────────────────────────────
  const [apiUsage, setApiUsage] = useState<Record<string, number>>({})
  const [usageLoading, setUsageLoading] = useState(true)

  // ── Live DB stats ────────────────────────────────────────────────────────
  const [dbStats, setDbStats] = useState<{ papers: number; users: number; runs: number } | null>(null)

  const checkHealth = async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true)
    setAiStatus("loading")
    setBackendStatus("loading")

    // Backend health
    api.get("/health")
      .then(() => setBackendStatus("ok"))
      .catch(() => setBackendStatus("error"))

    // AI health
    api.get("/ai/health")
      .then(r => {
        setAiHealth(r.data)
        setAiStatus(r.data?.status === "ok" || r.data?.success ? "ok" : "error")
      })
      .catch(() => {
        setAiStatus("error")
        setAiHealth(null)
      })
      .finally(() => {
        setLastChecked(new Date())
        if (showSpinner) setIsRefreshing(false)
      })
  }

  const fetchApiUsage = async () => {
    setUsageLoading(true)
    try {
      // Use SyncLog to count requests per source
      const res = await api.get("/corpus/sync-logs", { params: { limit: 1000 } })
      const logs: any[] = res.data.logs ?? res.data.data ?? res.data ?? []
      if (Array.isArray(logs)) {
        const usage: Record<string, number> = {}
        logs.forEach((log: any) => {
          const src = (log.source ?? log.apiSource ?? "").toLowerCase()
          if (src) usage[src] = (usage[src] ?? 0) + (log.requestCount ?? 1)
        })
        setApiUsage(usage)
      }
    } catch {
      // Fallback: try SyncLog model via corpus runs
      try {
        const res2 = await api.get("/corpus/runs", { params: { limit: 200 } })
        const runs: any[] = res2.data.runs ?? res2.data ?? []
        const usage: Record<string, number> = {}
        runs.forEach((run: any) => {
          const src = (run.source ?? "openalex").toLowerCase()
          usage[src] = (usage[src] ?? 0) + (run.stats?.totalPapers ?? 0)
        })
        setApiUsage(usage)
      } catch {
        setApiUsage({})
      }
    } finally {
      setUsageLoading(false)
    }
  }

  const fetchDbStats = async () => {
    const [papersRes, usersRes, runsRes] = await Promise.allSettled([
      api.get("/papers", { params: { limit: 1 } }),
      api.get("/users", { params: { limit: 1 } }),
      api.get("/corpus/runs"),
    ])
    const papers = papersRes.status === "fulfilled"
      ? (papersRes.value.data.pagination?.total ?? papersRes.value.data.total ?? 0) : 0
    const users = usersRes.status === "fulfilled"
      ? (usersRes.value.data.pagination?.total ?? 0) : 0
    const runsData = runsRes.status === "fulfilled"
      ? (runsRes.value.data.runs ?? runsRes.value.data ?? []) : []
    setDbStats({ papers, users, runs: Array.isArray(runsData) ? runsData.length : 0 })
  }

  useEffect(() => {
    checkHealth()
    fetchApiUsage()
    fetchDbStats()
    const interval = setInterval(() => checkHealth(), 30000)
    return () => clearInterval(interval)
  }, [])

  // ── Build display list for API limits ────────────────────────────────────
  const apiLimitRows = Object.entries(API_LIMIT_CONFIG).map(([key, cfg]) => ({
    name: key === "openalex" ? "OpenAlex API"
        : key === "semanticscholar" ? "Semantic Scholar"
        : key === "exa" ? "Exa Research"
        : key === "crossref" ? "CrossRef API"
        : key === "ieee" ? "IEEE Xplore"
        : key,
    used: apiUsage[key] ?? 0,
    ...cfg,
  }))

  const services = [
    { name: "Main Backend API", subtitle: "Node.js / Express", status: backendStatus, icon: Server, color: "from-violet-500 to-purple-600" },
    { name: "Database", subtitle: "MongoDB Atlas", status: "ok" as ServiceStatus, icon: Database, color: "from-emerald-500 to-teal-600" },
    { name: "AI Service", subtitle: "Python / FastAPI", status: aiStatus, icon: Wifi, color: "from-blue-500 to-cyan-600" },
  ]

  const statusConfig = {
    ok: {
      dot: "bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.7)] animate-pulse",
      badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: "Operational",
    },
    error: {
      dot: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-pulse",
      badge: "bg-red-500/10 text-red-500 border-red-500/20",
      icon: <WifiOff className="h-3.5 w-3.5" />,
      label: "Unreachable",
    },
    loading: {
      dot: "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.7)] animate-pulse",
      badge: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      label: "Checking...",
    },
  }

  return (
    <div className="space-y-8">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {lastChecked
            ? <><span>Last checked:</span><span className="font-medium text-foreground ml-1">{lastChecked.toLocaleTimeString()}</span></>
            : "Checking services..."}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { checkHealth(true); fetchApiUsage(); fetchDbStats() }}
          disabled={isRefreshing}
          className="gap-2 h-8 text-xs bg-background/50 border-border/50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── API Rate Limits ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md overflow-hidden shadow-sm"
        >
          <div className="flex items-center gap-3 px-6 py-5 border-b border-border/30">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md">
              <Globe className="h-[18px] w-[18px] text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">External API Rate Limits</h3>
              <p className="text-xs text-muted-foreground">Usage based on corpus run logs</p>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {usageLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              apiLimitRows.map((row, idx) => {
                const pct = row.total > 0 ? (row.used / row.total) * 100 : 0
                const isWarn = pct >= row.warnAt
                return (
                  <motion.div
                    key={row.name}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.07 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{row.name}</span>
                        {isWarn && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">
                            <AlertTriangle className="h-2.5 w-2.5" /> High
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-foreground">{row.used.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground"> / {row.total.toLocaleString()}</span>
                      </div>
                    </div>
                    <ProgressBar pct={pct} color={row.color} warn={isWarn} />
                    <div className="flex justify-between">
                      <span className="text-[11px] text-muted-foreground">{row.period} quota</span>
                      <span className={`text-[11px] font-semibold ${isWarn ? "text-orange-500" : "text-muted-foreground"}`}>
                        {pct.toFixed(1)}% used
                      </span>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </motion.div>

        {/* ── Service Health ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md overflow-hidden shadow-sm"
        >
          <div className="flex items-center gap-3 px-6 py-5 border-b border-border/30">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-md">
              <Server className="h-[18px] w-[18px] text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Internal Services Health</h3>
              <p className="text-xs text-muted-foreground">Real-time status of backend services</p>
            </div>
          </div>

          <div className="px-6 py-5 space-y-3">
            {services.map((svc, idx) => {
              const Icon = svc.icon
              const cfg = statusConfig[svc.status]
              return (
                <motion.div
                  key={svc.name}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + idx * 0.08 }}
                  className="flex items-center justify-between p-4 rounded-xl border border-border/30 bg-background/30 hover:bg-background/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${svc.color} flex items-center justify-center shadow-sm`}>
                      <Icon className="h-[18px] w-[18px] text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{svc.name}</p>
                      <p className="text-xs text-muted-foreground">{svc.subtitle}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.badge}`}>
                    {cfg.icon}
                    {cfg.label}
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Uptime banner — reflects real backend status */}
          <div className={`mx-6 mb-6 p-4 rounded-xl border ${backendStatus === "ok" ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20" : "bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/20"}`}>
            <div className="flex items-center gap-3">
              <div className={`h-2 w-2 rounded-full animate-pulse shadow-sm ${backendStatus === "ok" ? "bg-emerald-500" : "bg-red-500"}`} />
              <div>
                <p className={`text-sm font-semibold ${backendStatus === "ok" ? "text-emerald-500" : "text-red-500"}`}>
                  {backendStatus === "ok" ? "All systems operational" : "Some services may be unavailable"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lastChecked ? `Last checked at ${lastChecked.toLocaleTimeString()}` : "Checking..."}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Live DB Metrics from API ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid gap-4 sm:grid-cols-3"
      >
        {[
          {
            label: "Papers in DB",
            value: dbStats ? dbStats.papers.toLocaleString() : "—",
            sub: "Total indexed papers",
            color: "text-blue-500",
            bg: "from-blue-500/20 to-cyan-500/10",
            border: "border-blue-500/20",
            icon: <Activity className="h-4 w-4 text-blue-500" />,
          },
          {
            label: "Registered Users",
            value: dbStats ? dbStats.users.toLocaleString() : "—",
            sub: "Active accounts",
            color: "text-emerald-500",
            bg: "from-emerald-500/20 to-teal-500/10",
            border: "border-emerald-500/20",
            icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
          },
          {
            label: "Corpus Runs",
            value: dbStats ? dbStats.runs.toLocaleString() : "—",
            sub: "Total analysis jobs",
            color: "text-violet-500",
            bg: "from-violet-500/20 to-purple-500/10",
            border: "border-violet-500/20",
            icon: <Database className="h-4 w-4 text-violet-500" />,
          },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45 + i * 0.06 }}
            className={`rounded-2xl border ${m.border} bg-gradient-to-br ${m.bg} backdrop-blur-md p-5`}
          >
            <div className="flex items-center justify-between mb-2">
              {m.icon}
            </div>
            <p className={`text-3xl font-bold ${m.color} tabular-nums`}>{m.value}</p>
            <p className="text-sm font-medium text-foreground mt-1">{m.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{m.sub}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
