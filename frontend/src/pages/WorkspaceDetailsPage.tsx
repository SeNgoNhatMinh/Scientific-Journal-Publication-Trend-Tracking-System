import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft, Plus, Loader2, Search, GitBranch, FileText,
  TrendingUp, Bell, Users, BellRing, BellOff, Trash2, LogOut, UserMinus
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
import ForceGraph2D from "react-force-graph-2d"
import api from "@/lib/api"
import { formatText, getPaperId, unwrapPaper } from "@/lib/format"
import { motion, AnimatePresence } from "framer-motion"
import { Area, AreaChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, CartesianGrid } from "recharts"

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
  const [alerts, setAlerts] = useState<any[]>([])
  const [trends, setTrends] = useState<any>(null)
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] })
  const [isLoading, setIsLoading] = useState(true)

  const graphContainerRef = React.useRef<HTMLDivElement>(null)
  const [graphSize, setGraphSize] = useState({ width: 800, height: 400 })

  useEffect(() => {
    if (!graphContainerRef.current) return
    const observer = new ResizeObserver((entries) => {
      setGraphSize({
        width: entries[0].contentRect.width,
        height: entries[0].contentRect.height
      })
    })
    observer.observe(graphContainerRef.current)
    return () => observer.disconnect()
  }, [])

  // Add paper
  const [showAddPaper, setShowAddPaper] = useState(false)
  const [paperQuery, setPaperQuery] = useState("")
  const [paperSource, setPaperSource] = useState("openalex")
  const [paperResults, setPaperResults] = useState<any[]>([])
  const [isSearchingPapers, setIsSearchingPapers] = useState(false)
  const [searchPage, setSearchPage] = useState(1)
  const [addingPaperId, setAddingPaperId] = useState<string | null>(null)
  const [paperError, setPaperError] = useState("")

  // Alerts
  const [alertKeyword, setAlertKeyword] = useState("")
  const [alertNotify, setAlertNotify] = useState(true)
  const [isSavingAlert, setIsSavingAlert] = useState(false)
  const [alertError, setAlertError] = useState("")

  // Members
  const [members, setMembers] = useState<any[]>([])
  const [memberOpen, setMemberOpen] = useState(false)
  const [memberEmail, setMemberEmail] = useState("")
  const [memberRole, setMemberRole] = useState("viewer")
  const [isSavingMember, setIsSavingMember] = useState(false)
  const [memberError, setMemberError] = useState("")
  const [memberSuccess, setMemberSuccess] = useState("")
  const [userSuggestions, setUserSuggestions] = useState<any[]>([])
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

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

        try {
          const membersRes = await api.get(`/workspaces/${id}/members`)
          setMembers(membersRes.data.members || [])
        } catch { /* ignore */ }
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
      if (source === "arxiv") externalIds.arxiv = paper.id
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

  const searchPapers = async (event?: React.FormEvent, pageToFetch = 1) => {
    event?.preventDefault()
    if (!paperQuery.trim()) return
    setIsSearchingPapers(true)
    setPaperError("")
    try {
      const res = await api.get("/sources/search", {
        params: { source: paperSource, keyword: paperQuery.trim(), limit: 10, page: pageToFetch },
      })
      setPaperResults(res.data.papers || [])
      setSearchPage(pageToFetch)
    } catch (err: any) {
      setPaperError(err.response?.data?.message || "Could not search papers.")
      setPaperResults([])
    } finally {
      setIsSearchingPapers(false)
    }
  }

  const isPaperAdded = (paper: any) => {
    return papers.some((p) => {
      const wp = unwrapPaper(p)
      if (!wp) return false
      const matchId = paper.id
      if (matchId) {
        if (
          wp.externalIds?.openalex === matchId ||
          wp.externalIds?.semanticScholar === matchId ||
          wp.externalIds?.crossref === matchId ||
          wp.externalIds?.arxiv === matchId ||
          wp.externalIds?.ieee === matchId ||
          wp.externalIds?.exa === matchId
        ) {
          return true
        }
      }
      if (paper.doi && wp.doi && paper.doi === wp.doi) return true
      if (paper.title && wp.title && paper.title.toLowerCase() === wp.title.toLowerCase()) return true
      return false
    })
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
    } catch (err: any) {
      setPaperError(err.response?.data?.message || "Could not add paper to workspace.")
    } finally {
      setAddingPaperId(null)
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

  const toggleAlert = async (alertId: string, notifyEnabled: boolean) => {
    try {
      await api.put(`/workspaces/${id}/alerts/${alertId}`, { notifyEnabled: !notifyEnabled })
      const alertsRes = await api.get(`/workspaces/${id}/alerts`)
      setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : alertsRes.data.alerts || [])
    } catch (err: any) {
      setAlertError(err.response?.data?.message || "Could not update alert.")
    }
  }

  const deleteAlert = async (alertId: string) => {
    try {
      await api.delete(`/workspaces/${id}/alerts/${alertId}`)
      const alertsRes = await api.get(`/workspaces/${id}/alerts`)
      setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : alertsRes.data.alerts || [])
    } catch (err: any) {
      setAlertError(err.response?.data?.message || "Could not delete alert.")
    }
  }

  const handleUserSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setMemberEmail(val)
    if (!val.trim() || val.length < 2) {
      setUserSuggestions([])
      return
    }
    setIsSearchingUsers(true)
    try {
      const res = await api.get(`/users/search?keyword=${val}`)
      setUserSuggestions(res.data.data || [])
    } catch {
      setUserSuggestions([])
    } finally {
      setIsSearchingUsers(false)
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
      const name = res.data?.member?.userId?.name || memberEmail.trim()
      setMemberSuccess(`Invitation sent to ${name}.`)
      setMemberEmail("")
      setUserSuggestions([])
      
      const membersRes = await api.get(`/workspaces/${id}/members`)
      setMembers(membersRes.data.members || [])
      const wsRes = await api.get(`/workspaces/${id}`)
      setStats(wsRes.data.stats || null)
    } catch (err: any) {
      setMemberError(err.response?.data?.message || "Could not invite member.")
    } finally {
      setIsSavingMember(false)
    }
  }

  const kickMember = async (userId: string) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return
    try {
      await api.delete(`/workspaces/${id}/members/${userId}`)
      setMembers((prev) => prev.filter((m) => m.userId?._id !== userId))
      const wsRes = await api.get(`/workspaces/${id}`)
      setStats(wsRes.data.stats || null)
    } catch (err: any) {
      alert(err.response?.data?.message || "Could not remove member.")
    }
  }

  const handleLeaveWorkspace = async () => {
    if (!window.confirm("Are you sure you want to leave this workspace?")) return
    setIsLeaving(true)
    try {
      await api.delete(`/workspaces/${id}/members/me`)
      navigate("/workspaces")
    } catch (err: any) {
      alert(err.response?.data?.message || "Could not leave workspace.")
      setIsLeaving(false)
    }
  }

  const handleDeleteWorkspace = async () => {
    if (!window.confirm("Are you sure you want to delete this workspace? This action cannot be undone.")) return
    try {
      await api.delete(`/workspaces/${id}`)
      navigate("/workspaces")
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete workspace.")
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
          {isOwner && (
            <Button variant="destructive" size="sm" className="gap-2 rounded-xl" onClick={handleDeleteWorkspace}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
          {!isOwner && (
            <Button variant="destructive" size="sm" className="gap-2 rounded-xl" onClick={handleLeaveWorkspace} disabled={isLeaving}>
              {isLeaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Leave Workspace
            </Button>
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
          <TabsTrigger value="members" className="rounded-lg text-sm gap-2">
            <Users className="h-3.5 w-3.5" /> Members ({members.length || stats?.membersCount || 0})
          </TabsTrigger>
          <TabsTrigger value="trends" className="rounded-lg text-sm gap-2">
            <TrendingUp className="h-3.5 w-3.5" /> Trends
          </TabsTrigger>
          <TabsTrigger value="alerts" className="rounded-lg text-sm gap-2">
            <Bell className="h-3.5 w-3.5" /> Alerts ({alerts.length})
          </TabsTrigger>
        </TabsList>

        {/* Keyword Graph Tab */}
        <TabsContent value="dashboard" className="flex-1 flex flex-col rounded-2xl overflow-hidden border border-border/40 bg-background/50 relative">
          <div className="absolute top-4 left-4 z-10 glass rounded-xl px-4 py-2.5 border border-border/40 pointer-events-none">
            <h3 className="text-xs font-semibold">Mini Research Map</h3>
            <p className="text-xs text-muted-foreground">Keyword connections of your workspace</p>
          </div>
          <div className="flex-1 cursor-move" ref={graphContainerRef}>
            {graphData.nodes.length > 0 ? (
              <ForceGraph2D
                graphData={graphData}
                width={graphSize.width}
                height={graphSize.height}
                nodeLabel={(node: any) => `${node.label || node.id} (${node.paperCount || node.val} papers)`}
                nodeColor={(node: any) => node.color}
                nodeVal={(node: any) => node.val}
                backgroundColor="#00000000"
                linkDirectionalParticles={1}
                linkColor={() => "rgba(100, 100, 100, 0.2)"}
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                  const label = node.label || node.id;
                  const fontSize = 12 / globalScale;
                  ctx.font = `${fontSize}px Inter, sans-serif`;
                  const textWidth = ctx.measureText(label).width;
                  const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.4);

                  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                  if (document.documentElement.classList.contains('dark')) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                  }
                  
                  ctx.beginPath();
                  ctx.roundRect(
                    node.x - bckgDimensions[0] / 2, 
                    node.y - bckgDimensions[1] / 2, 
                    bckgDimensions[0], 
                    bckgDimensions[1],
                    4 / globalScale
                  );
                  ctx.fill();

                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = node.color || "#6b7280";
                  ctx.fillText(label, node.x, node.y);

                  node.__bckgDimensions = bckgDimensions;
                }}
                nodePointerAreaPaint={(node: any, color, ctx) => {
                  ctx.fillStyle = color;
                  const bckgDimensions = node.__bckgDimensions;
                  if (bckgDimensions) {
                    ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
                  }
                }}
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
          {canEdit && !showAddPaper && (
            <div className="flex justify-end mb-4">
              <Button size="sm" className="gap-2 rounded-xl" onClick={() => setShowAddPaper(true)}>
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
                  <Select value={paperSource} onValueChange={(value) => setPaperSource(value ?? "openalex")}>
                    <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-border/50 md:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openalex">OpenAlex</SelectItem>
                      <SelectItem value="arxiv">arXiv</SelectItem>
                      <SelectItem value="crossref">Crossref</SelectItem>
                      <SelectItem value="semanticscholar">Semantic Scholar</SelectItem>
                      <SelectItem value="exa">Exa Research</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="submit" disabled={isSearchingPapers || !paperQuery.trim()} className="rounded-xl">
                    {isSearchingPapers ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                  </Button>
                  <Button type="button" variant="ghost" className="rounded-xl" onClick={() => { setShowAddPaper(false); setPaperResults([]) }}>
                    Cancel
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
                          disabled={addingPaperId === (paper.id || paper.url || paper.title) || isPaperAdded(paper)}
                          variant={isPaperAdded(paper) ? "secondary" : "default"}
                        >
                          {addingPaperId === (paper.id || paper.url || paper.title) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isPaperAdded(paper) ? (
                            <FileText className="h-3.5 w-3.5" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                          {isPaperAdded(paper) ? "Added" : "Add"}
                        </Button>
                      </div>
                    ))}
                    <div className="flex justify-between items-center mt-4">
                      <Button size="sm" variant="outline" className="rounded-xl" disabled={searchPage <= 1} onClick={() => searchPapers(undefined, searchPage - 1)}>
                        Previous
                      </Button>
                      <span className="text-xs font-medium text-muted-foreground">Page {searchPage}</span>
                      <Button size="sm" variant="outline" className="rounded-xl" disabled={paperResults.length < 10} onClick={() => searchPapers(undefined, searchPage + 1)}>
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {!showAddPaper && (
            papers.length === 0 ? (
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
            )
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="flex-1 overflow-y-auto">
          {isOwner && (
            <div className="flex justify-end mb-4">
              <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2 rounded-xl">
                    <Plus className="h-4 w-4" /> Add Member
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
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Search by name or email..."
                          value={memberEmail}
                          onChange={handleUserSearch}
                          required
                          className="h-11 rounded-xl bg-muted/30 border-border/50"
                        />
                        {isSearchingUsers && <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-muted-foreground" />}
                        {userSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-background border border-border/50 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {userSuggestions.map((u) => {
                              const alreadyIn = members.some(m => m.userId?.email === u.email)
                              if (alreadyIn) return null
                              return (
                                <button
                                  key={u._id}
                                  type="button"
                                  className="w-full text-left px-4 py-2 hover:bg-muted/50 text-sm flex flex-col"
                                  onClick={() => {
                                    setMemberEmail(u.email)
                                    setUserSuggestions([])
                                  }}
                                >
                                  <span className="font-medium">{u.name}</span>
                                  <span className="text-xs text-muted-foreground">{u.email}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
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
                    <DialogFooter className="flex-col items-end">
                      {members.some(m => m.userId?.email?.toLowerCase() === memberEmail.trim().toLowerCase()) && (
                        <span className="text-xs text-amber-500 mb-2 w-full text-right">
                          This user is already a member.
                        </span>
                      )}
                      <Button 
                        type="submit" 
                        disabled={
                          isSavingMember || 
                          !memberEmail.trim() || 
                          members.some(m => m.userId?.email?.toLowerCase() === memberEmail.trim().toLowerCase())
                        } 
                        className="rounded-xl gap-2"
                      >
                        {isSavingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Add Member
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <div key={member._id} className="glass rounded-2xl border border-border/40 p-5 flex items-center justify-between group">
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">{member.userId?.name || "Unknown"}</span>
                  <span className="text-xs text-muted-foreground">{member.userId?.email}</span>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {member.role}
                    </Badge>
                    {member.status === "pending" && (
                      <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20">
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
                {isOwner && member.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => kickMember(member.userId?._id)}
                    title="Remove Member"
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="flex-1 overflow-y-auto">
          {!trends || (trends.paperCount || 0) === 0 ? (
            <div className="text-center py-16 glass rounded-2xl border border-dashed border-border/50">
              <TrendingUp className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No trend data yet. Add papers to compute workspace trends.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Premium Hero Stats */}
              <div className="relative overflow-hidden rounded-3xl border border-border/20 p-10 flex items-center justify-between bg-gradient-to-r from-background via-muted/20 to-background shadow-2xl">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] mix-blend-overlay"></div>
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/20 rounded-full blur-[80px]"></div>
                <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]"></div>
                
                <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left w-full">
                  <motion.span 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                    className="text-xs font-bold text-muted-foreground/80 mb-2 uppercase tracking-[0.2em]"
                  >
                    Analysis Scope
                  </motion.span>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring' }}
                    className="flex items-baseline gap-3"
                  >
                    <span className="text-7xl font-black bg-clip-text text-transparent bg-gradient-to-br from-primary via-primary/80 to-primary/40 drop-shadow-sm">
                      {trends.paperCount}
                    </span>
                  </motion.div>
                  <motion.span 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                    className="text-sm text-muted-foreground mt-3 font-medium"
                  >
                    Papers systematically analyzed & synthesized
                  </motion.span>
                </div>
                <TrendingUp className="hidden md:block h-32 w-32 text-primary/5 absolute right-12 top-1/2 -translate-y-1/2 -rotate-12 drop-shadow-2xl" />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Yearly Data Chart */}
                {Array.isArray(trends.yearlyData) && trends.yearlyData.length > 0 && (
                  <div className="glass rounded-3xl border border-border/40 p-6 shadow-lg relative overflow-hidden">
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
                    <h3 className="text-base font-semibold mb-6 flex items-center gap-2 relative z-10">
                      <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div> Publication Timeline
                    </h3>
                    <div className="h-[260px] w-full relative z-10">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trends.yearlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.1)" />
                          <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dx={-10} />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} 
                            itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                            labelStyle={{ color: '#aaa', marginBottom: '4px' }}
                          />
                          <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Top Keywords Cloud */}
                {Array.isArray(trends.topKeywords) && trends.topKeywords.length > 0 && (
                  <div className="glass rounded-3xl border border-border/40 p-6 shadow-lg flex flex-col relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>
                    <h3 className="text-base font-semibold mb-6 flex items-center gap-2 relative z-10">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div> Dominant Topics
                    </h3>
                    <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2 relative z-10">
                      {trends.topKeywords.map((kw: any, i: number) => {
                        const maxCount = Math.max(...trends.topKeywords.map((k: any) => k.paperCount), 1)
                        const percentage = (kw.paperCount / maxCount) * 100
                        const color = CATEGORY_COLORS[kw.category] || CATEGORY_COLORS.general
                        return (
                          <motion.div
                            key={kw.keywordId || kw.name}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="relative group"
                          >
                            <div className="flex justify-between items-end mb-1.5 z-10 relative px-1">
                              <span className="text-sm font-semibold tracking-tight group-hover:text-primary transition-colors" style={{ color: color }}>{kw.name}</span>
                              <span className="text-xs font-bold text-muted-foreground">{kw.paperCount}</span>
                            </div>
                            <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden backdrop-blur-sm">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1, delay: i * 0.1, type: "spring" }}
                                className="h-full rounded-full"
                                style={{ 
                                  backgroundColor: color,
                                  boxShadow: `0 0 10px ${color}80` 
                                }}
                              />
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
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
                    <button 
                      onClick={() => canEdit && toggleAlert(alert._id, alert.notifyEnabled)} 
                      className={canEdit ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
                      title={canEdit ? "Toggle Notification" : ""}
                    >
                      {alert.notifyEnabled ? (
                        <BellRing className="h-4 w-4 text-primary" />
                      ) : (
                        <BellOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    <div>
                      <p className="text-sm font-medium">{alert.keyword}</p>
                      <p className="text-xs text-muted-foreground">{alert.type || "keyword"} alert</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={alert.notifyEnabled ? "default" : "secondary"} 
                      className={`text-[10px] ${canEdit ? 'cursor-pointer' : ''}`} 
                      onClick={() => canEdit && toggleAlert(alert._id, alert.notifyEnabled)}
                    >
                      {alert.notifyEnabled ? "Active" : "Muted"}
                    </Badge>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 opacity-50 hover:opacity-100 transition-opacity"
                        onClick={() => deleteAlert(alert._id)}
                        title="Delete Alert"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
