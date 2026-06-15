import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { BookmarkMinus, ExternalLink, Library, Search, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import api from "@/lib/api"
import { formatText } from "@/lib/format"
import { motion, AnimatePresence } from "framer-motion"

// API: GET /papers/bookmarks → { success, total, papers: [...], pagination }

const SOURCE_COLORS: Record<string, string> = {
  openalex: "source-openalex",
  semanticscholar: "source-semanticscholar",
  crossref: "source-crossref",
  ieee: "source-ieee",
  exa: "source-exa",
}

export default function LibraryPage() {
  const navigate = useNavigate()
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        const res = await api.get("/papers/bookmarks")
        setBookmarks(res.data.papers || [])
      } catch (err: any) {
        console.error("Failed to fetch bookmarks", err)
        setBookmarks([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchBookmarks()
  }, [])

  const handleRemove = async (id: string) => {
    try {
      // Toggle bookmark off (same endpoint POST acts as toggle)
      await api.post(`/papers/${id}/bookmark`)
      setBookmarks(bookmarks.filter((b) => (b._id || b.id) !== id))
    } catch {
      console.error("Failed to remove bookmark")
    }
  }

  const filteredBookmarks = bookmarks.filter((b) => {
    const q = search.toLowerCase()
    return (
      formatText(b.title).toLowerCase().includes(q) ||
      formatText(b.abstract).toLowerCase().includes(q)
    )
  })

  const formatAuthors = (authors: any) => {
    if (!authors || authors.length === 0) return "Unknown"
    if (typeof authors[0] === "string") return authors.join(", ")
    return authors.map((a: any) => a.name).join(", ")
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Library className="h-7 w-7 text-primary" />
            My Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {bookmarks.length > 0 ? `${bookmarks.length} saved paper${bookmarks.length !== 1 ? "s" : ""}` : "Manage your saved papers and reading list."}
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="library-search"
            placeholder="Search saved papers..."
            className="pl-9 h-10 bg-muted/30 border-border/50 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </motion.div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl border border-border/40 p-5 space-y-3">
              <div className="shimmer h-5 w-3/4" />
              <div className="shimmer h-3 w-1/2" />
              <div className="shimmer h-3 w-full" />
            </div>
          ))}
        </div>
      ) : filteredBookmarks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24 glass rounded-2xl border border-dashed border-border/50"
        >
          <FileText className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-base font-semibold mb-2">
            {search ? "No matching papers" : "Your library is empty"}
          </h3>
          <p className="text-sm text-muted-foreground mb-5">
            {search
              ? "Try different search terms."
              : "Start exploring and bookmark papers you find interesting."}
          </p>
          {!search && (
            <Button onClick={() => navigate("/search")} className="rounded-xl gap-2">
              Search Papers
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }}
          className="space-y-4"
        >
          <AnimatePresence>
            {filteredBookmarks.map((paper) => {
              const paperId = paper._id || paper.id
              const srcCls = SOURCE_COLORS[paper.source] ?? ""
              return (
                <motion.div
                  key={paperId}
                  variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <article className="glass rounded-2xl border border-border/40 hover:border-primary/30 transition-all duration-300 card-hover overflow-hidden group">
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <button
                          onClick={() => navigate(`/papers/${paperId}`)}
                          className="text-left text-base font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2"
                        >
                          {formatText(paper.title, "Untitled paper")}
                        </button>
                        {paper.source && (
                          <Badge
                            variant="outline"
                            className={`shrink-0 text-xs border rounded-full px-2 py-0.5 capitalize ${srcCls}`}
                          >
                            {paper.source}
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mb-3">
                        {formatAuthors(paper.authors)}
                        <span className="mx-1.5">·</span>
                        {paper.publicationYear || "N/A"}
                        {paper.citationCount > 0 && (
                          <>
                            <span className="mx-1.5">·</span>
                            <span className="font-medium text-foreground">{paper.citationCount.toLocaleString()}</span>
                            {" citations"}
                          </>
                        )}
                      </p>

                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {formatText(paper.abstract, "No abstract available.")}
                      </p>
                    </div>

                    <div className="flex items-center justify-between px-5 py-3 border-t border-border/30 bg-muted/20">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(paperId)}
                        className="h-8 px-3 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <BookmarkMinus className="h-3.5 w-3.5" /> Remove
                      </Button>
                      <div className="flex gap-2">
                        {paper.url && (
                          <Button variant="ghost" size="sm" asChild className="h-8 px-3 text-xs gap-1.5 text-muted-foreground hover:text-primary">
                            <a href={paper.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" /> Source
                            </a>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-3 text-xs text-primary hover:bg-primary/10"
                          onClick={() => navigate(`/papers/${paperId}`)}
                        >
                          Read More →
                        </Button>
                      </div>
                    </div>
                  </article>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
