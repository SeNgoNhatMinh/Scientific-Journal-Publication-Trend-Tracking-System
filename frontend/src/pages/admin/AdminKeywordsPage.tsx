import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import {
  Search, RefreshCw, AlertCircle, Plus, Edit2, Trash2, Loader2, Tag, TrendingUp, Activity, ChevronLeft, ChevronRight
} from "lucide-react"
import api from "@/lib/api"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

type KeywordItem = {
  _id: string
  name: string
  openalexId?: string
  description?: string
  category: "domain" | "algorithm" | "application" | "method" | "dataset" | "tool" | "general"
  paperCount: number
  citationCount: number
  trendScore: number
  growthRate: number
  createdAt: string
}

const CATEGORY_OPTIONS = ["domain", "algorithm", "application", "method", "dataset", "tool", "general"]

export default function AdminKeywordsPage() {
  const [keywords, setKeywords] = useState<KeywordItem[]>([])
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
  const [editingKeyword, setEditingKeyword] = useState<KeywordItem | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    openalexId: "",
    description: "",
    category: "general",
    paperCount: "0",
    citationCount: "0",
    trendScore: "0",
    growthRate: "0"
  })

  const limit = 10

  const fetchKeywords = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params: Record<string, any> = { page, limit }
      if (search) params.search = search
      const res = await api.get("/keywords", { params })
      if (res.data.success) {
        setKeywords(res.data.data)
        setTotal(res.data.total ?? 0)
        setTotalPages(res.data.totalPages ?? 1)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load keywords")
    } finally {
      setIsLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    const t = setTimeout(fetchKeywords, 300)
    return () => clearTimeout(t)
  }, [fetchKeywords])

  const handleOpenCreate = () => {
    setEditingKeyword(null)
    setFormData({
      name: "",
      openalexId: "",
      description: "",
      category: "general",
      paperCount: "0",
      citationCount: "0",
      trendScore: "0",
      growthRate: "0"
    })
    setIsFormOpen(true)
  }

  const handleOpenEdit = (keyword: KeywordItem) => {
    setEditingKeyword(keyword)
    setFormData({
      name: keyword.name || "",
      openalexId: keyword.openalexId || "",
      description: keyword.description || "",
      category: keyword.category || "general",
      paperCount: keyword.paperCount?.toString() || "0",
      citationCount: keyword.citationCount?.toString() || "0",
      trendScore: keyword.trendScore?.toString() || "0",
      growthRate: keyword.growthRate?.toString() || "0"
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
        name: formData.name.trim().toLowerCase(),
        openalexId: formData.openalexId.trim() || undefined,
        description: formData.description.trim() || undefined,
        category: formData.category,
        paperCount: parseInt(formData.paperCount, 10) || 0,
        citationCount: parseInt(formData.citationCount, 10) || 0,
        trendScore: parseFloat(formData.trendScore) || 0,
        growthRate: parseFloat(formData.growthRate) || 0
      }

      if (editingKeyword) {
        // Update
        const res = await api.put(`/keywords/${editingKeyword._id}`, payload)
        if (res.data.success) {
          setKeywords(prev => prev.map(k => k._id === editingKeyword._id ? res.data.data : k))
          setIsFormOpen(false)
        }
      } else {
        // Create
        const res = await api.post("/keywords", payload)
        if (res.data.success) {
          fetchKeywords()
          setIsFormOpen(false)
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save keyword")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = (keywordId: string, name: string) => {
    setError(null)
    setConfirmState({
      isOpen: true,
      title: "Delete Keyword",
      description: `Are you sure you want to delete keyword "${name}"? This action cannot be undone.`,
      variant: "destructive",
      onConfirm: async () => {
        try {
          const res = await api.delete(`/keywords/${keywordId}`)
          if (res.data.success) {
            setKeywords(prev => prev.filter(k => k._id !== keywordId))
            setTotal(t => t - 1)
          }
        } catch (err: any) {
          setError(err.response?.data?.message || "Failed to delete keyword")
        }
      }
    })
  }

  const getCategoryColor = (cat: string) => {
    const map: Record<string, string> = {
      domain: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      algorithm: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      application: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      method: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      dataset: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
      tool: "bg-pink-500/10 text-pink-500 border-pink-500/20",
      general: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
    }
    return map[cat] || map.general
  }

  return (
    <div className="space-y-6">
      {/* Summary Row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/20 to-pink-500/10 backdrop-blur-md p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold tabular-nums text-purple-500">{isLoading ? "—" : total}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Keywords</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md">
              <Tag className="h-4.5 w-4.5 text-white" />
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative overflow-hidden rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/20 to-amber-500/10 backdrop-blur-md p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold tabular-nums text-orange-500">
                {isLoading ? "—" : (keywords.reduce((max, k) => Math.max(max, k.trendScore), 0)).toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Max Trend Score (on Page)</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md">
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
            placeholder="Search keywords..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-border/50 bg-background/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/50 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchKeywords}
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
            <Plus className="h-4 w-4" /> Add Keyword
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
        {isLoading && keywords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Activity className="animate-spin h-7 w-7 text-primary" />
            <p className="text-sm text-muted-foreground">Loading keywords...</p>
          </div>
        ) : keywords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-12 w-12 rounded-2xl bg-muted/30 flex items-center justify-center">
              <Tag className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No keywords found</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20 border-border/30">
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-6">Keyword</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Papers / Citations</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trend Score</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Growth Rate</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.map((kw) => (
                  <TableRow
                    key={kw._id}
                    className="border-border/20 hover:bg-muted/20 transition-colors group"
                  >
                    <TableCell className="pl-6 py-3.5 font-medium text-foreground">
                      #{kw.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getCategoryColor(kw.category)}`}>
                        {kw.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-foreground/80 tabular-nums font-medium">
                      {kw.paperCount.toLocaleString()} / {kw.citationCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs font-semibold tabular-nums text-foreground/90">
                      {(kw.trendScore || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-xs font-semibold tabular-nums ${kw.growthRate >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                      {kw.growthRate >= 0 ? "+" : ""}{(kw.growthRate * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Edit Keyword"
                          onClick={() => handleOpenEdit(kw)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Delete Keyword"
                          onClick={() => handleDelete(kw._id, kw.name)}
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
                Showing page <span className="font-medium text-foreground">{page}</span> of <span className="font-medium text-foreground">{totalPages}</span> ({total} keywords total)
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
              <DialogTitle>{editingKeyword ? "Edit Keyword" : "Add New Keyword"}</DialogTitle>
              <DialogDescription>
                Define a research keyword and its trend settings.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="kw-name">Keyword Name *</label>
                <Input
                  id="kw-name"
                  required
                  placeholder="e.g. quantum cryptography"
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  className="h-10 rounded-xl bg-muted/20 border-border/50 focus-visible:border-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="kw-cat">Category</label>
                  <select
                    id="kw-cat"
                    value={formData.category}
                    onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                    className="w-full h-10 text-sm bg-muted/20 border border-border/50 rounded-xl px-2 focus:outline-none focus:border-primary/50"
                  >
                    {CATEGORY_OPTIONS.map(c => (
                      <option key={c} value={c} className="bg-background text-foreground capitalize">{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="kw-openalex">OpenAlex ID</label>
                  <Input
                    id="kw-openalex"
                    placeholder="e.g. C5043813"
                    value={formData.openalexId}
                    onChange={e => setFormData(f => ({ ...f, openalexId: e.target.value }))}
                    className="h-10 rounded-xl bg-muted/20 border-border/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="kw-desc">Description</label>
                <textarea
                  id="kw-desc"
                  placeholder="Brief explanation of this keyword concept..."
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  className="w-full min-h-[60px] p-2 text-sm rounded-xl bg-muted/20 border border-border/50 outline-none focus:border-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="kw-papers">Paper Count</label>
                  <Input
                    id="kw-papers"
                    type="number"
                    value={formData.paperCount}
                    onChange={e => setFormData(f => ({ ...f, paperCount: e.target.value }))}
                    className="h-10 rounded-xl bg-muted/20 border-border/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="kw-citations">Citation Count</label>
                  <Input
                    id="kw-citations"
                    type="number"
                    value={formData.citationCount}
                    onChange={e => setFormData(f => ({ ...f, citationCount: e.target.value }))}
                    className="h-10 rounded-xl bg-muted/20 border-border/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="kw-trend">Trend Score</label>
                  <Input
                    id="kw-trend"
                    type="number"
                    step="0.01"
                    value={formData.trendScore}
                    onChange={e => setFormData(f => ({ ...f, trendScore: e.target.value }))}
                    className="h-10 rounded-xl bg-muted/20 border-border/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="kw-growth">Growth Rate (0.0 to 1.0)</label>
                  <Input
                    id="kw-growth"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 0.15"
                    value={formData.growthRate}
                    onChange={e => setFormData(f => ({ ...f, growthRate: e.target.value }))}
                    className="h-10 rounded-xl bg-muted/20 border-border/50"
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
                {editingKeyword ? "Save Changes" : "Create Keyword"}
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
