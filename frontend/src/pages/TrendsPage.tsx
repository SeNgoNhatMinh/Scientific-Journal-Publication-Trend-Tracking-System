import { useState, useEffect } from "react"
import { TrendingUp, Activity, Loader2, Sparkles, Zap, Minus, TrendingDown, Search, ExternalLink, FileText, Bookmark } from "lucide-react"
import { useNavigate } from "react-router-dom"
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
  LineChart,
  Line,
  Legend,
  ComposedChart,
  Bar,
} from "recharts"
import api from "@/lib/api"
import { formatText } from "@/lib/format"
import { motion } from "framer-motion"

const colors = [
  "oklch(0.65 0.25 285)", // purple
  "oklch(0.65 0.23 140)", // emerald
  "oklch(0.65 0.22 40)",  // orange
  "oklch(0.65 0.18 200)", // sky
  "oklch(0.7 0.18 80)",   // gold
  "oklch(0.65 0.22 345)", // rose
  "oklch(0.65 0.18 170)", // teal
  "oklch(0.6 0.23 310)",  // fuchsia
];

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
          {p.dataKey === "count" ? `${p.value?.toLocaleString()} papers` : `${p.value}% growth`}
        </p>
      ))}
    </div>
  )
}

function RelatedTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const sortedPayload = [...payload].sort((a: any, b: any) => b.value - a.value);
  return (
    <div className="glass rounded-lg px-3 py-2 border border-border/50 text-xs shadow-xl max-h-60 overflow-y-auto space-y-1">
      <p className="font-semibold mb-1 text-foreground text-sm">{label}</p>
      {sortedPayload.map((p: any, i: number) => {
        if (p.value === 0) return null;
        return (
          <p key={i} className="flex justify-between gap-4" style={{ color: p.color }}>
            <span>{p.name}:</span>
            <span className="font-bold">{p.value} papers</span>
          </p>
        );
      })}
    </div>
  )
}

