import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { User, Mail, Shield, Settings, Camera, BookMarked, Activity, Key, LogOut, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import api from "@/lib/api"

type UserProfile = {
  _id: string
  name: string
  email: string
  role: string
  institution?: string
  bio?: string
  interests?: string[]
  bookmarks?: string[]
  createdAt?: string
  isActive?: boolean
}

type AlertState = { type: "success" | "error"; message: string } | null

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Profile form state
  const [profileForm, setProfileForm] = useState({ name: "", institution: "", bio: "", interests: "" })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileAlert, setProfileAlert] = useState<AlertState>(null)

  // Password form state
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [passwordAlert, setPasswordAlert] = useState<AlertState>(null)
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/auth/me")
        if (res.data.success) {
          const u = res.data.user
          setUser(u)
          setProfileForm({
            name: u.name || "",
            institution: u.institution || "",
            bio: u.bio || "",
            interests: u.interests?.join(", ") || "",
          })
          localStorage.setItem("user", JSON.stringify(u))
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error)
        const userStr = localStorage.getItem("user")
        if (userStr) {
          const u = JSON.parse(userStr)
          setUser(u)
          setProfileForm({
            name: u.name || "",
            institution: u.institution || "",
            bio: u.bio || "",
            interests: u.interests?.join(", ") || "",
          })
        }
      } finally {
        setIsLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingProfile(true)
    setProfileAlert(null)
    try {
      const res = await api.put("/auth/me", {
        name: profileForm.name,
        institution: profileForm.institution,
        bio: profileForm.bio,
        interests: profileForm.interests,
      })
      if (res.data.success) {
        setUser(res.data.user)
        localStorage.setItem("user", JSON.stringify(res.data.user))
        setProfileAlert({ type: "success", message: "Profile updated successfully!" })
      }
    } catch (err: any) {
      setProfileAlert({ type: "error", message: err.response?.data?.message || "Failed to update profile." })
    } finally {
      setIsSavingProfile(false)
      setTimeout(() => setProfileAlert(null), 4000)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordAlert(null)

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordAlert({ type: "error", message: "New passwords do not match." })
      return
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordAlert({ type: "error", message: "New password must be at least 6 characters." })
      return
    }

    setIsSavingPassword(true)
    try {
      const res = await api.put("/auth/me/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      if (res.data.success) {
        setPasswordAlert({ type: "success", message: "Password updated successfully!" })
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
        setTimeout(() => setShowPasswordForm(false), 1500)
      }
    } catch (err: any) {
      setPasswordAlert({ type: "error", message: err.response?.data?.message || "Failed to update password." })
    } finally {
      setIsSavingPassword(false)
      setTimeout(() => setPasswordAlert(null), 4000)
    }
  }

  if (isLoading && !user) {
    return <div className="p-8 text-center text-muted-foreground flex items-center justify-center min-h-[50vh]"><Activity className="animate-spin h-6 w-6 mr-2" /> Loading profile...</div>
  }

  if (!user) {
    return <div className="p-8 text-center text-muted-foreground">User not found.</div>
  }

  const roleColor = user.role === 'admin'
    ? 'bg-red-500/10 text-red-500 border-red-500/20'
    : user.role === 'researcher'
      ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      : 'bg-primary/10 text-primary border-primary/20'

  return (
    <div className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full space-y-8 mt-4">
      {/* Header Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl glass border border-border/50 overflow-hidden shadow-sm"
      >
        <div className="h-32 md:h-48 bg-gradient-to-r from-primary/30 via-accent/20 to-primary/10" />
        <div className="px-6 md:px-10 pb-8 flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16 md:-mt-20">
          <div className="relative group">
            <div className="h-32 w-32 md:h-40 md:w-40 rounded-full border-4 border-background bg-muted/50 flex items-center justify-center overflow-hidden shadow-xl glass transition-transform group-hover:scale-105">
              <User className="h-16 w-16 text-muted-foreground/50" />
            </div>
            <button className="absolute bottom-2 right-2 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform opacity-0 group-hover:opacity-100">
              <Camera className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 text-center md:text-left mb-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{user.name || "Unknown User"}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2 text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium"><Mail className="h-4 w-4" /> {user.email}</span>
              <span className="hidden md:inline text-border/50">•</span>
              <Badge variant="outline" className={`capitalize tracking-wider border text-[10px] sm:text-xs ${roleColor}`}>
                {user.role}
              </Badge>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8 pb-10">
        {/* Left Column: Quick Stats */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <div className="glass rounded-2xl p-6 border border-border/50 shadow-sm">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-foreground">
              <Activity className="h-5 w-5 text-primary" />
              Account Activity
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2.5 border-b border-border/50">
                <span className="text-muted-foreground text-sm font-medium">Status</span>
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 border-0">Active</Badge>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-border/50">
                <span className="text-muted-foreground text-sm font-medium">Member Since</span>
                <span className="font-medium text-sm text-foreground">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-border/50">
                <span className="text-muted-foreground text-sm font-medium">Saved Papers</span>
                <span className="font-medium text-sm flex items-center gap-1 text-foreground"><BookMarked className="h-3.5 w-3.5 text-primary" /> {user.bookmarks?.length || 0}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Settings Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-2 space-y-6"
        >
          {/* General Information */}
          <div className="glass rounded-2xl p-6 md:p-8 border border-border/50 shadow-sm">
            <h3 className="font-semibold text-xl mb-6 flex items-center gap-2 text-foreground">
              <Settings className="h-5 w-5 text-primary" />
              General Information
            </h3>

            {/* Profile Alert */}
            {profileAlert && (
              <div className={`flex items-center gap-2 p-3 rounded-lg mb-5 text-sm ${profileAlert.type === "success" ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}>
                {profileAlert.type === "success" ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                {profileAlert.message}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSaveProfile}>
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <Input
                    value={profileForm.name}
                    onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                    className="bg-background/50 border-border/50 focus-visible:border-primary/50 focus-visible:bg-background/80 h-11"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                  <Input value={user.email} disabled className="bg-muted/30 border-border/50 h-11 text-muted-foreground opacity-70" />
                  <p className="text-xs text-muted-foreground/70 mt-1">Email cannot be changed.</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Institution</label>
                <Input
                  value={profileForm.institution}
                  onChange={e => setProfileForm(f => ({ ...f, institution: e.target.value }))}
                  placeholder="e.g. FPT University"
                  className="bg-background/50 border-border/50 focus-visible:border-primary/50 focus-visible:bg-background/80 h-11"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Bio</label>
                <textarea
                  value={profileForm.bio}
                  onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="Tell us a bit about yourself and your research focus..."
                  className="flex w-full rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-background/80 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] resize-y"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Research Interests</label>
                <Input
                  value={profileForm.interests}
                  onChange={e => setProfileForm(f => ({ ...f, interests: e.target.value }))}
                  placeholder="e.g. Artificial Intelligence, Quantum Physics"
                  className="bg-background/50 border-border/50 focus-visible:border-primary/50 focus-visible:bg-background/80 h-11"
                />
                <p className="text-xs text-muted-foreground/70 mt-1">Separate multiple topics with commas.</p>
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={isSavingProfile} className="glow-primary px-8 h-10 rounded-xl">
                  {isSavingProfile ? <><Activity className="animate-spin h-4 w-4 mr-2" /> Saving...</> : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>

          {/* Security */}
          <div className="glass rounded-2xl p-6 md:p-8 border border-border/50 shadow-sm">
            <h3 className="font-semibold text-xl mb-6 flex items-center gap-2 text-foreground">
              <Key className="h-5 w-5 text-orange-500" />
              Security Settings
            </h3>
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-5 border border-border/50 rounded-xl bg-background/30 hover:bg-background/50 transition-colors">
                <div>
                  <h4 className="font-medium text-foreground">Change Password</h4>
                  <p className="text-sm text-muted-foreground mt-1">Update your password to keep your account secure.</p>
                </div>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto shrink-0 bg-background/50 border-border/50 hover:bg-background/80 hover:text-foreground"
                  onClick={() => { setShowPasswordForm(v => !v); setPasswordAlert(null) }}
                >
                  {showPasswordForm ? "Cancel" : "Update Password"}
                </Button>
              </div>

              {/* Password Alert */}
              {passwordAlert && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${passwordAlert.type === "success" ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}>
                  {passwordAlert.type === "success" ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  {passwordAlert.message}
                </div>
              )}

              {/* Password Form */}
              {showPasswordForm && (
                <motion.form
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 p-5 border border-border/50 rounded-xl bg-background/20"
                  onSubmit={handleUpdatePassword}
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Current Password</label>
                    <Input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                      placeholder="Enter current password"
                      className="bg-background/50 border-border/50 h-11"
                      required
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">New Password</label>
                      <Input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                        placeholder="Min 6 characters"
                        className="bg-background/50 border-border/50 h-11"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Confirm New Password</label>
                      <Input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                        placeholder="Repeat new password"
                        className="bg-background/50 border-border/50 h-11"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSavingPassword} className="px-8 h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white">
                      {isSavingPassword ? <><Activity className="animate-spin h-4 w-4 mr-2" /> Updating...</> : <><Key className="h-4 w-4 mr-2" /> Confirm Password Change</>}
                    </Button>
                  </div>
                </motion.form>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
