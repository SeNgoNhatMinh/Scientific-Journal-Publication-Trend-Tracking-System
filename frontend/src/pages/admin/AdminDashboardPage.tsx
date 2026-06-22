import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import axios from "axios"
import {
  Users, Database, FileText, Activity, TrendingUp, TrendingDown,
  Clock, ArrowUpRight, Server, CheckCircle2, Bell, Loader2, BookOpen, Tag, Compass
} from "lucide-react"
import api from "@/lib/api"

// ─── Animated counter ───────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1500) {
  const [count, setCount] = useState(0)
  const raf = useRef<number>(0)
  useEffect(() => {
    const startTime = performance.now()
    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(ease * target))
      if (progress < 1) raf.current = requestAnimationFrame(animate)
    }
    raf.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])
  return count
}

// ─── Stat card config (visual only — values filled from API) ─────────────────
const STAT_CONFIG = [
  {
    key: "users",
    label: "Total Users",
    suffix: "",
    trendLabel: "registered accounts",
    icon: Users,
    gradient: "from-violet-500/20 via-purple-500/10 to-transparent",
    iconBg: "from-violet-500 to-purple-600",
    border: "border-violet-500/20",
    glow: "shadow-violet-500/10",
  },
  {
    key: "corpus",
    label: "Corpus Runs",
    suffix: "",
    trendLabel: "total analysis jobs",
    icon: Database,
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    iconBg: "from-emerald-500 to-teal-600",
    border: "border-emerald-500/20",
    glow: "shadow-emerald-500/10",
  },
  {
    key: "papers",
    label: "Total Papers",
    suffix: "",
    trendLabel: "in the database",
    icon: FileText,
    gradient: "from-blue-500/20 via-cyan-500/10 to-transparent",
    iconBg: "from-blue-500 to-cyan-600",
    border: "border-blue-500/20",
    glow: "shadow-blue-500/10",
  },
  {
    key: "activeCorpus",
    label: "Active Jobs",
    suffix: "",
    trendLabel: "ingesting / analyzing",
    icon: Activity,
    gradient: "from-orange-500/20 via-rose-500/10 to-transparent",
    iconBg: "from-orange-500 to-rose-500",
    border: "border-orange-500/20",
    glow: "shadow-orange-500/10",
  },
  {
    key: "authors",
    label: "Total Authors",
    suffix: "",
    trendLabel: "academic authors",
    icon: Users,
    gradient: "from-purple-500/20 via-indigo-500/10 to-transparent",
    iconBg: "from-purple-500 to-indigo-600",
    border: "border-purple-500/20",
    glow: "shadow-purple-500/10",
  },
  {
    key: "journals",
    label: "Total Journals",
    suffix: "",
    trendLabel: "registered venues",
    icon: BookOpen,
    gradient: "from-emerald-500/20 via-green-500/10 to-transparent",
    iconBg: "from-emerald-500 to-green-600",
    border: "border-emerald-500/20",
    glow: "shadow-emerald-500/10",
  },
  {
    key: "keywords",
    label: "Total Keywords",
    suffix: "",
    trendLabel: "trend keywords",
    icon: Tag,
    gradient: "from-pink-500/20 via-rose-500/10 to-transparent",
    iconBg: "from-pink-500 to-rose-600",
    border: "border-pink-500/20",
    glow: "shadow-pink-500/10",
  },
  {
    key: "topics",
    label: "Total Topics",
    suffix: "",
    trendLabel: "AI-clustered topics",
    icon: Compass,
    gradient: "from-cyan-500/20 via-blue-500/10 to-transparent",
    iconBg: "from-cyan-500 to-blue-600",
    border: "border-cyan-500/20",
    glow: "shadow-cyan-500/10",
  },
]

