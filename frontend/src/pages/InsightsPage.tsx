import { useState, useCallback, useMemo } from "react"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  Users,
  Loader2,
  Sparkles,
  Zap,
  Cloud,
  LayoutList,
  CalendarRange,
  FileText,
  Award,
  ArrowUpRight,
  Flame,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend,
  Cell,
} from "recharts"
import api from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"

// ─── Design tokens ───
const CHART_COLORS = [
  "oklch(0.65 0.25 285)",
  "oklch(0.65 0.23 140)",
  "oklch(0.65 0.22 40)",
  "oklch(0.65 0.18 200)",
  "oklch(0.7 0.18 80)",
  "oklch(0.65 0.22 345)",
  "oklch(0.65 0.18 170)",
  "oklch(0.6 0.23 310)",
  "oklch(0.58 0.20 270)",
  "oklch(0.60 0.15 120)",
]

const LINE_COLORS = [
  "#a78bfa", "#34d399", "#fbbf24", "#60a5fa", "#f472b6",
  "#2dd4bf", "#fb923c", "#818cf8", "#a3e635", "#e879f9",
]

const WORD_CLOUD_COLORS = [
  "oklch(0.70 0.25 285)",
  "oklch(0.68 0.20 200)",
  "oklch(0.72 0.22 340)",
  "oklch(0.70 0.18 150)",
  "oklch(0.75 0.20 55)",
  "oklch(0.65 0.22 120)",
  "oklch(0.68 0.24 310)",
  "oklch(0.72 0.16 170)",
]

const CATEGORY_BADGE: Record<string, string> = {
  domain: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  algorithm: "border-red-500/30 bg-red-500/10 text-red-400",
  application: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  method: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  dataset: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  tool: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
  general: "border-slate-500/30 bg-slate-500/10 text-slate-400",
}

// ─── Types ───
interface TopicItem {
  name: string
  normalizedText: string
  category: string
  count: number
}

interface TrendItem {
  name: string
  normalizedText: string
  category: string
  totalCount: number
  yearlyData: { year: number; count: number }[]
  growthRate: number
  avgGrowthRate: number
  isEmerging: boolean
}

interface AffiliationItem {
  affiliation: string
  country?: string | null
  paperCount: number
  authorCount: number
  topAuthors: string[]
}

interface AuthorItem {
  name: string
  paperCount: number
  affiliation: string
}

// ─── Custom Recharts Tooltip ───
function InsightTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-lg px-3 py-2 border border-border/50 text-sm shadow-xl">
      <p className="font-semibold mb-1 text-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="text-xs">
          {p.name || p.dataKey}: <span className="font-semibold">{p.value?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Word Cloud Component ───
function WordCloud({ keywords }: { keywords: TopicItem[] }) {
  if (!keywords.length) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground italic">
        Chưa có dữ liệu từ khóa
      </div>
    )
  }

  const maxCount = Math.max(...keywords.map(k => k.count), 1)
  const minCount = Math.min(...keywords.map(k => k.count), 0)
  const range = maxCount - minCount || 1

  // Shuffle for organic look
  const shuffled = useMemo(() => {
    const arr = [...keywords]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }, [keywords])

  return (
    <div className="word-cloud">
      {shuffled.map((kw, idx) => {
        const t = (kw.count - minCount) / range // 0..1
        const fontSize = 0.7 + t * 1.8 // 0.7rem to 2.5rem
        const opacity = 0.5 + t * 0.5
        const color = WORD_CLOUD_COLORS[idx % WORD_CLOUD_COLORS.length]
        return (
          <motion.span
            key={kw.normalizedText || kw.name}
            className="word-cloud-item"
            style={{ fontSize: `${fontSize}rem`, color, opacity }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity, scale: 1 }}
            transition={{ delay: idx * 0.03, duration: 0.35 }}
            title={`${kw.name}: ${kw.count} papers (${kw.category})`}
          >
            {kw.name}
          </motion.span>
        )
      })}
    </div>
  )
}

