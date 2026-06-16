import { useState, useEffect } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { Search as SearchIcon, Filter, ExternalLink, Bookmark, Loader2, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import api from "@/lib/api"
import { formatText } from "@/lib/format"
import { motion, AnimatePresence } from "framer-motion"

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

const SOURCE_META: Record<string, { label: string; cls: string }> = {
  openalex:        { label: "OpenAlex",         cls: "source-openalex" },
  semanticscholar: { label: "Semantic Scholar",  cls: "source-semanticscholar" },
  crossref:        { label: "Crossref",          cls: "source-crossref" },
  ieee:            { label: "IEEE Xplore",       cls: "source-ieee" },
  exa:             { label: "Exa Research",      cls: "source-exa" },
}

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const initialKeyword = searchParams.get("keyword") || ""
  const [keyword, setKeyword] = useState(initialKeyword)
  const [source, setSource] = useState("openalex")
  const [year, setYear] = useState("")
  const [page, setPage] = useState(1)
  const [pageInput, setPageInput] = useState("1")

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
    if (status === 429) return "Rate limit exceeded. Please try again in a moment or switch to another source."
    if (status === 504) return "External source timeout (search may take 30-90 seconds). Please refine your query or try another source."
    if (status === 403) return providerMessage || "API key inactive or rejected. Check source configuration."
    return providerMessage || "Failed to fetch results. Please try again."
  }

  const fetchResults = async (query: string, sourceOverride = source, pageNum = 1) => {
    if (!query) return
    setIsLoading(true)
    setError("")
    try {
      const params: any = { keyword: query, source: sourceOverride, page: pageNum }
      if (year) params.year = parseInt(year)
      const res = await api.get(`/sources/search`, { params })
      setPapers(res.data.papers || [])
      setTotal(res.data.total || 0)
      setPage(pageNum)
      setPageInput(pageNum.toString())
    } catch (err: any) {
      console.error(err)
      setError(getSourceErrorMessage(sourceOverride, err.response?.status, err.response?.data?.message))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (initialKeyword) fetchResults(initialKeyword, source, 1)
  }, [initialKeyword])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (keyword.trim()) navigate(`/search?keyword=${encodeURIComponent(keyword)}`)
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

  const getSourceUrl = (paper: Paper) => paper.url || getDoiUrl(paper.doi)

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
    if (!localStorage.getItem("token")) { navigate("/login"); return null }
    setSavingPaperId(paper.id)
    try {
      const res = await api.post("/papers", { paper: buildSavablePaper(paper) })
      const databasePaperId = res.data.paper?._id || res.data.paper?.id || null
      if (databasePaperId) setSavedPaperIds((current) => new Set(current).add(paper.id))
      return databasePaperId
    } catch (err: any) {
      if (err.response?.status === 401) { navigate("/login"); return null }
      if (err.response?.status === 409 && err.response?.data?.paper?._id) return err.response.data.paper._id
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
      if (err.response?.status === 401) navigate("/login")
      else setError(err.response?.data?.message || "Failed to save this paper.")
    }
  }

  const formatAuthors = (authors: PaperAuthor[], paperSource?: string) => {
    if (!authors || authors.length === 0) {
      return paperSource === "exa" ? "Authors not available from Exa" : "Unknown authors"
    }
    return authors.map((a) => a.name).join(", ")
  }

  const sourceMeta = SOURCE_META[source] ?? { label: source, cls: "" }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Search Results
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {total > 0 ? (
              <>
                <span className="font-semibold text-primary">~{total.toLocaleString()}</span>
                {" papers found for "}
                <span className="italic">"{initialKeyword}"</span>
              </>
            ) : initialKeyword ? (
              `Searching "${initialKeyword}"...`
            ) : (
              "Enter a keyword to search"
            )}
          </p>
        </div>

        <form onSubmit={handleSearch} className="w-full md:w-auto relative flex items-center gap-2">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full md:w-72 pl-9 h-10 bg-muted/30 border-border/50 rounded-xl"
              placeholder="Refine search..."
            />
          </div>
          <Button type="submit" size="sm" className="h-10 px-4 rounded-xl">
            Search
          </Button>
        </form>
      </div>

      <div className="flex gap-6">
        {/* Filter sidebar */}
        <aside className="w-60 hidden lg:flex flex-col gap-4 shrink-0">
          <div className="glass rounded-xl p-4 border border-border/40 sticky top-20">
            <div className="flex items-center gap-2 font-semibold text-sm mb-4 pb-3 border-b border-border/40">
              <Filter className="h-4 w-4 text-primary" /> Filters
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                  Source
                </label>
                <div className="relative">
                  <select
                    className="w-full text-sm rounded-lg border border-border/50 bg-muted/30 px-3 py-2 pr-8 appearance-none focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  >
                    <option value="openalex">OpenAlex</option>
                    <option value="semanticscholar">Semantic Scholar</option>
                    <option value="crossref">Crossref</option>
                    <option value="ieee">IEEE Xplore</option>
                    <option value="exa">Exa Research</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                  Year
                </label>
                <div className="relative">
                  <select
                    className="w-full text-sm rounded-lg border border-border/50 bg-muted/30 px-3 py-2 pr-8 appearance-none focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  >
                    <option value="">All Years</option>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <Button
                className="w-full h-9 rounded-lg text-sm"
                onClick={() => fetchResults(initialKeyword || keyword, source, 1)}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass rounded-xl p-5 border border-border/40 space-y-3">
                  <div className="shimmer h-5 w-3/4" />
                  <div className="shimmer h-3 w-1/2" />
                  <div className="shimmer h-3 w-full" />
                  <div className="shimmer h-3 w-5/6" />
                </div>
              ))}
              <p className="text-center text-sm text-muted-foreground pt-2">
                Searching {sourceMeta.label}... this may take 30–90 seconds.
              </p>
            </div>
          ) : error ? (
            <div className="glass rounded-xl p-6 border border-destructive/30 bg-destructive/5">
              <p className="text-destructive text-sm">{error}</p>
              {source !== "openalex" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => { setSource("openalex"); fetchResults(initialKeyword || keyword, "openalex", 1) }}
                >
                  Try OpenAlex instead
                </Button>
              )}
            </div>
          ) : papers.length === 0 && initialKeyword ? (
            <div className="text-center py-20 text-muted-foreground glass rounded-xl border border-border/40">
              <SearchIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No results found. Try adjusting your search keywords or source.</p>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }}
              className="space-y-4"
            >
              <AnimatePresence>
                {papers.map((paper) => {
                  const src = SOURCE_META[paper.source] ?? { label: paper.source, cls: "" }
                  return (
                    <motion.div
                      key={paper.id}
                      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                    >
                      <article className="glass rounded-xl border border-border/40 hover:border-primary/30 transition-all duration-300 card-hover overflow-hidden group">
                        <div className="p-5">
                          {/* Title row */}
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <button
                              onClick={() => openPaperDetails(paper)}
                              className="text-left text-base font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2"
                            >
                              {formatText(paper.title, "Untitled paper")}
                            </button>
                            <Badge
                              variant="outline"
                              className={`shrink-0 text-xs border rounded-full px-2 py-0.5 ${src.cls}`}
                            >
                              {src.label}
                            </Badge>
                          </div>

                          {/* DOI */}
                          {paper.doi && (
                            <a
                              href={getDoiUrl(paper.doi)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline block mb-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              DOI: {cleanDoi(paper.doi)}
                            </a>
                          )}

                          {/* Meta */}
                          <p className="text-xs text-muted-foreground mb-3">
                            {formatAuthors(paper.authors, paper.source)}
                            <span className="mx-1.5">·</span>
                            {paper.publicationYear || "N/A"}
                            {paper.citationCount > 0 && (
                              <>
                                <span className="mx-1.5">·</span>
                                <span className="font-medium text-foreground">{paper.citationCount.toLocaleString()}</span>
                                {" citations"}
                              </>
                            )}
                            {paper.journalName && (
                              <>
                                <span className="mx-1.5">·</span>
                                <span className="italic">{paper.journalName}</span>
                              </>
                            )}
                          </p>

                          {/* Abstract */}
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {formatText(paper.abstract, "No abstract available.")}
                          </p>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-5 py-3 border-t border-border/30 bg-muted/20">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleBookmark(paper)}
                              disabled={savingPaperId === paper.id}
                              className="h-8 px-3 text-xs gap-1.5 text-muted-foreground hover:text-primary"
                            >
                              {savingPaperId === paper.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Bookmark className="h-3.5 w-3.5" />
                              )}
                              {savedPaperIds.has(paper.id) ? "Saved" : "Save"}
                            </Button>
                            {getSourceUrl(paper) && (
                              <Button variant="ghost" size="sm" asChild className="h-8 px-3 text-xs gap-1.5 text-muted-foreground hover:text-primary">
                                <a href={getSourceUrl(paper)} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5" /> Source
                                </a>
                              </Button>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-xs text-primary hover:bg-primary/10"
                            onClick={() => openPaperDetails(paper)}
                            disabled={savingPaperId === paper.id}
                          >
                            View Details →
                          </Button>
                        </div>
                      </article>
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {/* Pagination */}
              {papers.length > 0 && total > 0 && (
                <div className="flex justify-between items-center mt-6 pt-6 border-t border-border/40">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                      fetchResults(initialKeyword || keyword, source, page - 1)
                    }}
                    disabled={page <= 1 || isLoading}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                    <span>Page</span>
                    <Input
                      type="number"
                      min={1}
                      max={Math.max(1, Math.ceil(total / 20))}
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const p = parseInt(pageInput, 10)
                          const maxPages = Math.max(1, Math.ceil(total / 20))
                          if (!isNaN(p) && p >= 1 && p <= maxPages) {
                            window.scrollTo({ top: 0, behavior: "smooth" })
                            fetchResults(initialKeyword || keyword, source, p)
                          } else {
                            setPageInput(page.toString())
                          }
                        }
                      }}
                      onBlur={() => setPageInput(page.toString())}
                      className="w-16 h-8 text-center px-1 py-1"
                    />
                    <span>of {Math.max(1, Math.ceil(total / 20))}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                      fetchResults(initialKeyword || keyword, source, page + 1)
                    }}
                    disabled={page >= Math.ceil(total / 20) || isLoading}
                  >
                    Next
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
