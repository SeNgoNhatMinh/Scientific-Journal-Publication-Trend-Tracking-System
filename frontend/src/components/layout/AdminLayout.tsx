import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom"
import { LayoutDashboard, Users, Database, Activity, LogOut, Menu, X, Shield, ChevronRight, ArrowLeft, BookOpen, Tag, Compass } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

const navItems = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard, color: "from-violet-500 to-purple-600" },
  { name: "Users", href: "/admin/users", icon: Users, color: "from-blue-500 to-cyan-600" },
  { name: "Corpus & Trends", href: "/admin/corpus", icon: Database, color: "from-emerald-500 to-teal-600" },
  { name: "Authors", href: "/admin/authors", icon: Users, color: "from-violet-500 to-indigo-600" },
  { name: "Journals", href: "/admin/journals", icon: BookOpen, color: "from-emerald-500 to-green-600" },
  { name: "Keywords", href: "/admin/keywords", icon: Tag, color: "from-purple-500 to-pink-600" },
  { name: "Topics", href: "/admin/topics", icon: Compass, color: "from-blue-500 to-sky-600" },
  { name: "System Monitor", href: "/admin/monitoring", icon: Activity, color: "from-orange-500 to-rose-500" },
]

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/admin": { title: "Dashboard Overview", subtitle: "Monitor system activity and key metrics" },
  "/admin/users": { title: "User Management", subtitle: "Manage users, roles and access" },
  "/admin/corpus": { title: "Corpus & Trends", subtitle: "Monitor background jobs and analysis runs" },
  "/admin/monitoring": { title: "System Monitor", subtitle: "Track API limits and service health" },
  "/admin/authors": { title: "Author Management", subtitle: "Manage academic authors and works statistics" },
  "/admin/journals": { title: "Journal Management", subtitle: "Manage scientific publication venues and metrics" },
  "/admin/keywords": { title: "Keyword Management", subtitle: "Manage terminology and categorization mappings" },
  "/admin/topics": { title: "Topic Management", subtitle: "Manage research topic clusters and growth trends" },
}

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (stored) setUser(JSON.parse(stored))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    navigate("/login")
  }

  const currentPage = pageTitles[location.pathname] || { title: "Admin Panel", subtitle: "" }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row relative overflow-hidden">
      {/* Ambient background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-64 -left-32 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -bottom-64 -right-32 w-[500px] h-[500px] rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/3 blur-[160px]" />
      </div>

      {/* ========= SIDEBAR (Desktop) ========= */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 z-30 border-r border-border/40">
        {/* Glass sidebar bg */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl" />

        <div className="relative flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-6 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground tracking-tight">Admin Panel</p>
                <p className="text-[10px] text-muted-foreground">Scientific Journal System</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 pb-2">Navigation</p>
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.href === "/admin"}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden ${
                      isActive
                        ? "text-primary-foreground font-medium shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="admin-nav-active"
                          className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-90 rounded-xl`}
                          initial={false}
                          transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                        />
                      )}
                      <div className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-lg transition-all ${isActive ? "bg-white/20" : `bg-gradient-to-br ${item.color} opacity-70 group-hover:opacity-100`}`}>
                        <Icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="relative z-10 text-sm font-medium">{item.name}</span>
                      {isActive && <ChevronRight className="relative z-10 h-3.5 w-3.5 ml-auto opacity-70" />}
                    </>
                  )}
                </NavLink>
              )
            })}
          </nav>

          {/* User + Logout */}
          <div className="px-3 py-4 border-t border-border/30 space-y-2">
            {user && (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/30">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold shadow-sm ring-1 ring-primary/30 shrink-0">
                  {user.name?.[0]?.toUpperCase() || "A"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.name || "Admin"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-3 px-3 h-9 rounded-xl"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">Logout</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* ========= MOBILE HEADER ========= */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
            <Shield className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-sm text-foreground">Admin Panel</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMobileOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* ========= MOBILE DRAWER ========= */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-72 z-50 bg-background/95 backdrop-blur-2xl border-r border-border/40 flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-bold text-foreground">Admin Panel</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMobileOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      end={item.href === "/admin"}
                      onClick={() => setIsMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                          isActive ? `bg-gradient-to-r ${item.color} text-white font-medium shadow-md` : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        }`
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </NavLink>
                  )
                })}
              </nav>
              <div className="px-3 py-4 border-t border-border/30">
                <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive gap-2" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" /> Logout
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ========= MAIN CONTENT ========= */}
      <main className="relative z-10 flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Topbar */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-border/30 bg-background/60 backdrop-blur-md sticky top-0 z-20">
          <div>
            <motion.h1
              key={location.pathname}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-lg font-bold tracking-tight text-foreground"
            >
              {currentPage.title}
            </motion.h1>
            <p className="text-xs text-muted-foreground mt-0.5">{currentPage.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2 h-8 text-xs bg-background/50 border-border/50 hover:bg-muted/50"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to App
            </Button>
            {user && (
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold shadow-md ring-2 ring-primary/20">
                {user.name?.[0]?.toUpperCase() || "A"}
              </div>
            )}
          </div>
        </header>

        {/* Page Content with animated transition */}
        <div className="flex-1 p-4 md:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  )
}
