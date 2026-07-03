import { useState, useRef, useEffect } from "react"
import { Bot, X, Sparkles, Send, User, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import api from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import ReactMarkdown from 'react-markdown'

interface Message {
  role: "assistant" | "user"
  content: string
  error?: boolean
}

const initialMessages: Message[] = [
  {
    role: "assistant",
    content: "Hi! I am your AI Research Assistant. You can ask me anything about academic papers, research trends, or concepts. I will search the database and external sources to answer your questions.",
  },
]

export default function AIAssistantPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isOpen])

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return

    setMessages((prev) => [...prev, { role: "user", content: text }])
    setInput("")
    setIsLoading(true)

    try {
      const res = await api.post("/ai/chat/ask", { question: text })
      const answer = res.data.answer || "I'm sorry, I couldn't find an answer to that."
      const sources = res.data.sources || []
      
      let fullAnswer = answer;
      if (sources.length > 0) {
        fullAnswer += "\n\nSources:\n" + sources.map((s: any, i: number) => `[${i+1}] ${s.title || 'Untitled'}`).join("\n")
      }
      
      setMessages((prev) => [...prev, { role: "assistant", content: fullAnswer }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "AI service is currently unavailable. Please try again later.", error: true },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              id="ai-assistant-open-btn"
              onClick={() => setIsOpen(true)}
              className="rounded-full h-14 w-14 shadow-2xl pulse-btn glow-primary relative overflow-hidden"
              size="icon"
            >
              <Sparkles className="h-6 w-6 relative z-10" />
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-6 right-6 z-50 w-[360px] flex flex-col rounded-2xl shadow-2xl border border-border/50 glass-strong overflow-hidden"
            style={{ height: 520 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-primary/5">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">AI Research Assistant</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                    Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                  <Minimize2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className={`flex items-start gap-3 w-full ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    {/* Avatar */}
                    <div className={`h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-xs shadow-sm ${
                      msg.role === "assistant"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted border border-border text-muted-foreground"
                    }`}>
                      {msg.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>
                    {/* Bubble */}
                    <div className={`max-w-[85%] text-[14.5px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-muted/50 text-foreground px-4 py-2.5 rounded-2xl rounded-tr-sm"
                        : msg.error
                          ? "bg-destructive/10 text-destructive px-4 py-2.5 rounded-2xl rounded-tl-sm border border-destructive/20"
                          : "text-foreground py-1"
                    }`}>
                      {msg.role === "user" || msg.error ? (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-a:text-blue-500 hover:prose-a:text-blue-600 prose-strong:text-primary prose-strong:font-semibold">
                        <ReactMarkdown
                          components={{
                            a: ({ node, ...props }) => (
                              <a {...props} target="_blank" rel="noreferrer" className="no-underline hover:underline font-medium" />
                            )
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="bg-muted/60 border border-border/50 rounded-xl rounded-tl-sm px-3 py-2 flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-muted-foreground block"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border/40">
              <form onSubmit={handleChat} className="flex gap-2">
                <Input
                  id="ai-assistant-input"
                  placeholder="Ask anything about academic papers..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                  className="h-9 text-sm bg-muted/40 border-border/50 rounded-full flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !input.trim()}
                  className="h-9 w-9 rounded-full shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
