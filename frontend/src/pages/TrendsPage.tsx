import { useState, useEffect } from "react"
import { TrendingUp, BarChart2, Activity, Loader2, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import api from "@/lib/api"

// GET /trends/trending response: topics[].name, trendStatus, emergenceScore
// GET /trends/keyword response: keyword, trendStatus, averageGrowthRate (string), trends[]{year, count, growthRate}

export default function TrendsPage() {
  const [keyword, setKeyword] = useState("")
  const [trendData, setTrendData] = useState<any>(null)
  const [trendingTopics, setTrendingTopics] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isExplaining, setIsExplaining] = useState(false)
  const [aiDirections, setAiDirections] = useState<any[]>([])
  const [aiError, setAiError] = useState("")
  
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await api.get('/trends/trending')
        // Response: { success, source, topics: [{name, trendStatus, ...}] }
        setTrendingTopics(res.data.topics || [])
      } catch (err) {
        console.error("Failed to fetch trending topics", err)
        setTrendingTopics([])
      }
    }
    fetchTrending()
  }, [])

  const analyzeTrend = async (kw: string) => {
    if (!kw) return
    setIsLoading(true)
    setError("")
    try {
      // API: GET /trends/keyword?keyword=...
      const res = await api.get(`/trends/keyword`, { params: { keyword: kw } })
      // Response: { success, keyword, trendStatus, averageGrowthRate, source, trends: [{year,count,growthRate}] }
      setTrendData(res.data)
      setAiDirections([])
      setAiError("")
    } catch (err: any) {
      console.error(err)
      if (err.response?.status === 504) {
        setError("External API timeout. The source may be slow — please try again.")
      } else if (err.response?.status === 429) {
        setError("Rate limit exceeded. Please wait a moment and try again.")
      } else {
        setError(err.response?.data?.message || "Failed to analyze keyword trend.")
      }
      setTrendData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    analyzeTrend(keyword)
  }

  const explainTrend = async () => {
    if (!trendData?.keyword) return
    setIsExplaining(true)
    setAiError("")
    try {
      const relatedKeywords = [
        trendData.keyword,
        ...(trendingTopics || []).slice(0, 8).map((topic) => topic.name || topic),
      ].filter(Boolean)

      const res = await api.post("/ai/recommendations/research-directions", {
        keywords: Array.from(new Set(relatedKeywords)),
      })
      setAiDirections(res.data.directions || [])
    } catch (err: any) {
      setAiError(err.response?.data?.message || "AI service is currently unavailable.")
    } finally {
      setIsExplaining(false)
    }
  }

  const getTrendColor = (status: string) => {
    switch (status) {
      case 'exploding': return 'text-red-600'
      case 'growing': return 'text-green-600'
      case 'stable': return 'text-yellow-600'
      case 'declining': return 'text-gray-500'
      default: return 'text-muted-foreground'
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Global Research Trends</h1>
        <p className="text-muted-foreground">Analyze publication velocity and predict emerging topics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Keyword Growth Analysis
            </CardTitle>
            <CardDescription>Enter a research keyword to see its publication volume over time.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-2 mb-8">
              <Input 
                placeholder="e.g., Transformer Models" 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
              </Button>
            </form>

            {error && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-4">
                {error}
              </div>
            )}

            {trendData ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg">
                  <div>
                    <h3 className="text-lg font-semibold">{trendData.keyword}</h3>
                    <p className="text-sm text-muted-foreground">
                      Source: {trendData.source} • Status: <span className={`font-semibold capitalize ${getTrendColor(trendData.trendStatus)}`}>{trendData.trendStatus}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getTrendColor(trendData.trendStatus)}`}>
                      {trendData.averageGrowthRate}%
                    </div>
                    <p className="text-sm text-muted-foreground">Avg Growth Rate</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                  <div>
                    <h3 className="text-sm font-semibold">AI Trend Explanation</h3>
                    <p className="text-sm text-muted-foreground">
                      Generate research directions from this keyword and nearby trending topics.
                    </p>
                  </div>
                  <Button variant="secondary" onClick={explainTrend} disabled={isExplaining}>
                    {isExplaining ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Explain Trend
                  </Button>
                </div>
                {aiError && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    {aiError}
                  </div>
                )}
                {aiDirections.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {aiDirections.map((direction, index) => (
                      <div key={index} className="rounded-lg border p-4">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <h3 className="font-semibold">{direction.direction}</h3>
                          {direction.priority !== undefined && (
                            <Badge variant="secondary">Priority {Math.round(direction.priority * 100)}%</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{direction.rationale}</p>
                        {direction.keywords?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {direction.keywords.map((item: string) => (
                              <Badge key={item} variant="outline">{item}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData.trends}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip formatter={(value: any, name: any) => {
                        if (name === 'count') return [value.toLocaleString(), 'Publications']
                        if (name === 'growthRate') return [`${value}%`, 'Growth']
                        return [value, name || 'Value']
                      }} />
                      <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : !error && (
              <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Search for a keyword to view its trend chart.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-orange-500" /> Hot Topics Now
              </CardTitle>
              <CardDescription>Topics with exploding or growing trend status from corpus.</CardDescription>
            </CardHeader>
            <CardContent>
              {trendingTopics.length === 0 ? (
                <p className="text-sm text-muted-foreground">No trending topics yet. Run a corpus analysis first.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {trendingTopics.map((topic, i) => (
                    <Badge 
                      key={i} 
                      variant="secondary" 
                      className="cursor-pointer hover:bg-primary/20"
                      onClick={() => { setKeyword(topic.name || topic); analyzeTrend(topic.name || topic) }}
                    >
                      {topic.name || topic}
                      {topic.trendStatus && <span className="ml-1 opacity-60">({topic.trendStatus})</span>}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart2 className="h-5 w-5 text-blue-500" /> Compare Keywords
              </CardTitle>
              <CardDescription>Compare multiple keyword trends side by side.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled>Open Comparison Tool</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
