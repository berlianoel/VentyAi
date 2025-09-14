"use client"

import type React from "react"
import { setConversationId } from "@/lib/conversation-id-manager" // Added import for setConversationId

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EnhancedFileUpload, EnhancedFilePreview } from "@/components/enhanced-file-upload"
import { Send, Paperclip, Zap, Sparkles, Copy } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { sessionManager } from "@/lib/session-manager"
import { getImagePlaceholder, isImageExpired } from "@/lib/image-placeholder"
import { Textarea } from "@/components/ui/textarea"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  file_url?: string
  file_type?: string
  created_at: string
  isCancelled?: boolean
  metadata?: any
}

interface ChatInterfaceProps {
  conversationId: string | null
  onConversationChange: (id: string) => void
}

const SUGGESTED_PROMPTS = [
  { emoji: "🧠", text: "Tell me an interesting fact about humans and bananas" },
  { emoji: "🧊", text: "How can you start a fire with ice?" },
  { emoji: "🌍", text: "Why is Earth's rotation slowing down?" },
  { emoji: "🐙", text: "How many hearts does an octopus have?" },
  { emoji: "🌙", text: "What would happen if the Moon disappeared?" },
  { emoji: "🦋", text: "How do butterflies remember being caterpillars?" },
  { emoji: "⚡", text: "Can lightning strike the same place twice?" },
  { emoji: "🌊", text: "Why is the ocean blue but water is clear?" },
  { emoji: "🔥", text: "What's the hottest temperature possible?" },
  { emoji: "❄️", text: "Why don't penguins' feet freeze?" },
  { emoji: "🌟", text: "How are stars born and how do they die?" },
  { emoji: "🧬", text: "What makes DNA so special?" },
  { emoji: "🤖", text: "Will AI ever become truly conscious?" },
  { emoji: "🚀", text: "What happens if you cry in space?" },
  { emoji: "🧲", text: "How do magnets actually work?" },
  { emoji: "🎵", text: "Why do some songs get stuck in our heads?" },
  { emoji: "🍯", text: "How do bees know how to make perfect hexagons?" },
  { emoji: "🌈", text: "Can animals see colors we can't?" },
  { emoji: "💎", text: "How are diamonds formed deep underground?" },
  { emoji: "🕳️", text: "What would happen if you fell into a black hole?" },
  { emoji: "🦎", text: "How do chameleons change colors so quickly?" },
  { emoji: "🌋", text: "What's inside the Earth's core?" },
  { emoji: "🧪", text: "What's the strangest chemical reaction?" },
  { emoji: "🎭", text: "Why do we dream and forget most of them?" },
  { emoji: "🔬", text: "What happens when you mix matter and antimatter?" },
  { emoji: "🌌", text: "How big is the observable universe really?" },
  { emoji: "🧠", text: "Can we upload consciousness to computers?" },
  { emoji: "🐋", text: "How do whales communicate across oceans?" },
  { emoji: "🌿", text: "Why do plants grow towards light?" },
  { emoji: "⚛️", text: "What's the smallest particle in existence?" },
  { emoji: "🎨", text: "How does our brain create the experience of color?" },
  { emoji: "🌪️", text: "What causes tornadoes to spin?" },
  { emoji: "🔮", text: "Is time travel theoretically possible?" },
  { emoji: "🦠", text: "How do viruses hijack our cells?" },
  { emoji: "🌺", text: "Why do flowers have different scents?" },
  { emoji: "🎯", text: "How accurate is human intuition?" },
]

