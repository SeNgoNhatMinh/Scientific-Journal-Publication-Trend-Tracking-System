import { useState } from "react"
import { Link, useSearchParams, useNavigate } from "react-router-dom"
import { Loader2, BookOpen, Lock, Eye, EyeOff, CheckCircle2, ArrowLeft, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import api from "@/lib/api"
import { motion } from "framer-motion"

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = searchParams.get("token") || ""
  const email = searchParams.get("email") || ""

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // Guard: no token in URL
  if (!token || !email) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Invalid Reset Link</h1>
          <p className="text-muted-foreground text-sm">
            This password reset link is invalid or has already been used.
          </p>
          <Link to="/forgot-password">
            <Button className="mt-2 glow-primary">Request a new link</Button>
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsLoading(true)
    try {
      const res = await api.post("/auth/reset-password", { token, email, newPassword })
      // Auto-login after reset
      if (res.data.token) {
        localStorage.setItem("token", res.data.token)
        if (res.data.user) localStorage.setItem("user", JSON.stringify(res.data.user))
      }
      setSuccess(true)
      setTimeout(() => {
        navigate(res.data.user?.role === "admin" ? "/admin" : "/workspaces")
      }, 2500)
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
              "Choose a strong, unique password to keep your research data secure."
            </p>
          </blockquote>
        </div>
      </div>

      {/* Right panel */}
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
            <h1 className="text-2xl font-bold tracking-tight">Set New Password</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Resetting password for{" "}
              <span className="text-primary font-medium">{decodeURIComponent(email)}</span>
            </p>
          </div>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-xl bg-green-500/10 border border-green-500/20 text-center space-y-3"
            >
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
              <h3 className="font-semibold text-green-500">Password updated!</h3>
              <p className="text-sm text-green-600/80">
                You're now logged in. Redirecting to your workspace...
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

              {/* New password */}
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="reset-new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="New password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="pl-10 pr-10 h-11 bg-muted/30 border-border/50 rounded-xl focus-visible:border-primary/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Confirm password */}
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="reset-confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pl-10 h-11 bg-muted/30 border-border/50 rounded-xl focus-visible:border-primary/50"
                />
              </div>

              {/* Password strength indicator */}
              {newPassword && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => {
                      const strength = newPassword.length >= 6
                        ? newPassword.length >= 10
                          ? newPassword.match(/[A-Z]/) && newPassword.match(/[0-9]/)
                            ? 4 : 3
                          : 2
                        : 1
                      return (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-all ${
                            level <= strength
                              ? strength === 1 ? "bg-red-500"
                                : strength === 2 ? "bg-orange-500"
                                : strength === 3 ? "bg-yellow-500"
                                : "bg-green-500"
                              : "bg-muted/40"
                          }`}
                        />
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {newPassword.length < 6 ? "Too short"
                      : newPassword.length < 10 ? "Weak — try adding more characters"
                      : newPassword.match(/[A-Z]/) && newPassword.match(/[0-9]/) ? "Strong 🎉"
                      : "Medium — add numbers or uppercase letters"}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 rounded-xl text-sm font-semibold glow-primary"
                disabled={isLoading || !newPassword || !confirmPassword}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Set New Password
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  )
}
