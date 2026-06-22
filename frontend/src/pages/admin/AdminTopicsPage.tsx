import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import {
  Search, RefreshCw, AlertCircle, Plus, Edit2, Trash2, Loader2, Compass, TrendingUp, Activity, ChevronLeft, ChevronRight
} from "lucide-react"
import api from "@/lib/api"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

type TopicItem = {
  _id: string
  name: string
  seedKeyword?: string
  description?: string
  paperCount: number
  trendStatus: "exploding" | "growing" | "stable" | "declining"
  growthRate: number
  accelerationFactor: number
  isEmerging?: boolean
  emergenceScore?: number
  createdAt: string
}

const STATUS_OPTIONS = ["exploding", "growing", "stable", "declining"]

export default function AdminTopicsPage() {
  const [topics, setTopics] = useState<TopicItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean
    title: string
    description: string
    onConfirm: () => void
    variant?: "default" | "destructive"
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {}
  })

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingTopic, setEditingTopic] = useState<TopicItem | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    seedKeyword: "",
    description: "",
    paperCount: "0",
    trendStatus: "stable",
    growthRate: "0",
    accelerationFactor: "0",
    isEmerging: false,
    emergenceScore: "0"
  })

  const limit = 10

  const fetchTopics = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params: Record<string, any> = { page, limit }
      if (search) params.search = search
      const res = await api.get("/topics", { params })
      if (res.data.success) {
        setTopics(res.data.data)
        setTotal(res.data.total ?? 0)
        setTotalPages(res.data.totalPages ?? 1)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load topics")
    } finally {
      setIsLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    const t = setTimeout(fetchTopics, 300)
    return () => clearTimeout(t)
  }, [fetchTopics])

  const handleOpenCreate = () => {
    setEditingTopic(null)
    setFormData({
      name: "",
      seedKeyword: "",
      description: "",
      paperCount: "0",
      trendStatus: "stable",
      growthRate: "0",
      accelerationFactor: "0",
      isEmerging: false,
      emergenceScore: "0"
    })
    setIsFormOpen(true)
  }

  const handleOpenEdit = (topic: TopicItem) => {
    setEditingTopic(topic)
    setFormData({
      name: topic.name || "",
      seedKeyword: topic.seedKeyword || "",
      description: topic.description || "",
      paperCount: topic.paperCount?.toString() || "0",
      trendStatus: topic.trendStatus || "stable",
      growthRate: topic.growthRate?.toString() || "0",
      accelerationFactor: topic.accelerationFactor?.toString() || "0",
      isEmerging: topic.isEmerging ?? false,
      emergenceScore: topic.emergenceScore?.toString() || "0"
    })
    setIsFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setIsSubmitting(true)
    setError(null)
    try {
      const payload = {
        name: formData.name.trim(),
        seedKeyword: formData.seedKeyword.trim() || undefined,
        description: formData.description.trim() || undefined,
        paperCount: parseInt(formData.paperCount, 10) || 0,
        trendStatus: formData.trendStatus,
        growthRate: parseFloat(formData.growthRate) || 0,
        accelerationFactor: parseFloat(formData.accelerationFactor) || 0,
        isEmerging: formData.isEmerging,
        emergenceScore: parseFloat(formData.emergenceScore) || 0
      }

      if (editingTopic) {
        // Update
        const res = await api.put(`/topics/${editingTopic._id}`, payload)
        if (res.data.success) {
          setTopics(prev => prev.map(t => t._id === editingTopic._id ? res.data.data : t))
          setIsFormOpen(false)
        }
      } else {
        // Create
        const res = await api.post("/topics", payload)
        if (res.data.success) {
          fetchTopics()
          setIsFormOpen(false)
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save topic")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = (topicId: string, name: string) => {
    setError(null)
    setConfirmState({
      isOpen: true,
      title: "Delete Topic",
      description: `Are you sure you want to delete topic "${name}"? This action cannot be undone.`,
      variant: "destructive",
      onConfirm: async () => {
        try {
          const res = await api.delete(`/topics/${topicId}`)
          if (res.data.success) {
            setTopics(prev => prev.filter(t => t._id !== topicId))
            setTotal(t => t - 1)
          }
        } catch (err: any) {
          setError(err.response?.data?.message || "Failed to delete topic")
        }
      }
    })
  }

  const getStatusStyle = (status: string) => {
    const map: Record<string, string> = {
      exploding: "bg-red-500/10 text-red-500 border-red-500/20",
      growing: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      stable: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      declining: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    }
    return map[status] || map.stable
  }

  return (
    <div className="space-y-6">
      {/* Summary Row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 backdrop-blur-md p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold tabular-nums text-blue-500">{isLoading ? "—" : total}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total AI Topics</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md">
              <Compass className="h-4.5 w-4.5 text-white" />
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/20 to-orange-500/10 backdrop-blur-md p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold tabular-nums text-red-500">
                {isLoading ? "—" : topics.filter(t => t.trendStatus === "exploding" || t.isEmerging).length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Exploding / Emerging Topics (on Page)</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-md">
              <TrendingUp className="h-4.5 w-4.5 text-white" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search topics..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-border/50 bg-background/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/50 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTopics}
            disabled={isLoading}
            className="gap-2 h-9 bg-background/50 border-border/50 hover:bg-muted/50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={handleOpenCreate}
            className="gap-2 h-9 glow-primary rounded-xl"
          >
            <Plus className="h-4 w-4" /> Add Topic
          </Button>
        </div>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md overflow-hidden shadow-sm"
      >
        {isLoading && topics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Activity className="animate-spin h-7 w-7 text-primary" />
            <p className="text-sm text-muted-foreground">Loading topics...</p>
          </div>
        ) : topics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-12 w-12 rounded-2xl bg-muted/30 flex items-center justify-center">
              <Compass className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No topics found</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20 border-border/30">
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-6">Topic Name</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Seed Keyword</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Papers</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Growth / Accel</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emerging</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topics.map((topic) => (
                  <TableRow
                    key={topic._id}
                    className="border-border/20 hover:bg-muted/20 transition-colors group"
                  >
                    <TableCell className="pl-6 py-3.5 font-medium text-foreground max-w-[200px] truncate" title={topic.name}>
                      {topic.name}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {topic.seedKeyword || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusStyle(topic.trendStatus)}`}>
                        {topic.trendStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-semibold tabular-nums text-foreground/90">
                      {topic.paperCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">
                      {(topic.growthRate * 100).toFixed(0)}% / {topic.accelerationFactor.toFixed(1)}x
                    </TableCell>
                    <TableCell>
                      {topic.isEmerging ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-orange-500/10 text-orange-500 border-orange-500/20">
                          🔥 Yes ({(topic.emergenceScore || 0).toFixed(2)})
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Edit Topic"
                          onClick={() => handleOpenEdit(topic)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Delete Topic"
                          onClick={() => handleDelete(topic._id, topic.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="px-6 py-3 border-t border-border/20 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing page <span className="font-medium text-foreground">{page}</span> of <span className="font-medium text-foreground">{totalPages}</span> ({total} topics total)
              </p>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="rounded-lg bg-background/50 border-border/50"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="rounded-lg bg-background/50 border-border/50"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="glass border-border/50 rounded-2xl max-w-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editingTopic ? "Edit Topic" : "Add New Topic"}</DialogTitle>
              <DialogDescription>
                Fill in the details for this AI topic or cluster.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="topic-name">Topic Name *</label>
                <Input
                  id="topic-name"
                  required
                  placeholder="e.g. Transformers in Vision Processing"
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  className="h-10 rounded-xl bg-muted/20 border-border/50 focus-visible:border-primary/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="topic-seed">Seed Keyword</label>
                <Input
                  id="topic-seed"
                  placeholder="e.g. computer vision"
                  value={formData.seedKeyword}
                  onChange={e => setFormData(f => ({ ...f, seedKeyword: e.target.value }))}
                  className="h-10 rounded-xl bg-muted/20 border-border/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="topic-desc">Description</label>
                <textarea
                  id="topic-desc"
                  placeholder="What research themes are associated with this cluster..."
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  className="w-full min-h-[60px] p-2 text-sm rounded-xl bg-muted/20 border border-border/50 outline-none focus:border-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="topic-papers">Paper Count</label>
                  <Input
                    id="topic-papers"
                    type="number"
                    value={formData.paperCount}
                    onChange={e => setFormData(f => ({ ...f, paperCount: e.target.value }))}
                    className="h-10 rounded-xl bg-muted/20 border-border/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="topic-status">Trend Status</label>
                  <select
                    id="topic-status"
                    value={formData.trendStatus}
                    onChange={e => setFormData(f => ({ ...f, trendStatus: e.target.value }))}
                    className="w-full h-10 text-sm bg-muted/20 border border-border/50 rounded-xl px-2 focus:outline-none focus:border-primary/50"
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s} className="bg-background text-foreground capitalize">{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="topic-growth">Growth Rate</label>
                  <Input
                    id="topic-growth"
                    type="number"
                    step="0.01"
                    value={formData.growthRate}
                    onChange={e => setFormData(f => ({ ...f, growthRate: e.target.value }))}
                    className="h-10 rounded-xl bg-muted/20 border-border/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="topic-accel">Acceleration Factor</label>
                  <Input
                    id="topic-accel"
                    type="number"
                    step="0.1"
                    value={formData.accelerationFactor}
                    onChange={e => setFormData(f => ({ ...f, accelerationFactor: e.target.value }))}
                    className="h-10 rounded-xl bg-muted/20 border-border/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="topic-emerging"
                    checked={formData.isEmerging}
                    onCheckedChange={checked => setFormData(f => ({ ...f, isEmerging: checked }))}
                  />
                  <label htmlFor="topic-emerging" className="text-xs font-semibold text-muted-foreground cursor-pointer">Is Emerging</label>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-muted-foreground" htmlFor="topic-emscore">Emergence Score (0-1)</label>
                  <Input
                    id="topic-emscore"
                    type="number"
                    step="0.01"
                    placeholder="0.75"
                    disabled={!formData.isEmerging}
                    value={formData.emergenceScore}
                    onChange={e => setFormData(f => ({ ...f, emergenceScore: e.target.value }))}
                    className="h-9 rounded-xl bg-muted/20 border-border/50"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl glow-primary">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTopic ? "Save Changes" : "Create Topic"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        description={confirmState.description}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}