const renderMessageContent = (content: string) => {
  // Handle bold text (**text**)
  let formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')

  // Handle headers (## text)
  formatted = formatted.replace(/^## (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-white">$1</h3>')
  formatted = formatted.replace(/^### (.*$)/gm, '<h4 class="text-base font-semibold mt-3 mb-1 text-white">$1</h4>')

  // Handle italic text (*text*) - improved regex to avoid conflicts with bold
  formatted = formatted.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em class="italic text-gray-200">$1</em>')

  // Handle code blocks (\`\`\`code\`\`\`)
  formatted = formatted.replace(
    /```([^`]*?)```/gs,
    '<pre class="bg-gray-800 p-3 rounded-lg my-2 overflow-x-auto text-gray-100 border border-gray-700"><code class="text-gray-100">$1</code></pre>',
  )

  // Handle inline code (`code`)
  formatted = formatted.replace(
    /`([^`]+)`/g,
    '<code class="bg-gray-800 px-2 py-1 rounded text-sm text-gray-100 border border-gray-700">$1</code>',
  )

  // Handle numbered lists (1. item)
  formatted = formatted.replace(
    /^(\d+)\.\s+(.*)$/gm,
    '<div class="ml-4 mb-1"><span class="font-semibold text-white">$1.</span> $2</div>',
  )

  // Handle bullet points (- item or * item)
  formatted = formatted.replace(/^[-*]\s+(.*)$/gm, '<div class="ml-4 mb-1">• $1</div>')

  // Handle line breaks
  formatted = formatted.replace(/\n/g, "<br>")

  return formatted
}

interface MessageBubbleProps {
  message: Message
  onCopy: (text: string, messageType?: string) => Promise<void>
  onRegenerate: () => void
  isRegenerating: boolean
  isCancelled: boolean
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onCopy,
  onRegenerate,
  isRegenerating,
  isCancelled,
}) => {
  const { user } = useAuth()
  return (
    <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
      {message.role === "user" ? (
        <div className="max-w-[80%] rounded-2xl p-4 shadow-sm border bg-red-600 text-white border-red-500 group">
          {message.file_url && message.file_type?.startsWith("image/") && (
            <div className="mb-3">
              <img
                src={getImagePlaceholder(message.file_url, message.file_type) || "/placeholder.svg"}
                alt="Uploaded image"
                className="max-w-full max-h-64 rounded-xl object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/abstract-geometric-shapes.png"
                }}
              />
            </div>
          )}
          <div className="whitespace-pre-wrap leading-relaxed text-white">{message.content}</div>
          <div className="flex items-center justify-between mt-3">
            <div className="text-xs opacity-70 text-white">{new Date(message.created_at).toLocaleTimeString()}</div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCopy(message.content, "User message")}
                className="h-6 w-6 p-0 text-white/70 hover:text-white"
                title="Copy message"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`max-w-[80%] rounded-2xl p-4 shadow-sm border group ${
            isCancelled ? "bg-gray-800 text-gray-400 border-gray-600" : "bg-gray-900 text-white border-gray-700"
          }`}
        >
          {message.file_url && message.file_type?.startsWith("image/") && (
            <div className="mb-3">
              <img
                src={getImagePlaceholder(message.file_url, message.file_type) || "/placeholder.svg"}
                alt="Uploaded image"
                className="max-w-full max-h-64 rounded-xl object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/abstract-geometric-shapes.png"
                }}
              />
            </div>
          )}
          <div
            className={`whitespace-pre-wrap leading-relaxed ${isCancelled ? "text-gray-400 italic" : "text-white"}`}
            dangerouslySetInnerHTML={{ __html: renderMessageContent(message.content) }}
          />
          <div className="flex items-center justify-between mt-3">
            <div className={`text-xs opacity-70 ${isCancelled ? "text-gray-500" : "text-white"}`}>
              {new Date(message.created_at).toLocaleTimeString()}
            </div>
            {!isCancelled && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopy(message.content, "AI message")}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                  title="Copy message"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function ChatInterface({ conversationId, onConversationChange }: ChatInterfaceProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [attachedFile, setAttachedFile] = useState<{ url: string; type: string; name: string; id?: string } | null>(
    null,
  )
  const [selectedModel, setSelectedModel] = useState<"smart" | "smartest">("smart")
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [randomPrompts, setRandomPrompts] = useState<typeof SUGGESTED_PROMPTS>([])
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [cancelledMessages, setCancelledMessages] = useState<Set<string>>(new Set())
  const [isThinking, setIsThinking] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [thinkingTimeoutId, setThinkingTimeoutId] = useState<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [conversationLoadingLock, setConversationLoadingLock] = useState(false) // Added lock to prevent multiple conversation loads
  const [hasInitialMessage, setHasInitialMessage] = useState(false) // Added state to track if user came from homepage with initial message
  const [modelFallbackCount, setModelFallbackCount] = useState(0)

  useEffect(() => {
    const shuffled = [...SUGGESTED_PROMPTS].sort(() => 0.5 - Math.random())
    setRandomPrompts(shuffled.slice(0, 3))

    if (!currentSessionId) {
      const sessionId = sessionManager.createNewSession()
      setCurrentSessionId(sessionId)
    }
  }, [])

  useEffect(() => {
    if (conversationId && user && !conversationLoadingLock) {
      // Added lock check
      setConversationLoadingLock(true)
      loadMessages(conversationId).finally(() => {
        setConversationLoadingLock(false)
      })
      // Link conversation to current session
      if (currentSessionId) {
        sessionManager.linkConversationToSession(currentSessionId, conversationId)
      }
    } else if (!conversationId) {
      setMessages([])
      setCancelledMessages(new Set())
    }
  }, [conversationId, user, currentSessionId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    return () => {
      if (thinkingTimeoutId) {
        clearTimeout(thinkingTimeoutId)
      }
    }
  }, [thinkingTimeoutId])

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
      // Additional scroll to ensure we reach the absolute bottom
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "auto", block: "end" })
        }
      }, 100)
    }
  }

  const loadMessages = async (convId: string) => {
    if (!user) return

    setLoadingMessages(true)
    try {
      console.log("[v0] Loading messages for conversation:", convId)
      const response = await fetch(`/api/messages?conversationId=${convId}&firebaseUid=${user.uid}`)
      if (response.ok) {
        const data = await response.json()
        const loadedMessages = data.messages || []

        const processedMessages = loadedMessages.map((msg: Message) => ({
          ...msg,
          // Replace expired image URLs with placeholders
          file_url:
            msg.file_url && isImageExpired(msg.file_url)
              ? getImagePlaceholder(msg.file_url, msg.file_type)
              : msg.file_url,
        }))

        const cancelledIds = new Set<string>()
        processedMessages.forEach((msg: Message) => {
          if (msg.content === "Cancelled by user" || msg.isCancelled) {
            cancelledIds.add(msg.id)
          }
        })

        setCancelledMessages(cancelledIds)

        // Modified to preserve current messages and prevent overwriting user messages
        setMessages((prevMessages) => {
          if (prevMessages.length === 0) {
            return processedMessages
          }
          // If we have current messages, merge them with loaded messages, avoiding duplicates
          const existingIds = new Set(prevMessages.map((msg) => msg.id))
          const newMessages = processedMessages.filter((msg) => !existingIds.has(msg.id))
          return [...prevMessages, ...newMessages]
        })

        console.log("[v0] Loaded messages:", processedMessages.length)
      } else {
        console.error("[v0] Failed to load messages:", await response.text())
        // Modified to not clear messages on error if we have current messages
        setMessages((prevMessages) => (prevMessages.length > 0 ? prevMessages : []))
      }
    } catch (error) {
      console.error("[v0] Error loading messages:", error)
      // Modified to not clear messages on error if we have current messages
      setMessages((prevMessages) => (prevMessages.length > 0 ? prevMessages : []))
    } finally {
      setLoadingMessages(false)
    }
  }

  const copyToClipboard = async (text: string, messageType = "Message") => {
    try {
      // Strip HTML tags for plain text copying
      const plainText = text.replace(/<[^>]*>/g, "")
      await navigator.clipboard.writeText(plainText)
      toast({
        title: "Copied!",
        description: `${messageType} copied to clipboard`,
      })
    } catch (error) {
      console.error("Copy failed:", error)
      // Fallback for older browsers
      try {
        const textArea = document.createElement("textarea")
        textArea.value = text.replace(/<[^>]*>/g, "")
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)
        toast({
          title: "Copied!",
          description: `${messageType} copied to clipboard`,
        })
      } catch (fallbackError) {
        toast({
          title: "Copy Failed",
          description: "Unable to copy to clipboard. Please select and copy manually.",
          variant: "destructive",
        })
      }
    }
  }

  const copyUserMessage = async (text: string) => {
    await copyToClipboard(text, "User message")
  }

  const regenerateMessage = async (messageIndex: number) => {
    const messageToRegenerate = messages[messageIndex]
    if (messageToRegenerate.role !== "assistant") return

    const previousUserMessage = messages[messageIndex - 1]
    if (!previousUserMessage || previousUserMessage.role !== "user") return

    setRegeneratingMessageId(messageToRegenerate.id)
    const controller = new AbortController()
    setAbortController(controller)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.slice(0, messageIndex).map((msg) => ({
            role: msg.role,
            content: msg.content,
            fileUrl: msg.file_url,
            fileType: msg.file_type,
          })),
          conversationId,
          firebaseUid: user?.uid,
          aiModel: selectedModel,
        }),
        signal: controller.signal,
      })

      if (response.ok) {
        const data = await response.json()
        const newMessages = [...messages]
        newMessages[messageIndex] = {
          ...messageToRegenerate,
          content: data.message,
          created_at: new Date().toISOString(),
        }
        setMessages(newMessages)
        toast({
          title: "Regenerated!",
          description: "Message has been regenerated successfully",
        })
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Regeneration cancelled")
        toast({
          title: "Cancelled",
          description: "Message regeneration was cancelled",
        })
      } else {
        console.error("Failed to regenerate message:", error)
        toast({
          title: "Regeneration Failed",
          description: "Unable to regenerate message. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setRegeneratingMessageId(null)
      setAbortController(null)
    }
  }

  const createNewConversation = async () => {
    if (!user) return null

    const newConversationId = crypto.randomUUID()

    try {
      console.log("[v0] Creating new conversation:", newConversationId)
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newConversationId,
          firebaseUid: user.uid,
          title: "New Chat",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const conversation = data.conversation

        if (currentSessionId) {
          sessionManager.linkConversationToSession(currentSessionId, conversation.id)
        }

        onConversationChange(conversation.id)
        return conversation.id
      }
    } catch (error) {
      console.error("Failed to create conversation:", error)
    }

    return newConversationId
  }

  const sendGuestMessage = async (input: string, file?: { url: string; type: string }) => {
    if (!input.trim() && !file) return

    const currentInput = input.trim()
    const currentFile = file

    setInput("")
    setAttachedFile(null)

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: currentInput,
      created_at: new Date().toISOString(),
      file_url: currentFile?.url,
      file_type: currentFile?.type,
    }

    setMessages((prev) => [...prev, userMessage])
    setLoading(true)
    setIsThinking(true)

    try {
      const response = await fetch("/api/chat/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages,
            {
              role: "user",
              content: currentInput,
              fileUrl: currentFile?.url,
              fileType: currentFile?.type,
            },
          ],
          aiModel: selectedModel,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to get response")
      }

      const data = await response.json()
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message,
        created_at: new Date().toISOString(),
        metadata: { model_used: data.model },
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error: any) {
      console.error("[v0] Guest chat error:", error)
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Maaf, terjadi kesalahan. Silakan coba lagi.",
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
      setIsThinking(false)
    }
  }

  const sendMessage = async (input: string, file?: { url: string; type: string }) => {
    if (!input.trim() && !file) return

    if (!user) {
      return sendGuestMessage(input, file)
    }

    const currentInput = input.trim()
    const currentFile = file

    setInput("")
    setAttachedFile(null)

    if (!conversationId && messages.length === 0) {
      setHasInitialMessage(true)
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: currentInput,
      created_at: new Date().toISOString(),
      file_url: currentFile?.url,
      file_type: currentFile?.type,
    }

    setMessages((prev) => [...prev, userMessage])
    setIsThinking(true)

    const controller = new AbortController()
    setAbortController(controller)

    try {
      let currentConversationId = conversationId

      if (!currentConversationId) {
        setIsCreatingSession(true)
        const conversationResponse = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firebaseUid: user.uid,
            title: currentInput.slice(0, 50),
          }),
        })

        if (!conversationResponse.ok) {
          throw new Error("Failed to create conversation")
        }

        const { conversation } = await conversationResponse.json()
        currentConversationId = conversation.id
        setConversationId(currentConversationId)
        onConversationChange(currentConversationId)
        setIsCreatingSession(false)
      }

      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: currentConversationId,
          role: "user",
          content: currentInput,
          firebaseUid: user.uid,
          file_url: currentFile?.url,
          file_type: currentFile?.type,
        }),
      })

      await sendAIResponse(currentConversationId, [userMessage])
    } catch (error) {
      console.error("Error in sendMessage:", error)
      setIsThinking(false)
      setIsCreatingSession(false)
      setHasInitialMessage(false)
    }
  }

  const sendAIResponse = async (conversationId: string, currentMessages: any[]) => {
    const controller = new AbortController()
    setAbortController(controller)
    setIsThinking(true)
    setLoading(true)

    const timeoutId = setTimeout(() => {
      console.log("[v0] Thinking timeout reached, clearing state")
      setIsThinking(false)
      if (!controller.signal.aborted) {
        toast({
          title: "Request Timeout",
          description: "The AI took too long to respond. Please try again.",
          variant: "destructive",
        })
      }
    }, 30000)
    setThinkingTimeoutId(timeoutId)

    try {
      const allMessages = [...messages, ...currentMessages]

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
            fileUrl: msg.file_url,
            fileType: msg.file_type,
          })),
          conversationId: conversationId,
          firebaseUid: user?.uid,
          aiModel: selectedModel,
        }),
        signal: controller.signal,
      })

      if (response.ok) {
        const data = await response.json()
        if (!controller.signal.aborted) {
          const assistantMessage = {
            id: `msg_${Date.now() + 1}_${Math.random().toString(36).substring(2, 9)}`,
            role: "assistant" as const,
            content: data.message,
            created_at: new Date().toISOString(),
          }
          setMessages((prev) => [...prev, assistantMessage])
        }
      } else {
        const errorData = await response.json()
        console.error("[v0] AI response error:", errorData)
        if (!controller.signal.aborted) {
          toast({
            title: "Error",
            description: errorData.error || "Failed to get AI response. Please try again.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("[v0] AI response cancelled by user")
        const cancelledMessage = {
          id: `msg_${Date.now() + 1}_${Math.random().toString(36).substring(2, 9)}`,
          role: "assistant" as const,
          content: "Cancelled by user",
          created_at: new Date().toISOString(),
          isCancelled: true,
        }
        setMessages((prev) => [...prev, cancelledMessage])
        setCancelledMessages((prev) => new Set([...prev, cancelledMessage.id]))
      } else {
        console.error("Failed to get AI response:", error)
        if (!controller.signal.aborted) {
          toast({
            title: "Network Error",
            description: "Connection failed. Please check your internet and try again.",
            variant: "destructive",
          })
        }
      }
    } finally {
      setLoading(false)
      setAbortController(null)
      setIsThinking(false)
      if (timeoutId) clearTimeout(timeoutId)
      setThinkingTimeoutId(null)
    }
  }

  const handleModelChange = (value: "smart" | "smartest") => {
    if (value === "smartest" && !user) {
      setShowLoginDialog(true)
      return
    }
    setSelectedModel(value)
  }

  const handleQuickExample = (exampleText: string) => {
    setInput(exampleText)
  }

  const cancelRequest = () => {
    console.log("[v0] Cancelling request...")

    // Cancel any ongoing fetch requests
    if (abortController) {
      abortController.abort()
      setAbortController(null)
    }

    // Clear timeout if exists
    if (thinkingTimeoutId) {
      clearTimeout(thinkingTimeoutId)
      setThinkingTimeoutId(null)
    }

    // Reset all loading states immediately
    setLoading(false)
    setIsThinking(false)
    setIsCreatingSession(false)
    setRegeneratingMessageId(null)

    toast({
      title: "Request Cancelled",
      description: "AI request has been cancelled successfully.",
      variant: "default",
    })
  }

  const handleFileUploadCancel = () => {
    setShowFileUpload(false)
    setAttachedFile(null)
  }

  if (!conversationId && messages.length === 0 && !hasInitialMessage && !loading && !isThinking) {
    return (
      <div className="flex-1 flex flex-col bg-gray-950">
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-2xl">
            <div className="text-center mb-8 md:mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">VenTY</h1>
              <p className="text-lg md:text-xl text-gray-400">Your intelligent AI assistant</p>
            </div>

            <div className="sticky bottom-0 bg-gray-900 rounded-2xl border border-gray-800 p-4 md:p-6 mb-4 md:mb-6 shadow-lg">
              {attachedFile && (
                <div className="mb-4">
                  <EnhancedFilePreview file={attachedFile} onRemove={() => setAttachedFile(null)} showDetails={true} />
                </div>
              )}
              {showFileUpload && user && selectedModel === "smartest" && (
                <div className="mb-4">
                  <EnhancedFileUpload
                    onFileUploaded={(file) => {
                      setAttachedFile(file)
                      setShowFileUpload(false)
                    }}
                    disabled={loading}
                    conversationId={conversationId || undefined}
                    maxSize={10}
                    onCancel={handleFileUploadCancel}
                  />
                </div>
              )}

              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage(input, attachedFile)
                  }
                }}
                placeholder="Ask anything..."
                className="bg-gray-800 border-gray-700 text-white text-base md:text-lg placeholder:text-gray-400 focus-visible:ring-red-500 focus-visible:ring-2 p-3 md:p-4 rounded-xl"
                disabled={loading}
              />

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2 md:gap-3">
                  {user && selectedModel === "smartest" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFileUpload(!showFileUpload)}
                      className="text-gray-400 hover:text-white hover:bg-gray-800 p-2 rounded-lg"
                      disabled={loading}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  )}

                  <Select value={selectedModel} onValueChange={handleModelChange} disabled={loading}>
                    <SelectTrigger className="w-auto bg-transparent border-none text-white hover:bg-gray-800 p-2 rounded-lg focus:ring-0">
                      <div className="flex items-center gap-2">
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 shadow-lg">
                      <SelectItem value="smartest" className="text-white focus:bg-red-600 focus:text-white">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-red-500" />
                          <div>
                            <div className="font-medium text-white">Smartest {!user && "(Login Required)"}</div>
                            <div className="text-xs text-gray-400">VenTY Advanced with vision</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="smart" className="text-white focus:bg-red-600 focus:text-white">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className="font-medium text-white">Smart</div>
                            <div className="text-xs text-gray-400">VenTY Standard</div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => sendMessage(input, attachedFile)}
                  disabled={!input.trim() || loading || isThinking || isCreatingSession}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl flex items-center gap-2"
                >
                  {isCreatingSession && !conversationId ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span className="text-sm hidden sm:inline">Creating...</span>
                    </>
                  ) : loading || isThinking ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span className="text-sm hidden sm:inline">Sending...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm hidden sm:inline">Send</span>
                      <Send className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2 md:space-y-3 px-2 md:px-0 max-w-full">
              {randomPrompts.map((prompt, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 md:gap-4 text-gray-400 hover:text-white cursor-pointer p-3 md:p-4 rounded-xl hover:bg-gray-900 transition-all duration-200 border border-transparent hover:border-gray-700 w-full"
                  onClick={() => handleQuickExample(prompt.text)}
                >
                  <span className="text-xl md:text-2xl flex-shrink-0">{prompt.emoji}</span>
                  <span className="font-medium text-white text-left leading-relaxed break-words">{prompt.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Dialog open={showLoginDialog} onOpenChange={(open) => !open && setShowLoginDialog(false)}>
          <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-white">Unlock Advanced Features</DialogTitle>
              <DialogDescription className="text-gray-400">
                Sign in to access the Smartest model with advanced AI capabilities, file upload, and conversation
                history.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-4">
              <Link href="/auth/login">
                <Button className="w-full bg-red-600 hover:bg-red-700 text-white">Sign In</Button>
              </Link>
              <Link href="/auth/register">
                <Button
                  variant="outline"
                  className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
                >
                  Create Account
                </Button>
              </Link>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 min-h-0">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
          </div>
        ) : messages.length === 0 && !hasInitialMessage ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Start a conversation</h2>
            <p className="text-gray-400 mb-8">Ask me anything and I'll help you out!</p>

            <div className="grid gap-3 w-full max-w-md">
              {randomPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickExample(prompt.text)}
                  className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-xl text-left transition-colors border border-gray-700 hover:border-gray-600"
                  disabled={loading}
                >
                  <span className="text-2xl">{prompt.emoji}</span>
                  <span className="text-white">{prompt.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onCopy={copyToClipboard}
                onRegenerate={() => regenerateMessage(messages.indexOf(message))}
                isRegenerating={regeneratingMessageId === message.id}
                isCancelled={cancelledMessages.has(message.id)}
              />
            ))}

            {isThinking && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-800 text-white border border-gray-700 rounded-2xl px-4 py-3 max-w-[80%]">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-red-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-red-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className="text-sm">VenTY is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div className="h-24"></div>
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 bg-gray-900 border-t border-gray-700 p-4 sticky bottom-0">
        <div className="max-w-4xl mx-auto">
          {attachedFile && (
            <div className="mb-4">
              <EnhancedFilePreview file={attachedFile} onRemove={() => setAttachedFile(null)} showDetails={true} />
            </div>
          )}
          {showFileUpload && user && selectedModel === "smartest" && (
            <div className="mb-4">
              <EnhancedFileUpload
                onFileUploaded={(file) => {
                  setAttachedFile(file)
                  setShowFileUpload(false)
                }}
                disabled={loading}
                conversationId={conversationId || undefined}
                maxSize={10}
                onCancel={handleFileUploadCancel}
              />
            </div>
          )}

          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4 shadow-lg">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage(input, attachedFile)
                }
              }}
              placeholder="Ask anything..."
              className="bg-transparent border-none text-white text-base md:text-lg placeholder:text-gray-400 focus-visible:ring-0 resize-none min-h-[50px] max-h-[200px] p-0"
              disabled={loading}
            />

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2 md:gap-3">
                {user && selectedModel === "smartest" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFileUpload(!showFileUpload)}
                    className="text-gray-400 hover:text-white hover:bg-gray-800 p-2 rounded-lg"
                    disabled={loading}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                )}

                <Select value={selectedModel} onValueChange={handleModelChange} disabled={loading}>
                  <SelectTrigger className="w-auto bg-transparent border-none text-white hover:bg-gray-800 p-2 rounded-lg focus:ring-0">
                    <div className="flex items-center gap-2">
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 shadow-lg">
                    <SelectItem value="smartest" className="text-white focus:bg-red-600 focus:text-white">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-red-500" />
                        <div>
                          <div className="font-medium text-white">Smartest {!user && "(Login Required)"}</div>
                          <div className="text-xs text-gray-400">VenTY Advanced with vision</div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="smart" className="text-white focus:bg-red-600 focus:text-white">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="font-medium text-white">Smart</div>
                          <div className="text-xs text-gray-400">VenTY Standard</div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => sendMessage(input, attachedFile)}
                disabled={!input.trim() || loading || isThinking || isCreatingSession}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl flex items-center gap-2"
              >
                {isCreatingSession && !conversationId ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="text-sm hidden sm:inline">Creating...</span>
                  </>
                ) : loading || isThinking ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="text-sm hidden sm:inline">Sending...</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm hidden sm:inline">Send</span>
                    <Send className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
