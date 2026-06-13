import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { FolderKanban, Plus, Loader2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import api from "@/lib/api"

// API: GET  /workspaces       → { success, workspaces, total, page, limit }
// API: POST /workspaces       → body { name, description?, visibility?, plan? }

export default function WorkspacesPage() {
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState("")
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState("")

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await api.get('/workspaces')
        setWorkspaces(res.data.workspaces || [])
      } catch (err: any) {
        console.error("Failed to fetch workspaces", err)
        setWorkspaces([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchWorkspaces()
  }, [])

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWorkspaceName) return
    setIsDialogOpen(false)
    try {
      const res = await api.post('/workspaces', { name: newWorkspaceName, description: newWorkspaceDesc })
      if (res.data.workspace) {
        setWorkspaces([...workspaces, res.data.workspace])
      } else {
        // Refetch if response shape is different
        const listRes = await api.get('/workspaces')
        setWorkspaces(listRes.data.workspaces || [])
      }
    } catch (err: any) {
      console.error("Failed to create workspace", err)
    }
    setNewWorkspaceName("")
    setNewWorkspaceDesc("")
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Workspaces</h1>
          <p className="text-muted-foreground">Organize your research papers, notes, and specific keyword trends.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Workspace</Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateWorkspace}>
              <DialogHeader>
                <DialogTitle>Create New Workspace</DialogTitle>
                <DialogDescription>
                  Workspaces group related papers, notes, and generate mini research maps automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <Input 
                  placeholder="Workspace Name (e.g., Computer Vision)" 
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  required
                />
                <Input 
                  placeholder="Short Description" 
                  value={newWorkspaceDesc}
                  onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Create Workspace</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : workspaces.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg bg-muted/20">
          <h3 className="text-lg font-medium mb-2">No workspaces yet</h3>
          <p className="text-muted-foreground mb-4">Create your first workspace to start organizing your research.</p>
          <Button onClick={() => setIsDialogOpen(true)}>Create Workspace</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workspaces.map((ws) => (
            <Card key={ws._id} className="hover:shadow-md transition-shadow cursor-pointer flex flex-col" onClick={() => navigate(`/workspaces/${ws._id}`)}>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <FolderKanban className="h-5 w-5 text-primary" />
                  {ws.name}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {ws.description || "No description provided."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  {ws.stats && (
                    <>
                      <div><strong>{ws.stats.papers || 0}</strong> Papers</div>
                      <div><strong>{ws.stats.notes || 0}</strong> Notes</div>
                      <div><strong>{ws.stats.members || 0}</strong> Members</div>
                    </>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t flex justify-end">
                <Button variant="ghost" size="sm" className="gap-2">
                  Open Workspace <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
