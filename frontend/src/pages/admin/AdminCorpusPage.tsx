import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, StopCircle, Trash2, Loader2, AlertCircle } from "lucide-react"
import { useState, useEffect } from "react"
import api from "@/lib/api"

export default function AdminCorpusPage() {
  const [runs, setRuns] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCorpusRuns = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.get('/corpus/runs')
      // API might return { success: true, runs: [...] } or just [...]
      const data = res.data.runs || res.data || []
      setRuns(Array.isArray(data) ? data : [])
    } catch (err: any) {
      console.error(err)
      setError("Failed to fetch corpus runs. " + (err.response?.data?.message || err.message))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCorpusRuns()
  }, [])

  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20'
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
      case 'ingesting': return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'
      case 'analyzing': return 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20'
      case 'failed': return 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
      default: return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Corpus Management</h2>
          <p className="text-muted-foreground">Monitor background jobs for paper collection and trend analysis.</p>
        </div>
        <Button variant="outline" onClick={fetchCorpusRuns} disabled={isLoading} className="w-full sm:w-auto bg-white/60 dark:bg-black/40 backdrop-blur-md">
          {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Sync All
        </Button>
      </div>

      <div className="rounded-md border border-white/20 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-md shadow-sm overflow-hidden min-h-[300px] flex flex-col">
        {error ? (
          <div className="p-8 flex flex-col items-center justify-center text-center text-muted-foreground h-full flex-1">
            <AlertCircle className="h-8 w-8 text-destructive mb-3" />
            <p>{error}</p>
          </div>
        ) : isLoading && runs.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center h-full flex-1">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
            <p className="text-muted-foreground">Loading corpus runs...</p>
          </div>
        ) : runs.length === 0 ? (
           <div className="p-8 flex flex-col items-center justify-center text-center text-muted-foreground h-full flex-1">
            <p>No corpus runs found in the database.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Run ID</TableHead>
                <TableHead>Target Keyword</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Papers Gathered</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run._id || run.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground">{(run._id || run.id)?.substring(0, 8)}...</TableCell>
                  <TableCell className="font-medium">{run.keyword || run.query || 'Unknown'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize border-0 ${getStatusColor(run.status)}`}>
                      {run.status === 'ingesting' || run.status === 'analyzing' ? (
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      ) : null}
                      {run.status || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell>{(run.stats?.totalPapers || run.papersCount || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">{run.user?.name || run.user?.email || run.userId || 'System'}</TableCell>
                  <TableCell className="text-muted-foreground">{run.createdAt ? new Date(run.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    {run.status === 'ingesting' || run.status === 'analyzing' ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-500/10" title="Stop Run">
                        <StopCircle className="h-4 w-4" />
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10" title="Delete Corpus">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
