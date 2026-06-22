import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import {
  Search, RefreshCw, AlertCircle, Plus, Edit2, Trash2, Loader2, Users, BookOpen, Activity, ChevronLeft, ChevronRight
} from "lucide-react"
import api from "@/lib/api"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

type AuthorItem = {
  _id: string
  fullName: string
  orcid: string | null
  affiliation: string | null
  openalexId: string | null
  worksCount: number | null
  createdAt: string
}

export default function AdminAuthorsPage() {
  const [authors, setAuthors] = useState<AuthorItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingAuthor, setEditingAuthor] = useState<AuthorItem | null>(null)
  const [formData, setFormData] = useState({
    fullName: "",
    orcid: "",
    affiliation: "",
    openalexId: "",
    worksCount: ""
  })
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

  const limit = 10

  const fetchAuthors = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params: Record<string, any> = { page, limit }
      if (search) params.search = search
      const res = await api.get("/authors", { params })
      if (res.data.success) {
        setAuthors(res.data.data)
        setTotal(res.data.total ?? 0)
        setTotalPages(res.data.totalPages ?? 1)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load authors")
    } finally {
      setIsLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    const t = setTimeout(fetchAuthors, 300)
    return () => clearTimeout(t)
  }, [fetchAuthors])

  const handleOpenCreate = () => {
    setEditingAuthor(null)
    setFormData({
      fullName: "",
      orcid: "",
      affiliation: "",
      openalexId: "",
      worksCount: ""
    })
    setIsFormOpen(true)
  }

  const handleOpenEdit = (author: AuthorItem) => {
    setEditingAuthor(author)
    setFormData({
      fullName: author.fullName || "",
      orcid: author.orcid || "",
      affiliation: author.affiliation || "",
      openalexId: author.openalexId || "",
      worksCount: author.worksCount?.toString() || ""
    })
    setIsFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.fullName.trim()) return

    setIsSubmitting(true)
    setError(null)
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        orcid: formData.orcid.trim() || null,
        affiliation: formData.affiliation.trim() || null,
        openalexId: formData.openalexId.trim() || null,
        worksCount: formData.worksCount ? parseInt(formData.worksCount, 10) : null
      }

      if (editingAuthor) {
        // Update
        const res = await api.put(`/authors/${editingAuthor._id}`, payload)
        if (res.data.success) {
          setAuthors(prev => prev.map(a => a._id === editingAuthor._id ? res.data.data : a))
          setIsFormOpen(false)
        }
      } else {
        // Create
        const res = await api.post("/authors", payload)
        if (res.data.success) {
          fetchAuthors()
          setIsFormOpen(false)
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save author")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = (authorId: string, name: string) => {
    setConfirmState({
      isOpen: true,
      title: "Delete Author",
      description: `Are you sure you want to permanently delete author "${name}"?`,
      variant: "destructive",
      onConfirm: async () => {
        setError(null)
        try {
          const res = await api.delete(`/authors/${authorId}`)
          if (res.data.success) {
            setAuthors(prev => prev.filter(a => a._id !== authorId))
            setTotal(t => t - 1)
          }
        } catch (err: any) {
          setError(err.response?.data?.message || "Failed to delete author")
        }
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Summary Row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/20 to-purple-500/10 backdrop-blur-md p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold tabular-nums text-violet-500">{isLoading ? "—" : total}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Authors</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
              <Users className="h-4.5 w-4.5 text-white" />
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
                {isLoading ? "—" : authors.reduce((sum, a) => sum + (a.worksCount || 0), 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Publications (on Current Page)</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md">
              <BookOpen className="h-4.5 w-4.5 text-white" />
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
            placeholder="Search authors by name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-border/50 bg-background/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/50 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAuthors}
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
            <Plus className="h-4 w-4" /> Add Author
          </Button>
        </div>
      </motion.div>

      {/* Error display */}
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
        {isLoading && authors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Activity className="animate-spin h-7 w-7 text-primary" />
            <p className="text-sm text-muted-foreground">Loading authors...</p>
          </div>
        ) : authors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-12 w-12 rounded-2xl bg-muted/30 flex items-center justify-center">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No authors found</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20 border-border/30">
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-6">Full Name</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ORCID</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Affiliation</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">OpenAlex ID</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Works Count</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {authors.map((author) => (
                  <TableRow
                    key={author._id}
                    className="border-border/20 hover:bg-muted/20 transition-colors group"
                  >
                    <TableCell className="pl-6 py-3.5 font-medium text-foreground">
                      {author.fullName}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {author.orcid || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-foreground/85 max-w-[200px] truncate" title={author.affiliation || ""}>
                      {author.affiliation || "—"}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground/80 max-w-[150px] truncate" title={author.openalexId || ""}>
                      {author.openalexId ? author.openalexId.split("/").pop() : "—"}
                    </TableCell>
                    <TableCell className="text-xs font-semibold tabular-nums text-foreground/90">
                      {author.worksCount !== null ? author.worksCount.toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Edit Author"
                          onClick={() => handleOpenEdit(author)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Delete Author"
                          onClick={() => handleDelete(author._id, author.fullName)}
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
                Showing page <span className="font-medium text-foreground">{page}</span> of <span className="font-medium text-foreground">{totalPages}</span> ({total} authors total)
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
              <DialogTitle>{editingAuthor ? "Edit Author" : "Add New Author"}</DialogTitle>
              <DialogDescription>
                Fill in the details for the author. Fields marked with OpenAlex ID are sparse-indexed.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="author-name">Full Name *</label>
                <Input
                  id="author-name"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.fullName}
                  onChange={e => setFormData(f => ({ ...f, fullName: e.target.value }))}
                  className="h-10 rounded-xl bg-muted/20 border-border/50 focus-visible:border-primary/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="author-orcid">ORCID ID</label>
                <Input
                  id="author-orcid"
                  placeholder="e.g. 0000-0002-1825-0097"
                  value={formData.orcid}
                  onChange={e => setFormData(f => ({ ...f, orcid: e.target.value }))}
                  className="h-10 rounded-xl bg-muted/20 border-border/50 focus-visible:border-primary/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="author-affiliation">Affiliation</label>
                <Input
                  id="author-affiliation"
                  placeholder="e.g. Stanford University"
                  value={formData.affiliation}
                  onChange={e => setFormData(f => ({ ...f, affiliation: e.target.value }))}
                  className="h-10 rounded-xl bg-muted/20 border-border/50 focus-visible:border-primary/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="author-openalex">OpenAlex ID</label>
                <Input
                  id="author-openalex"
                  placeholder="e.g. A5012345678"
                  value={formData.openalexId}
                  onChange={e => setFormData(f => ({ ...f, openalexId: e.target.value }))}
                  className="h-10 rounded-xl bg-muted/20 border-border/50 focus-visible:border-primary/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground" htmlFor="author-works">Works Count</label>
                <Input
                  id="author-works"
                  type="number"
                  placeholder="e.g. 45"
                  value={formData.worksCount}
                  onChange={e => setFormData(f => ({ ...f, worksCount: e.target.value }))}
                  className="h-10 rounded-xl bg-muted/20 border-border/50 focus-visible:border-primary/50"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl glow-primary">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingAuthor ? "Save Changes" : "Create Author"}
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
