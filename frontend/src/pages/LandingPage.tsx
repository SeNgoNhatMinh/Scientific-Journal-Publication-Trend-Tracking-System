import { Suspense, lazy } from "react"
import { motion } from "framer-motion"
import { Search, TrendingUp, Sparkles, Network } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"
import { useState } from "react"

const Constellation = lazy(() => import("@/components/3d/Constellation"))

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
    <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden min-h-[calc(100vh-3.5rem)]">
      {/* 3D Background */}
      <Suspense fallback={null}>
        <Constellation />
      </Suspense>

      {/* Hero Content */}
      <div className="z-10 flex flex-col items-center text-center px-4 max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-6 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Discover what the world is researching
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight lg:text-7xl mb-4 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400">
            Scientific Journal <br /> Publication Trends
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Track emerging topics, analyze academic growth, and find the right algorithms for your research domain.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          onSubmit={handleSearch}
          className="w-full max-w-xl flex relative"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-12 pr-24 h-14 text-lg rounded-full shadow-lg border-2 focus-visible:ring-primary"
            placeholder="E.g., federated learning, quantum computing..."
          />
          <Button 
            type="submit" 
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-6"
          >
            Search
          </Button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 w-full"
        >
          <div className="flex flex-col items-center p-6 bg-card rounded-xl shadow-sm border">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Live Search</h3>
            <p className="text-sm text-muted-foreground text-center">
              Instantly query millions of papers from OpenAlex, Semantic Scholar, and more.
            </p>
          </div>
          <div className="flex flex-col items-center p-6 bg-card rounded-xl shadow-sm border">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Trend Analysis</h3>
            <p className="text-sm text-muted-foreground text-center">
              Track keyword growth rates, find exploding topics, and compare research interests.
            </p>
          </div>
          <div className="flex flex-col items-center p-6 bg-card rounded-xl shadow-sm border">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Network className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Keyword Graphs</h3>
            <p className="text-sm text-muted-foreground text-center">
              Visualize the semantic relationships between algorithms, domains, and methods.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
