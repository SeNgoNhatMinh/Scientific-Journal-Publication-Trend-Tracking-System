import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft, Plus, Loader2, Search, GitBranch, FileText, StickyNote,
  TrendingUp, Bell, Users, Database, BellRing, BellOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import ForceGraph3D from "react-force-graph-3d"
import api from "@/lib/api"
import { formatText, getPaperId, unwrapPaper } from "@/lib/format"
import { motion, AnimatePresence } from "framer-motion"

// API: GET  /workspaces/{id}              → { success, workspace, role, stats }
// API: GET  /workspaces/{id}/papers       → { success, papers, ... }
// API: GET  /workspaces/{id}/keyword-graph → { success, nodes, edges, meta }
// API: GET  /workspaces/{id}/notes        → { success, notes, ... }
// API: POST /workspaces/{id}/notes        → body { paperId?, title?, content, tags? }
// API: GET  /workspaces/{id}/trends       → { success, paperCount, yearlyData, byCategory, topKeywords, ... }
// API: GET  /workspaces/{id}/alerts       → alert[]
// API: POST /workspaces/{id}/alerts       → body { keyword, type?, notifyEnabled? }
// API: POST /workspaces/{id}/members      → body { userId? | email, role? }
// API: POST /workspaces/{id}/corpus/runs  → body { seedKeyword, source?, startYear?, endYear?, maxPages?, perPage? }

const CATEGORY_COLORS: Record<string, string> = {
  domain:      "#3b82f6",
  algorithm:   "#ef4444",
  application: "#22c55e",
  method:      "#a855f7",
  dataset:     "#f97316",
  tool:        "#06b6d4",
  general:     "#6b7280",
}

// Role ranking to gate editor/owner-only actions in the UI
const roleRank: Record<string, number> = { viewer: 1, editor: 2, owner: 3 }

