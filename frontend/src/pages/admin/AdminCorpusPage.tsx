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
import { RefreshCw, StopCircle, Trash2 } from "lucide-react"

const mockCorpusRuns = [
  { id: "run_102", keyword: "federated learning", papers: 1420, status: "completed", creator: "Alice Researcher", date: "2026-06-14" },
  { id: "run_103", keyword: "crispr cas9", papers: 850, status: "analyzing", creator: "Bob Student", date: "2026-06-15" },
  { id: "run_104", keyword: "climate change models", papers: 3200, status: "ingesting", creator: "System Admin", date: "2026-06-15" },
  { id: "run_105", keyword: "unbounded keyword", papers: 0, status: "failed", creator: "Dr. Charlie", date: "2026-06-12" },
]

export default function AdminCorpusPage() {
  const getStatusColor = (status: string) => {
    switch (status) {
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
        <Button variant="outline" className="w-full sm:w-auto bg-white/60 dark:bg-black/40 backdrop-blur-md">
          <RefreshCw className="h-4 w-4 mr-2" /> Sync All
        </Button>
      </div>

      <div className="rounded-md border border-white/20 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-md shadow-sm overflow-hidden">
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
            {mockCorpusRuns.map((run) => (
              <TableRow key={run.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-mono text-xs text-muted-foreground">{run.id}</TableCell>
                <TableCell className="font-medium">{run.keyword}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`capitalize border-0 ${getStatusColor(run.status)}`}>
                    {run.status === 'ingesting' || run.status === 'analyzing' ? (
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    ) : null}
                    {run.status}
                  </Badge>
                </TableCell>
                <TableCell>{run.papers.toLocaleString()}</TableCell>
                <TableCell className="text-muted-foreground">{run.creator}</TableCell>
                <TableCell className="text-muted-foreground">{run.date}</TableCell>
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
      </div>
    </div>
  )
}
