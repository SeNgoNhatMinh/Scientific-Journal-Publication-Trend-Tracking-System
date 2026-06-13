import { useState, useEffect } from "react"
import { Database, Plus, Loader2, PlayCircle, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useNavigate } from "react-router-dom"
import api from "@/lib/api"

// API: POST /corpus/runs  → body { seedKeyword, source?, startYear?, endYear?, maxPages?, perPage? }
// API: GET  /corpus/runs   → { success, runs: [{_id, seedKeyword, status, paperCount, createdAt, ...}] }
// API: GET  /corpus/runs/:id → { success, run: {_id, seedKeyword, status, paperCount, yearlyData, trendStatus, ...} }

export default function CorpusPage() {
  const navigate = useNavigate()
  const [runs, setRuns] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newRunKeyword, setNewRunKeyword] = useState("")

  const fetchRuns = async () => {
    try {
      const res = await api.get('/corpus/runs')
      setRuns(res.data.runs || [])
    } catch (err: any) {
      console.error("Failed to fetch corpus runs", err)
      setRuns([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRuns()
  }, [])

  // Poll active runs every 5s
  useEffect(() => {
    const hasActive = runs.some(r => r.status === 'pending' || r.status === 'ingesting' || r.status === 'analyzing')
    if (!hasActive) return

    const interval = setInterval(() => {
      fetchRuns()
    }, 5000)
    return () => clearInterval(interval)
  }, [runs])

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRunKeyword) return
    setIsDialogOpen(false)
    try {
      // API: POST /corpus/runs — body uses seedKeyword (not topic)
      await api.post('/corpus/runs', { seedKeyword: newRunKeyword })
      fetchRuns()
    } catch (err: any) {
      console.error(err)
    }
    setNewRunKeyword("")
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'failed': return <AlertCircle className="h-5 w-5 text-red-500" />
      default: return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return "Pending"
      case 'ingesting': return "Ingesting Papers"
      case 'analyzing': return "AI Analyzing"
      case 'completed': return "Completed"
      case 'failed': return "Failed"
      default: return status
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Corpus Management</h1>
          <p className="text-muted-foreground">Track and manage large-scale topic tracking runs.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Tracking Run</Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateRun}>
              <DialogHeader>
                <DialogTitle>Create New Tracking Run</DialogTitle>
                <DialogDescription>
                  Enter a seed keyword. The system will ingest papers from OpenAlex and analyze trends in the background.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input 
                  placeholder="e.g., federated learning" 
                  value={newRunKeyword}
                  onChange={(e) => setNewRunKeyword(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Start Processing</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : runs.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg bg-muted/20">
          <h3 className="text-lg font-medium mb-2">No corpus runs yet</h3>
          <p className="text-muted-foreground mb-4">Start a new tracking run to begin ingesting and analyzing papers.</p>
          <Button onClick={() => setIsDialogOpen(true)}>Create Your First Run</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {runs.map((run) => (
            <Card key={run._id} className="overflow-hidden">
              <CardHeader className="bg-muted/30 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Database className="h-5 w-5 text-muted-foreground" />
                      {run.seedKeyword}
                    </CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-3">
                      <span>Started {new Date(run.createdAt).toLocaleString()}</span>
                      {run.paperCount > 0 && <Badge variant="outline">{run.paperCount} papers</Badge>}
                      {run.trendStatus && <Badge variant="secondary" className="capitalize">{run.trendStatus}</Badge>}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-background rounded-full border shadow-sm">
                    {getStatusIcon(run.status)}
                    <span className="text-sm font-medium capitalize">{getStatusText(run.status)}</span>
                  </div>
                </div>
              </CardHeader>
              
              {/* Pipeline animation for active runs */}
              {(run.status === 'pending' || run.status === 'ingesting' || run.status === 'analyzing') && (
                <div className="h-16 bg-blue-500/10 flex items-center justify-center border-y border-blue-500/20 relative overflow-hidden">
                  <span className="relative z-10 text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <PlayCircle className="h-4 w-4 animate-pulse" />
                    Processing Pipeline Active — {getStatusText(run.status)}...
                  </span>
                </div>
              )}

              {run.status === 'failed' && run.errorMessage && (
                <div className="bg-destructive/10 text-destructive p-3 text-sm border-y border-destructive/20 font-medium px-6">
                  Error: {run.errorMessage}
                </div>
              )}

              <CardFooter className="pt-4 flex justify-end bg-card gap-2">
                {run.status === 'completed' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/trends`)}>
                      View Trends
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/insights?runId=${run._id}&keyword=${encodeURIComponent(run.seedKeyword)}`)}>
                      View Graph
                    </Button>
                  </>
                )}
                {run.status === 'failed' && (
                  <Button variant="outline" size="sm" onClick={() => {
                    setNewRunKeyword(run.seedKeyword)
                    setIsDialogOpen(true)
                  }}>Retry</Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
