import { Link, useLocation, useNavigate } from "react-router-dom"
import { Search, Bell, User, BookOpen, TrendingUp, Brain, Database, Library, LayoutDashboard, X, Menu, Sun, Moon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { motion, AnimatePresence } from "framer-motion"

const navLinks = [
  { to: "/trends", label: "Trends", icon: TrendingUp },
  { to: "/insights", label: "Insights", icon: Brain },
]

const protectedLinks = [
  { to: "/corpus", label: "Corpus", icon: Database },
  { to: "/workspaces", label: "Workspaces", icon: LayoutDashboard },
  { to: "/library", label: "Library", icon: Library },
]

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState("")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  )

  const toggleTheme = () => {
    const html = document.documentElement
    if (isDark) {
      html.classList.remove("dark")
      localStorage.setItem("theme", "light")
    } else {
      html.classList.add("dark")
      localStorage.setItem("theme", "dark")
    }
    setIsDark(!isDark)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?keyword=${encodeURIComponent(searchQuery)}`)
      setMobileOpen(false)
    }
  }

  const token = localStorage.getItem("token")
  const isLoggedIn = !!token

  const handleLogout = () => {
    localStorage.removeItem("token")
    navigate("/login")
  }

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/")

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 glass-strong">
      <div className="flex h-14 w-full items-center gap-3 px-4 md:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0 group">
          <div className="relative h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/40 transition-colors">
            <BookOpen className="h-4 w-4 text-primary" />
            <div className="absolute inset-0 rounded-lg bg-primary/10 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="hidden md:block font-bold text-lg tracking-tight gradient-text">
            SciTrend
          </span>
        </Link>

        {/* Search bar — desktop */}
        <div className="flex-1 max-w-md mx-auto hidden md:flex">
          <form onSubmit={handleSearch} className="w-full relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              type="search"
              placeholder="Search papers, topics, algorithms..."
              className="w-full pl-9 pr-4 h-9 text-sm bg-muted/40 dark:bg-muted/20 border-border/50 focus-visible:border-primary/50 focus-visible:bg-background/80 rounded-full transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-1 ml-2">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`text-sm font-medium px-3 py-1.5 rounded-md transition-all duration-200 ${
                isActive(to)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {label}
            </Link>
          ))}
          {isLoggedIn &&
            protectedLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`text-sm font-medium px-3 py-1.5 rounded-md transition-all duration-200 ${
                  isActive(to)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {label}
              </Link>
            ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto md:ml-2">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            id="theme-toggle-btn"
            className="h-8 w-8 rounded-lg"
            onClick={toggleTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-yellow-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-600" />
            )}
          </Button>
          {isLoggedIn ? (
            <>
              <Button variant="ghost" size="icon" className="relative h-8 w-8 hidden sm:flex">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger className="relative inline-flex h-8 w-8 items-center justify-center rounded-full outline-none ring-2 ring-transparent hover:ring-primary/40 transition-all">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 glass" align="end">
                  <DropdownMenuLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    My Account
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/library")} className="gap-2 cursor-pointer">
                    <Library className="h-4 w-4" /> Library
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/workspaces")} className="gap-2 cursor-pointer">
                    <LayoutDashboard className="h-4 w-4" /> Workspaces
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/login")}
                className="hidden sm:inline-flex text-sm"
              >
                Log in
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/register")}
                className="text-sm glow-primary"
              >
                Sign up
              </Button>
            </>
          )}

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl px-4 pb-4 overflow-hidden"
          >
            <form onSubmit={handleSearch} className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search papers..."
                className="w-full pl-9 h-10 bg-muted/40 rounded-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
            <nav className="mt-3 flex flex-col gap-1">
              {[...navLinks, ...(isLoggedIn ? protectedLinks : [])].map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(to)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              ))}
              {!isLoggedIn && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-border/40">
                  <Button variant="outline" className="flex-1" onClick={() => { navigate("/login"); setMobileOpen(false) }}>Log in</Button>
                  <Button className="flex-1" onClick={() => { navigate("/register"); setMobileOpen(false) }}>Sign up</Button>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
