import { useState } from "react"
import { Link } from "react-router-dom"
import { Loader2, BookOpen, Mail, ArrowLeft, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import api from "@/lib/api"
import { motion } from "framer-motion"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    setError("")
    try {
      await api.post("/auth/forgot-password", { email })
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.message || "An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] grid lg:grid-cols-2">
      {/* Left panel — decorative */}
      <div className="relative hidden lg:flex flex-col p-10 overflow-hidden bg-gradient-to-br from-background via-primary/5 to-accent/5">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-56 h-56 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <span className="font-bold text-lg gradient-text">SciTrend</span>
          </Link>
        </div>

        <div className="relative z-10 mt-auto">
          <blockquote className="border-l-2 border-primary/30 pl-4">
            <p className="text-sm text-muted-foreground italic">
              "A secure environment for all your research tracking needs."
            </p>
          </blockquote>
        </div>
      </div>

      {/* Right panel — form */}
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

          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">
              Reset Password
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-xl bg-green-500/10 border border-green-500/20 text-center space-y-3"
            >
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
              <h3 className="font-semibold text-green-500">Check your email</h3>
              <p className="text-sm text-green-600/80">
                We've sent a password reset link to <br/><span className="font-medium text-green-600">{email}</span>
              </p>
            </motion.div>
          ) : (
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

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 h-11 bg-muted/30 border-border/50 rounded-xl focus-visible:border-primary/50"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-xl text-sm font-semibold glow-primary"
                disabled={isLoading || !email}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  )
}
