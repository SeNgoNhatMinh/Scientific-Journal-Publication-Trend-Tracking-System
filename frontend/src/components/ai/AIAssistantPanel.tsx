import { useState } from "react"
import { Bot, X, Sparkles, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import api from "@/lib/api"

export default function AIAssistantPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [response, setResponse] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(false)

  const handleSummarize = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    setIsLoading(true)
    setError(false)
    try {
      // FE calls backend proxy /api/v1/ai/summarization/abstract
      const res = await api.post("/ai/summarization/abstract", { abstract: input })
      setResponse(res.data.summary || res.data.message || "Summary generated successfully.")
    } catch (err) {
      console.error(err)
      setError(true)
      setResponse("AI is currently unavailable. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg"
        size="icon"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-6 right-6 w-[350px] shadow-xl z-50 flex flex-col h-[500px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bot className="h-4 w-4" />
          AI Assistant
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-6 w-6">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
          Hello! I can summarize abstracts or recommend papers based on your input. Try pasting an abstract below!
        </div>
        
        {response && (
          <div className={`text-sm p-3 rounded-lg ${error ? "bg-destructive/10 text-destructive" : "bg-primary/10"}`}>
            {response}
          </div>
        )}
      </CardContent>
      <div className="p-4 border-t mt-auto">
        <form onSubmit={handleSummarize} className="flex gap-2">
          <Input
            placeholder="Paste abstract to summarize..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  )
}
