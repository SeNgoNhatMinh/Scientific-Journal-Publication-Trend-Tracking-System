import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Bookmark, ExternalLink, ArrowLeft, Loader2, Calendar, Quote, Bot, Upload, Sparkles, FileText, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import api, { getBackendAssetUrl } from "@/lib/api"
import { formatText } from "@/lib/format"
import { motion } from "framer-motion"

// API: GET /papers/{paperId} → { success, paper: { _id, title, abstract, authors, publicationYear, citationCount, ... } }

export default function PaperPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [paper, setPaper] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [isUploadingPdf, setIsUploadingPdf] = useState(false)
  const [pdfMessage, setPdfMessage] = useState("")
  const [pdfError, setPdfError] = useState("")
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [aiSummary, setAiSummary] = useState<any>(null)
  const [aiInsight, setAiInsight] = useState<any>(null)
  const [aiError, setAiError] = useState("")
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

  useEffect(() => {
    const fetchPaper = async () => {
      if (!id) return
      setIsLoading(true)
      try {
        const res = await api.get(`/papers/${id}`)
        setPaper(res.data.paper || res.data)
      } catch (err: any) {
        console.error(err)
        if (err.response?.status === 404) {
          setError("Paper not found in database. It may need to be ingested via corpus or saved from search first.")
        } else {
          setError(err.response?.data?.message || "Failed to load paper details.")
        }
      } finally {
        setIsLoading(false)
      }
    }
    fetchPaper()
  }, [id])

  const handleBookmark = async () => {
    try {
      await api.post(`/papers/${id}/bookmark`)
    } catch (err: any) {
      if (err.response?.status === 401) navigate("/login")
    }
  }

  const getPaperTextForAi = () => formatText(paper.fullText || paper.abstract, "")

  const cleanDoi = (doi?: string | null) => String(doi || "").trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
  const getDoiUrl = (doi?: string | null) => { const v = cleanDoi(doi); return v ? `https://doi.org/${v}` : "" }
  const getSourceUrl = () => paper?.url || getDoiUrl(paper?.doi)

  const handlePdfUpload = async () => {
    if (!id || !pdfFile) return
    setIsUploadingPdf(true)
    setPdfMessage("")
    setPdfError("")
    try {
      const formData = new FormData()
      formData.append("pdf", pdfFile)
      const res = await api.post(`/papers/${id}/pdf`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      setPaper((current: any) => ({ ...current, pdfUrl: res.data.pdfUrl, uploadedPdf: res.data.uploadedPdf }))
      setPdfMessage(
        res.data.fullTextExtracted
          ? `PDF uploaded. Extracted ${res.data.fullTextLength?.toLocaleString() || 0} characters for AI analysis.`
          : "PDF uploaded, but text extraction was not available for this file."
      )
      setPdfFile(null)
    } catch (err: any) {
      if (err.response?.status === 401) { navigate("/login"); return }
      setPdfError(err.response?.data?.message || "Failed to upload PDF.")
    } finally {
      setIsUploadingPdf(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!paper?.pdfUrl) return
    setIsDownloadingPdf(true)
    setPdfError("")
    try {
      const fileUrl = getBackendAssetUrl(paper.pdfUrl)
      const response = await fetch(fileUrl)
      if (!response.ok) throw new Error("Network response was not ok")
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      const cleanTitle = (paper.title || "paper").replace(/[^a-z0-9]/gi, "_").toLowerCase().slice(0, 100)
      link.setAttribute("download", `${cleanTitle || "paper"}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch {
      window.open(getBackendAssetUrl(paper.pdfUrl), "_blank", "noopener,noreferrer")
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  const handleAiSummary = async () => {
    const text = getPaperTextForAi()
    if (!text) { setAiError("This paper does not have abstract or extracted PDF text to summarize."); return }
    setIsSummarizing(true)
    setAiError("")
    try {
      const trimmedText = text.slice(0, 8000)
      const [summaryRes, insightRes] = await Promise.all([
        api.post("/ai/summarization/abstract", { abstract: trimmedText, maxLength: 500 }),
        api.post("/ai/summarization/extract-problem", { abstract: trimmedText }),
      ])
      setAiSummary(summaryRes.data)
      setAiInsight(insightRes.data)
    } catch (err: any) {
      setAiError(err.response?.data?.message || "AI service is currently unavailable.")
    } finally {
      setIsSummarizing(false)
    }
  }

  const formatAuthors = (authors: any) => {
    if (!authors || authors.length === 0) return "Unknown"
    if (typeof authors[0] === "string") return authors.join(", ")
    return authors.map((a: any) => a.name).join(", ")
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="h-12 w-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading paper details...</p>
      </div>
    )
  }

  if (error || !paper) {
    return (
      <div className="container mx-auto p-8 max-w-2xl text-center py-24">
        <div className="glass rounded-2xl border border-border/40 p-10">
          <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-destructive">Paper not found</h2>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => navigate(-1)} variant="outline" className="rounded-xl">
            <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="container mx-auto p-4 md:p-8 max-w-4xl"
    >
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-6 -ml-3 text-muted-foreground hover:text-foreground gap-2 rounded-xl"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {paper.source && (
              <Badge variant="outline" className="rounded-full text-xs capitalize">
                {paper.source}
              </Badge>
            )}
            {paper.publicationYear && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {paper.publicationYear}
              </span>
            )}
            {paper.citationCount > 0 && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Quote className="h-3.5 w-3.5" />
                {paper.citationCount.toLocaleString()} citations
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight mb-3">
            {formatText(paper.title, "Untitled paper")}
          </h1>

          {paper.doi && (
            <a
              href={getDoiUrl(paper.doi)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline block mb-3"
            >
              DOI: {cleanDoi(paper.doi)}
            </a>
          )}

          <p className="text-base text-muted-foreground font-medium">{formatAuthors(paper.authors)}</p>
          {paper.journalName && (
            <p className="text-sm text-muted-foreground italic mt-1">{paper.journalName}</p>
          )}
        </div>

        {/* Actions row */}
        <div className="flex flex-wrap gap-3 py-4 border-y border-border/40">
          <Button onClick={handleBookmark} className="gap-2 rounded-xl">
            <Bookmark className="h-4 w-4" /> Save to Library
          </Button>
          {getSourceUrl() && (
            <Button variant="outline" asChild className="rounded-xl gap-2">
              <a href={getSourceUrl()} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" /> View Source
              </a>
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={handleAiSummary}
            disabled={isSummarizing}
            className="gap-2 rounded-xl"
          >
            {isSummarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            AI Summary
          </Button>
        </div>

        {/* PDF & AI Card */}
        <div className="glass rounded-2xl border border-border/40 p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-0.5">
              <Upload className="h-4 w-4 text-primary" /> Research File & AI
            </h2>
            <p className="text-xs text-muted-foreground">
              Upload the full paper PDF so the system can store it and extract text for deeper AI analysis.
            </p>
          </div>

          {paper.pdfUrl && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/30 bg-muted/20 p-3 text-sm">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-medium">{paper.uploadedPdf?.originalName || "PDF available"}</span>
              {paper.uploadedPdf?.textExtracted && (
                <Badge variant="secondary" className="text-xs">Text extracted</Badge>
              )}
              <Button variant="outline" size="sm" asChild className="rounded-lg">
                <a href={getBackendAssetUrl(paper.pdfUrl)} target="_blank" rel="noopener noreferrer">
                  Open PDF
                </a>
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={isDownloadingPdf} className="rounded-lg">
                {isDownloadingPdf ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                Download
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setPdfFile(event.target.files?.[0] || null)}
              className="flex-1 text-sm rounded-xl border border-border/50 bg-muted/30 px-3 py-2 cursor-pointer file:mr-2 file:text-xs file:font-medium file:border-0 file:bg-primary/10 file:text-primary file:rounded-lg file:px-2 file:py-1"
            />
            <Button
              onClick={handlePdfUpload}
              disabled={!pdfFile || isUploadingPdf}
              className="rounded-xl gap-2"
            >
              {isUploadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload PDF
            </Button>
          </div>

          {pdfMessage && <p className="text-xs text-emerald-500">{pdfMessage}</p>}
          {pdfError && <p className="text-xs text-destructive">{pdfError}</p>}
        </div>

        {/* AI Reading Notes */}
        {(aiSummary || aiInsight || aiError) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl border border-primary/20 p-5 space-y-4"
          >
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI Reading Notes
            </h2>

            {aiError && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {aiError}
              </div>
            )}

            {aiSummary?.summary && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Summary</h3>
                <p className="text-sm leading-relaxed">{aiSummary.summary}</p>
              </div>
            )}

            {aiSummary?.keyPoints?.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Key Points</h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {aiSummary.keyPoints.map((point: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/50 mt-1.5 shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiInsight && (
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Problem", value: aiInsight.problem },
                  { label: "Method", value: aiInsight.methodology },
                  { label: "Result", value: aiInsight.results },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-border/40 bg-muted/20 p-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</h3>
                    <p className="text-sm">{value || "N/A"}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Abstract */}
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <FileText className="h-5 w-5 text-primary" /> Abstract
          </h2>
          <div className="glass rounded-2xl border border-border/40 p-6">
            <p className="text-base leading-relaxed text-muted-foreground">
              {formatText(paper.abstract, "No abstract available.")}
            </p>
          </div>
        </div>

        {/* Keywords */}
        {paper.keywords && paper.keywords.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Tag className="h-4 w-4 text-primary" /> Keywords
            </h3>
            <div className="flex flex-wrap gap-2">
              {paper.keywords.map((kw: unknown, i: number) => {
                const keyword = formatText(kw)
                if (!keyword) return null
                return (
                  <button
                    key={i}
                    onClick={() => navigate(`/search?keyword=${encodeURIComponent(keyword)}`)}
                    className="text-xs px-3 py-1 rounded-full border border-border/50 bg-muted/30 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    {keyword}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
