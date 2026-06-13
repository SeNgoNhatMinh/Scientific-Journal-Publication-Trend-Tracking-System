import { Outlet } from "react-router-dom"
import Navbar from "./Navbar"
import AIAssistantPanel from "../ai/AIAssistantPanel"

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <AIAssistantPanel />
    </div>
  )
}
