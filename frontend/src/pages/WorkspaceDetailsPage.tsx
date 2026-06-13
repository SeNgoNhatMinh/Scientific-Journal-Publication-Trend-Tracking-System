import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Plus, Settings, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ForceGraph3D from "react-force-graph-3d"
import api from "@/lib/api"
import { formatText, getPaperId, unwrapPaper } from "@/lib/format"

// API: GET /workspaces/{id}              → { success, workspace, role, stats }
// API: GET /workspaces/{id}/papers       → { success, papers, ... }
// API: GET /workspaces/{id}/keyword-graph → { success, nodes, edges, meta }
// API: GET /workspaces/{id}/notes        → { success, notes, ... }

const CATEGORY_COLORS: Record<string, string> = {
  domain: '#3b82f6',
  algorithm: '#ef4444',
  application: '#22c55e',
  method: '#a855f7',
  dataset: '#f97316',
  tool: '#06b6d4',
  general: '#6b7280',
}

export default function WorkspaceDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [workspace, setWorkspace] = useState<any>(null)
  const [papers, setPapers] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [graphData, setGraphData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] })
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
          // Map API edges → links for react-force-graph
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

  const cleanDoi = (doi?: string | null) => {
    const value = String(doi || "").trim()
    return value.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
  }

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
        params: {
          source: "openalex",
          keyword: paperQuery.trim(),
          limit: 6,
        },
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
    if (typeof authors[0] === 'string') return authors.join(", ")
    return authors.map((a: any) => a.name).join(", ")
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if (!workspace) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Workspace not found</h2>
        <Button onClick={() => navigate('/workspaces')}>Back to Workspaces</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/workspaces')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{workspace.name}</h1>
            <p className="text-sm text-muted-foreground">{workspace.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><Settings className="h-4 w-4 mr-2"/> Settings</Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="flex-1 flex flex-col">
        <TabsList className="mb-4">
          <TabsTrigger value="dashboard">Dashboard & Map</TabsTrigger>
          <TabsTrigger value="papers">Papers ({papers.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="flex-1 flex flex-col border rounded-lg overflow-hidden bg-slate-900 relative">
          <div className="absolute top-4 left-4 z-10 bg-background/80 p-3 rounded-lg backdrop-blur-sm pointer-events-none">
            <h3 className="text-sm font-semibold mb-1">Mini Research Map</h3>
            <p className="text-xs text-muted-foreground">3D keyword graph of your workspace</p>
          </div>
          <div className="flex-1 cursor-move">
            {graphData.nodes.length > 0 ? (
              <ForceGraph3D
                graphData={graphData}
                nodeLabel={(node: any) => `${node.label || node.id} (${node.category || 'unknown'})`}
                nodeColor={(node: any) => node.color}
                nodeVal={(node: any) => node.val}
                backgroundColor="#00000000"
                linkDirectionalParticles={1}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Add papers to this workspace to generate the keyword graph.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="papers" className="flex-1">
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={() => setShowAddPaper((value) => !value)}>
              <Plus className="h-4 w-4 mr-2"/> Add Paper
            </Button>
          </div>
          {showAddPaper && (
            <div className="mb-4 rounded-lg border bg-card p-4">
              <form onSubmit={searchPapers} className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={paperQuery}
                    onChange={(event) => setPaperQuery(event.target.value)}
                    className="pl-9"
                    placeholder="Search paper to add, e.g. mamba medical imaging"
                  />
                </div>
                <Button type="submit" disabled={isSearchingPapers || !paperQuery.trim()}>
                  {isSearchingPapers ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Search
                </Button>
              </form>
              {paperError && (
                <div className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {paperError}
                </div>
              )}
              {paperResults.length > 0 && (
                <div className="mt-4 space-y-3">
                  {paperResults.map((paper) => (
                    <div key={paper.id || paper.url || paper.title} className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h4 className="font-medium">{formatText(paper.title, "Untitled paper")}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatAuthors(paper.authors, paper.source)} • {paper.publicationYear || "N/A"} • {paper.citationCount || 0} citations
                        </p>
                        {paper.doi && (
                          <p className="mt-1 text-xs text-primary">DOI: {cleanDoi(paper.doi)}</p>
                        )}
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {formatText(paper.abstract, "No abstract available.")}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="shrink-0"
                        onClick={() => addPaperToWorkspace(paper)}
                        disabled={addingPaperId === (paper.id || paper.url || paper.title)}
                      >
                        {addingPaperId === (paper.id || paper.url || paper.title) ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {papers.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
              No papers in this workspace yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {papers.map((p) => (
                <div key={getPaperId(p)} className="p-4 border rounded-lg bg-card">
                  <h4 className="font-semibold text-primary cursor-pointer hover:underline" onClick={() => navigate(`/papers/${getPaperId(p)}`)}>
                    {formatText(unwrapPaper(p)?.title, "Untitled paper")}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatAuthors(unwrapPaper(p)?.authors, unwrapPaper(p)?.source)} • {unwrapPaper(p)?.publicationYear || "N/A"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="notes" className="flex-1">
          {notes.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg mt-4">
              No notes yet. Create your first research note.
            </div>
          ) : (
            <div className="grid gap-4">
              {notes.map((note) => (
                <div key={note._id} className="p-4 border rounded-lg bg-card">
                  <h4 className="font-semibold">{formatText(note.title, "Untitled note")}</h4>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{formatText(note.content)}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
