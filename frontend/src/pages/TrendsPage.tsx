import { useState, useEffect } from "react"
import { TrendingUp, Activity, Loader2, Sparkles, Zap, Minus, TrendingDown, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts"
import api from "@/lib/api"
import { motion } from "framer-motion"

// GET /trends/trending response: topics[].name, trendStatus, emergenceScore
// GET /trends/keyword response: keyword, trendStatus, averageGrowthRate (string), trends[]{year, count, growthRate}

const TREND_CONFIG: Record<string, { label: string; icon: any; cls: string; badgeCls: string }> = {
  exploding: { label: "Exploding", icon: Zap, cls: "trend-exploding", badgeCls: "bg-orange-500/10 text-orange-400 border-orange-500/30" },
  growing:   { label: "Growing",   icon: TrendingUp, cls: "trend-growing",   badgeCls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  stable:    { label: "Stable",    icon: Minus, cls: "trend-stable",    badgeCls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
  declining: { label: "Declining", icon: TrendingDown, cls: "trend-declining", badgeCls: "bg-slate-500/10 text-slate-400 border-slate-500/30" },
}

// Custom tooltip for recharts
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-lg px-3 py-2 border border-border/50 text-sm shadow-xl">
      <p className="font-semibold mb-1 text-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name === "count" ? `${p.value?.toLocaleString()} papers` : `${p.value}% growth`}
        </p>
      ))}
    </div>
  )
}

