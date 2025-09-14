"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { signOut } from "@/lib/firebase/auth"
import { Plus, MessageSquare, Crown, LogOut, User, Trash2, Edit2, Check, X, MoreHorizontal } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Conversation {
  id: string
  title: string
  ai_model: string
  created_at: string
  updated_at: string
  message_preview?: string
}

interface SidebarProps {
  currentConversationId: string | null
  onConversationSelect: (id: string | null) => void
}

export function Sidebar({ currentConversationId, onConversationSelect }: SidebarProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")

  useEffect(() => {
    if (user) {
      fetchConversations()
      fetchUserProfile()
    }
  }, [user])

  const fetchConversations = async () => {
    try {
      const response = await fetch(`/api/conversations?firebaseUid=${user?.uid}`)
      if (response.ok) {
        const data = await response.json()
        const conversationsWithPreview = await Promise.all(
          data.conversations.map(async (conv: Conversation) => {
            try {
              const msgResponse = await fetch(
                `/api/messages?conversationId=${conv.id}&firebaseUid=${user?.uid}&limit=2`,
              )
              if (msgResponse.ok) {
                const msgData = await msgResponse.json()
                const messages = msgData.messages || []

                let conversationTitle = conv.title
                if (!conversationTitle || conversationTitle === "undefined" || conversationTitle === "New Chat") {
                  if (messages.length > 0) {
                    const firstUserMessage = messages.find((msg) => msg.role === "user")
                    if (firstUserMessage?.content) {
                      // Generate a smart title from the first user message
                      const content = firstUserMessage.content.trim()
                      if (content.length > 40) {
                        // Find a good breaking point
                        const breakPoint = content.substring(0, 40).lastIndexOf(" ")
                        conversationTitle = content.substring(0, breakPoint > 20 ? breakPoint : 40) + "..."
                      } else {
                        conversationTitle = content
                      }

                      // Auto-generate better title using AI
                      try {
                        const titleResponse = await fetch("/api/generate-title", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            content: firstUserMessage.content,
                            conversationId: conv.id,
                            firebaseUid: user?.uid,
                          }),
                        })
                        if (titleResponse.ok) {
                          const titleData = await titleResponse.json()
                          if (titleData.title) {
                            conversationTitle = titleData.title
                          }
                        }
                      } catch (error) {
                        console.log("Title generation failed, using fallback")
                      }
                    } else {
                      conversationTitle = "New Chat"
                    }
                  } else {
                    conversationTitle = "New Chat"
                  }
                }

                let messagePreview = "No messages yet"
                if (messages.length > 0) {
                  const lastMessage = messages[0]
                  const previewText = lastMessage.content?.substring(0, 60) || ""
                  const rolePrefix = lastMessage.role === "user" ? "You: " : "AI: "
                  messagePreview = rolePrefix + previewText + (lastMessage.content?.length > 60 ? "..." : "")
                }

                return {
                  ...conv,
                  title: conversationTitle,
                  message_preview: messagePreview,
                }
              }
            } catch (error) {
              console.error("Error fetching message preview:", error)
            }

            let conversationTitle = conv.title
            if (!conversationTitle || conversationTitle === "undefined") {
              conversationTitle = "New Chat"
            }

            return { ...conv, title: conversationTitle, message_preview: "No messages yet" }
          }),
        )
        setConversations(conversationsWithPreview)
      }
    } catch (error) {
      console.error("Get conversations error:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`/api/users?firebaseUid=${user?.uid}`)
      if (response.ok) {
        const data = await response.json()
        setUserProfile(data.user)
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error)
    }
  }

  const createNewConversation = async () => {
    try {
      const newConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newConversationId,
          title: "New Chat",
          aiModel: userProfile?.subscription_type === "pro" ? "zuki" : "openrouter",
          firebaseUid: user?.uid,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        onConversationSelect(data.conversation?.id || newConversationId)
        fetchConversations()
        toast({
          title: "Success",
          description: "New conversation created!",
        })
      }
    } catch (error) {
      console.error("Create conversation error:", error)
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      })
    }
  }

  const deleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm("Are you sure you want to delete this conversation?")) return

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firebaseUid: user?.uid }),
      })

      if (response.ok) {
        setConversations((prev) => prev.filter((conv) => conv.id !== conversationId))
        if (currentConversationId === conversationId) {
          onConversationSelect(null)
        }
        toast({
          title: "Success",
          description: "Conversation deleted successfully",
        })
      }
    } catch (error) {
      console.error("Delete conversation error:", error)
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      })
    }
  }

  const startEditing = (conversation: Conversation, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(conversation.id)
    setEditTitle(conversation.title)
  }

  const saveTitle = async (conversationId: string) => {
    if (!editTitle.trim()) return

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          firebaseUid: user?.uid,
        }),
      })

      if (response.ok) {
        setConversations((prev) =>
          prev.map((conv) => (conv.id === conversationId ? { ...conv, title: editTitle.trim() } : conv)),
        )
        setEditingId(null)
        toast({
          title: "Success",
          description: "Conversation renamed successfully",
        })
      }
    } catch (error) {
      console.error("Rename conversation error:", error)
      toast({
        title: "Error",
        description: "Failed to rename conversation",
        variant: "destructive",
      })
    }
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditTitle("")
  }

  const handleLogout = async () => {
    await signOut()
    router.push("/")
  }

  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 mb-4">
          <div>
            <h1 className="text-sidebar-foreground font-semibold">VenTY AI</h1>
            <p className="text-xs text-muted-foreground">Your AI Assistant</p>
          </div>
        </div>

        <Button onClick={createNewConversation} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          <Plus className="h-4 w-4 mr-2" />
          <span className="text-white dark:text-accent-foreground">New Chat</span>
        </Button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        <style jsx>{`
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent mx-auto"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div key={conversation.id} className="group relative">
                <Button
                  variant="ghost"
                  onClick={() => onConversationSelect(conversation.id)}
                  className={`w-full justify-start text-left p-3 h-auto pr-12 ${
                    currentConversationId === conversation.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="h-3 w-3 flex-shrink-0" />
                      {editingId === conversation.id ? (
                        <div className="flex items-center gap-1 flex-1">
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="h-6 text-xs bg-transparent border-gray-600 text-white"
                            onKeyPress={(e) => {
                              if (e.key === "Enter") saveTitle(conversation.id)
                              if (e.key === "Escape") cancelEditing()
                            }}
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              saveTitle(conversation.id)
                            }}
                            className="h-6 w-6 p-0 text-green-500 hover:text-green-400"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              cancelEditing()
                            }}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-400"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm font-medium truncate">{conversation.title}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{conversation.message_preview}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(conversation.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </Button>

                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 h-6 w-6 text-muted-foreground hover:text-white hover:bg-gray-800"
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-gray-900 border-gray-700 text-white">
                      <DropdownMenuItem
                        onClick={(e) => startEditing(conversation, e)}
                        className="text-white hover:bg-gray-800 cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => deleteConversation(conversation.id, e)}
                        className="text-red-400 hover:bg-red-900/20 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border">
        {userProfile && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-sidebar-foreground truncate">{userProfile.display_name}</span>
            </div>
            <Badge
              variant={userProfile.subscription_type === "pro" ? "default" : "secondary"}
              className={
                userProfile.subscription_type === "pro"
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-secondary-foreground"
              }
            >
              {userProfile.subscription_type === "pro" ? (
                <>
                  <Crown className="h-3 w-3 mr-1" />
                  VenTY Pro
                </>
              ) : (
                "VenTY Lite"
              )}
            </Badge>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
