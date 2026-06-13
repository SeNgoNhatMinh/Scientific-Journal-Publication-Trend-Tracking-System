import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { BookmarkMinus, ExternalLink, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import api from "@/lib/api"
import { formatText } from "@/lib/format"

// API: GET /papers/bookmarks → { success, total, papers: [...], pagination }

export default function LibraryPage() {
  const navigate = useNavigate()
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        const res = await api.get('/papers/bookmarks')
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
      setBookmarks(bookmarks.filter(b => (b._id || b.id) !== id))
    } catch (err) {
      console.error("Failed to remove bookmark")
    }
  }

  const filteredBookmarks = bookmarks.filter(b => {
    const q = search.toLowerCase()
    return formatText(b.title).toLowerCase().includes(q) || 
           formatText(b.abstract).toLowerCase().includes(q)
  })

  const formatAuthors = (authors: any) => {
    if (!authors || authors.length === 0) return "Unknown"
    if (typeof authors[0] === 'string') return authors.join(", ")
    return authors.map((a: any) => a.name).join(", ")
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Library</h1>
          <p className="text-muted-foreground">Manage your saved papers and reading list.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search library..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredBookmarks.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg bg-muted/20">
          <h3 className="text-lg font-medium mb-2">Your library is empty</h3>
          <p className="text-muted-foreground mb-4">Start exploring and bookmark papers you find interesting.</p>
          <Button onClick={() => navigate('/search')}>Search Papers</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredBookmarks.map((paper) => (
            <Card key={paper._id || paper.id}>
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <CardTitle 
                      className="text-xl text-primary hover:underline cursor-pointer"
                      onClick={() => navigate(`/papers/${paper._id || paper.id}`)}
                    >
                      {formatText(paper.title, "Untitled paper")}
                    </CardTitle>
                    <CardDescription className="mt-2 text-sm">
                      {formatAuthors(paper.authors)} • {paper.publicationYear || "N/A"}
                      {paper.citationCount > 0 && ` • ${paper.citationCount} citations`}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{paper.source}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {formatText(paper.abstract, "No abstract available.")}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <Button variant="ghost" size="sm" onClick={() => handleRemove(paper._id || paper.id)} className="text-destructive hover:text-destructive/90 hover:bg-destructive/10">
                  <BookmarkMinus className="h-4 w-4 mr-2" /> Remove
                </Button>
                <div className="flex gap-2">
                  {paper.url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={paper.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" /> Source
                      </a>
                    </Button>
                  )}
                  <Button size="sm" onClick={() => navigate(`/papers/${paper._id || paper.id}`)}>
                    Read More
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