export default function TrendsPage() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState("")
  const [trendData, setTrendData] = useState<any>(null)
  const [trendingTopics, setTrendingTopics] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isExplaining, setIsExplaining] = useState(false)
  const [aiDirections, setAiDirections] = useState<any[]>([])
  const [aiError, setAiError] = useState("")
  const [hasGeneratedDirections, setHasGeneratedDirections] = useState(false)
  const [savingEvidenceId, setSavingEvidenceId] = useState<string | null>(null)
  const [savingBookmarkId, setSavingBookmarkId] = useState<string | null>(null)
  const [savedEvidenceIds, setSavedEvidenceIds] = useState<Set<string>>(new Set())

  const [activeTab, setActiveTab] = useState<"volume" | "related">("volume")
  const [relKeyword, setRelKeyword] = useState("")
  const [relSource, setRelSource] = useState<"openalex" | "local">("openalex")
  const [relStartYear, setRelStartYear] = useState("2010")
  const [relData, setRelData] = useState<any>(null)
  const [relIsLoading, setRelIsLoading] = useState(false)
  const [relError, setRelError] = useState("")

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
      setHasGeneratedDirections(false)
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

  const analyzeRelatedTrend = async (kw: string) => {
    if (!kw) return
    setRelIsLoading(true)
    setRelError("")
    try {
      const res = await api.get(`/trends/related-keywords`, {
        params: {
          keyword: kw,
          source: relSource,
          startYear: parseInt(relStartYear, 10) || 2010
        }
      })
      setRelData(res.data)
    } catch (err: any) {
      console.error(err)
      if (err.response?.status === 504) setRelError("External API timeout. The source may be slow — please try again.")
      else if (err.response?.status === 429) setRelError("Rate limit exceeded. Please wait a moment and try again.")
      else setRelError(err.response?.data?.message || "Failed to analyze related keywords trend.")
      setRelData(null)
    } finally {
      setRelIsLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    analyzeTrend(keyword)
  }

  const handleRelatedSearch = (e: React.FormEvent) => {
    e.preventDefault()
    analyzeRelatedTrend(relKeyword)
  }

  const cleanDoi = (doi?: string | null) =>
    String(doi || "").trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")

  const getDoiUrl = (doi?: string | null) => {
    const value = cleanDoi(doi)
    return value ? `https://doi.org/${value}` : ""
  }

  const getSourceUrl = (paper: any) => paper?.url || getDoiUrl(paper?.doi)

  const isMongoObjectId = (value: string) => /^[a-f\d]{24}$/i.test(value)

  const getEvidenceId = (paper: any, fallback?: string | number) =>
    String(paper?._id || paper?.id || paper?.doi || paper?.url || paper?.title || fallback || "")

  const toBackendSource = (paperSource?: string | null) => {
    const value = String(paperSource || "openalex").toLowerCase().replace(/[-\s]/g, "_")
    if (value === "semanticscholar") return "semantic_scholar"
    return value
  }

  const normalizeOpportunityScore = (score: any) => {
    const value = Number(score)
    if (!Number.isFinite(value)) return null
    return Math.round(value > 1 ? value : value * 100)
  }

  const getDirectionTitle = (direction: any) => direction.title || direction.direction || "Research direction"

  const getDirectionWhy = (direction: any) => direction.why || direction.rationale || "This direction has matching research evidence from academic sources."

  const getDirectionKeywords = (direction: any) => direction.relatedKeywords || direction.keywords || []

  const buildSavablePaper = (paper: any) => {
    const normalizedSource = toBackendSource(paper.source)
    const externalIds: Record<string, string> = {}
    if (paper.id) {
      if (normalizedSource === "openalex") externalIds.openalex = paper.id
      if (normalizedSource === "semantic_scholar") externalIds.semanticScholar = paper.id
      if (normalizedSource === "crossref") externalIds.crossref = paper.id
      if (normalizedSource === "arxiv") externalIds.arxiv = paper.id
      if (normalizedSource === "ieee") externalIds.ieee = paper.id
      if (normalizedSource === "exa") externalIds.exa = paper.id
    }

    return {
      title: formatText(paper.title, "Untitled paper"),
      abstract: formatText(paper.abstract, "").slice(0, 5000),
      doi: cleanDoi(paper.doi) || undefined,
      publishedDate: paper.publishedDate || undefined,
      publicationYear: paper.publicationYear || undefined,
      citationCount: paper.citationCount || 0,
      authors: (paper.authors || []).map((author: any, index: number) => ({
        name: author.name || "Unknown",
        externalId: author.authorId || undefined,
        order: index + 1,
      })),
      journalName: paper.journalName || undefined,
      source: normalizedSource,
      url: paper.url || undefined,
      pdfUrl: paper.pdfUrl || undefined,
      externalIds,
    }
  }

  const ensureEvidencePaperInDatabase = async (paper: any, evidenceId: string, showDetailLoading = false) => {
    const paperId = String(paper?._id || paper?.id || "")
    if (paperId && isMongoObjectId(paperId)) {
      return paperId
    }
    if (!localStorage.getItem("token")) {
      navigate("/login")
      return null
    }

    if (showDetailLoading) setSavingEvidenceId(evidenceId)
    try {
      const res = await api.post("/papers", { paper: buildSavablePaper(paper) })
      const databasePaperId = res.data.paper?._id || res.data.paper?.id
      if (databasePaperId) return databasePaperId
      setAiError("Could not open details because the paper was not saved into the database.")
      return null
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate("/login")
        return null
      }
      setAiError(err.response?.data?.message || "Could not save this evidence paper before opening details.")
      return null
    } finally {
      if (showDetailLoading) setSavingEvidenceId(null)
    }
  }

  const openEvidenceDetails = async (paper: any, evidenceId: string) => {
    setAiError("")
    const databasePaperId = await ensureEvidencePaperInDatabase(paper, evidenceId, true)
    if (databasePaperId) navigate(`/papers/${databasePaperId}`)
  }

  const saveEvidencePaper = async (paper: any, evidenceId: string) => {
    if (!localStorage.getItem("token")) {
      navigate("/login")
      return
    }

    setAiError("")
    setSavingBookmarkId(evidenceId)
    try {
      const databasePaperId = await ensureEvidencePaperInDatabase(paper, evidenceId, false)
      if (!databasePaperId) return
      await api.post(`/papers/${databasePaperId}/bookmark`)
      setSavedEvidenceIds((current) => new Set(current).add(evidenceId))
    } catch (err: any) {
      if (err.response?.status === 401) navigate("/login")
      else setAiError(err.response?.data?.message || "Could not add this evidence paper to your library.")
    } finally {
      setSavingBookmarkId(null)
    }
  }

  const explainTrend = async () => {
    if (!trendData?.keyword) return
    setIsExplaining(true)
    setAiError("")
    setAiDirections([])
    setHasGeneratedDirections(false)
    try {
      const res = await api.post("/trends/research-directions", {
        keyword: trendData.keyword,
        trendContext: {
          keyword: trendData.keyword,
          trendStatus: trendData.trendStatus,
          averageGrowthRate: trendData.averageGrowthRate,
          trends: trendData.trends || trendData.yearlyData || [],
        },
        limit: 5,
      })
      setAiDirections(res.data.directions || [])
    } catch (err: any) {
      setAiError(err.response?.data?.message || "Could not generate evidence-backed research directions.")
    } finally {
      setHasGeneratedDirections(true)
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

      {/* Tabs */}
      <div className="flex border-b border-border/40 gap-4 mb-2">
        <button
          onClick={() => setActiveTab("volume")}
          className={`pb-2.5 px-2 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "volume"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Keyword Volume Trend
        </button>
        <button
          onClick={() => setActiveTab("related")}
          className={`pb-2.5 px-2 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "related"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Related Keywords Trend Analyzer
        </button>
      </div>

      {activeTab === "volume" ? (
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

                {/* Research opportunity section */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-border/30 bg-muted/20">
                  <div>
                    <p className="text-sm font-medium">Research Opportunity Map</p>
                    <p className="text-xs text-muted-foreground">Find evidence-backed research directions from this trend.</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={explainTrend}
                    disabled={isExplaining}
                    className="gap-2"
                  >
                    {isExplaining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {isExplaining ? "Finding evidence..." : "Generate Directions"}
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
                    className="grid gap-4"
                  >
                    {aiDirections.map((direction, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold leading-5">{getDirectionTitle(direction)}</h3>
                            {direction.nextQuery && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Next query: <span className="text-foreground">{direction.nextQuery}</span>
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge variant="secondary" className="text-xs">
                              {direction.opportunityLevel || "Weak evidence"}
                            </Badge>
                            {normalizeOpportunityScore(direction.opportunityScore ?? direction.priority) !== null && (
                              <span className="text-[11px] text-muted-foreground">
                                Score {normalizeOpportunityScore(direction.opportunityScore ?? direction.priority)}
                              </span>
                            )}
                          </div>
                        </div>

                        {direction.formula && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {[
                              ["Algorithm", direction.formula.algorithm],
                              ["Domain", direction.formula.domain],
                              ["Application", direction.formula.application],
                            ].map(([label, value]) => (
                              <div key={label} className="rounded-lg border border-border/30 bg-background/30 p-2">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
                                <p className="text-xs font-medium mt-0.5">{value || "Evidence-driven"}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground leading-5">{getDirectionWhy(direction)}</p>

                        {getDirectionKeywords(direction).length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {getDirectionKeywords(direction).map((item: string) => (
                              <Badge key={item} variant="outline" className="text-xs">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {direction.evidencePapers?.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-primary" />
                              Evidence Papers
                            </p>
                            <div className="space-y-2">
                              {direction.evidencePapers.map((paper: any, paperIndex: number) => {
                                const sourceUrl = getSourceUrl(paper)
                                const doiUrl = getDoiUrl(paper.doi)
                                const evidenceId = getEvidenceId(paper, paperIndex)
                                return (
                                  <div key={evidenceId} className="rounded-lg border border-border/30 bg-background/35 p-3">
                                    <p className="text-xs font-medium leading-5">{formatText(paper.title, "Untitled paper")}</p>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                      {(paper.source || "source").toUpperCase()}
                                      {paper.publicationYear ? ` • ${paper.publicationYear}` : ""}
                                      {paper.doi ? ` • DOI: ${cleanDoi(paper.doi)}` : ""}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {sourceUrl && (
                                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" asChild>
                                          <a href={sourceUrl} target="_blank" rel="noreferrer">
                                            <ExternalLink className="h-3 w-3" />
                                            Open Source
                                          </a>
                                        </Button>
                                      )}
                                      {doiUrl && (
                                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" asChild>
                                          <a href={doiUrl} target="_blank" rel="noreferrer">DOI</a>
                                        </Button>
                                      )}
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => openEvidenceDetails(paper, evidenceId)}
                                        disabled={savingEvidenceId === evidenceId}
                                      >
                                        {savingEvidenceId === evidenceId ? <Loader2 className="h-3 w-3 animate-spin" /> : "View Details"}
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 text-xs gap-1"
                                        onClick={() => saveEvidencePaper(paper, evidenceId)}
                                        disabled={savingBookmarkId === evidenceId || savedEvidenceIds.has(evidenceId)}
                                      >
                                        {savingBookmarkId === evidenceId ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <Bookmark className="h-3 w-3" />
                                        )}
                                        {savedEvidenceIds.has(evidenceId) ? "In Library" : "Add to Library"}
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}

                {hasGeneratedDirections && !isExplaining && aiDirections.length === 0 && !aiError && (
                  <div className="rounded-xl border border-border/30 bg-muted/20 p-4 text-sm text-muted-foreground">
                    No evidence-backed directions found. Try a more specific keyword.
                  </div>
                )}

                {/* Chart */}
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart 
                      data={trendData.trends.map((t: any) => t.year === new Date().getFullYear() ? { ...t, growthRate: null } : t)} 
                      margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.02 270 / 0.2)" vertical={false} />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: "oklch(0.55 0.03 270)" }} axisLine={false} tickLine={false} tickFormatter={(val) => val === new Date().getFullYear() ? `${val}*` : val} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "oklch(0.55 0.03 270)" }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "oklch(0.65 0.27 285)" }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}%`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                      <Bar yAxisId="left" dataKey="count" fill="oklch(0.65 0.27 285 / 0.4)" radius={[4, 4, 0, 0]} name="Publication Volume (count)" />
                      <Line yAxisId="right" type="monotone" dataKey="growthRate" stroke="oklch(0.65 0.27 285)" strokeWidth={2.5} name="Growth Rate (%)" dot={{ r: 3, fill: "oklch(0.65 0.27 285)", strokeWidth: 0 }} activeDot={{ r: 5, fill: "oklch(0.65 0.27 285)", stroke: "oklch(0.75 0.27 285)", strokeWidth: 2 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-muted-foreground mt-2 text-center opacity-70">
                    * {new Date().getFullYear()} data is incomplete (year-to-date)
                  </p>
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
                        onClick={() => {
                          setKeyword(topic.name || topic);
                          analyzeTrend(topic.name || topic);
                        }}
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Related Trend Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2 glass rounded-2xl border border-border/40 p-6 space-y-6"
          >
            <div>
              <h2 className="font-semibold text-base flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-primary" /> Related Keywords Trend Analyzer
              </h2>
              <p className="text-xs text-muted-foreground">Search a keyword to extract associated keywords in matching papers and view their co-trends.</p>
            </div>

            <form onSubmit={handleRelatedSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="e.g., Mamba, Selective Scan, Transformer..."
                  value={relKeyword}
                  onChange={(e) => setRelKeyword(e.target.value)}
                  className="pl-9 h-10 bg-muted/30 border-border/50 rounded-xl w-full text-sm"
                />
              </div>
              
              <div className="flex gap-2 shrink-0">
                <select
                  value={relSource}
                  onChange={(e) => setRelSource(e.target.value as any)}
                  className="h-10 px-3 bg-muted/30 border border-border/50 rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-muted/40 transition-all font-medium"
                >
                  <option value="openalex" className="bg-background text-foreground">OpenAlex API</option>
                  <option value="local" className="bg-background text-foreground">Local Database</option>
                </select>

                <div className="flex items-center gap-1.5 bg-muted/30 border border-border/50 rounded-xl px-2.5 h-10">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold whitespace-nowrap">From:</span>
                  <input
                    type="number"
                    min="2000"
                    max={new Date().getFullYear()}
                    value={relStartYear}
                    onChange={(e) => setRelStartYear(e.target.value)}
                    className="w-10 bg-transparent border-none p-0 text-sm focus:outline-none focus:ring-0 text-foreground font-semibold text-center"
                  />
                </div>

                <Button type="submit" disabled={relIsLoading} className="h-10 px-5 rounded-xl text-sm font-semibold">
                  {relIsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
                </Button>
              </div>
            </form>

            {relError && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 text-destructive p-3 text-sm">
                {relError}
              </div>
            )}

            {relData ? (
              <div className="space-y-6">
                {/* Stats Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-muted/30 border border-border/30">
                  <div>
                    <h3 className="font-semibold text-base flex items-center gap-1.5">
                      {relData.keyword}
                      <Badge variant="secondary" className="text-xs uppercase font-bold tracking-wider py-0 px-1.5">
                        {relData.source}
                      </Badge>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Analyzed {relData.totalPapers} publications from {relStartYear} to present</p>
                  </div>
                </div>

                {/* Multi-line chart */}
                {relData.trends?.length > 0 && relData.topKeywords?.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Yearly Trend of Top Related Keywords</p>
                    <div className="h-[300px] w-full pr-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={relData.trends} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.02 270 / 0.15)" vertical={false} />
                          <XAxis dataKey="year" tick={{ fontSize: 10, fill: "oklch(0.55 0.03 270)" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "oklch(0.55 0.03 270)" }} axisLine={false} tickLine={false} />
                          <Tooltip content={<RelatedTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                          {relData.topKeywords.slice(0, 8).map((kw: any, i: number) => (
                            <Line
                              key={kw.keyword}
                              type="monotone"
                              dataKey={kw.keyword}
                              stroke={colors[i % colors.length]}
                              strokeWidth={2.5}
                              dot={{ r: 2.5, fill: colors[i % colors.length], strokeWidth: 0 }}
                              activeDot={{ r: 4.5, strokeWidth: 1.5 }}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center border border-dashed border-border/30 rounded-xl">
                    <p className="text-sm text-muted-foreground italic">No trend data available. Make sure papers contain keywords.</p>
                  </div>
                )}

                {/* Papers List with Keywords */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <Search className="h-4 w-4 text-primary" /> Extracted Publications ({relData.papers?.length || 0})
                  </h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {relData.papers && relData.papers.length > 0 ? (
                      relData.papers.map((paper: any, i: number) => (
                        <div key={i} className="p-3.5 rounded-xl border border-border/20 bg-muted/10 space-y-2 hover:bg-muted/15 transition-all">
                          <div className="flex items-start justify-between gap-4">
                            <h4 className="font-medium text-xs text-foreground leading-relaxed">{paper.title}</h4>
                            <div className="flex gap-1.5 items-center text-[10px] font-semibold text-muted-foreground shrink-0">
                              <span className="bg-muted/50 px-1.5 py-0.5 rounded border border-border/30">{paper.year || "N/A"}</span>
                              {paper.citationCount !== undefined && (
                                <span className="bg-muted/50 px-1.5 py-0.5 rounded border border-border/30">{paper.citationCount} cit.</span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {paper.keywords?.length > 0 ? (
                              paper.keywords.map((kw: string, idx: number) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  onClick={() => {
                                    setRelKeyword(kw);
                                    analyzeRelatedTrend(kw);
                                  }}
                                  className="text-[9px] font-semibold cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all py-0 px-1.5"
                                >
                                  {kw}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-[10px] text-muted-foreground/60 italic">No keywords available</span>
                            )}
                          </div>
                          {paper.keywords?.length > 0 && (
                            <div className="text-[9px] text-muted-foreground/50 font-medium">
                              Total: {paper.keywords.length} keywords extracted
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic text-center py-6">No papers found.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : !relError && (
              <div className="h-[350px] flex flex-col items-center justify-center border-2 border-dashed border-border/30 rounded-xl text-center px-6">
                <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">Search for a main keyword to extract and analyze related keyword trends.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Try: "mamba", "quantum computing", "crispr"</p>
              </div>
            )}
          </motion.div>

          {/* Right sidebar: Related Keyword Frequency List */}
          <div className="space-y-6">
            {relData && relData.topKeywords?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="glass rounded-2xl border border-border/40 p-5 space-y-4"
              >
                <div>
                  <h2 className="font-semibold text-sm flex items-center gap-2 mb-1">
                    <Activity className="h-4 w-4 text-primary" /> Top Related Keywords
                  </h2>
                  <p className="text-[10px] text-muted-foreground">Occurrence frequency in {relData.totalPapers} matching papers. Click to pivot search.</p>
                </div>

                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {relData.topKeywords.map((item: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => {
                        setRelKeyword(item.keyword);
                        analyzeRelatedTrend(item.keyword);
                      }}
                      className="w-full text-left p-3 rounded-xl border border-border/20 bg-muted/5 hover:bg-muted/15 transition-all group space-y-2 hover:scale-[1.01]"
                    >
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">{item.keyword}</span>
                        <span className="text-muted-foreground font-bold shrink-0">{item.count} papers ({item.percentage}%)</span>
                      </div>
                      
                      {/* Premium Progress Bar */}
                      <div className="h-1 w-full bg-muted/20 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: colors[i % colors.length]
                          }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Hot Topics Sidebar */}
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
                        onClick={() => {
                          setRelKeyword(topic.name || topic);
                          analyzeRelatedTrend(topic.name || topic);
                        }}
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
          </div>
        </div>
      )}
    </div>
  )
}
