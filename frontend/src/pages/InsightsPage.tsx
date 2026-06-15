import { useMemo, useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import ForceGraph2D from "react-force-graph-2d"
import ForceGraph3D from "react-force-graph-3d"
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  FileText,
  GitBranch,
  Layers3,
  Loader2,
  Search,
  Sparkles,
  Target,
  Zap,
  TrendingUp,
  Minus,
  TrendingDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import api from "@/lib/api"
import { formatText } from "@/lib/format"
import { motion, AnimatePresence } from "framer-motion"

const CATEGORY_COLORS: Record<string, string> = {
  domain:      "#3b82f6",
  algorithm:   "#ef4444",
  application: "#22c55e",
  method:      "#a855f7",
  dataset:     "#f97316",
  tool:        "#06b6d4",
  general:     "#6b7280",
}

const CATEGORY_TITLES: Record<string, string> = {
  domain:      "Domains",
  algorithm:   "Algorithms",
  application: "Applications",
  method:      "Methods",
  dataset:     "Datasets",
  tool:        "Tools",
  general:     "General",
}

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  domain:      "border-blue-500/30 bg-blue-500/10 text-blue-400",
  algorithm:   "border-red-500/30 bg-red-500/10 text-red-400",
  application: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  method:      "border-purple-500/30 bg-purple-500/10 text-purple-400",
  dataset:     "border-orange-500/30 bg-orange-500/10 text-orange-400",
  tool:        "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
  general:     "border-slate-500/30 bg-slate-500/10 text-slate-400",
}

