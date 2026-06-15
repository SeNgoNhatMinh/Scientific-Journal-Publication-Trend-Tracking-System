import { Outlet } from "react-router-dom"
import Navbar from "./Navbar"
import AIAssistantPanel from "../ai/AIAssistantPanel"

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Animated grid background */}
      <div className="fixed inset-0 bg-grid opacity-100 pointer-events-none z-0" aria-hidden="true" />
      {/* Radial gradient overlay — adds depth */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.65 0.27 285 / 0.08) 0%, transparent 65%)",
        }}
        aria-hidden="true"
      />
      <Navbar />
      <main className="flex-1 flex flex-col relative z-10">
        <Outlet />
      </main>
      <AIAssistantPanel />
    </div>
  )
}