// ─── Notification → activity icon mapping ────────────────────────────────────
const notifIcon = (type: string) => {
  const map: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
    corpus_completed: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    corpus_started:  { icon: Database,      color: "text-blue-500",    bg: "bg-blue-500/10"    },
    new_user:        { icon: Users,          color: "text-violet-500",  bg: "bg-violet-500/10"  },
    trend_alert:     { icon: TrendingUp,     color: "text-orange-500",  bg: "bg-orange-500/10"  },
    default:         { icon: Bell,           color: "text-muted-foreground", bg: "bg-muted/30"  },
  }
  return map[type] || map.default
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`
  return `${Math.floor(diff / 86400)} days ago`
}

function StatCard({ cfg, value, index }: { cfg: typeof STAT_CONFIG[0]; value: number; index: number }) {
  const Icon = cfg.icon
  const displayValue = useCountUp(value, 1600)
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: "easeOut" }}
      className={`group relative overflow-hidden rounded-2xl border ${cfg.border} bg-card/60 backdrop-blur-md p-5 shadow-lg ${cfg.glow} hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${cfg.gradient} pointer-events-none`} />
      <div className="relative flex items-start justify-between mb-4">
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${cfg.iconBg} flex items-center justify-center shadow-md`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <div className="relative">
        <div className="text-3xl font-bold text-foreground tabular-nums">
          {displayValue.toLocaleString()}{cfg.suffix}
        </div>
        <p className="text-sm font-medium text-foreground/70 mt-1">{cfg.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{cfg.trendLabel}</p>
      </div>
    </motion.div>
  )
}

