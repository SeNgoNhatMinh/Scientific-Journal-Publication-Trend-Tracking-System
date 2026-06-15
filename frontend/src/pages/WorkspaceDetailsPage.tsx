import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Plus, Settings, Loader2, Search, GitBranch, FileText, StickyNote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ForceGraph3D from "react-force-graph-3d"
import api from "@/lib/api"
import { formatText, getPaperId, unwrapPaper } from "@/lib/format"
import { motion, AnimatePresence } from "framer-motion"

// API: GET /workspaces/{id}              → { success, workspace, role, stats }
// API: GET /workspaces/{id}/papers       → { success, papers, ... }
// API: GET /workspaces/{id}/keyword-graph → { success, nodes, edges, meta }
// API: GET /workspaces/{id}/notes        → { success, notes, ... }

const CATEGORY_COLORS: Record<string, string> = {
  domain:      "#3b82f6",
  algorithm:   "#ef4444",
  application: "#22c55e",
  method:      "#a855f7",
  dataset:     "#f97316",
  tool:        "#06b6d4",
  general:     "#6b7280",
}

export default function WorkspaceDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [workspace, setWorkspace] = useState<any>(null)
  const [papers, setPapers] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [showAddPaper, setShowAddPaper] = useState(false)
  const [paperQuery, setPaperQuery] = useState("")
  const [paperResults, setPaperResults] = useState<any[]>([])
  const [isSearchingPapers, setIsSearchingPapers] = useState(false)
  const [addingPaperId, setAddingPaperId] = useState<string | null>(null)
  const [paperError, setPaperError] = useState("")

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const wsRes = await api.get(`/workspaces/${id}`)
        setWorkspace(wsRes.data.workspace || wsRes.data)

        const papersRes = await api.get(`/workspaces/${id}/papers`)
        setPapers(papersRes.data.papers || [])

        try {
          const notesRes = await api.get(`/workspaces/${id}/notes`)
          setNotes(notesRes.data.notes || [])
        } catch { /* notes may be empty */ }

        try {
          const graphRes = await api.get(`/workspaces/${id}/keyword-graph`)
          const nodes = (graphRes.data.nodes || []).map((n: any) => ({
            ...n,
            val: n.paperCount || 1,
            color: CATEGORY_COLORS[n.category] || CATEGORY_COLORS.general,
          }))
          const links = (graphRes.data.edges || []).map((e: any) => ({
            source: e.source,
            target: e.target,
            value: e.weight || 1,
          }))
          setGraphData({ nodes, links })
        } catch { /* graph may be empty for new workspaces */ }
      } catch (err) {
        console.error("Failed to load workspace", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDetails()
  }, [id])

  const loadWorkspacePapers = async () => {
    const papersRes = await api.get(`/workspaces/${id}/papers`)
    setPapers(papersRes.data.papers || [])
  }

  const loadWorkspaceGraph = async () => {
    const graphRes = await api.get(`/workspaces/${id}/keyword-graph`)
    const nodes = (graphRes.data.nodes || []).map((n: any) => ({
      ...n,
      val: n.paperCount || 1,
      color: CATEGORY_COLORS[n.category] || CATEGORY_COLORS.general,
    }))
    const links = (graphRes.data.edges || []).map((e: any) => ({
      source: e.source,
      target: e.target,
      value: e.weight || 1,
    }))
    setGraphData({ nodes, links })
  }

  const toBackendSource = (paperSource: string) => {
    if (paperSource === "semanticscholar") return "semantic_scholar"
    return paperSource || "openalex"
  }

  const cleanDoi = (doi?: string | null) =>
    String(doi || "").trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")

  const buildSavablePaper = (paper: any) => {
    const externalIds: Record<string, string> = {}
    const source = String(paper.source || "openalex")
    if (paper.id) {
      if (source === "openalex") externalIds.openalex = paper.id
      if (source === "semanticscholar") externalIds.semanticScholar = paper.id
      if (source === "crossref") externalIds.crossref = paper.id
      if (source === "ieee") externalIds.ieee = paper.id
      if (source === "exa") externalIds.exa = paper.id
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
      source: toBackendSource(source),
      url: paper.url || undefined,
      externalIds,
    }
  }

  const searchPapers = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!paperQuery.trim()) return
    setIsSearchingPapers(true)
    setPaperError("")
    try {
      const res = await api.get("/sources/search", {
        params: { source: "openalex", keyword: paperQuery.trim(), limit: 6 },
      })
      setPaperResults(res.data.papers || [])
    } catch (err: any) {
      setPaperError(err.response?.data?.message || "Could not search papers.")
      setPaperResults([])
    } finally {
      setIsSearchingPapers(false)
    }
  }

  const addPaperToWorkspace = async (paper: any) => {
    if (!id) return
    setAddingPaperId(paper.id || paper.url || paper.title)
    setPaperError("")
    try {
      await api.post(`/workspaces/${id}/papers`, {
        paper: buildSavablePaper(paper),
        source: "search",
      })
      await loadWorkspacePapers()
      await loadWorkspaceGraph()
      setShowAddPaper(false)
      setPaperResults([])
      setPaperQuery("")
    } catch (err: any) {
      setPaperError(err.response?.data?.message || "Could not add paper to workspace.")
    } finally {
      setAddingPaperId(null)
    }
  }

  const formatAuthors = (authors: any, paperSource?: string) => {
    if (!authors || authors.length === 0) {
      return paperSource === "exa" ? "Authors not available from Exa" : "Unknown authors"
    }
    if (typeof authors[0] === "string") return authors.join(", ")
    return authors.map((a: any) => a.name).join(", ")
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h2 className="text-xl font-bold mb-4">Workspace not found</h2>
        <Button onClick={() => navigate("/workspaces")} className="rounded-xl">Back to Workspaces</Button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="container mx-auto p-4 md:p-8 flex flex-col h-[calc(100vh-3.5rem)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl hover:bg-muted"
            onClick={() => navigate("/workspaces")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{workspace.name}</h1>
            {workspace.description && (
              <p className="text-xs text-muted-foreground">{workspace.description}</p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2 rounded-xl">
          <Settings className="h-4 w-4" /> Settings
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="flex-1 flex flex-col">
        <TabsList className="mb-4 glass border border-border/40 rounded-xl p-1 self-start gap-1">
          <TabsTrigger value="dashboard" className="rounded-lg text-sm gap-2">
            <GitBranch className="h-3.5 w-3.5" /> Research Map
          </TabsTrigger>
          <TabsTrigger value="papers" className="rounded-lg text-sm gap-2">
            <FileText className="h-3.5 w-3.5" /> Papers ({papers.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="rounded-lg text-sm gap-2">
            <StickyNote className="h-3.5 w-3.5" /> Notes ({notes.length})
          </TabsTrigger>
        </TabsList>

        {/* 3D Graph Tab */}
        <TabsContent value="dashboard" className="flex-1 flex flex-col rounded-2xl overflow-hidden border border-border/40 bg-background/50 relative">
          <div className="absolute top-4 left-4 z-10 glass rounded-xl px-4 py-2.5 border border-border/40 pointer-events-none">
            <h3 className="text-xs font-semibold">Mini Research Map</h3>
            <p className="text-xs text-muted-foreground">3D keyword graph of your workspace</p>
          </div>
          <div className="flex-1 cursor-move">
            {graphData.nodes.length > 0 ? (
              <ForceGraph3D
                graphData={graphData}
                nodeLabel={(node: any) => `${node.label || node.id} (${node.category || "unknown"})`}
                nodeColor={(node: any) => node.color}
                nodeVal={(node: any) => node.val}
                backgroundColor="#00000000"
                linkDirectionalParticles={1}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <GitBranch className="h-12 w-12 opacity-20" />
                <p className="text-sm">Add papers to this workspace to generate the keyword graph.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Papers Tab */}
        <TabsContent value="papers" className="flex-1 overflow-y-auto">
          <div className="flex justify-end mb-4">
            <Button
              size="sm"
              className="gap-2 rounded-xl"
              onClick={() => setShowAddPaper((v) => !v)}
            >
              <Plus className="h-4 w-4" /> Add Paper
            </Button>
          </div>

          <AnimatePresence>
            {showAddPaper && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-5 glass rounded-2xl border border-border/40 p-4 space-y-3"
              >
                <form onSubmit={searchPapers} className="flex flex-col gap-3 md:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      value={paperQuery}
                      onChange={(e) => setPaperQuery(e.target.value)}
                      className="pl-9 h-10 bg-muted/30 border-border/50 rounded-xl"
                      placeholder="Search paper to add..."
                    />
                  </div>
                  <Button type="submit" disabled={isSearchingPapers || !paperQuery.trim()} className="rounded-xl">
                    {isSearchingPapers ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                  </Button>
                </form>

                {paperError && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                    {paperError}
                  </div>
                )}

                {paperResults.length > 0 && (
                  <div className="space-y-3 mt-1">
                    {paperResults.map((paper) => (
                      <div
                        key={paper.id || paper.url || paper.title}
                        className="flex flex-col gap-3 rounded-xl border border-border/40 bg-muted/20 p-3 md:flex-row md:items-start md:justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2">{formatText(paper.title, "Untitled paper")}</h4>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatAuthors(paper.authors, paper.source)} · {paper.publicationYear || "N/A"} · {paper.citationCount || 0} citations
                          </p>
                          {paper.doi && (
                            <p className="mt-0.5 text-xs text-primary">DOI: {cleanDoi(paper.doi)}</p>
                          )}
                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                            {formatText(paper.abstract, "No abstract available.")}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="shrink-0 rounded-lg gap-1.5"
                          onClick={() => addPaperToWorkspace(paper)}
                          disabled={addingPaperId === (paper.id || paper.url || paper.title)}
                        >
                          {addingPaperId === (paper.id || paper.url || paper.title) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {papers.length === 0 ? (
            <div className="text-center py-16 glass rounded-2xl border border-dashed border-border/50">
              <FileText className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No papers in this workspace yet.</p>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
              className="space-y-3"
            >
              {papers.map((p) => {
                const wp = unwrapPaper(p)
                return (
                  <motion.div
                    key={getPaperId(p)}
                    variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    className="glass rounded-xl border border-border/40 p-4 hover:border-primary/30 transition-colors"
                  >
                    <button
                      className="text-sm font-semibold text-left hover:text-primary transition-colors line-clamp-2 w-full"
                      onClick={() => navigate(`/papers/${getPaperId(p)}`)}
                    >
                      {formatText(wp?.title, "Untitled paper")}
                    </button>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatAuthors(wp?.authors, wp?.source)} · {wp?.publicationYear || "N/A"}
                    </p>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="flex-1 overflow-y-auto">
          {notes.length === 0 ? (
            <div className="text-center py-16 glass rounded-2xl border border-dashed border-border/50">
              <StickyNote className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No notes yet. Create your first research note.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note._id} className="glass rounded-xl border border-border/40 p-4 hover:border-primary/30 transition-colors">
                  <h4 className="font-semibold text-sm">{formatText(note.title, "Untitled note")}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{formatText(note.content)}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
