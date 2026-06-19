import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Shield, Lock, Trash2, Activity, Search, RefreshCw, AlertCircle,
  Users, UserCheck, UserX, Crown, ChevronDown
} from "lucide-react"
import api from "@/lib/api"

type UserItem = {
  _id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
}

const ROLE_OPTIONS = ["researcher", "student", "lecturer", "admin"]

const roleConfig: Record<string, { cls: string; icon: string }> = {
  admin: { cls: "bg-red-500/10 text-red-500 border-red-500/20", icon: "👑" },
  researcher: { cls: "bg-violet-500/10 text-violet-500 border-violet-500/20", icon: "🔬" },
  lecturer: { cls: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: "🎓" },
  student: { cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: "📖" },
}

function Avatar({ name, role }: { name: string; role: string }) {
  const colors: Record<string, string> = {
    admin: "from-red-500 to-rose-600",
    researcher: "from-violet-500 to-purple-600",
    lecturer: "from-blue-500 to-cyan-600",
    student: "from-emerald-500 to-teal-600",
  }
  return (
    <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${colors[role] || "from-muted to-muted-foreground"} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [total, setTotal] = useState(0)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = {}
      if (search) params.search = search
      if (roleFilter) params.role = roleFilter
      const res = await api.get("/users", { params })
      if (res.data.success) {
        setUsers(res.data.data)
        setTotal(res.data.pagination?.total ?? res.data.data.length)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load users")
    } finally {
      setIsLoading(false)
    }
  }, [search, roleFilter])

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300)
    return () => clearTimeout(t)
  }, [fetchUsers])

  const handleToggleStatus = async (userId: string) => {
    setActionLoading(userId + "-status")
    try {
      const res = await api.put(`/users/${userId}/status`)
      if (res.data.success) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, isActive: res.data.data.isActive } : u))
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed")
    } finally {
      setActionLoading(null)
    }
  }

  const handleChangeRole = async (userId: string, newRole: string) => {
    setActionLoading(userId + "-role")
    try {
      const res = await api.put(`/users/${userId}/role`, { role: newRole })
      if (res.data.success) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: res.data.data.role } : u))
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed")
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Delete "${userName}"? This cannot be undone.`)) return
    setActionLoading(userId + "-delete")
    try {
      const res = await api.delete(`/users/${userId}`)
      if (res.data.success) {
        setUsers(prev => prev.filter(u => u._id !== userId))
        setTotal(t => t - 1)
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed")
    } finally {
      setActionLoading(null)
    }
  }

  const activeCount = users.filter(u => u.isActive).length
  const adminCount = users.filter(u => u.role === "admin").length

  return (
    <div className="space-y-6">
      {/* Summary mini-cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Users", value: total, icon: Users, color: "from-violet-500/20 to-purple-500/10", border: "border-violet-500/20", text: "text-violet-500", iconBg: "from-violet-500 to-purple-600" },
          { label: "Active Users", value: activeCount, icon: UserCheck, color: "from-emerald-500/20 to-teal-500/10", border: "border-emerald-500/20", text: "text-emerald-500", iconBg: "from-emerald-500 to-teal-600" },
          { label: "Admins", value: adminCount, icon: Crown, color: "from-red-500/20 to-rose-500/10", border: "border-red-500/20", text: "text-red-500", iconBg: "from-red-500 to-rose-600" },
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
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-2xl font-bold tabular-nums ${s.text}`}>{isLoading ? "—" : s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
                <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${s.iconBg} flex items-center justify-center shadow-md`}>
                  <Icon className="h-4.5 w-4.5 text-white h-[18px] w-[18px]" />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-border/50 bg-background/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/50 transition-colors"
          />
        </div>
        <div className="relative">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="h-9 pl-3 pr-8 rounded-xl border border-border/50 bg-background/50 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer w-full sm:w-40"
          >
            <option value="">All Roles</option>
            {ROLE_OPTIONS.map(r => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchUsers}
          disabled={isLoading}
          className="gap-2 h-9 shrink-0 bg-background/50 border-border/50 hover:bg-muted/50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
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
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md overflow-hidden shadow-sm"
      >
        {isLoading && users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Activity className="animate-spin h-7 w-7 text-primary" />
            <p className="text-sm text-muted-foreground">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-12 w-12 rounded-2xl bg-muted/30 flex items-center justify-center">
              <UserX className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No users found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20 border-border/30">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-6">User</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Joined</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {users.map((user, idx) => {
                  const rCfg = roleConfig[user.role] || { cls: "bg-muted text-muted-foreground border-border", icon: "👤" }
                  return (
                    <motion.tr
                      key={user._id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: idx * 0.04 }}
                      className="border-border/20 hover:bg-muted/20 transition-colors group"
                    >
                      {/* User info */}
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={user.name} role={user.role} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Role selector */}
                      <TableCell>
                        <div className="relative inline-flex">
                          <select
                            value={user.role}
                            disabled={actionLoading === user._id + "-role"}
                            onChange={e => handleChangeRole(user._id, e.target.value)}
                            className={`capitalize text-[11px] font-semibold pl-2 pr-6 py-1 rounded-full border appearance-none cursor-pointer focus:outline-none bg-transparent ${rCfg.cls}`}
                          >
                            {ROLE_OPTIONS.map(r => (
                              <option key={r} value={r} className="bg-background text-foreground">
                                {r.charAt(0).toUpperCase() + r.slice(1)}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 pointer-events-none opacity-70" />
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${user.isActive ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                          {user.isActive ? "Active" : "Blocked"}
                        </span>
                      </TableCell>

                      {/* Joined date */}
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="pr-6 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 rounded-lg transition-colors ${user.isActive ? "text-orange-500 hover:bg-orange-500/10" : "text-emerald-500 hover:bg-emerald-500/10"}`}
                            title={user.isActive ? "Block user" : "Activate user"}
                            disabled={actionLoading === user._id + "-status"}
                            onClick={() => handleToggleStatus(user._id)}
                          >
                            {actionLoading === user._id + "-status"
                              ? <Activity className="h-3.5 w-3.5 animate-spin" />
                              : <Lock className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Delete user"
                            disabled={actionLoading === user._id + "-delete"}
                            onClick={() => handleDelete(user._id, user.name)}
                          >
                            {actionLoading === user._id + "-delete"
                              ? <Activity className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            </TableBody>
          </Table>
        )}

        {/* Footer */}
        {users.length > 0 && (
          <div className="px-6 py-3 border-t border-border/20 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-medium text-foreground">{users.length}</span> of <span className="font-medium text-foreground">{total}</span> users
            </p>
            {isLoading && <Activity className="h-3.5 w-3.5 animate-spin text-primary" />}
          </div>
        )}
      </motion.div>
    </div>
  )
}
