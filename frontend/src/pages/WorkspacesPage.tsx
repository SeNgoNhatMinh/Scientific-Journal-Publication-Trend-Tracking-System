import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { FolderKanban, Plus, ArrowRight, FileText, StickyNote, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import api from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"

// API: GET  /workspaces       → { success, workspaces, total, page, limit }
// API: POST /workspaces       → body { name, description?, visibility?, plan? }

const WORKSPACE_GRADIENTS = [
  "from-violet-500/10 to-purple-500/5",
  "from-cyan-500/10 to-blue-500/5",
  "from-emerald-500/10 to-green-500/5",
  "from-orange-500/10 to-amber-500/5",
  "from-pink-500/10 to-rose-500/5",
  "from-indigo-500/10 to-blue-500/5",
]

export default function WorkspacesPage() {
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState("")
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState("")
  const [newWorkspaceVisibility, setNewWorkspaceVisibility] = useState("private")
  const [newWorkspacePlan, setNewWorkspacePlan] = useState("free")

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await api.get("/workspaces")
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
    setIsLoading(true) // Show shimmer while refetching
    try {
      await api.post("/workspaces", {
        name: newWorkspaceName,
        description: newWorkspaceDesc,
        visibility: newWorkspaceVisibility,
        plan: newWorkspacePlan,
      })
      // Re-fetch to ensure data consistency and stats are properly populated
      const listRes = await api.get("/workspaces")
      setWorkspaces(listRes.data.workspaces || [])
    } catch (err: any) {
      console.error("Failed to create workspace", err)
    } finally {
      setIsLoading(false)
      setNewWorkspaceName("")
      setNewWorkspaceDesc("")
      setNewWorkspaceVisibility("private")
      setNewWorkspacePlan("free")
    }
  }

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
            <FolderKanban className="h-7 w-7 text-primary" />
            My Workspaces
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize your research papers, notes, and keyword trends.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl glow-primary">
              <Plus className="h-4 w-4" /> New Workspace
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-border/50 rounded-2xl">
            <form onSubmit={handleCreateWorkspace}>
              <DialogHeader>
                <DialogTitle>Create New Workspace</DialogTitle>
                <DialogDescription>
                  Workspaces group related papers, notes, and generate mini research maps automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-3">
                <Input
                  id="workspace-name"
                  placeholder="Workspace Name (e.g., Computer Vision)"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  required
                  className="h-11 rounded-xl bg-muted/30 border-border/50 focus-visible:border-primary/50"
                />
                <Input
                  id="workspace-desc"
                  placeholder="Short Description (optional)"
                  value={newWorkspaceDesc}
                  onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                  className="h-11 rounded-xl bg-muted/30 border-border/50 focus-visible:border-primary/50"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Visibility</label>
                    <Select value={newWorkspaceVisibility} onValueChange={(v) => setNewWorkspaceVisibility(v ?? "private")}>
                      <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Plan</label>
                    <Select value={newWorkspacePlan} onValueChange={(v) => setNewWorkspacePlan(v ?? "free")}>
                      <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" className="rounded-xl">Create Workspace</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass rounded-2xl border border-border/40 p-5 space-y-3">
              <div className="shimmer h-5 w-1/2" />
              <div className="shimmer h-3 w-3/4" />
              <div className="shimmer h-8 w-full mt-4" />
            </div>
          ))}
        </div>
      ) : workspaces.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24 glass rounded-2xl border border-dashed border-border/50"
        >
          <FolderKanban className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-base font-semibold mb-2">No workspaces yet</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Create your first workspace to start organizing your research.
          </p>
          <Button onClick={() => setIsDialogOpen(true)} className="rounded-xl gap-2">
            <Plus className="h-4 w-4" /> Create Workspace
          </Button>
        </motion.div>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
          className="grid grid-cols-1 md:grid-cols-2 gap-5"
        >
          <AnimatePresence>
            {workspaces.map((ws, i) => {
              const gradient = WORKSPACE_GRADIENTS[i % WORKSPACE_GRADIENTS.length]
              return (
                <motion.div
                  key={ws._id}
                  variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                >
                  <button
                    onClick={() => navigate(`/workspaces/${ws._id}`)}
                    className={`w-full text-left glass rounded-2xl border border-border/40 hover:border-primary/30 transition-all duration-300 card-hover overflow-hidden group bg-gradient-to-br ${gradient}`}
                  >
                    {/* Card body */}
                    <div className="p-5">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <FolderKanban className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                          {ws.name}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {ws.description || "No description provided."}
                      </p>

                      {ws.stats && (
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <strong className="text-foreground">{ws.stats.papers || 0}</strong> Papers
                          </span>
                          <span className="flex items-center gap-1">
                            <StickyNote className="h-3 w-3" />
                            <strong className="text-foreground">{ws.stats.notes || 0}</strong> Notes
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <strong className="text-foreground">{ws.stats.members || 0}</strong> Members
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end px-5 py-3 border-t border-border/30 bg-muted/10">
                      <span className="text-xs text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                        Open Workspace <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
