import { useState } from "react"
import { useLocation, useNavigate, Link } from "react-router-dom"
import { Loader2, BookOpen, Sparkles, Lock, Mail, User, Building2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import api from "@/lib/api"
import { motion } from "framer-motion"

export default function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const isLogin = location.pathname === "/login"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState("student")
  const [institution, setInstitution] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register"
      const payload = isLogin ? { email, password } : { email, password, name, role, institution }
      const res = await api.post(endpoint, payload)
      // API returns { success, token, user } on both login and register
      localStorage.setItem("token", res.data.token)
      if (res.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user))
      }
      
      if (res.data.user?.role === 'admin') {
        navigate("/admin")
      } else {
        navigate("/workspaces")
      }
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.message || "An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] grid lg:grid-cols-2">
      {/* Left panel — decorative */}
      <div className="relative hidden lg:flex flex-col p-10 overflow-hidden bg-gradient-to-br from-background via-primary/5 to-accent/5">
        {/* Animated grid */}
        <div className="absolute inset-0 bg-grid opacity-50" />
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-56 h-56 rounded-full bg-accent/10 blur-3xl" />

        {/* Content */}
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <span className="font-bold text-lg gradient-text">SciTrend</span>
          </Link>
        </div>

        <div className="relative z-10 mt-auto">
          {/* Floating feature cards */}
          <div className="space-y-3 mb-8">
            {[
              { icon: "🔍", text: "Search millions of academic papers in real time" },
              { icon: "📈", text: "Track publication trends and emerging research topics" },
              { icon: "🧠", text: "AI-powered research insights and recommendations" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
                className="flex items-center gap-3 glass rounded-xl px-4 py-3 border border-border/30"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm text-muted-foreground">{item.text}</span>
              </motion.div>
            ))}
          </div>

          <blockquote className="border-l-2 border-primary/30 pl-4">
            <p className="text-sm text-muted-foreground italic">
              "SciTrend transformed how we identify research opportunities. The trend analytics are incredible."
            </p>
            <footer className="text-xs text-muted-foreground/60 mt-2">— Research Team, FPT University</footer>
          </blockquote>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <span className="font-bold text-lg gradient-text">SciTrend</span>
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isLogin
                ? "Sign in to access your research workspace"
                : "Join SciTrend to track research trends"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 text-sm rounded-xl bg-destructive/10 border border-destructive/20 text-destructive"
              >
                {error}
              </motion.div>
            )}

            {!isLogin && (
              <>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="auth-name"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="pl-10 h-11 bg-muted/30 border-border/50 rounded-xl focus-visible:border-primary/50"
                  />
                </div>

                <div className="relative">
                  <Select value={role} onValueChange={(val) => val && setRole(val)}>
                    <SelectTrigger className="capitalize h-11 bg-muted/30 border-border/50 rounded-xl focus-visible:border-primary/50">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="researcher">Researcher</SelectItem>
                      <SelectItem value="lecturer">Lecturer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="auth-institution"
                    placeholder="Institution / University (Optional)"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="pl-10 h-11 bg-muted/30 border-border/50 rounded-xl focus-visible:border-primary/50"
                  />
                </div>
              </>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="auth-email"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 h-11 bg-muted/30 border-border/50 rounded-xl focus-visible:border-primary/50"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-10 pr-10 h-11 bg-muted/30 border-border/50 rounded-xl focus-visible:border-primary/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {isLogin && (
              <div className="flex justify-end mt-1 mb-4">
                <Link 
                  to="/forgot-password" 
                  className="text-xs text-primary hover:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 rounded-xl text-sm font-semibold glow-primary"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          {/* Footer link */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? (
              <>
                Don't have an account?{" "}
                <Link to="/register" className="text-primary hover:underline font-medium">
                  Sign up free
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </>
            )}
          </p>

          {/* Decorative sparkles */}
          <div className="flex justify-center mt-8">
            <Sparkles className="h-4 w-4 text-primary/20" />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
