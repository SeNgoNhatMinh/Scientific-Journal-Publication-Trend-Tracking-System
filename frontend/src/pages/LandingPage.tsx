import { Suspense, lazy, useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, TrendingUp, Sparkles, Network, ArrowRight, BookOpen, Zap, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"
import api from "@/lib/api"

const Constellation = lazy(() => import("@/components/3d/Constellation"))

// Color palettes for topic cards (cycled)
const TOPIC_COLORS = [
  { color: "from-violet-500/20 to-purple-500/10", badge: "text-violet-400 border-violet-500/30 bg-violet-500/10" },
  { color: "from-cyan-500/20 to-blue-500/10",    badge: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10"       },
  { color: "from-pink-500/20 to-rose-500/10",    badge: "text-pink-400 border-pink-500/30 bg-pink-500/10"       },
  { color: "from-emerald-500/20 to-green-500/10",badge: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  { color: "from-orange-500/20 to-amber-500/10", badge: "text-orange-400 border-orange-500/30 bg-orange-500/10" },
  { color: "from-blue-500/20 to-indigo-500/10",  badge: "text-blue-400 border-blue-500/30 bg-blue-500/10"       },
]

const features = [
  {
    icon: Search,
    title: "Live Search",
    description: "Instantly query millions of academic papers from OpenAlex, Semantic Scholar, Crossref, and more.",
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
  },
  {
    icon: TrendingUp,
    title: "Trend Analysis",
    description: "Track keyword growth rates, find exploding topics, and compare research interests over time.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20",
  },
  {
    icon: Network,
    title: "Keyword Graphs",
    description: "Visualize semantic relationships between algorithms, domains, and methods in 2D and 3D.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
]

const stats = [
  { value: "200M+", label: "Papers Indexed", icon: BookOpen },
  { value: "Real-time", label: "Trend Tracking", icon: Zap },
  { value: "AI-powered", label: "Research Insights", icon: Sparkles },
  { value: "5 Sources", label: "Academic Databases", icon: BarChart3 },
]

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState("")
  const [trendingTopics, setTrendingTopics] = useState<any[]>([])

  useEffect(() => {
    // Fetch top trending keywords from DB
    api.get("/trends/keyword-categories", { params: { limit: 6 } })
      .then(r => {
        const kws: any[] = r.data.keywords ?? []
        if (kws.length > 0) {
          setTrendingTopics(
            kws.slice(0, 6).map((kw: any, i: number) => ({
              id: kw.keywordId ?? kw._id ?? i,
              title: kw.name,
              category: kw.category
                ? kw.category.charAt(0).toUpperCase() + kw.category.slice(1)
                : "Research",
              growth: kw.growthRate != null
                ? `${kw.growthRate > 0 ? "+" : ""}${kw.growthRate.toFixed(0)}%`
                : `${kw.paperCount ?? 0} papers`,
              ...TOPIC_COLORS[i % TOPIC_COLORS.length],
            }))
          )
        } else {
          // Fallback to trending topics from AnalysisRun
          api.get("/trends/trending", { params: { limit: 6 } })
            .then(r2 => {
              const topics: any[] = r2.data.topics ?? r2.data.trending ?? []
              setTrendingTopics(
                topics.slice(0, 6).map((t: any, i: number) => ({
                  id: t._id ?? i,
                  title: t.name ?? t.seedKeyword ?? t.keyword ?? "Topic",
                  category: t.category ?? "Research",
                  growth: t.growthRate != null
                    ? `${t.growthRate > 0 ? "+" : ""}${t.growthRate.toFixed(0)}%`
                    : t.trendStatus ?? "Trending",
                  ...TOPIC_COLORS[i % TOPIC_COLORS.length],
                }))
              )
            })
            .catch(() => {})
        }
      })
      .catch(() => {})
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (keyword.trim()) {
      navigate(`/search?keyword=${encodeURIComponent(keyword)}`)
    }
  }

  return (
    <div className="relative flex-1 flex flex-col items-center overflow-hidden min-h-[calc(100vh-3.5rem)]">
      {/* 3D Background */}
      <Suspense fallback={null}>
        <Constellation />
      </Suspense>

      {/* Hero Section */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="z-10 flex flex-col items-center text-center px-4 max-w-5xl mx-auto w-full pt-20 pb-10"
      >
        {/* Badge */}
        <motion.div variants={itemVariants}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-8 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered scientific journal analytics
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6 leading-[1.05]"
        >
          <span className="gradient-text">Discover</span>
          <br />
          <span className="text-foreground">Research Trends</span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10"
        >
          Track emerging topics, analyze academic publication velocity, and find the next breakthrough research direction with our advanced analytics engine.
        </motion.p>

        {/* Search Bar */}
        <motion.form
          variants={itemVariants}
          onSubmit={handleSearch}
          className="w-full max-w-2xl relative group"
        >
          <div className="relative flex items-center">
            <Search className="absolute left-5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors z-10 pointer-events-none" />
            <input
              id="hero-search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-14 pr-36 h-16 text-base md:text-lg rounded-2xl border border-border/50 bg-background/60 backdrop-blur-xl focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all shadow-xl placeholder:text-muted-foreground/50"
              placeholder="e.g., federated learning, transformer models..."
            />
            <Button
              type="submit"
              size="lg"
              className="absolute right-2 rounded-xl px-6 h-12 text-sm font-semibold shadow-lg hover:shadow-primary/30 transition-all glow-primary"
            >
              Search
            </Button>
          </div>
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary/20 to-accent/20 blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity -z-10" />
        </motion.form>

        {/* Quick suggestions */}
        <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-2 mt-4">
          {["LLM", "Computer Vision", "Reinforcement Learning", "Graph Neural Networks"].map((s) => (
            <button
              key={s}
              onClick={() => navigate(`/search?keyword=${encodeURIComponent(s)}`)}
              className="text-xs px-3 py-1 rounded-full border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all backdrop-blur-sm"
            >
              {s}
            </button>
          ))}
        </motion.div>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="z-10 w-full max-w-5xl mx-auto px-4 mb-16"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map(({ value, label, icon: Icon }) => (
            <div
              key={label}
              className="glass rounded-xl p-4 flex flex-col items-center text-center border border-border/40 hover:border-primary/30 transition-colors"
            >
              <Icon className="h-5 w-5 text-primary mb-2" />
              <div className="font-bold text-lg text-foreground">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Trending Topics */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.7 }}
        className="z-10 w-full max-w-5xl mx-auto px-4 mb-16"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Trending Now
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground hover:text-primary text-sm"
            onClick={() => navigate("/trends")}
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="relative px-0 md:px-12">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            plugins={[
              Autoplay({
                delay: 3000,
              }),
            ]}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {trendingTopics.map((topic, i) => (
                <CarouselItem key={topic.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + i * 0.08, duration: 0.5 }}
                    whileHover={{ y: -4 }}
                    onClick={() => navigate(`/search?keyword=${encodeURIComponent(topic.title)}`)}
                    className={`h-full cursor-pointer glass rounded-xl p-5 border border-border/40 hover:border-primary/30 bg-gradient-to-br ${topic.color} transition-all duration-300 card-hover group`}
                  >
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-2 px-2 py-0.5 rounded-full border inline-block ${topic.badge}`}>
                      {topic.category}
                    </p>
                    <h3 className="font-semibold text-base mb-3 group-hover:text-primary transition-colors">{topic.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-emerald-400">{topic.growth}</span>
                      <span className="text-xs text-muted-foreground">publications this year</span>
                    </div>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-12" />
            <CarouselNext className="hidden md:flex -right-12" />
          </Carousel>
        </div>
      </motion.div>

      {/* Feature Grid */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.7 }}
        className="z-10 w-full max-w-5xl mx-auto px-4 pb-20"
      >
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Everything you need for{" "}
            <span className="gradient-text">research intelligence</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From raw paper searches to deep AI-powered insights, SciTrend covers every step of your research journey.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, description, color, bg }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 + i * 0.1, duration: 0.5 }}
              className="group glass rounded-2xl p-6 border border-border/40 hover:border-primary/30 transition-all duration-300 card-hover"
            >
              <div className={`h-12 w-12 rounded-xl border flex items-center justify-center mb-5 ${bg} group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
              <h3 className="font-bold text-lg mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
