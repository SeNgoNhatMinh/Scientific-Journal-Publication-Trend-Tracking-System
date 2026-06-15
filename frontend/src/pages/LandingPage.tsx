import { Suspense, lazy } from "react"
import { motion } from "framer-motion"
import { Search, TrendingUp, Sparkles, Network, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"
import { useState } from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Card, CardContent } from "@/components/ui/card"

const Constellation = lazy(() => import("@/components/3d/Constellation"))

// Dummy data for Trending Topics
const trendingTopics = [
  { id: 1, title: "Federated Learning", category: "Machine Learning", growth: "+124%" },
  { id: 2, title: "Quantum Computing", category: "Physics & CS", growth: "+89%" },
  { id: 3, title: "Large Language Models", category: "Artificial Intelligence", growth: "+312%" },
  { id: 4, title: "CRISPR Cas9", category: "Biotechnology", growth: "+45%" },
  { id: 5, title: "Solid State Batteries", category: "Materials Science", growth: "+67%" },
  { id: 6, title: "Neuromorphic Computing", category: "Hardware", growth: "+110%" },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (keyword.trim()) {
      navigate(`/search?keyword=${encodeURIComponent(keyword)}`)
    }
  }

  return (
    <div className="relative flex-1 flex flex-col items-center overflow-hidden min-h-[calc(100vh-3.5rem)] pt-20 pb-16">
      {/* 3D Background */}
      <Suspense fallback={null}>
        <Constellation />
      </Suspense>

      {/* Hero Content */}
      <div className="z-10 flex flex-col items-center text-center px-4 max-w-5xl mx-auto space-y-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary mb-8 text-sm font-semibold border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.2)]">
            <Sparkles className="h-4 w-4" />
            Discover what the world is researching
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight lg:text-8xl mb-6 bg-clip-text text-transparent bg-gradient-to-br from-gray-900 via-gray-700 to-gray-500 dark:from-white dark:via-purple-200 dark:to-gray-400 drop-shadow-sm">
            Scientific Journal <br /> Publication Trends
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Track emerging topics, analyze academic growth, and find the right algorithms for your research domain with our advanced analytics engine.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          onSubmit={handleSearch}
          className="w-full max-w-2xl flex relative mt-4 group"
        >
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-16 pr-32 h-16 text-lg md:text-xl rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.05)] border-2 border-white/20 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-xl focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
            placeholder="E.g., federated learning..."
          />
          <Button 
            type="submit" 
            size="lg"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-8 h-12 text-base font-semibold shadow-lg hover:shadow-primary/25 transition-all"
          >
            Search
          </Button>
        </motion.form>

        {/* Trending Topics Carousel Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="w-full mt-16 pt-8 border-t border-border/50"
        >
          <div className="flex items-center justify-between mb-6 px-4">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Trending Topics
            </h2>
            <Button variant="ghost" className="gap-2" onClick={() => navigate('/trends')}>
              View all trends <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full px-4"
          >
            <CarouselContent className="-ml-4">
              {trendingTopics.map((topic, index) => (
                <CarouselItem key={topic.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
                    <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-md border-white/20 dark:border-white/10 overflow-hidden cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/search?keyword=${encodeURIComponent(topic.title)}`)}>
                      <CardContent className="p-6 flex flex-col justify-between h-full aspect-[2/1]">
                        <div>
                          <p className="text-xs font-medium text-primary uppercase tracking-wider mb-2">{topic.category}</p>
                          <h3 className="font-semibold text-lg line-clamp-2">{topic.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          <span className="inline-flex items-center rounded-md bg-green-500/10 px-2 py-1 text-xs font-medium text-green-500 ring-1 ring-inset ring-green-500/20">
                            {topic.growth}
                          </span>
                          <span className="text-xs text-muted-foreground">growth this year</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-4 bg-background/80 backdrop-blur-sm" />
            <CarouselNext className="hidden md:flex -right-4 bg-background/80 backdrop-blur-sm" />
          </Carousel>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-16 w-full"
        >
          <div className="group flex flex-col items-center p-8 bg-white/40 dark:bg-black/40 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 dark:border-white/10 hover:border-primary/30 transition-all duration-300">
            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-bold text-xl mb-3">Live Search</h3>
            <p className="text-muted-foreground text-center leading-relaxed">
              Instantly query millions of papers from OpenAlex, Semantic Scholar, and more.
            </p>
          </div>
          <div className="group flex flex-col items-center p-8 bg-white/40 dark:bg-black/40 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 dark:border-white/10 hover:border-primary/30 transition-all duration-300">
            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-bold text-xl mb-3">Trend Analysis</h3>
            <p className="text-muted-foreground text-center leading-relaxed">
              Track keyword growth rates, find exploding topics, and compare research interests.
            </p>
          </div>
          <div className="group flex flex-col items-center p-8 bg-white/40 dark:bg-black/40 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 dark:border-white/10 hover:border-primary/30 transition-all duration-300">
            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
              <Network className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-bold text-xl mb-3">Keyword Graphs</h3>
            <p className="text-muted-foreground text-center leading-relaxed">
              Visualize the semantic relationships between algorithms, domains, and methods.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
