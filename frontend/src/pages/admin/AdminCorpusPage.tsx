import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  RefreshCw, StopCircle, Trash2, Loader2, AlertCircle, Database,
  CheckCircle2, Cpu, FileText, Clock, Search
} from "lucide-react"
import api from "@/lib/api"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

const statusConfig: Record<string, { label: string; cls: string; dot: string; spinner?: boolean }> = {
  completed: {
    label: "Completed",
    cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  ingesting: {
    label: "Ingesting",
    cls: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    dot: "bg-blue-500",
    spinner: true,
  },
  analyzing: {
    label: "Analyzing",
    cls: "bg-violet-500/10 text-violet-500 border-violet-500/20",
    dot: "bg-violet-500",
    spinner: true,
  },
  failed: {
    label: "Failed",
    cls: "bg-red-500/10 text-red-500 border-red-500/20",
    dot: "bg-red-500",
  },
  pending: {
    label: "Pending",
    cls: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    dot: "bg-orange-400",
  },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status?.toLowerCase()] ?? {
    label: status || "Unknown",
    cls: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cfg.cls}`}>
      {cfg.spinner
        ? <RefreshCw className="h-2.5 w-2.5 animate-spin" />
        : <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} animate-pulse`} />}
      {cfg.label}
    </span>
  )
}

export default function AdminCorpusPage() {
  const [runs, setRuns] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
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

  const fetchRuns = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.get("/corpus/runs")
      const data = res.data.runs || res.data || []
      setRuns(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError("Failed to fetch corpus runs. " + (err.response?.data?.message || err.message))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchRuns() }, [])

  const handleStopRun = (runId: string) => {
    setConfirmState({
      isOpen: true,
      title: "Stop Ingestion",
      description: "Are you sure you want to stop this corpus ingestion run?",
      onConfirm: async () => {
        try {
          const res = await api.post(`/corpus/runs/${runId}/stop`)
          if (res.data.success) {
            setRuns(prev =>
              prev.map(r =>
                (r._id === runId || r.id === runId)
                  ? { ...r, status: "failed", errorMessage: "Stopped by administrator" }
                  : r
              )
            )
          }
        } catch (err: any) {
          setError(err.response?.data?.message || err.message || "Failed to stop corpus run")
        }
      }
    })
  }

  const handleDeleteRun = (runId: string) => {
    setConfirmState({
      isOpen: true,
      title: "Delete Corpus Run",
      description: "Are you sure you want to permanently delete this corpus run and all of its papers and trend data?",
      variant: "destructive",
      onConfirm: async () => {
        setDeletingId(runId)
        setError(null)
        try {
          const res = await api.delete(`/corpus/runs/${runId}`)
          if (res.data.success) {
            setRuns(prev => prev.filter(r => r._id !== runId && r.id !== runId))
          }
        } catch (err: any) {
          setError(err.response?.data?.message || err.message || "Failed to delete corpus run")
        } finally {
          setDeletingId(null)
        }
      }
    })
  }

  const filtered = runs.filter(r =>
    !search || (r.keyword || r.query || "").toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: runs.length,
    active: runs.filter(r => r.status === "ingesting" || r.status === "analyzing").length,
    completed: runs.filter(r => r.status === "completed").length,
    failed: runs.filter(r => r.status === "failed").length,
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Runs", value: stats.total, icon: Database, color: "from-violet-500/20 to-purple-500/10", border: "border-violet-500/20", text: "text-violet-500", iconBg: "from-violet-500 to-purple-600" },
          { label: "Active", value: stats.active, icon: Cpu, color: "from-blue-500/20 to-cyan-500/10", border: "border-blue-500/20", text: "text-blue-500", iconBg: "from-blue-500 to-cyan-600" },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "from-emerald-500/20 to-teal-500/10", border: "border-emerald-500/20", text: "text-emerald-500", iconBg: "from-emerald-500 to-teal-600" },
          { label: "Failed", value: stats.failed, icon: AlertCircle, color: "from-red-500/20 to-rose-500/10", border: "border-red-500/20", text: "text-red-500", iconBg: "from-red-500 to-rose-600" },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`relative overflow-hidden rounded-2xl border ${s.border} bg-gradient-to-br ${s.color} backdrop-blur-md p-5`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${s.iconBg} flex items-center justify-center shadow-sm`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className={`text-2xl font-bold tabular-nums ${s.text}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by keyword..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-border/50 bg-background/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/50 transition-colors"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchRuns}
          disabled={isLoading}
          className="gap-2 h-9 shrink-0 bg-background/50 border-border/50 hover:bg-muted/50"
        >
          {isLoading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md overflow-hidden shadow-sm"
      >
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-xs">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchRuns} className="mt-2">Retry</Button>
          </div>
        ) : isLoading && runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading corpus runs...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-12 w-12 rounded-2xl bg-muted/30 flex items-center justify-center">
              <Database className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {search ? `No results for "${search}"` : "No corpus runs found"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20 border-border/30">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-6">Run ID</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Keyword</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Papers</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created By</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filtered.map((run, idx) => (
                  <motion.tr
                    key={run._id || run.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: idx * 0.04 }}
                    className="border-border/20 hover:bg-muted/20 transition-colors group"
                  >
                    <TableCell className="pl-6">
                      <span className="font-mono text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md">
                        {(run._id || run.id)?.substring(0, 8)}…
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{run.keyword || run.query || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={run.status} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {(run.stats?.totalPapers || run.papersCount || 0).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {run.user?.name || run.user?.email || run.userId || "System"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {run.createdAt ? new Date(run.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </div>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(run.status === "ingesting" || run.status === "analyzing") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-orange-500 hover:bg-orange-500/10 rounded-lg"
                            title="Stop Run"
                            onClick={() => handleStopRun(run._id || run.id)}
                          >
                            <StopCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                          title="Delete"
                          disabled={deletingId === (run._id || run.id)}
                          onClick={() => handleDeleteRun(run._id || run.id)}
                        >
                          {deletingId === (run._id || run.id)
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        )}
      </motion.div>

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
