import { useState, useEffect } from "react"
import { Database, Plus, Loader2, CheckCircle2, AlertCircle, PlayCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useNavigate } from "react-router-dom"
import api from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"

// API: POST /corpus/runs  → body { seedKeyword, source?, startYear?, endYear?, maxPages?, perPage? }
// API: GET  /corpus/runs   → { success, runs: [{_id, seedKeyword, status, paperCount, createdAt, ...}] }
// API: GET  /corpus/runs/:id → { success, run: {_id, seedKeyword, status, paperCount, yearlyData, trendStatus, ...} }

const STATUS_CONFIG: Record<string, { label: string; icon: any; cls: string; iconCls: string }> = {
  completed: { label: "Completed", icon: CheckCircle2, cls: "status-completed", iconCls: "text-emerald-400" },
  failed:    { label: "Failed",    icon: AlertCircle,  cls: "status-failed",    iconCls: "text-red-400" },
  pending:   { label: "Pending",   icon: Loader2,      cls: "status-running",   iconCls: "text-cyan-400 animate-spin" },
  ingesting: { label: "Ingesting Papers", icon: Loader2, cls: "status-running", iconCls: "text-cyan-400 animate-spin" },
  analyzing: { label: "AI Analyzing",    icon: Loader2, cls: "status-running", iconCls: "text-cyan-400 animate-spin" },
}

export default function CorpusPage() {
  const navigate = useNavigate()
  const [runs, setRuns] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newRunKeyword, setNewRunKeyword] = useState("")

  const fetchRuns = async () => {
    try {
      const res = await api.get("/corpus/runs")
      setRuns(res.data.runs || [])
    } catch (err: any) {
      console.error("Failed to fetch corpus runs", err)
      setRuns([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchRuns() }, [])

  // Poll active runs every 5s
  useEffect(() => {
    const hasActive = runs.some((r) => r.status === "pending" || r.status === "ingesting" || r.status === "analyzing")
    if (!hasActive) return
    const interval = setInterval(() => { fetchRuns() }, 5000)
    return () => clearInterval(interval)
  }, [runs])

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRunKeyword) return
    setIsDialogOpen(false)
    try {
      await api.post("/corpus/runs", { seedKeyword: newRunKeyword })
      fetchRuns()
    } catch (err: any) {
      console.error(err)
    }
    setNewRunKeyword("")
  }

  const isActive = (status: string) => ["pending", "ingesting", "analyzing"].includes(status)

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-7 w-7 text-primary" />
            Corpus Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Start topic tracking runs to ingest and analyze academic papers at scale.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl glow-primary">
              <Plus className="h-4 w-4" /> New Tracking Run
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-border/50 rounded-2xl">
            <form onSubmit={handleCreateRun}>
              <DialogHeader>
                <DialogTitle>Create New Tracking Run</DialogTitle>
                <DialogDescription>
                  Enter a seed keyword. The system will ingest papers from OpenAlex and analyze trends in the background.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  id="corpus-new-keyword"
                  placeholder="e.g., federated learning"
                  value={newRunKeyword}
                  onChange={(e) => setNewRunKeyword(e.target.value)}
                  className="h-11 rounded-xl bg-muted/30 border-border/50 focus-visible:border-primary/50"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" className="rounded-xl">Start Processing</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
      ) : runs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 glass rounded-2xl border border-dashed border-border/50"
        >
          <Database className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-base font-semibold mb-2">No corpus runs yet</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Start a new tracking run to begin ingesting and analyzing papers.
          </p>
          <Button onClick={() => setIsDialogOpen(true)} className="rounded-xl gap-2">
            <Plus className="h-4 w-4" /> Create Your First Run
          </Button>
        </motion.div>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
          className="space-y-4"
        >
          <AnimatePresence>
            {runs.map((run) => {
              const conf = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.pending
              const active = isActive(run.status)
              return (
                <motion.div
                  key={run._id}
                  variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                  className="glass rounded-2xl border border-border/40 overflow-hidden"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between p-5 pb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Database className="h-4 w-4 text-primary shrink-0" />
                        <h3 className="font-semibold text-base truncate">{run.seedKeyword}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                        <span>Started {new Date(run.createdAt).toLocaleString()}</span>
                        {run.paperCount > 0 && (
                          <Badge variant="outline" className="text-xs rounded-full">
                            {run.paperCount} papers
                          </Badge>
                        )}
                        {run.trendStatus && (
                          <Badge variant="secondary" className="text-xs rounded-full capitalize">
                            {run.trendStatus}
                          </Badge>
                        )}
                      </p>
                    </div>
                    {/* Status pill */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium shrink-0 ml-3 ${conf.cls}`}>
                      <conf.icon className={`h-3.5 w-3.5 ${conf.iconCls}`} />
                      {conf.label}
                    </div>
                  </div>

                  {/* Active pipeline bar */}
                  {active && (
                    <div className="h-10 mx-5 mb-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center relative overflow-hidden">
                      {/* Scan line */}
                      <div
                        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent"
                        style={{ animation: "scan-line 2s linear infinite" }}
                      />
                      <span className="relative z-10 text-xs font-medium text-cyan-400 flex items-center gap-2">
                        <PlayCircle className="h-3.5 w-3.5 animate-pulse" />
                        Processing Pipeline Active — {conf.label}...
                      </span>
                    </div>
                  )}

                  {/* Error message */}
                  {run.status === "failed" && run.errorMessage && (
                    <div className="mx-5 mb-4 px-4 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                      Error: {run.errorMessage}
                    </div>
                  )}

                  {/* Footer actions */}
                  <div className="flex justify-end gap-2 px-5 pb-5">
                    {run.status === "completed" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 text-xs rounded-lg text-muted-foreground hover:text-primary"
                          onClick={() => navigate("/trends")}
                        >
                          View Trends <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs rounded-lg"
                          onClick={() => navigate(`/insights?runId=${run._id}&keyword=${encodeURIComponent(run.seedKeyword)}`)}
                        >
                          View Graph
                        </Button>
                      </>
                    )}
                    {run.status === "failed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs rounded-lg"
                        onClick={() => { setNewRunKeyword(run.seedKeyword); setIsDialogOpen(true) }}
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
