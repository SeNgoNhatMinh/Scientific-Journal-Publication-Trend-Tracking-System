import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Bookmark, ExternalLink, ArrowLeft, Loader2, Calendar, FileText, Bot, Upload, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import api, { getBackendAssetUrl } from "@/lib/api"
import { formatText } from "@/lib/format"

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
        // Response: { success, paper: {...} }
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
      if (err.response?.status === 401) {
        navigate("/login")
      }
    }
  }

  const getPaperTextForAi = () => {
    return formatText(paper.fullText || paper.abstract, "")
  }

  const cleanDoi = (doi?: string | null) => {
    const value = String(doi || "").trim()
    return value.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
  }

  const getDoiUrl = (doi?: string | null) => {
    const value = cleanDoi(doi)
    return value ? `https://doi.org/${value}` : ""
  }

  const getSourceUrl = () => {
    return paper?.url || getDoiUrl(paper?.doi)
  }

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

      setPaper((current: any) => ({
        ...current,
        pdfUrl: res.data.pdfUrl,
        uploadedPdf: res.data.uploadedPdf,
      }))
      setPdfMessage(
        res.data.fullTextExtracted
          ? `PDF uploaded. Extracted ${res.data.fullTextLength?.toLocaleString() || 0} characters for AI analysis.`
          : "PDF uploaded, but text extraction was not available for this file."
      )
      setPdfFile(null)
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate("/login")
        return
      }
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
      const cleanTitle = (paper.title || "paper")
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()
        .slice(0, 100)
      link.setAttribute("download", `${cleanTitle || "paper"}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error("Failed to download PDF", err)
      // Fallback to opening in new tab
      window.open(getBackendAssetUrl(paper.pdfUrl), "_blank", "noopener,noreferrer")
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  const handleAiSummary = async () => {
    const text = getPaperTextForAi()
    if (!text) {
      setAiError("This paper does not have abstract or extracted PDF text to summarize.")
      return
    }

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
    if (typeof authors[0] === 'string') return authors.join(", ")
    return authors.map((a: any) => a.name).join(", ")
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading paper details...</p>
      </div>
    )
  }

  if (error || !paper) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-4xl text-center py-20">
        <h2 className="text-2xl font-bold mb-4 text-destructive">Error</h2>
        <p className="text-muted-foreground mb-8">{error}</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 -ml-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Badge>{paper.source}</Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {paper.publicationYear || "N/A"}
            </span>
            {paper.citationCount > 0 && (
              <span className="text-sm text-muted-foreground">{paper.citationCount} citations</span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            {formatText(paper.title, "Untitled paper")}
          </h1>
          {paper.doi && (
            <a
              href={getDoiUrl(paper.doi)}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-3 block text-sm text-primary hover:underline"
            >
              DOI: {cleanDoi(paper.doi)}
            </a>
          )}
          <p className="text-lg text-muted-foreground font-medium">
            {formatAuthors(paper.authors)}
          </p>
          {paper.journalName && (
            <p className="text-sm text-muted-foreground italic mt-2">{paper.journalName}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-4 py-4 border-y">
          <Button onClick={handleBookmark}>
            <Bookmark className="h-4 w-4 mr-2" /> Save to Library
          </Button>
          {getSourceUrl() && (
            <Button variant="outline" asChild>
              <a href={getSourceUrl()} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" /> View Original Source
              </a>
            </Button>
          )}
          {paper.doi && (
            <Button variant="outline" asChild>
              <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer">
                DOI: {paper.doi}
              </a>
            </Button>
          )}
          <Button variant="secondary" onClick={handleAiSummary} disabled={isSummarizing}>
            {isSummarizing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Bot className="h-4 w-4 mr-2" />
            )}
            AI Summary
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5 text-primary" /> Research File & AI
            </CardTitle>
            <CardDescription>
              Upload the full paper PDF so the system can store it and extract text for deeper AI analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {paper.pdfUrl && (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-medium">{paper.uploadedPdf?.originalName || "PDF available"}</span>
                {paper.uploadedPdf?.textExtracted && (
                  <Badge variant="secondary">Text extracted</Badge>
                )}
                <Button variant="outline" size="sm" asChild>
                  <a href={getBackendAssetUrl(paper.pdfUrl)} target="_blank" rel="noopener noreferrer">
                    Open PDF
                  </a>
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={isDownloadingPdf}>
                  {isDownloadingPdf ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : null}
                  Download PDF
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => setPdfFile(event.target.files?.[0] || null)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
              <Button onClick={handlePdfUpload} disabled={!pdfFile || isUploadingPdf}>
                {isUploadingPdf ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload PDF
              </Button>
            </div>

            {pdfMessage && <p className="text-sm text-green-600">{pdfMessage}</p>}
            {pdfError && <p className="text-sm text-destructive">{pdfError}</p>}
          </CardContent>
        </Card>

        {(aiSummary || aiInsight || aiError) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" /> AI Reading Notes
              </CardTitle>
              <CardDescription>Generated from the abstract or extracted PDF text.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiError && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{aiError}</div>}
              {aiSummary?.summary && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Summary</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{aiSummary.summary}</p>
                </div>
              )}
              {aiSummary?.keyPoints?.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Key Points</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {aiSummary.keyPoints.map((point: string, index: number) => (
                      <li key={index}>- {point}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiInsight && (
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border p-3">
                    <h3 className="mb-1 text-sm font-semibold">Problem</h3>
                    <p className="text-sm text-muted-foreground">{aiInsight.problem || "N/A"}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <h3 className="mb-1 text-sm font-semibold">Method</h3>
                    <p className="text-sm text-muted-foreground">{aiInsight.methodology || "N/A"}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <h3 className="mb-1 text-sm font-semibold">Result</h3>
                    <p className="text-sm text-muted-foreground">{aiInsight.results || "N/A"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5" /> Abstract
          </h2>
          <div className="prose prose-stone dark:prose-invert max-w-none">
            <p className="text-lg leading-relaxed">{formatText(paper.abstract, "No abstract available.")}</p>
          </div>
        </div>

        {paper.keywords && paper.keywords.length > 0 && (
          <div className="pt-6">
            <h3 className="text-lg font-semibold mb-3">Keywords</h3>
            <div className="flex flex-wrap gap-2">
              {paper.keywords.map((kw: unknown, i: number) => {
                const keyword = formatText(kw)
                if (!keyword) return null
                return (
                  <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => navigate(`/search?keyword=${encodeURIComponent(keyword)}`)}>
                    {keyword}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
