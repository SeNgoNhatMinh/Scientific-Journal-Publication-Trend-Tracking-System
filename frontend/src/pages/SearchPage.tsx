import { useState, useEffect } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { Search as SearchIcon, Filter, ExternalLink, Bookmark, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import api from "@/lib/api"
import { formatText } from "@/lib/format"

// Matches GET /sources/search response shape
interface PaperAuthor {
  authorId?: string
  name: string
}

interface Paper {
  id: string
  title: unknown
  abstract: unknown
  authors: PaperAuthor[]
  publishedDate: string
  publicationYear: number | null
  citationCount: number
  doi: string | null
  journalName: string | null
  url: string
  source: string
}

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const initialKeyword = searchParams.get("keyword") || ""
  const [keyword, setKeyword] = useState(initialKeyword)
  const [source, setSource] = useState("openalex")
  const [year, setYear] = useState("")
  
  const [papers, setPapers] = useState<Paper[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [savingPaperId, setSavingPaperId] = useState<string | null>(null)
  const [savedPaperIds, setSavedPaperIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState("")

  const getSourceErrorMessage = (
    selectedSource: string,
    status?: number,
    providerMessage?: string
  ) => {
    if (status === 429 && selectedSource === "semanticscholar") {
      return "Semantic Scholar is rate-limiting requests. Wait 1-2 minutes or switch to OpenAlex for a more stable demo."
    }
    if (status === 403 && selectedSource === "ieee") {
      return providerMessage || "IEEE Xplore rejected this key/account. Activate the IEEE developer account/key before using this source."
    }
    if (selectedSource === "exa" && (status === 401 || status === 403 || status === 429)) {
      return providerMessage || "Exa Research search is unavailable right now. Check the Exa API key/quota or switch to OpenAlex."
    }
    if (status === 429) {
      return "Rate limit exceeded. Please try again in a moment or switch to another source."
    }
    if (status === 504) {
      return "External source timeout (search may take 30-90 seconds). Please refine your query or try another source."
    }
    if (status === 403) {
      return providerMessage || "API key inactive or rejected. Check source configuration."
    }
    return providerMessage || "Failed to fetch results. Please try again."
  }

  const fetchResults = async (query: string, sourceOverride = source) => {
    if (!query) return
    setIsLoading(true)
    setError("")
    try {
      const params: any = { keyword: query, source: sourceOverride }
      if (year) params.year = parseInt(year)
      const res = await api.get(`/sources/search`, { params })
      setPapers(res.data.papers || [])
      setTotal(res.data.total || 0)
    } catch (err: any) {
      console.error(err)
      setError(getSourceErrorMessage(sourceOverride, err.response?.status, err.response?.data?.message))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (initialKeyword) {
      fetchResults(initialKeyword)
    }
  }, [initialKeyword])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (keyword.trim()) {
      navigate(`/search?keyword=${encodeURIComponent(keyword)}`)
    }
  }

  const isMongoObjectId = (value: string) => /^[a-f\d]{24}$/i.test(value)

  const toBackendSource = (paperSource: string) => {
    if (paperSource === "semanticscholar") return "semantic_scholar"
    return paperSource
  }

  const cleanDoi = (doi?: string | null) => {
    const value = String(doi || "").trim()
    return value.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
  }

  const getDoiUrl = (doi?: string | null) => {
    const value = cleanDoi(doi)
    return value ? `https://doi.org/${value}` : ""
  }

  const getSourceUrl = (paper: Paper) => {
    return paper.url || getDoiUrl(paper.doi)
  }

  const getSourceLabel = (paperSource: string) => {
    if (paperSource === "exa") return "Exa Research"
    if (paperSource === "semanticscholar") return "Semantic Scholar"
    if (paperSource === "ieee") return "IEEE Xplore"
    if (paperSource === "openalex") return "OpenAlex"
    if (paperSource === "crossref") return "Crossref"
    return paperSource
  }

  const buildSavablePaper = (paper: Paper) => {
    const normalizedSource = toBackendSource(paper.source)
    const externalIds: Record<string, string> = {}

    if (paper.id) {
      if (paper.source === "openalex") externalIds.openalex = paper.id
      if (paper.source === "semanticscholar") externalIds.semanticScholar = paper.id
      if (paper.source === "crossref") externalIds.crossref = paper.id
      if (paper.source === "ieee") externalIds.ieee = paper.id
      if (paper.source === "exa") externalIds.exa = paper.id
    }

    return {
      title: formatText(paper.title, "Untitled paper"),
      abstract: formatText(paper.abstract, "").slice(0, 5000),
      doi: cleanDoi(paper.doi) || undefined,
      publishedDate: paper.publishedDate || undefined,
      publicationYear: paper.publicationYear || undefined,
      citationCount: paper.citationCount || 0,
      authors: (paper.authors || []).map((author, index) => ({
        name: author.name || "Unknown",
        externalId: author.authorId || undefined,
        order: index + 1,
      })),
      journalName: paper.journalName || undefined,
      source: normalizedSource,
      url: paper.url || undefined,
      externalIds,
    }
  }

  const ensurePaperInDatabase = async (paper: Paper) => {
    if (paper.id && isMongoObjectId(paper.id)) return paper.id

    if (!localStorage.getItem("token")) {
      navigate("/login")
      return null
    }

    setSavingPaperId(paper.id)
    try {
      const res = await api.post("/papers", { paper: buildSavablePaper(paper) })
      const databasePaperId = res.data.paper?._id || res.data.paper?.id || null
      if (databasePaperId) {
        setSavedPaperIds((current) => new Set(current).add(paper.id))
      }
      return databasePaperId
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate("/login")
        return null
      }
      if (err.response?.status === 409 && err.response?.data?.paper?._id) {
        return err.response.data.paper._id
      }
      setError(err.response?.data?.message || "Could not save this paper before opening details.")
      return null
    } finally {
      setSavingPaperId(null)
    }
  }

  const openPaperDetails = async (paper: Paper) => {
    const databasePaperId = await ensurePaperInDatabase(paper)
    if (databasePaperId) navigate(`/papers/${databasePaperId}`)
  }

  const handleBookmark = async (paper: Paper) => {
    try {
      const databasePaperId = await ensurePaperInDatabase(paper)
      if (!databasePaperId) return
      await api.post(`/papers/${databasePaperId}/bookmark`)
      setSavedPaperIds((current) => new Set(current).add(paper.id))
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate("/login")
      } else {
        setError(err.response?.data?.message || "Failed to save this paper.")
      }
    }
  }

  const formatAuthors = (authors: PaperAuthor[], paperSource?: string) => {
    if (!authors || authors.length === 0) {
      return paperSource === "exa" ? "Authors not available from Exa" : "Unknown authors"
    }
    return authors.map(a => a.name).join(", ")
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl flex flex-col gap-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Search Results</h1>
          <p className="text-muted-foreground">
            {total > 0 ? `~${total.toLocaleString()} papers found` : "0 papers found"} for "{initialKeyword}"
          </p>
        </div>
        
        <form onSubmit={handleSearch} className="w-full md:w-auto relative flex items-center">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full md:w-80 pr-10"
            placeholder="Search again..."
          />
          <Button type="submit" size="icon" variant="ghost" className="absolute right-0">
            <SearchIcon className="h-4 w-4" />
          </Button>
        </form>
      </div>

      <div className="flex gap-6">
        {/* Filters Sidebar */}
        <div className="w-64 hidden lg:block space-y-6">
          <div className="flex items-center gap-2 font-semibold pb-2 border-b">
            <Filter className="h-4 w-4" /> Filters
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Source</h3>
              <select 
                className="w-full text-sm border rounded p-2 bg-background"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="openalex">OpenAlex</option>
                <option value="semanticscholar">Semantic Scholar</option>
                <option value="crossref">Crossref</option>
                <option value="ieee">IEEE Xplore</option>
                <option value="exa">Exa Research</option>
              </select>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Year</h3>
              <select 
                className="w-full text-sm border rounded p-2 bg-background"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                <option value="">All Years</option>
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <Button variant="outline" className="w-full" onClick={() => fetchResults(initialKeyword)}>
              Apply Filters
            </Button>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Searching {source}... this may take 30–90 seconds.</p>
            </div>
          ) : error ? (
            <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
              <p>{error}</p>
              {source !== "openalex" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 border-destructive/30 bg-background text-foreground hover:bg-muted"
                  onClick={() => {
                    setSource("openalex")
                    fetchResults(initialKeyword || keyword, "openalex")
                  }}
                >
                  Try OpenAlex
                </Button>
              )}
            </div>
          ) : papers.length === 0 && initialKeyword ? (
            <div className="text-center py-20 text-muted-foreground">
              No results found. Try adjusting your search keywords or source.
            </div>
          ) : (
            papers.map((paper) => (
              <Card key={paper.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <CardTitle className="text-xl text-primary hover:underline cursor-pointer" onClick={() => openPaperDetails(paper)}>
                        {formatText(paper.title, "Untitled paper")}
                      </CardTitle>
                      {paper.doi && (
                        <a
                          href={getDoiUrl(paper.doi)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block text-xs text-primary hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          DOI: {cleanDoi(paper.doi)}
                        </a>
                      )}
                      <CardDescription className="mt-2 text-sm">
                        {formatAuthors(paper.authors, paper.source)} • {paper.publicationYear || "N/A"}
                        {paper.citationCount > 0 && ` • ${paper.citationCount} citations`}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{getSourceLabel(paper.source)}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {formatText(paper.abstract, "No abstract available.")}
                  </p>
                  {paper.journalName && (
                    <p className="text-xs text-muted-foreground mt-2 italic">{paper.journalName}</p>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleBookmark(paper)} disabled={savingPaperId === paper.id}>
                      {savingPaperId === paper.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Bookmark className="h-4 w-4 mr-2" />
                      )}
                      {savedPaperIds.has(paper.id) ? "Saved" : "Save"}
                    </Button>
                    {getSourceUrl(paper) && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={getSourceUrl(paper)} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" /> Source
                        </a>
                      </Button>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openPaperDetails(paper)} disabled={savingPaperId === paper.id}>
                    {savingPaperId === paper.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
