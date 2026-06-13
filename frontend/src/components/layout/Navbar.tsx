import { Link, useNavigate } from "react-router-dom"
import { Search, Bell, User, BookOpen } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function Navbar() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?keyword=${encodeURIComponent(searchQuery)}`)
    }
  }

  const token = localStorage.getItem("token")
  const isLoggedIn = !!token

  const handleLogout = () => {
    localStorage.removeItem("token")
    navigate("/login")
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 w-full items-center gap-4 px-4">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="hidden md:inline-block">SciTrend</span>
          </Link>
        </div>

        <div className="flex-1 max-w-2xl mx-auto flex items-center justify-center">
          <form onSubmit={handleSearch} className="w-full relative max-w-md hidden md:flex items-center">
            <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search academic papers..."
              className="w-full pl-9 bg-muted/50 focus-visible:bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/trends" className="text-sm font-medium hover:text-primary hidden sm:block">
            Trends
          </Link>
          <Link to="/insights" className="text-sm font-medium hover:text-primary hidden sm:block">
            Insights
          </Link>

          {isLoggedIn ? (
            <>
              <Link to="/corpus" className="text-sm font-medium hover:text-primary hidden sm:block">
                Corpus
              </Link>
              <Link to="/workspaces" className="text-sm font-medium hover:text-primary hidden sm:block">
                Workspaces
              </Link>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-red-600"></span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger className="relative inline-flex h-8 w-8 items-center justify-center rounded-full outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">User</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/library")}>
                    Library
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/workspaces")}>
                    My Workspaces
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate("/login")} className="hidden sm:inline-flex">
                Log in
              </Button>
              <Button onClick={() => navigate("/register")}>Sign up</Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