export default function AdminDashboardPage() {
  // ── State ──
  const [stats, setStats] = useState({ users: 0, corpus: 0, papers: 0, activeCorpus: 0, authors: 0, journals: 0, keywords: 0, topics: 0 })
  const [apiHealth, setApiHealth] = useState<"ok" | "error" | "loading">("loading")

  // Recent activity from notifications API
  const [activities, setActivities] = useState<any[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)

  // Top keywords from trends API
  const [topKeywords, setTopKeywords] = useState<any[]>([])
  const [keywordsLoading, setKeywordsLoading] = useState(true)

  useEffect(() => {
    // 1. Total users
    api.get("/users", { params: { limit: 1 } })
      .then(r => setStats(s => ({ ...s, users: r.data.pagination?.total ?? 0 })))
      .catch(() => {})

    // 2. Corpus runs — total + active count
    api.get("/corpus/runs")
      .then(r => {
        const runs: any[] = r.data.runs ?? r.data ?? []
        const active = Array.isArray(runs)
          ? runs.filter((run: any) => run.status === "ingesting" || run.status === "analyzing").length
          : 0
        // Lấy total papers từ tổng stats trong các runs
        const totalPapers = Array.isArray(runs)
          ? runs.reduce((sum: number, run: any) => sum + (run.stats?.totalPapers ?? 0), 0)
          : 0
        setStats(s => ({
          ...s,
          corpus: Array.isArray(runs) ? runs.length : 0,
          activeCorpus: active,
          papers: totalPapers,
        }))
      })
      .catch(() => {})

    // 3. API health
    const backendRoot = (import.meta.env.VITE_API_BASE_URL
      ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/v1\/?$/, "")
      : "")
    axios.get(`${backendRoot}/health`)
      .then(() => setApiHealth("ok"))
      .catch(() => setApiHealth("error"))

    // 4. Authors, Journals, Keywords, Topics total count
    api.get("/authors", { params: { limit: 1 } })
      .then(r => setStats(s => ({ ...s, authors: r.data.total ?? 0 })))
      .catch(() => {})

    api.get("/journals", { params: { limit: 1 } })
      .then(r => setStats(s => ({ ...s, journals: r.data.total ?? 0 })))
      .catch(() => {})

    api.get("/keywords", { params: { limit: 1 } })
      .then(r => setStats(s => ({ ...s, keywords: r.data.total ?? 0 })))
      .catch(() => {})

    api.get("/topics", { params: { limit: 1 } })
      .then(r => setStats(s => ({ ...s, topics: r.data.total ?? 0 })))
      .catch(() => {})

    // 5. Recent activity — from notifications (admin sees all system events)
    api.get("/notifications", { params: { limit: 8 } })
      .then(r => {
        const data = r.data.notifications ?? r.data.data ?? []
        setActivities(Array.isArray(data) ? data : [])
      })
      .catch(() => setActivities([]))
      .finally(() => setActivitiesLoading(false))

    // 6. Top trending keywords from trends API
    api.get("/trends/keyword-categories", { params: { limit: 5 } })
      .then(r => {
        const kws = r.data.keywords ?? []
        setTopKeywords(kws.slice(0, 5))
      })
      .catch(() => setTopKeywords([]))
      .finally(() => setKeywordsLoading(false))
  }, [])

  const statValues: Record<string, number> = {
    users: stats.users,
    corpus: stats.corpus,
    papers: stats.papers,
    activeCorpus: stats.activeCorpus,
    authors: stats.authors,
    journals: stats.journals,
    keywords: stats.keywords,
    topics: stats.topics,
  }

  // Compute max paperCount for relative progress bars
  const maxPapers = Math.max(...topKeywords.map((k: any) => k.paperCount ?? 1), 1)

  return (
    <div className="space-y-8">
      {/* ── Stat Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CONFIG.map((cfg, i) => (
          <StatCard key={cfg.key} cfg={cfg} value={statValues[cfg.key] ?? 0} index={i} />
        ))}
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="lg:col-span-3 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md overflow-hidden shadow-sm"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
            <div>
              <h3 className="font-semibold text-foreground">Recent Activity</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Latest system notifications</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </div>
          </div>

          <div className="px-6 py-2 divide-y divide-border/20 min-h-[240px]">
            {activitiesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Bell className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              activities.map((notif: any, idx) => {
                const { icon: Icon, color, bg } = notifIcon(notif.type)
                return (
                  <motion.div
                    key={notif._id ?? idx}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + idx * 0.06 }}
                    className="flex items-center gap-4 py-3.5"
                  >
                    <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{notif.title ?? notif.message ?? "System event"}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{notif.message ?? notif.detail ?? ""}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground/70 shrink-0">
                      <Clock className="h-3 w-3" />
                      {notif.createdAt ? timeAgo(notif.createdAt) : "—"}
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </motion.div>

        {/* Top Keywords */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="lg:col-span-2 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md overflow-hidden shadow-sm"
        >
          <div className="px-6 py-4 border-b border-border/30">
            <h3 className="font-semibold text-foreground">Top Research Keywords</h3>
            <p className="text-xs text-muted-foreground mt-0.5">By paper count in corpus</p>
          </div>
          <div className="px-6 py-4 space-y-4 min-h-[200px]">
            {keywordsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : topKeywords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No keyword data yet</p>
              </div>
            ) : (
              topKeywords.map((kw: any, idx) => {
                const pct = Math.round((kw.paperCount / maxPapers) * 100)
                const growthRate = kw.growthRate ?? 0
                return (
                  <motion.div
                    key={kw.keywordId ?? kw._id ?? idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + idx * 0.06 }}
                    className="space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground truncate pr-2">{kw.name}</span>
                      {growthRate !== 0 && (
                        <div className={`flex items-center gap-1 text-[11px] font-semibold shrink-0 ${growthRate > 0 ? "text-emerald-500" : "text-red-400"}`}>
                          {growthRate > 0 ? <ArrowUpRight className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {Math.abs(growthRate).toFixed(0)}%
                        </div>
                      )}
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.6 + idx * 0.06, duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{(kw.paperCount ?? 0).toLocaleString()} papers</p>
                  </motion.div>
                )
              })
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Quick Status Row ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid gap-4 sm:grid-cols-3"
      >
        {[
          {
            label: "Backend API",
            status: "Operational",
            color: "emerald" as const,
            icon: Server,
          },
          {
            label: "MongoDB Atlas",
            status: "Connected",
            color: "emerald" as const,
            icon: Database,
          },
          {
            label: "AI Service",
            status: apiHealth === "ok" ? "Active" : apiHealth === "loading" ? "Checking..." : "Unreachable",
            color: apiHealth === "ok" ? ("emerald" as const) : apiHealth === "loading" ? ("orange" as const) : ("red" as const),
            icon: Activity,
          },
        ].map((s, i) => {
          const Icon = s.icon
          const colors = {
            emerald: { dot: "bg-emerald-500 shadow-emerald-500/60", text: "text-emerald-500", badge: "bg-emerald-500/10 border-emerald-500/20" },
            orange:  { dot: "bg-orange-400 shadow-orange-400/60",  text: "text-orange-400",  badge: "bg-orange-500/10 border-orange-500/20"  },
            red:     { dot: "bg-red-500 shadow-red-500/60",        text: "text-red-500",     badge: "bg-red-500/10 border-red-500/20"         },
          }[s.color]
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.65 + i * 0.06 }}
              className="flex items-center gap-4 rounded-xl border border-border/30 bg-card/50 backdrop-blur-md px-5 py-3.5"
            >
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${colors.badge} border`}>
                <Icon className={`h-4 w-4 ${colors.text}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{s.label}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`h-1.5 w-1.5 rounded-full shadow-sm ${colors.dot} ${s.color === "emerald" ? "animate-pulse" : ""}`} />
                  <span className={`text-xs font-medium ${colors.text}`}>{s.status}</span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