const TREND_CONFIG = {
  exploding: { label: "Exploding", icon: Zap, cls: "trend-exploding", badgeCls: "bg-orange-500/10 text-orange-400 border-orange-500/30" },
  growing:   { label: "Growing",   icon: TrendingUp, cls: "trend-growing", badgeCls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  stable:    { label: "Stable",    icon: Minus, cls: "trend-stable", badgeCls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
  declining: { label: "Declining", icon: TrendingDown, cls: "trend-declining", badgeCls: "bg-slate-500/10 text-slate-400 border-slate-500/30" },
} as Record<string, any>

function parseGrowth(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function keywordName(item: any) {
  return item?.name || item?.normalizedText || item?.keyword || item?.label || ""
}

export default function InsightsPage() {
  const [keyword, setKeyword] = useState("mamba")
  const [searchedKeyword, setSearchedKeyword] = useState("")
  const [trendData, setTrendData] = useState<any>(null)
  const [categories, setCategories] = useState<Record<string, any[]>>({})
  const [algorithmDomains, setAlgorithmDomains] = useState<any[]>([])
  const [papers, setPapers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingCorpus, setIsCreatingCorpus] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const [searchParams] = useSearchParams()
  const runIdParam = searchParams.get("runId")
  const keywordParam = searchParams.get("keyword")

  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] })
  const [graphMode, setGraphMode] = useState<"2d" | "3d">("3d")
  const [activeRunId, setActiveRunId] = useState<string>("")

  const opportunityCards = useMemo(() => {
    const topAlgorithm = keywordName(categories.algorithm?.[0])
    const topDomain = keywordName(categories.domain?.[0])
    const topApplication = keywordName(categories.application?.[0])
    const topMethod = keywordName(categories.method?.[0])
    const pair = algorithmDomains[0]
    const cards = []

    if (pair?.algorithm && pair?.domain) {
      cards.push({
        title: `${pair.algorithm} in ${pair.domain}`,
        type: "Algorithm-domain pair",
        why: `This pair appears together in ${pair.paperCount || 0} stored papers, making it a concrete research intersection.`,
        next: `Search recent papers around "${pair.algorithm} ${pair.domain}" and look for unresolved evaluation gaps.`,
      })
    }
    if (topAlgorithm && topApplication) {
      cards.push({
        title: `${topAlgorithm} for ${topApplication}`,
        type: "Technique application",
        why: `This combines a detected algorithm with a detected application, closer to an actual paper topic than a single keyword.`,
        next: `Check whether existing papers focus on accuracy, efficiency, robustness, or real-world deployment.`,
      })
    }
    if (topDomain && topMethod) {
      cards.push({
        title: `${topMethod} in ${topDomain}`,
        type: "Method-domain niche",
        why: `Methods become valuable when tied to a domain. This direction can become a focused research question.`,
        next: `Build a corpus for this phrase and compare publication growth over the last 3-5 years.`,
      })
    }
    if (searchedKeyword) {
      cards.push({
        title: `Map sub-topics under "${searchedKeyword}"`,
        type: "Exploration path",
        why: `If the input is broad, the system should reveal smaller sub-keywords instead of returning a generic paper list.`,
        next: `Create a corpus for "${searchedKeyword}", then refresh this page to get evidence from stored metadata.`,
      })
    }
    return cards.slice(0, 4)
  }, [algorithmDomains, categories, searchedKeyword])

  const performAnalysis = async (seedValue: string, overrideRunId?: string) => {
    if (!seedValue) return

    setIsLoading(true)
    setError("")
    setMessage("")
    setSearchedKeyword(seedValue)

    try {
      let activeRun = overrideRunId || ""
      if (!activeRun && seedValue) {
        try {
          const runsRes = await api.get("/corpus/runs", { params: { limit: 100 } })
          const matchingRun = (runsRes.data.runs || []).find(
            (r: any) => r.seedKeyword.toLowerCase() === seedValue.toLowerCase() && r.status === "completed"
          )
          if (matchingRun) activeRun = matchingRun._id
        } catch (err) {
          console.error("Failed to check existing corpus runs", err)
        }
      }
      setActiveRunId(activeRun)

      const categoriesParams: any = { limit: 8 }
      const domainsParams: any = { limit: 8, paperLimit: 500 }
      const graphParams: any = { limit: 50, paperLimit: 300 }

      if (activeRun) {
        categoriesParams.analysisRunId = activeRun
        domainsParams.analysisRunId = activeRun
        graphParams.analysisRunId = activeRun
      }

      const [trendRes, algorithmRes, domainRes, applicationRes, methodRes, pairRes, paperRes, graphRes] =
        await Promise.allSettled([
          api.get("/trends/keyword", { params: { keyword: seedValue } }),
          api.get("/trends/keyword-categories", { params: { category: "algorithm", ...categoriesParams } }),
          api.get("/trends/keyword-categories", { params: { category: "domain", ...categoriesParams } }),
          api.get("/trends/keyword-categories", { params: { category: "application", ...categoriesParams } }),
          api.get("/trends/keyword-categories", { params: { category: "method", ...categoriesParams } }),
          api.get("/trends/algorithm-domains", { params: domainsParams }),
          api.get("/sources/search", { params: { source: "openalex", keyword: seedValue, limit: 5 } }),
          activeRun
            ? api.get("/trends/keyword-graph", { params: graphParams })
            : Promise.reject(new Error("No active run for graph")),
        ])

      if (trendRes.status === "fulfilled") setTrendData(trendRes.value.data)
      else setTrendData(null)

      setCategories({
        algorithm: algorithmRes.status === "fulfilled" ? algorithmRes.value.data.keywords || [] : [],
        domain: domainRes.status === "fulfilled" ? domainRes.value.data.keywords || [] : [],
        application: applicationRes.status === "fulfilled" ? applicationRes.value.data.keywords || [] : [],
        method: methodRes.status === "fulfilled" ? methodRes.value.data.keywords || [] : [],
      })
      setAlgorithmDomains(pairRes.status === "fulfilled" ? pairRes.value.data.pairs || [] : [])
      setPapers(paperRes.status === "fulfilled" ? paperRes.value.data.papers || [] : [])

      if (graphRes.status === "fulfilled") {
        const nodes = (graphRes.value.data.nodes || []).map((n: any) => ({
          ...n,
          val: n.paperCount || 1,
          color: CATEGORY_COLORS[n.category] || CATEGORY_COLORS.general,
        }))
        const links = (graphRes.value.data.edges || []).map((e: any) => ({
          source: e.source,
          target: e.target,
          value: e.weight || 1,
        }))
        setGraphData({ nodes, links })
      } else {
        setGraphData({ nodes: [], links: [] })
      }

      const allFailed = [trendRes, algorithmRes, domainRes, applicationRes, methodRes, pairRes, paperRes].every(
        (result) => result.status === "rejected"
      )
      if (allFailed) setError("Could not load research insights. Check backend/API configuration.")
    } catch (err) {
      console.error(err)
      setError("An unexpected error occurred during analysis.")
    } finally {
      setIsLoading(false)
    }
  }

  const analyzeKeyword = () => performAnalysis(keyword.trim())

  const createCorpus = async () => {
    const seed = keyword.trim()
    if (!seed) return
    setIsCreatingCorpus(true)
    setError("")
    setMessage("")
    try {
      const res = await api.post("/corpus/runs", {
        seedKeyword: seed,
        source: "openalex",
        startYear: new Date().getFullYear() - 5,
        endYear: new Date().getFullYear(),
        maxPages: 2,
        perPage: 25,
      })
      setMessage(
        `Corpus started for "${seed}". Wait until it completes, then run Analyze again. Run ID: ${res.data.run?._id || res.data.runId}`
      )
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not start corpus run.")
    } finally {
      setIsCreatingCorpus(false)
    }
  }

  useEffect(() => {
    if (keywordParam || runIdParam) {
      const activeKeyword = keywordParam || ""
      if (activeKeyword) setKeyword(activeKeyword)
      performAnalysis(activeKeyword || keyword, runIdParam || undefined)
    }
  }, [keywordParam, runIdParam])

  const hasResults = Boolean(searchedKeyword)
  const growth = parseGrowth(trendData?.averageGrowthRate)
  const trendConf = TREND_CONFIG[trendData?.trendStatus] ?? null

  return (
    <div className="w-full p-4 md:p-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-5xl"
      >
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <BrainCircuit className="h-7 w-7 text-primary" />
          Research Opportunity Finder
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a keyword or domain. This page turns paper metadata into actionable research directions.
        </p>
      </motion.div>

      {/* Search / Action bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass rounded-2xl border border-border/40 p-4"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="insights-keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") analyzeKeyword() }}
              className="pl-9 h-11 bg-muted/30 border-border/50 rounded-xl"
              placeholder="Try: mamba, medical imaging, robotics, transformer..."
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={analyzeKeyword}
              disabled={isLoading || !keyword.trim()}
              className="h-11 px-5 rounded-xl gap-2"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Analyze
            </Button>
            <Button
              variant="outline"
              onClick={createCorpus}
              disabled={isCreatingCorpus || !keyword.trim()}
              className="h-11 px-5 rounded-xl gap-2"
            >
              {isCreatingCorpus ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
              Build Corpus
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Status messages */}
      <AnimatePresence>
        {(error || message) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className={`rounded-xl px-4 py-3 text-sm border ${
              error
                ? "bg-destructive/10 border-destructive/20 text-destructive"
                : "bg-primary/10 border-primary/20 text-primary"
            }`}
          >
            {error || message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!hasResults ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid gap-4 md:grid-cols-3"
        >
          {[
            { icon: BarChart3, title: "Trend Signal", description: "Check whether the keyword is growing by publication volume." },
            { icon: Layers3, title: "Keyword Roles", description: "Separate domain, algorithm, application, and method keywords." },
            { icon: Target, title: "Research Direction", description: "Turn keywords into concrete topic suggestions you can act on." },
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
          {/* Keyword Graph Card */}
          <div className="glass rounded-2xl border border-border/40 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 pb-4 gap-3">
              <div>
                <h2 className="font-semibold text-base flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" /> Keyword Co-occurrence Graph
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <span className="text-xs text-muted-foreground">Colored by category:</span>
                  {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                    <span key={cat} className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: color }} />
                      <span className="text-xs text-muted-foreground capitalize">{cat}</span>
                    </span>
                  ))}
                </div>
              </div>
              {graphData.nodes.length > 0 && (
                <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/30">
                  {(["2d", "3d"] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={graphMode === mode ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 px-3 text-xs rounded-md"
                      onClick={() => setGraphMode(mode)}
                    >
                      {mode.toUpperCase()}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div className="h-[420px] border-t border-border/30 bg-background/40 relative overflow-hidden flex items-center justify-center">
              {graphData.nodes.length > 0 ? (
                <div className="w-full h-full relative">
                  {graphMode === "2d" ? (
                    <ForceGraph2D
                      graphData={graphData}
                      nodeLabel={(node: any) => `${node.label || node.id} (${node.category || "unknown"})`}
                      nodeColor={(node: any) => node.color}
                      nodeVal={(node: any) => node.val}
                      backgroundColor="#00000000"
                    />
                  ) : (
                    <ForceGraph3D
                      graphData={graphData}
                      nodeLabel={(node: any) => `${node.label || node.id} (${node.category || "unknown"})`}
                      nodeColor={(node: any) => node.color}
                      nodeVal={(node: any) => node.val}
                      backgroundColor="#00000000"
                      linkDirectionalParticles={1}
                    />
                  )}
                </div>
              ) : (
                <div className="text-center p-6 flex flex-col items-center gap-3">
                  <GitBranch className="h-10 w-10 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {activeRunId
                      ? "No keyword relationships could be generated for this corpus run yet."
                      : `No completed corpus run exists for "${searchedKeyword}" yet. Build a corpus to generate the graph.`}
                  </p>
                  {!activeRunId && (
                    <Button variant="outline" size="sm" onClick={createCorpus} disabled={isCreatingCorpus} className="rounded-xl gap-2">
                      {isCreatingCorpus ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
                      Build Corpus for "{searchedKeyword}"
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid gap-4 lg:grid-cols-4">
            {/* Trend signal */}
            <div className="glass rounded-2xl border border-border/40 p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Trend Signal</h3>
              <div className={`text-3xl font-bold mb-1 ${trendConf?.cls ?? "text-muted-foreground"}`}>
                {trendData ? `${growth.toFixed(1)}%` : "N/A"}
              </div>
              <div className="flex items-center gap-2">
                {trendConf && (
                  <Badge variant="outline" className={`border text-xs px-2 py-0.5 flex items-center gap-1 ${trendConf.badgeCls}`}>
                    <trendConf.icon className="h-3 w-3" />
                    {trendConf.label}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Avg. publication growth rate</p>
            </div>

            {/* Category chips */}
            {(["algorithm", "domain", "application"] as const).map((category) => (
              <div key={category} className="glass rounded-2xl border border-border/40 p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  {CATEGORY_TITLES[category]}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {(categories[category] || []).slice(0, 6).map((item) => (
                    <span
                      key={item._id || keywordName(item)}
                      className={`text-xs px-2 py-0.5 rounded-full border ${CATEGORY_BADGE_COLORS[category]}`}
                    >
                      {keywordName(item)}
                    </span>
                  ))}
                  {(categories[category] || []).length === 0 && (
                    <span className="text-xs text-muted-foreground italic">No stored data yet.</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Opportunities + Evidence */}
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            {/* Opportunities */}
            <div className="glass rounded-2xl border border-border/40 p-5 space-y-4">
              <div>
                <h2 className="font-semibold text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> Suggested Research Opportunities
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Topic directions testable by building a corpus and checking recent papers.
                </p>
              </div>

              {opportunityCards.length > 0 ? (
                <div className="space-y-3">
                  {opportunityCards.map((item, index) => (
                    <motion.div
                      key={`${item.title}-${index}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                      className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-2"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary">
                          {item.type}
                        </span>
                        <h3 className="font-semibold text-sm">{item.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.why}</p>
                      <div className="flex items-start gap-2 rounded-lg bg-muted/30 p-2.5">
                        <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                        <span className="text-xs text-muted-foreground">{item.next}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Not enough local metadata yet. Click Build Corpus, wait for completion, then analyze again.
                </p>
              )}
            </div>

            {/* Evidence papers */}
            <div className="glass rounded-2xl border border-border/40 p-5 space-y-4">
              <div>
                <h2 className="font-semibold text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Evidence Papers
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Recent papers from OpenAlex for quick inspection.</p>
              </div>

              <div className="space-y-2">
                {papers.slice(0, 5).map((paper) => (
                  <a
                    key={paper.id || paper.url || paper.title}
                    href={paper.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl border border-border/40 bg-muted/20 p-3 hover:border-primary/30 hover:bg-primary/5 transition-all group"
                  >
                    <h3 className="line-clamp-2 text-xs font-semibold group-hover:text-primary transition-colors">
                      {formatText(paper.title, "Untitled paper")}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {paper.publicationYear || "N/A"}
                      {paper.citationCount > 0 && ` · ${paper.citationCount} citations`}
                    </p>
                  </a>
                ))}
                {papers.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    No live papers loaded. Try another keyword or source later.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Algorithm x Domain */}
          <div className="glass rounded-2xl border border-border/40 p-5 space-y-4">
            <div>
              <h2 className="font-semibold text-base flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-primary" /> Algorithm × Domain Evidence
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Where algorithms are being applied — higher paper count = stronger evidence in your corpus.
              </p>
            </div>

            {algorithmDomains.length > 0 ? (
              <div className="space-y-2">
                {algorithmDomains.slice(0, 8).map((pair) => (
                  <div
                    key={`${pair.algorithm}-${pair.domain}`}
                    className="grid gap-3 rounded-xl border border-border/40 bg-muted/20 p-3 md:grid-cols-[1fr_1fr_auto_1.2fr] md:items-center"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">Algorithm</p>
                      <p className="text-sm font-medium">{pair.algorithm}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Domain</p>
                      <p className="text-sm font-medium">{pair.domain}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs w-fit">
                      {pair.paperCount || 0} papers
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Use "{pair.algorithm} {pair.domain}" as a focused search phrase.
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/50 p-5 text-sm text-muted-foreground text-center">
                No algorithm-domain evidence yet. Click Build Corpus for the keyword, wait until complete, then Analyze again.
              </div>
            )}
          </div>

          {/* How to use */}
          <div className="glass rounded-2xl border border-border/40 p-5">
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
              <BrainCircuit className="h-4 w-4 text-primary" /> How To Use This For Research
            </h2>
            <div className="grid gap-4 text-xs text-muted-foreground md:grid-cols-3">
              {[
                "1. Use Trend Signal to decide whether the topic is worth exploring right now.",
                "2. Use Algorithms/Domains/Applications to turn a broad keyword into a focused research angle.",
                "3. Use Evidence Papers to verify that the suggested opportunity has real academic activity.",
              ].map((tip) => (
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
