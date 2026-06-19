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
  Search, RefreshCw, AlertCircle, Plus, Edit2, Trash2, Loader2, BookOpen, Activity, ChevronLeft, ChevronRight, Check, X, Rss
} from "lucide-react"
import api from "@/lib/api"

type JournalItem = {
  _id: string
  title: string
  issn: string | null
  eissn: string | null
  description: string | null
  category: string[]
  publisher: string | null
  websiteUrl: string | null
  impactFactor: number | null
  h5Index: number | null
  paperCount: number
  fieldDomain: string | null
  isTracked: boolean
  source: string | null
  createdAt: string
}

const SOURCE_OPTIONS = ["openalex", "crossref", "semantic_scholar"]

export default function AdminJournalsPage() {
  const [journals, setJournals] = useState<JournalItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingJournal, setEditingJournal] = useState<JournalItem | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    issn: "",
    eissn: "",
    description: "",
    categoryRaw: "",
    publisher: "",
    websiteUrl: "",
    impactFactor: "",
    h5Index: "",
    paperCount: "0",
    fieldDomain: "",
    isTracked: false,
    source: "openalex"
  })

  const limit = 10

  const fetchJournals = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params: Record<string, any> = { page, limit }
      if (search) params.search = search
      const res = await api.get("/journals", { params })
      if (res.data.success) {
        setJournals(res.data.data)
        setTotal(res.data.total ?? 0)
        setTotalPages(res.data.totalPages ?? 1)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load journals")
    } finally {
      setIsLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    const t = setTimeout(fetchJournals, 300)
    return () => clearTimeout(t)
  }, [fetchJournals])

  const handleOpenCreate = () => {
    setEditingJournal(null)
    setFormData({
      title: "",
      issn: "",
      eissn: "",
      description: "",
      categoryRaw: "",
      publisher: "",
      websiteUrl: "",
      impactFactor: "",
      h5Index: "",
      paperCount: "0",
      fieldDomain: "",
      isTracked: false,
      source: "openalex"
    })
    setIsFormOpen(true)
  }

  const handleOpenEdit = (journal: JournalItem) => {
    setEditingJournal(journal)
    setFormData({
      title: journal.title || "",
      issn: journal.issn || "",
      eissn: journal.eissn || "",
      description: journal.description || "",
      categoryRaw: journal.category ? journal.category.join(", ") : "",
      publisher: journal.publisher || "",
      websiteUrl: journal.websiteUrl || "",
      impactFactor: journal.impactFactor?.toString() || "",
      h5Index: journal.h5Index?.toString() || "",
      paperCount: journal.paperCount?.toString() || "0",
      fieldDomain: journal.fieldDomain || "",
      isTracked: journal.isTracked ?? false,
      source: journal.source || "openalex"
    })
    setIsFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    setIsSubmitting(true)
    setError(null)
    try {
      const payload = {
        title: formData.title.trim(),
        issn: formData.issn.trim() || null,
        eissn: formData.eissn.trim() || null,
        description: formData.description.trim() || null,
        category: formData.categoryRaw ? formData.categoryRaw.split(",").map(c => c.trim()).filter(Boolean) : [],
        publisher: formData.publisher.trim() || null,
        websiteUrl: formData.websiteUrl.trim() || null,
        impactFactor: formData.impactFactor ? parseFloat(formData.impactFactor) : null,
        h5Index: formData.h5Index ? parseInt(formData.h5Index, 10) : null,
        paperCount: formData.paperCount ? parseInt(formData.paperCount, 10) : 0,
        fieldDomain: formData.fieldDomain.trim() || null,
        isTracked: formData.isTracked,
        source: formData.source
      }

      if (editingJournal) {
        // Update
        const res = await api.put(`/journals/${editingJournal._id}`, payload)
        if (res.data.success) {
          setJournals(prev => prev.map(j => j._id === editingJournal._id ? res.data.data : j))
          setIsFormOpen(false)
        }
      } else {
        // Create
        const res = await api.post("/journals", payload)
        if (res.data.success) {
          fetchJournals()
          setIsFormOpen(false)
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save journal")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (journalId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete journal "${title}"?`)) return
    setError(null)
    try {
      const res = await api.delete(`/journals/${journalId}`)
      if (res.data.success) {
        setJournals(prev => prev.filter(j => j._id !== journalId))
        setTotal(t => t - 1)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete journal")
    }
  }

  const handleToggleTracked = async (journal: JournalItem) => {
    try {
      const res = await api.put(`/journals/${journal._id}`, {
        isTracked: !journal.isTracked
      })
      if (res.data.success) {
        setJournals(prev => prev.map(j => j._id === journal._id ? { ...j, isTracked: res.data.data.isTracked } : j))
      }
    } catch (err: any) {
      alert("Failed to toggle tracking status")
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 backdrop-blur-md p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold tabular-nums text-emerald-500">{isLoading ? "—" : total}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Journals</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <BookOpen className="h-4.5 w-4.5 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 backdrop-blur-md p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold tabular-nums text-blue-500">
                {isLoading ? "—" : journals.filter(j => j.isTracked).length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Tracked Journals (on Page)</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md">
              <Rss className="h-4.5 w-4.5 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/20 to-amber-500/10 backdrop-blur-md p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold tabular-nums text-orange-500">
                {isLoading ? "—" : journals.reduce((sum, j) => sum + (j.paperCount || 0), 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Papers (on Page)</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md">
              <Activity className="h-4.5 w-4.5 text-white" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search journals by title, publisher or issn..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-border/50 bg-background/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/50 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchJournals}
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
            <Plus className="h-4 w-4" /> Add Journal
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
        {isLoading && journals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Activity className="animate-spin h-7 w-7 text-primary" />
            <p className="text-sm text-muted-foreground">Loading journals...</p>
          </div>
        ) : journals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-12 w-12 rounded-2xl bg-muted/30 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No journals found</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20 border-border/30">
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-6">Title</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ISSN / EISSN</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categories</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">IF / h5</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Papers</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tracked</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journals.map((journal, idx) => (
                  <TableRow
                    key={journal._id}
                    className="border-border/20 hover:bg-muted/20 transition-colors group"
                  >
                    <TableCell className="pl-6 py-3.5 font-medium text-foreground max-w-[220px] truncate" title={journal.title}>
                      {journal.title}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {journal.issn || "—"} / {journal.eissn || "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="flex flex-wrap gap-1">
                        {journal.category && journal.category.length > 0 ? (
                          journal.category.slice(0, 2).map(cat => (
                            <Badge key={cat} variant="secondary" className="text-[10px] px-1.5 py-0 rounded-full font-medium">
                              {cat}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                        {journal.category && journal.category.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">+{journal.category.length - 2}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-foreground/80 tabular-nums font-medium">
                      IF: {journal.impactFactor !== null ? journal.impactFactor : "—"} / h5: {journal.h5Index !== null ? journal.h5Index : "—"}
                    </TableCell>
                    <TableCell className="text-xs font-semibold tabular-nums text-foreground/90">
                      {journal.paperCount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggleTracked(journal)}
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                          journal.isTracked
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20"
                            : "bg-muted text-muted-foreground border-border hover:bg-muted/60"
                        }`}
                      >
                        {journal.isTracked ? (
                          <>
                            <Check className="h-2.5 w-2.5" /> Tracked
                          </>
                        ) : (
                          <>
                            <X className="h-2.5 w-2.5" /> Untracked
                          </>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Edit Journal"
                          onClick={() => handleOpenEdit(journal)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Delete Journal"
                          onClick={() => handleDelete(journal._id, journal.title)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination & Footer */}
            <div className="px-6 py-3 border-t border-border/20 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing page <span className="font-medium text-foreground">{page}</span> of <span className="font-medium text-foreground">{totalPages}</span> ({total} journals total)
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
              <DialogTitle>{editingJournal ? "Edit Journal" : "Add New Journal"}</DialogTitle>
              <DialogDescription>
                Fill in the academic journal information.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-1 max-h-[360px] overflow-y-auto px-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="journal-title">Title *</label>
                <Input
                  id="journal-title"
                  required
                  placeholder="e.g. IEEE Transactions on Pattern Analysis"
                  value={formData.title}
                  onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                  className="h-10 rounded-xl bg-muted/20 border-border/50 focus-visible:border-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="journal-issn">ISSN</label>
                  <Input
                    id="journal-issn"
                    placeholder="e.g. 0162-8828"
                    value={formData.issn}
                    onChange={e => setFormData(f => ({ ...f, issn: e.target.value }))}
                    className="h-10 rounded-xl bg-muted/20 border-border/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="journal-eissn">E-ISSN</label>
                  <Input
                    id="journal-eissn"
                    placeholder="e.g. 2160-9454"
                    value={formData.eissn}
                    onChange={e => setFormData(f => ({ ...f, eissn: e.target.value }))}
                    className="h-10 rounded-xl bg-muted/20 border-border/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="journal-desc">Description</label>
                <textarea
                  id="journal-desc"
                  placeholder="Description of the journal coverage..."
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  className="w-full min-h-[60px] p-2 text-sm rounded-xl bg-muted/20 border border-border/50 outline-none focus:border-primary/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="journal-cats">Categories (Comma-separated)</label>
                <Input
                  id="journal-cats"
                  placeholder="e.g. Computer Science, Artificial Intelligence"
                  value={formData.categoryRaw}
                  onChange={e => setFormData(f => ({ ...f, categoryRaw: e.target.value }))}
                  className="h-10 rounded-xl bg-muted/20 border-border/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="journal-pub">Publisher</label>
                  <Input
                    id="journal-pub"
                    placeholder="e.g. IEEE"
                    value={formData.publisher}
                    onChange={e => setFormData(f => ({ ...f, publisher: e.target.value }))}
                    className="h-10 rounded-xl bg-muted/20 border-border/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="journal-domain">Field Domain</label>
                  <Input
                    id="journal-domain"
                    placeholder="e.g. Computer Science"
                    value={formData.fieldDomain}
                    onChange={e => setFormData(f => ({ ...f, fieldDomain: e.target.value }))}
                    className="h-10 rounded-xl bg-muted/20 border-border/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="journal-url">Website URL</label>
                <Input
                  id="journal-url"
                  placeholder="e.g. https://ieeexplore.ieee.org/..."
                  value={formData.websiteUrl}
                  onChange={e => setFormData(f => ({ ...f, websiteUrl: e.target.value }))}
                  className="h-10 rounded-xl bg-muted/20 border-border/50"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="journal-if">Impact Factor</label>
                  <Input
                    id="journal-if"
                    type="number"
                    step="0.01"
                    placeholder="23.5"
                    value={formData.impactFactor}
                    onChange={e => setFormData(f => ({ ...f, impactFactor: e.target.value }))}
                    className="h-10 rounded-xl bg-muted/20 border-border/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="journal-h5">h5 Index</label>
                  <Input
                    id="journal-h5"
                    type="number"
                    placeholder="120"
                    value={formData.h5Index}
                    onChange={e => setFormData(f => ({ ...f, h5Index: e.target.value }))}
                    className="h-10 rounded-xl bg-muted/20 border-border/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="journal-papers">Paper Count</label>
                  <Input
                    id="journal-papers"
                    type="number"
                    placeholder="0"
                    value={formData.paperCount}
                    onChange={e => setFormData(f => ({ ...f, paperCount: e.target.value }))}
                    className="h-10 rounded-xl bg-muted/20 border-border/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="journal-tracked"
                    checked={formData.isTracked}
                    onCheckedChange={checked => setFormData(f => ({ ...f, isTracked: checked }))}
                  />
                  <label htmlFor="journal-tracked" className="text-xs font-semibold text-muted-foreground cursor-pointer">Track trends</label>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-muted-foreground" htmlFor="journal-source">DataSource</label>
                  <select
                    id="journal-source"
                    value={formData.source}
                    onChange={e => setFormData(f => ({ ...f, source: e.target.value }))}
                    className="w-full h-8 text-xs bg-muted/30 rounded-lg border border-border/50 focus:outline-none"
                  >
                    {SOURCE_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl glow-primary">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingJournal ? "Save Changes" : "Create Journal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