// ─── Ranking Medal ───
function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <div className="ranking-medal gold">1</div>
  if (rank === 2) return <div className="ranking-medal silver">2</div>
  if (rank === 3) return <div className="ranking-medal bronze">3</div>
  return (
    <div className="ranking-medal" style={{ background: "oklch(0.30 0.02 270)", color: "oklch(0.70 0.02 270)" }}>
      {rank}
    </div>
  )
}

// ─── Year Selector ───
function YearSelect({
  value,
  onChange,
  id,
  label,
}: {
  value: number
  onChange: (v: number) => void
  id: string
  label: string
}) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 2000 + 1 }, (_, i) => currentYear - i)

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-xs text-muted-foreground whitespace-nowrap">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="h-9 px-3 rounded-lg bg-muted/40 border border-border/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
      >
        {years.map(y => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function InsightsPage() {
  const currentYear = new Date().getFullYear()
  const [keyword, setKeyword] = useState("")
  const [startYear, setStartYear] = useState(currentYear - 5)
  const [endYear, setEndYear] = useState(currentYear)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [activeSource, setActiveSource] = useState<"openalex" | "local">("local")

  // Section 1: Top Topics & Keywords
  const [topics, setTopics] = useState<TopicItem[]>([])
  const [keywords, setKeywords] = useState<TopicItem[]>([])
  const [totalPapers, setTotalPapers] = useState(0)

  // Section 2: Emerging Trends
  const [trends, setTrends] = useState<TrendItem[]>([])

  // Section 3: Top Affiliations
  const [affiliations, setAffiliations] = useState<AffiliationItem[]>([])
  const [authors, setAuthors] = useState<AuthorItem[]>([])

  const [hasLoaded, setHasLoaded] = useState(false)

  // Active tab for section 1
  const [topicsView, setTopicsView] = useState<"chart" | "cloud">("chart")

  const fetchInsights = useCallback(async () => {
    setIsLoading(true)
    setError("")

    const trimmedKeyword = keyword.trim()
    const params: Record<string, string | number> = { startYear, endYear }
    if (trimmedKeyword) params.keyword = trimmedKeyword
    setActiveSource(trimmedKeyword ? "openalex" : "local")

    try {
      const [topTopicsRes, emergingRes, affiliationsRes] = await Promise.allSettled([
        api.get("/trends/insights/top-topics", { params }),
        api.get("/trends/insights/emerging-trends", { params }),
        api.get("/trends/insights/top-affiliations", { params }),
      ])

      if (topTopicsRes.status === "fulfilled") {
        setTopics(topTopicsRes.value.data.topics || [])
        setKeywords(topTopicsRes.value.data.keywords || [])
        setTotalPapers(topTopicsRes.value.data.totalPapers || 0)
      }

      if (emergingRes.status === "fulfilled") {
        setTrends(emergingRes.value.data.trends || [])
      }

      if (affiliationsRes.status === "fulfilled") {
        setAffiliations(affiliationsRes.value.data.affiliations || [])
        setAuthors(affiliationsRes.value.data.authors || [])
      }

      const allFailed = [topTopicsRes, emergingRes, affiliationsRes].every(r => r.status === "rejected")
      if (allFailed) {
        setError("Không thể tải dữ liệu Insight. Kiểm tra kết nối backend.")
      }

      setHasLoaded(true)
    } catch {
      setError("Đã xảy ra lỗi không mong đợi.")
    } finally {
      setIsLoading(false)
    }
  }, [keyword, startYear, endYear])

  // Prepare line chart data from trends
  const lineChartData = useMemo(() => {
    if (!trends.length) return []
    const allYears = new Set<number>()
    trends.forEach(t => t.yearlyData.forEach(d => allYears.add(d.year)))
    const sortedYears = Array.from(allYears).sort()
    return sortedYears.map(year => {
      const point: Record<string, any> = { year }
      trends.slice(0, 8).forEach(t => {
        const found = t.yearlyData.find(d => d.year === year)
        point[t.name] = found?.count || 0
      })
      return point
    })
  }, [trends])

  const trendNames = useMemo(() => trends.slice(0, 8).map(t => t.name), [trends])

  return (
    <div className="w-full p-4 md:p-8 space-y-6">
      {/* ═══ Header ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-5xl"
      >
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-primary" />
          Research Insights
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Phân tích xu hướng nghiên cứu khoa học — Top chủ đề, từ khóa mới nổi, và tổ chức dẫn đầu từ metadata bài báo.
        </p>
        {hasLoaded && (
          <div className="mt-2">
            <Badge
              variant="outline"
              className={
                activeSource === "openalex"
                  ? "border-blue-500/30 bg-blue-500/10 text-blue-400 gap-1.5"
                  : "border-slate-500/30 bg-slate-500/10 text-slate-400 gap-1.5"
              }
            >
              {activeSource === "openalex" ? (
                <>
                  <Zap className="h-3 w-3" /> Live OpenAlex API
                  {keyword.trim() ? ` · "${keyword.trim()}"` : ""}
                </>
              ) : (
                <>
                  <LayoutList className="h-3 w-3" /> Dữ liệu corpus đã lưu
                </>
              )}
            </Badge>
          </div>
        )}
      </motion.div>

      {/* ═══ Filter Bar ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass rounded-2xl border border-border/40 p-4"
      >
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !isLoading && startYear <= endYear) fetchInsights()
              }}
              placeholder="Nhập chủ đề/từ khóa để phân tích trực tiếp từ OpenAlex (vd: machine learning) — để trống dùng dữ liệu corpus đã lưu"
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/40 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <CalendarRange className="h-4 w-4 text-primary" />
              <YearSelect id="insight-start" label="Từ" value={startYear} onChange={setStartYear} />
              <span className="text-muted-foreground text-sm">—</span>
              <YearSelect id="insight-end" label="Đến" value={endYear} onChange={setEndYear} />
            </div>
            <Button
              onClick={fetchInsights}
              disabled={isLoading || startYear > endYear}
              className="h-11 px-6 rounded-xl gap-2"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Phân tích
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ═══ Error ═══ */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="rounded-xl px-4 py-3 text-sm border bg-destructive/10 border-destructive/20 text-destructive"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Empty State ═══ */}
      {!hasLoaded ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid gap-4 md:grid-cols-3"
        >
          {[
            { icon: BarChart3, title: "Top Chủ đề & Từ khóa", description: "Biểu đồ cột và đám mây từ khóa thể hiện các lĩnh vực nghiên cứu nổi bật nhất." },
            { icon: TrendingUp, title: "Xu hướng Mới nổi", description: "Biểu đồ đường theo dõi dòng dịch chuyển keyword với Δ% tăng trưởng theo từng năm." },
            { icon: Building2, title: "Tổ chức & Tác giả", description: "Bảng xếp hạng các trường đại học, viện nghiên cứu và tác giả dẫn đầu." },
          ].map(({ icon: Icon, title, description }) => (
            <div key={title} className="glass rounded-2xl border border-border/40 p-5">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{title}</h3>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* ═══ Stats Row ═══ */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Tổng bài báo",
                value: totalPapers.toLocaleString(),
                icon: FileText,
                cls: "stat-purple",
              },
              {
                label: "Chủ đề phân tích",
                value: topics.length.toString(),
                icon: LayoutList,
                cls: "stat-emerald",
              },
              {
                label: "Xu hướng mới nổi",
                value: trends.filter(t => t.isEmerging).length.toString(),
                icon: Flame,
                cls: "stat-amber",
              },
              {
                label: "Tổ chức dẫn đầu",
                value: affiliations.length.toString(),
                icon: Building2,
                cls: "stat-rose",
              },
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className={`insight-stat-card glass rounded-2xl border border-border/40 p-5 ${stat.cls}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</span>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{startYear} — {endYear}</p>
              </motion.div>
            ))}
          </div>

          {/* ═══ SECTION 1: Top Topics & Keywords ═══ */}
          <div className="insight-divider" />

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Tiêu điểm Chủ đề & Từ khóa
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Top lĩnh vực nghiên cứu theo số lượng bài báo trong giai đoạn {startYear}–{endYear}
                </p>
              </div>
              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/30">
                <Button
                  variant={topicsView === "chart" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs rounded-md gap-1.5"
                  onClick={() => setTopicsView("chart")}
                >
                  <BarChart3 className="h-3 w-3" /> Bar Chart
                </Button>
                <Button
                  variant={topicsView === "cloud" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs rounded-md gap-1.5"
                  onClick={() => setTopicsView("cloud")}
                >
                  <Cloud className="h-3 w-3" /> Word Cloud
                </Button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-1">
              <div className="glass rounded-2xl border border-border/40 overflow-hidden">
                {topicsView === "chart" ? (
                  <div className="p-4">
                    {topics.length > 0 ? (
                      <ResponsiveContainer width="100%" height={380}>
                        <BarChart data={topics} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.30 0.02 270 / 0.3)" />
                          <XAxis type="number" tick={{ fill: "oklch(0.60 0.04 275)", fontSize: 11 }} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={140}
                            tick={{ fill: "oklch(0.80 0.02 275)", fontSize: 11 }}
                            tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 20) + "…" : v}
                          />
                          <Tooltip content={<InsightTooltip />} />
                          <Bar dataKey="count" name="Số bài báo" radius={[0, 6, 6, 0]}>
                            {topics.map((_entry, idx) => (
                              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground italic">
                        Chưa có dữ liệu chủ đề. Nhập từ khóa để phân tích live từ OpenAlex, hoặc tạo corpus trước.
                      </div>
                    )}
                  </div>
                ) : (
                  <WordCloud keywords={keywords} />
                )}
              </div>
            </div>

            {/* Top Keywords Table */}
            {topics.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl border border-border/40 p-4"
              >
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  Bảng xếp hạng chủ đề
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">#</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Chủ đề</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Phân loại</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Số bài</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topics.map((topic, idx) => (
                        <tr key={topic.name} className="ranking-row border-b border-border/20">
                          <td className="py-2.5 px-3">
                            <RankMedal rank={idx + 1} />
                          </td>
                          <td className="py-2.5 px-3 font-medium capitalize">{topic.name}</td>
                          <td className="py-2.5 px-3">
                            <Badge variant="outline" className={`text-xs ${CATEGORY_BADGE[topic.category] || CATEGORY_BADGE.general}`}>
                              {topic.category}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold tabular-nums">{topic.count.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </div>

          {/* ═══ SECTION 2: Emerging Trends ═══ */}
          <div className="insight-divider" />

          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Động lực Xu hướng Mới nổi
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tốc độ tăng trưởng (Δ%) giữa các chu kỳ — keyword có Δ% vượt bậc được gắn nhãn <span className="text-amber-400 font-semibold">Emerging Trend 🔥</span>
              </p>
            </div>

            {/* Line Chart */}
            <div className="glass rounded-2xl border border-border/40 p-4 overflow-hidden">
              {lineChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={380}>
                  <LineChart data={lineChartData} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.30 0.02 270 / 0.3)" />
                    <XAxis dataKey="year" tick={{ fill: "oklch(0.60 0.04 275)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "oklch(0.60 0.04 275)", fontSize: 11 }} />
                    <Tooltip content={<InsightTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                      iconType="circle"
                      iconSize={8}
                    />
                    {trendNames.map((name, idx) => (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground italic">
                  Chưa có dữ liệu xu hướng. Nhập từ khóa để phân tích live từ OpenAlex, hoặc tạo corpus và phân tích.
                </div>
              )}
            </div>

            {/* Trend Cards */}
            {trends.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {trends.slice(0, 9).map((trend, idx) => {
                  const isUp = trend.growthRate > 0
                  const isDown = trend.growthRate < 0
                  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus

                  return (
                    <motion.div
                      key={trend.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="glass rounded-xl border border-border/40 p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm capitalize truncate">{trend.name}</h3>
                          <Badge variant="outline" className={`text-[10px] mt-1 ${CATEGORY_BADGE[trend.category] || CATEGORY_BADGE.general}`}>
                            {trend.category}
                          </Badge>
                        </div>
                        {trend.isEmerging && (
                          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] gap-1 shrink-0">
                            <Flame className="h-3 w-3" /> Emerging
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <TrendIcon className={`h-4 w-4 ${isUp ? "text-emerald-400" : isDown ? "text-red-400" : "text-yellow-400"}`} />
                          <span className={`text-lg font-bold ${isUp ? "text-emerald-400" : isDown ? "text-red-400" : "text-yellow-400"}`}>
                            {trend.growthRate > 0 ? "+" : ""}{trend.growthRate}%
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {trend.totalCount} bài tổng
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Tăng trưởng TB: {trend.avgGrowthRate > 0 ? "+" : ""}{trend.avgGrowthRate}%/năm
                      </p>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ═══ SECTION 3: Top Affiliations & Authors ═══ */}
          <div className="insight-divider" />

          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Mạng lưới & Đơn vị Dẫn đầu
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tổ chức và tác giả có số lượng công bố cao nhất trong giai đoạn {startYear}–{endYear}
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {/* Affiliations Table */}
              <div className="glass rounded-2xl border border-border/40 p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Top Tổ chức
                </h3>
                {affiliations.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/30">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">#</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Tổ chức</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Bài báo</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Tác giả</th>
                        </tr>
                      </thead>
                      <tbody>
                        {affiliations.map((aff, idx) => (
                          <tr key={aff.affiliation} className="ranking-row border-b border-border/20">
                            <td className="py-2.5 px-3">
                              <RankMedal rank={idx + 1} />
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-xs capitalize truncate max-w-[200px]" title={aff.affiliation}>
                                {aff.affiliation}
                                {aff.country && (
                                  <span className="ml-1.5 text-[10px] uppercase text-muted-foreground not-italic">{aff.country}</span>
                                )}
                              </div>
                              {aff.topAuthors.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {aff.topAuthors.slice(0, 3).map(a => (
                                    <span key={a} className="text-[10px] text-muted-foreground bg-muted/40 rounded px-1.5 py-0.5">{a}</span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold tabular-nums">{aff.paperCount}</td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground tabular-nums">{aff.authorCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-sm text-muted-foreground italic">
                    Chưa có dữ liệu tổ chức
                  </div>
                )}
              </div>

              {/* Authors Table */}
              <div className="glass rounded-2xl border border-border/40 p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Top Tác giả
                </h3>
                {authors.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/30">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">#</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Tác giả</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Đơn vị</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Bài báo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {authors.map((author, idx) => (
                          <tr key={author.name} className="ranking-row border-b border-border/20">
                            <td className="py-2.5 px-3">
                              <RankMedal rank={idx + 1} />
                            </td>
                            <td className="py-2.5 px-3 font-medium">{author.name}</td>
                            <td className="py-2.5 px-3 text-xs text-muted-foreground capitalize truncate max-w-[160px]" title={author.affiliation || ""}>
                              {author.affiliation || "—"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold tabular-nums">{author.paperCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-sm text-muted-foreground italic">
                    Chưa có dữ liệu tác giả
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══ How to use ═══ */}
          <div className="glass rounded-2xl border border-border/40 p-5">
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-primary" /> Cách sử dụng Insight
            </h2>
            <div className="grid gap-4 text-xs text-muted-foreground md:grid-cols-3">
              {[
                "1. Nhập từ khóa + chọn khoảng thời gian rồi nhấn Phân tích để gọi live OpenAlex; để trống từ khóa sẽ thống kê từ corpus đã lưu.",
                "2. Dùng Bar Chart & Word Cloud để xác định chủ đề/từ khóa nào đang dẫn đầu trong giai đoạn nghiên cứu.",
                "3. Biểu đồ Emerging Trends giúp phát hiện từ khóa có tốc độ tăng Δ% vượt bậc — cơ hội nghiên cứu mới.",
              ].map(tip => (
                <div key={tip} className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/50 mt-1 shrink-0" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