export default function WorkspaceDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [workspace, setWorkspace] = useState<any>(null)
  const [role, setRole] = useState<string>("viewer")
  const [stats, setStats] = useState<any>(null)
  const [papers, setPapers] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [trends, setTrends] = useState<any>(null)
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] })
  const [isLoading, setIsLoading] = useState(true)

  // Add paper
  const [showAddPaper, setShowAddPaper] = useState(false)
  const [paperQuery, setPaperQuery] = useState("")
  const [paperResults, setPaperResults] = useState<any[]>([])
  const [isSearchingPapers, setIsSearchingPapers] = useState(false)
  const [addingPaperId, setAddingPaperId] = useState<string | null>(null)
  const [paperError, setPaperError] = useState("")

  // Notes
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [noteTitle, setNoteTitle] = useState("")
  const [noteContent, setNoteContent] = useState("")
  const [noteTags, setNoteTags] = useState("")
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [noteError, setNoteError] = useState("")

  // Alerts
  const [alertKeyword, setAlertKeyword] = useState("")
  const [alertNotify, setAlertNotify] = useState(true)
  const [isSavingAlert, setIsSavingAlert] = useState(false)
  const [alertError, setAlertError] = useState("")

  // Members
  const [memberOpen, setMemberOpen] = useState(false)
  const [memberEmail, setMemberEmail] = useState("")
  const [memberRole, setMemberRole] = useState("viewer")
  const [isSavingMember, setIsSavingMember] = useState(false)
  const [memberError, setMemberError] = useState("")
  const [memberSuccess, setMemberSuccess] = useState("")

  // Corpus run
  const [corpusOpen, setCorpusOpen] = useState(false)
  const [corpusKeyword, setCorpusKeyword] = useState("")
  const [corpusSource, setCorpusSource] = useState("openalex")
  const [corpusStartYear, setCorpusStartYear] = useState("2018")
  const [corpusEndYear, setCorpusEndYear] = useState("2024")
  const [corpusMaxPages, setCorpusMaxPages] = useState("5")
  const [isSavingCorpus, setIsSavingCorpus] = useState(false)
  const [corpusError, setCorpusError] = useState("")
  const [corpusSuccess, setCorpusSuccess] = useState("")

  const canEdit = roleRank[role] >= roleRank.editor
  const isOwner = role === "owner"

  const buildGraph = (data: any) => {
    const nodes = (data.nodes || []).map((n: any) => ({
      ...n,
      val: n.paperCount || 1,
      color: CATEGORY_COLORS[n.category] || CATEGORY_COLORS.general,
    }))
    const links = (data.edges || []).map((e: any) => ({
      source: e.source,
      target: e.target,
      value: e.weight || 1,
    }))
    return { nodes, links }
  }

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const wsRes = await api.get(`/workspaces/${id}`)
        setWorkspace(wsRes.data.workspace || wsRes.data)
        setRole(wsRes.data.role || "viewer")
        setStats(wsRes.data.stats || null)

        const papersRes = await api.get(`/workspaces/${id}/papers`)
        setPapers(papersRes.data.papers || [])

        try {
          const notesRes = await api.get(`/workspaces/${id}/notes`)
          setNotes(notesRes.data.notes || [])
        } catch { /* notes may be empty */ }

        try {
          const alertsRes = await api.get(`/workspaces/${id}/alerts`)
          setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : alertsRes.data.alerts || [])
        } catch { /* alerts may be empty */ }

        try {
          const trendsRes = await api.get(`/workspaces/${id}/trends`)
          setTrends(trendsRes.data)
        } catch { /* trends may be empty */ }

        try {
          const graphRes = await api.get(`/workspaces/${id}/keyword-graph`)
          setGraphData(buildGraph(graphRes.data))
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
    setGraphData(buildGraph(graphRes.data))
  }

  const refreshTrends = async () => {
    try {
      const trendsRes = await api.get(`/workspaces/${id}/trends`)
      setTrends(trendsRes.data)
    } catch { /* ignore */ }
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
      refreshTrends()
      setShowAddPaper(false)
      setPaperResults([])
      setPaperQuery("")
    } catch (err: any) {
      setPaperError(err.response?.data?.message || "Could not add paper to workspace.")
    } finally {
      setAddingPaperId(null)
    }
  }

  const createNote = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!id || !noteContent.trim()) return
    setIsSavingNote(true)
    setNoteError("")
    try {
      const tags = noteTags.split(",").map((t) => t.trim()).filter(Boolean)
      await api.post(`/workspaces/${id}/notes`, {
        title: noteTitle.trim() || undefined,
        content: noteContent.trim(),
        tags,
      })
      const notesRes = await api.get(`/workspaces/${id}/notes`)
      setNotes(notesRes.data.notes || [])
      setShowNoteForm(false)
      setNoteTitle("")
      setNoteContent("")
      setNoteTags("")
    } catch (err: any) {
      setNoteError(err.response?.data?.message || "Could not save note.")
    } finally {
      setIsSavingNote(false)
    }
  }

  const createAlert = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!id || !alertKeyword.trim()) return
    setIsSavingAlert(true)
    setAlertError("")
    try {
      await api.post(`/workspaces/${id}/alerts`, {
        keyword: alertKeyword.trim(),
        type: "keyword",
        notifyEnabled: alertNotify,
      })
      const alertsRes = await api.get(`/workspaces/${id}/alerts`)
      setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : alertsRes.data.alerts || [])
      setAlertKeyword("")
      setAlertNotify(true)
    } catch (err: any) {
      setAlertError(err.response?.data?.message || "Could not create alert.")
    } finally {
      setIsSavingAlert(false)
    }
  }

  const addMember = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!id || !memberEmail.trim()) return
    setIsSavingMember(true)
    setMemberError("")
    setMemberSuccess("")
    try {
      const res = await api.post(`/workspaces/${id}/members`, {
        email: memberEmail.trim(),
        role: memberRole,
      })
      const name = res.data?.userId?.name || res.data?.userId?.email || memberEmail.trim()
      setMemberSuccess(`${name} added as ${memberRole}.`)
      setMemberEmail("")
      // Refresh member count
      try {
        const wsRes = await api.get(`/workspaces/${id}`)
        setStats(wsRes.data.stats || null)
      } catch { /* ignore */ }
    } catch (err: any) {
      setMemberError(err.response?.data?.message || "Could not add member.")
    } finally {
      setIsSavingMember(false)
    }
  }

  const createCorpusRun = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!id || !corpusKeyword.trim()) return
    setIsSavingCorpus(true)
    setCorpusError("")
    setCorpusSuccess("")
    try {
      await api.post(`/workspaces/${id}/corpus/runs`, {
        seedKeyword: corpusKeyword.trim(),
        source: corpusSource,
        startYear: Number(corpusStartYear) || undefined,
        endYear: Number(corpusEndYear) || undefined,
        maxPages: Number(corpusMaxPages) || undefined,
      })
      setCorpusSuccess("Corpus run started. Papers will appear here once processed.")
      setCorpusKeyword("")
      loadWorkspacePapers()
      loadWorkspaceGraph()
      refreshTrends()
    } catch (err: any) {
      setCorpusError(err.response?.data?.message || "Could not start corpus run.")
    } finally {
      setIsSavingCorpus(false)
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
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              {workspace.name}
              <Badge variant="outline" className="text-[10px] uppercase">{role}</Badge>
            </h1>
            {workspace.description && (
              <p className="text-xs text-muted-foreground">{workspace.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Dialog open={corpusOpen} onOpenChange={setCorpusOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                  <Database className="h-4 w-4" /> Run Corpus
                </Button>
              </DialogTrigger>
              <DialogContent className="glass border-border/50 rounded-2xl">
                <form onSubmit={createCorpusRun}>
                  <DialogHeader>
                    <DialogTitle>New Corpus Run</DialogTitle>
                    <DialogDescription>
                      Fetch and analyze papers from an academic source by keyword.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-3">
                    <Input
                      placeholder="Seed keyword (e.g., machine learning)"
                      value={corpusKeyword}
                      onChange={(e) => setCorpusKeyword(e.target.value)}
                      required
                      className="h-11 rounded-xl bg-muted/30 border-border/50"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Source</label>
                        <Select value={corpusSource} onValueChange={(v) => setCorpusSource(v ?? "openalex")}>
                          <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-border/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="openalex">OpenAlex</SelectItem>
                            <SelectItem value="crossref">Crossref</SelectItem>
                            <SelectItem value="semantic_scholar">Semantic Scholar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Max pages</label>
                        <Input
                          type="number" min={1} max={20}
                          value={corpusMaxPages}
                          onChange={(e) => setCorpusMaxPages(e.target.value)}
                          className="h-11 rounded-xl bg-muted/30 border-border/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Start year</label>
                        <Input
                          type="number"
                          value={corpusStartYear}
                          onChange={(e) => setCorpusStartYear(e.target.value)}
                          className="h-11 rounded-xl bg-muted/30 border-border/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">End year</label>
                        <Input
                          type="number"
                          value={corpusEndYear}
                          onChange={(e) => setCorpusEndYear(e.target.value)}
                          className="h-11 rounded-xl bg-muted/30 border-border/50"
                        />
                      </div>
                    </div>
                    {corpusError && (
                      <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                        {corpusError}
                      </div>
                    )}
                    {corpusSuccess && (
                      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-500">
                        {corpusSuccess}
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isSavingCorpus || !corpusKeyword.trim()} className="rounded-xl gap-2">
                      {isSavingCorpus ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                      Start Run
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {isOwner && (
            <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                  <Users className="h-4 w-4" /> Members{stats ? ` (${stats.membersCount})` : ""}
                </Button>
              </DialogTrigger>
              <DialogContent className="glass border-border/50 rounded-2xl">
                <form onSubmit={addMember}>
                  <DialogHeader>
                    <DialogTitle>Add / Update Member</DialogTitle>
                    <DialogDescription>
                      Invite a user by email and assign their role in this workspace.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-3">
                    <Input
                      type="email"
                      placeholder="member@example.com"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      required
                      className="h-11 rounded-xl bg-muted/30 border-border/50"
                    />
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Role</label>
                      <Select value={memberRole} onValueChange={(v) => setMemberRole(v ?? "viewer")}>
                        <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-border/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {memberError && (
                      <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                        {memberError}
                      </div>
                    )}
                    {memberSuccess && (
                      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-500">
                        {memberSuccess}
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isSavingMember || !memberEmail.trim()} className="rounded-xl gap-2">
                      {isSavingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Add Member
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mb-4 glass border border-border/40 rounded-xl p-1 self-start gap-1 flex-wrap h-auto">
          <TabsTrigger value="dashboard" className="rounded-lg text-sm gap-2">
            <GitBranch className="h-3.5 w-3.5" /> Research Map
          </TabsTrigger>
          <TabsTrigger value="papers" className="rounded-lg text-sm gap-2">
            <FileText className="h-3.5 w-3.5" /> Papers ({papers.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="rounded-lg text-sm gap-2">
            <StickyNote className="h-3.5 w-3.5" /> Notes ({notes.length})
          </TabsTrigger>
          <TabsTrigger value="trends" className="rounded-lg text-sm gap-2">
            <TrendingUp className="h-3.5 w-3.5" /> Trends
          </TabsTrigger>
          <TabsTrigger value="alerts" className="rounded-lg text-sm gap-2">
            <Bell className="h-3.5 w-3.5" /> Alerts ({alerts.length})
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
          {canEdit && (
            <div className="flex justify-end mb-4">
              <Button size="sm" className="gap-2 rounded-xl" onClick={() => setShowAddPaper((v) => !v)}>
                <Plus className="h-4 w-4" /> Add Paper
              </Button>
            </div>
          )}

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
          {canEdit && (
            <div className="flex justify-end mb-4">
              <Button size="sm" className="gap-2 rounded-xl" onClick={() => setShowNoteForm((v) => !v)}>
                <Plus className="h-4 w-4" /> New Note
              </Button>
            </div>
          )}

          <AnimatePresence>
            {showNoteForm && (
              <motion.form
                onSubmit={createNote}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-5 glass rounded-2xl border border-border/40 p-4 space-y-3"
              >
                <Input
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="h-10 bg-muted/30 border-border/50 rounded-xl"
                  placeholder="Note title (optional)"
                />
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full min-h-24 bg-muted/30 border border-border/50 rounded-xl p-3 text-sm resize-y focus-visible:outline-none focus-visible:border-primary/50"
                  placeholder="Write your research note..."
                  required
                />
                <Input
                  value={noteTags}
                  onChange={(e) => setNoteTags(e.target.value)}
                  className="h-10 bg-muted/30 border-border/50 rounded-xl"
                  placeholder="Tags, comma separated (optional)"
                />
                {noteError && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                    {noteError}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={isSavingNote || !noteContent.trim()} className="rounded-xl gap-2">
                    {isSavingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <StickyNote className="h-4 w-4" />}
                    Save Note
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

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
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{formatText(note.content)}</p>
                  {Array.isArray(note.tags) && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {note.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="flex-1 overflow-y-auto">
          {!trends || (trends.paperCount || 0) === 0 ? (
            <div className="text-center py-16 glass rounded-2xl border border-dashed border-border/50">
              <TrendingUp className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No trend data yet. Add papers to compute workspace trends.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="glass rounded-2xl border border-border/40 p-5">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{trends.paperCount}</span>
                  <span className="text-sm text-muted-foreground">papers analyzed</span>
                </div>
              </div>

              {Array.isArray(trends.yearlyData) && trends.yearlyData.length > 0 && (
                <div className="glass rounded-2xl border border-border/40 p-5">
                  <h3 className="text-sm font-semibold mb-3">Papers by year</h3>
                  <div className="space-y-2">
                    {(() => {
                      const max = Math.max(...trends.yearlyData.map((y: any) => y.count || 0), 1)
                      return trends.yearlyData.map((y: any) => (
                        <div key={y.year} className="flex items-center gap-3">
                          <span className="w-12 text-xs text-muted-foreground shrink-0">{y.year}</span>
                          <div className="flex-1 h-5 bg-muted/30 rounded-md overflow-hidden">
                            <div
                              className="h-full bg-primary/60 rounded-md"
                              style={{ width: `${((y.count || 0) / max) * 100}%` }}
                            />
                          </div>
                          <span className="w-8 text-xs text-right">{y.count}</span>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              )}

              {Array.isArray(trends.topKeywords) && trends.topKeywords.length > 0 && (
                <div className="glass rounded-2xl border border-border/40 p-5">
                  <h3 className="text-sm font-semibold mb-3">Top keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {trends.topKeywords.map((kw: any) => (
                      <Badge
                        key={kw.keywordId || kw.name}
                        variant="outline"
                        className="gap-1.5"
                        style={{ borderColor: (CATEGORY_COLORS[kw.category] || CATEGORY_COLORS.general) + "66" }}
                      >
                        {kw.name}
                        <span className="text-muted-foreground">{kw.paperCount}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="flex-1 overflow-y-auto space-y-5">
          {canEdit && (
            <form onSubmit={createAlert} className="glass rounded-2xl border border-border/40 p-4 flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs text-muted-foreground">Keyword to watch</label>
                <Input
                  value={alertKeyword}
                  onChange={(e) => setAlertKeyword(e.target.value)}
                  className="h-10 bg-muted/30 border-border/50 rounded-xl"
                  placeholder="e.g., large language models"
                />
              </div>
              <div className="flex items-center gap-2 pb-2.5">
                <Switch checked={alertNotify} onCheckedChange={setAlertNotify} id="alert-notify" />
                <label htmlFor="alert-notify" className="text-xs text-muted-foreground">Notify</label>
              </div>
              <Button type="submit" disabled={isSavingAlert || !alertKeyword.trim()} className="rounded-xl gap-2">
                {isSavingAlert ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                Create Alert
              </Button>
            </form>
          )}

          {alertError && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {alertError}
            </div>
          )}

          {alerts.length === 0 ? (
            <div className="text-center py-16 glass rounded-2xl border border-dashed border-border/50">
              <Bell className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No alerts yet. Watch a keyword to get notified.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert._id} className="glass rounded-xl border border-border/40 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {alert.notifyEnabled ? (
                      <BellRing className="h-4 w-4 text-primary" />
                    ) : (
                      <BellOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{alert.keyword}</p>
                      <p className="text-xs text-muted-foreground">{alert.type || "keyword"} alert</p>
                    </div>
                  </div>
                  <Badge variant={alert.notifyEnabled ? "default" : "secondary"} className="text-[10px]">
                    {alert.notifyEnabled ? "Active" : "Muted"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
