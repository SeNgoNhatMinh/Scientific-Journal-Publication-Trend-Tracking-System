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
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import api from "@/lib/api"
import { formatText } from "@/lib/format"

const CATEGORY_COLORS: Record<string, string> = {
  domain: '#3b82f6',
  algorithm: '#ef4444',
  application: '#22c55e',
  method: '#a855f7',
  dataset: '#f97316',
  tool: '#06b6d4',
  general: '#6b7280',
}


const CATEGORY_TITLES: Record<string, string> = {
  domain: "Domains",
  algorithm: "Algorithms",
  application: "Applications",
  method: "Methods",
  dataset: "Datasets",
  tool: "Tools",
  general: "General",
}

function parseGrowth(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function getTrendTone(status?: string) {
  if (status === "exploding") return "text-red-600"
  if (status === "growing") return "text-green-600"
  if (status === "stable") return "text-yellow-600"
  if (status === "declining") return "text-muted-foreground"
  return "text-muted-foreground"
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
        why: `This pair appears together in ${pair.paperCount || 0} stored papers, so it is a concrete research intersection rather than a loose keyword match.`,
        next: `Search recent papers around "${pair.algorithm} ${pair.domain}" and look for unresolved evaluation gaps.`,
      })
    }

    if (topAlgorithm && topApplication) {
      cards.push({
        title: `${topAlgorithm} for ${topApplication}`,
        type: "Technique application",
        why: `This combines a detected algorithm with a detected application, which is closer to an actual paper topic than a single keyword.`,
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
          if (matchingRun) {
            activeRun = matchingRun._id
          }
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

      const allFailed = [trendRes, algorithmRes, domainRes, applicationRes, methodRes, pairRes, paperRes]
        .every((result) => result.status === "rejected")
      if (allFailed) setError("Could not load research insights. Check backend/API configuration.")
    } catch (err) {
      console.error(err)
      setError("An unexpected error occurred during analysis.")
    } finally {
      setIsLoading(false)
    }
  }

  const analyzeKeyword = () => {
    performAnalysis(keyword.trim())
  }

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
      setMessage(`Corpus started for "${seed}". Wait until it completes, then run Analyze again. Run ID: ${res.data.run?._id || res.data.runId}`)
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not start corpus run.")
    } finally {
      setIsCreatingCorpus(false)
    }
  }

  useEffect(() => {
    if (keywordParam || runIdParam) {
      const activeKeyword = keywordParam || ""
      if (activeKeyword) {
        setKeyword(activeKeyword)
      }
      performAnalysis(activeKeyword || keyword, runIdParam || undefined)
    }
  }, [keywordParam, runIdParam])

  const hasResults = Boolean(searchedKeyword)
  const growth = parseGrowth(trendData?.averageGrowthRate)

  return (
    <div className="w-full p-4 md:p-8">
      <div className="mb-6 max-w-5xl">
        <h1 className="text-3xl font-bold tracking-tight">Research Opportunity Finder</h1>
        <p className="mt-2 text-muted-foreground">
          Nhập một keyword hoặc domain. Trang này không chỉ vẽ graph, mà biến metadata paper thành hướng nghiên cứu có thể hành động.
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") analyzeKeyword()
              }}
              className="pl-9"
              placeholder="Try: mamba, medical imaging, robotics, transformer"
            />
          </div>
          <Button onClick={analyzeKeyword} disabled={isLoading || !keyword.trim()}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Analyze
          </Button>
          <Button variant="outline" onClick={createCorpus} disabled={isCreatingCorpus || !keyword.trim()}>
            {isCreatingCorpus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitBranch className="mr-2 h-4 w-4" />}
            Build Corpus
          </Button>
        </CardContent>
      </Card>

      {(error || message) && (
        <div className={`mb-6 rounded-lg p-3 text-sm ${error ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
          {error || message}
        </div>
      )}

      {!hasResults ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" /> Trend Signal
              </CardTitle>
              <CardDescription>Check whether the keyword is growing by publication volume.</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers3 className="h-5 w-5 text-primary" /> Keyword Roles
              </CardTitle>
              <CardDescription>Separate domain, algorithm, application, and method.</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-primary" /> Research Direction
              </CardTitle>
              <CardDescription>Turn keywords into concrete topic suggestions.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Keyword Graph Card */}
          <Card className="col-span-full overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-primary" /> Keyword Co-occurrence Graph
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs">
                  <span>Visualizing concept relationships. Colored by category:</span>
                  <span className="inline-flex flex-wrap gap-2">
                    {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                      <span key={cat} className="inline-flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
                        <span className="capitalize text-muted-foreground">{cat}</span>
                      </span>
                    ))}
                  </span>
                </CardDescription>
              </div>
              {graphData.nodes.length > 0 && (
                <div className="flex items-center gap-1.5 self-end sm:self-auto bg-muted p-1 rounded-md">
                  <Button
                    variant={graphMode === "2d" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => setGraphMode("2d")}
                  >
                    2D
                  </Button>
                  <Button
                    variant={graphMode === "3d" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => setGraphMode("3d")}
                  >
                    3D
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="h-[450px] bg-slate-950/20 rounded-b-lg border-t relative overflow-hidden flex flex-col items-center justify-center">
              {graphData.nodes.length > 0 ? (
                <div className="w-full h-full relative">
                  {graphMode === "2d" ? (
                    <ForceGraph2D
                      graphData={graphData}
                      nodeLabel={(node: any) => `${node.label || node.id} (${node.category || 'unknown'})`}
                      nodeColor={(node: any) => node.color}
                      nodeVal={(node: any) => node.val}
                      backgroundColor="#00000000"
                    />
                  ) : (
                    <ForceGraph3D
                      graphData={graphData}
                      nodeLabel={(node: any) => `${node.label || node.id} (${node.category || 'unknown'})`}
                      nodeColor={(node: any) => node.color}
                      nodeVal={(node: any) => node.val}
                      backgroundColor="#00000000"
                      linkDirectionalParticles={1}
                    />
                  )}
                </div>
              ) : (
                <div className="text-center p-6 flex flex-col items-center gap-3">
                  <p className="text-muted-foreground text-sm max-w-sm">
                    {activeRunId 
                      ? "No keyword relationships could be generated for this corpus run yet."
                      : `No completed corpus run exists for "${searchedKeyword}" yet. Build a corpus to generate the keyword relationship graph.`
                    }
                  </p>
                  {!activeRunId && (
                    <Button variant="outline" size="sm" onClick={createCorpus} disabled={isCreatingCorpus}>
                      {isCreatingCorpus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitBranch className="mr-2 h-4 w-4" />}
                      Build Corpus for "{searchedKeyword}"
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trend Signal</CardTitle>
                <CardDescription>Publication growth for the searched keyword.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getTrendTone(trendData?.trendStatus)}`}>
                  {trendData ? `${growth.toFixed(1)}%` : "N/A"}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Status: <span className="font-medium capitalize">{trendData?.trendStatus || "unknown"}</span>
                </p>
              </CardContent>
            </Card>

            {(["algorithm", "domain", "application"] as const).map((category) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-base">{CATEGORY_TITLES[category]}</CardTitle>
                  <CardDescription>Top detected {category} keywords in stored metadata.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {(categories[category] || []).slice(0, 6).map((item) => (
                    <Badge key={item._id || keywordName(item)} variant="secondary">
                      {keywordName(item)}
                    </Badge>
                  ))}
                  {(categories[category] || []).length === 0 && (
                    <span className="text-sm text-muted-foreground">No stored data yet.</span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" /> Suggested Research Opportunities
                </CardTitle>
                <CardDescription>
                  These are topic directions, not just keywords. Each one should be testable by building a corpus and checking recent papers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {opportunityCards.map((item, index) => (
                  <div key={`${item.title}-${index}`} className="rounded-lg border p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{item.type}</Badge>
                      <h3 className="font-semibold">{item.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.why}</p>
                    <div className="mt-3 flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm">
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{item.next}</span>
                    </div>
                  </div>
                ))}
                {opportunityCards.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Not enough local metadata yet. Click Build Corpus, wait for completion, then analyze again.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Evidence Papers
                </CardTitle>
                <CardDescription>Recent papers from OpenAlex for quick inspection.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {papers.slice(0, 5).map((paper) => (
                  <a
                    key={paper.id || paper.url || paper.title}
                    href={paper.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <h3 className="line-clamp-2 text-sm font-semibold">{formatText(paper.title, "Untitled paper")}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {paper.publicationYear || "N/A"} · {paper.citationCount || 0} citations
                    </p>
                  </a>
                ))}
                {papers.length === 0 && (
                  <p className="text-sm text-muted-foreground">No live papers loaded. Try another keyword or source later.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers3 className="h-5 w-5 text-primary" /> Algorithm x Domain Evidence
              </CardTitle>
              <CardDescription>
                A practical matrix of where algorithms are being applied. Higher paper count means stronger evidence in your stored corpus.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {algorithmDomains.length > 0 ? (
                algorithmDomains.slice(0, 8).map((pair) => (
                  <div key={`${pair.algorithm}-${pair.domain}`} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_1fr_auto_1.2fr] md:items-center">
                    <div>
                      <div className="text-xs text-muted-foreground">Algorithm</div>
                      <div className="font-medium">{pair.algorithm}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Domain</div>
                      <div className="font-medium">{pair.domain}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Evidence</div>
                      <Badge variant="secondary">{pair.paperCount || 0} papers</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Use this pair as a focused search phrase: "{pair.algorithm} {pair.domain}".
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  No algorithm-domain evidence yet. Click Build Corpus for the keyword, wait until it completes, then Analyze again.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" /> How To Use This For Research
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
              <p>
                1. Use Trend Signal to decide whether the topic is worth exploring right now.
              </p>
              <p>
                2. Use Algorithms/Domains/Applications to turn a broad keyword into a focused research angle.
              </p>
              <p>
                3. Use Evidence Papers to verify that the suggested opportunity has real academic activity.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