export default function TrendsPage() {
  const [keyword, setKeyword] = useState("")
  const [trendData, setTrendData] = useState<any>(null)
  const [trendingTopics, setTrendingTopics] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isExplaining, setIsExplaining] = useState(false)
  const [aiDirections, setAiDirections] = useState<any[]>([])
  const [aiError, setAiError] = useState("")

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await api.get("/trends/trending")
        setTrendingTopics(res.data.topics || [])
      } catch (err) {
        console.error("Failed to fetch trending topics", err)
        setTrendingTopics([])
      }
    }
    fetchTrending()
  }, [])

  const analyzeTrend = async (kw: string) => {
    if (!kw) return
    setIsLoading(true)
    setError("")
    try {
      const res = await api.get(`/trends/keyword`, { params: { keyword: kw } })
      setTrendData(res.data)
      setAiDirections([])
      setAiError("")
    } catch (err: any) {
      console.error(err)
      if (err.response?.status === 504) setError("External API timeout. The source may be slow — please try again.")
      else if (err.response?.status === 429) setError("Rate limit exceeded. Please wait a moment and try again.")
      else setError(err.response?.data?.message || "Failed to analyze keyword trend.")
      setTrendData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    analyzeTrend(keyword)
  }

  const explainTrend = async () => {
    if (!trendData?.keyword) return
    setIsExplaining(true)
    setAiError("")
    try {
      const relatedKeywords = [
        trendData.keyword,
        ...(trendingTopics || []).slice(0, 8).map((topic) => topic.name || topic),
      ].filter(Boolean)
      const res = await api.post("/ai/recommendations/research-directions", {
        keywords: Array.from(new Set(relatedKeywords)),
      })
      setAiDirections(res.data.directions || [])
    } catch (err: any) {
      setAiError(err.response?.data?.message || "AI service is currently unavailable.")
    } finally {
      setIsExplaining(false)
    }
  }

  const trendConfig = TREND_CONFIG[trendData?.trendStatus] ?? null

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <TrendingUp className="h-7 w-7 text-primary" />
          Global Research Trends
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Analyze publication velocity and track emerging research topics in real time.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main chart card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-2 glass rounded-2xl border border-border/40 p-6 space-y-5"
        >
          <div>
            <h2 className="font-semibold text-base flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-primary" /> Keyword Growth Analysis
            </h2>
            <p className="text-xs text-muted-foreground">Enter a research keyword to see publication volume over time.</p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="e.g., Transformer Models, CRISPR, Quantum..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9 h-10 bg-muted/30 border-border/50 rounded-xl"
              />
            </div>
            <Button type="submit" disabled={isLoading} className="h-10 px-5 rounded-xl">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
            </Button>
          </form>

          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 text-destructive p-3 text-sm">
              {error}
            </div>
          )}

          {trendData ? (
            <div className="space-y-5">
              {/* Stats row */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-muted/30 border border-border/30">
                <div>
                  <h3 className="font-semibold text-base">{trendData.keyword}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Source: {trendData.source}</p>
                </div>
                <div className="flex items-center gap-3">
                  {trendConfig && (
                    <Badge
                      variant="outline"
                      className={`border text-xs px-2 py-0.5 flex items-center gap-1 ${trendConfig.badgeCls}`}
                    >
                      <trendConfig.icon className="h-3 w-3" />
                      {trendConfig.label}
                    </Badge>
                  )}
                  <div className={`text-2xl font-bold ${trendConfig?.cls ?? "text-muted-foreground"}`}>
                    {trendData.averageGrowthRate}%
                  </div>
                </div>
              </div>

              {/* AI Explain section */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-border/30 bg-muted/20">
                <div>
                  <p className="text-sm font-medium">AI Research Directions</p>
                  <p className="text-xs text-muted-foreground">Generate research directions from this trend.</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={explainTrend}
                  disabled={isExplaining}
                  className="gap-2"
                >
                  {isExplaining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Explain Trend
                </Button>
              </div>

              {aiError && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 text-destructive p-3 text-sm">
                  {aiError}
                </div>
              )}

              {aiDirections.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid gap-3 md:grid-cols-2"
                >
                  {aiDirections.map((direction, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold">{direction.direction}</h3>
                        {direction.priority !== undefined && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {Math.round(direction.priority * 100)}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{direction.rationale}</p>
                      {direction.keywords?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {direction.keywords.map((item: string) => (
                            <Badge key={item} variant="outline" className="text-xs">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Chart */}
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData.trends} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.65 0.27 285)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="oklch(0.65 0.27 285)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.02 270 / 0.2)" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: "oklch(0.55 0.03 270)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "oklch(0.55 0.03 270)" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="oklch(0.65 0.27 285)"
                      strokeWidth={2.5}
                      fill="url(#trendGradient)"
                      dot={{ r: 3, fill: "oklch(0.65 0.27 285)", strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "oklch(0.65 0.27 285)", stroke: "oklch(0.75 0.27 285)", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : !error && (
            <div className="h-[280px] flex flex-col items-center justify-center border-2 border-dashed border-border/30 rounded-xl text-center px-6">
              <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Search for a keyword to view its trend chart.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Try: "machine learning", "CRISPR", "transformer"</p>
            </div>
          )}
        </motion.div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Hot Topics */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass rounded-2xl border border-border/40 p-5"
          >
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-orange-400" /> Hot Topics Now
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Topics from corpus with exploding or growing status.</p>
            {trendingTopics.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No trending topics yet. Run a corpus analysis first.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {trendingTopics.map((topic, i) => {
                  const conf = TREND_CONFIG[topic.trendStatus] ?? null
                  return (
                    <button
                      key={i}
                      onClick={() => { setKeyword(topic.name || topic); analyzeTrend(topic.name || topic) }}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all hover:scale-105 ${
                        conf?.badgeCls ?? "border-border/50 bg-muted/30 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {topic.name || topic}
                      {topic.trendStatus && (
                        <span className="ml-1 opacity-60 text-xs">({topic.trendStatus})</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* Compare card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="glass rounded-2xl border border-border/40 p-5"
          >
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-blue-400" /> Compare Keywords
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Compare multiple keyword trends side by side.</p>
            <Button variant="outline" className="w-full h-9 text-sm rounded-xl" disabled>
              Open Comparison Tool
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
