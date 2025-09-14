"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { signOut } from "@/lib/firebase/auth"
import { chatService } from "@/lib/supabase/chat-service"
import { Plus, MessageSquare, Crown, LogOut, User, Trash2, Edit2, Check, X, MoreHorizontal, Search } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Conversation {
  id: string
  title: string
  ai_model: string
  created_at: string
  updated_at: string
  is_pinned: boolean
  is_archived: boolean
  message_preview?: string
}

interface EnhancedSidebarProps {
  currentConversationId: string | null
  onConversationSelect: (id: string | null) => void
}

export function EnhancedSidebar({ currentConversationId, onConversationSelect }: EnhancedSidebarProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [creatingChat, setCreatingChat] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [fetchingLock, setFetchingLock] = useState(false)
  const CONVERSATIONS_PER_PAGE = 2

  useEffect(() => {
    if (user && !fetchingLock) {
      setPage(1)
      setHasMore(true)
      fetchConversations(1, false)
      fetchUserProfile()
    }
  }, [user])

  const fetchConversations = async (pageNum = 1, append = false) => {
    if (!user || fetchingLock) return

    setFetchingLock(true)
    if (!append) setLoading(true)
    else setLoadingMore(true)

    try {
      console.log("[v0] Fetching conversations for user:", user.uid, "page:", pageNum)
      const response = await fetch(
        `/api/conversations?firebaseUid=${user.uid}&page=${pageNum}&limit=${CONVERSATIONS_PER_PAGE}`,
      )

      if (response.ok) {
        const data = await response.json()
        const conversationsData = data.conversations || []
        const totalCount = data.total || 0

        setHasMore(conversationsData.length === CONVERSATIONS_PER_PAGE && pageNum * CONVERSATIONS_PER_PAGE < totalCount)

        const conversationsWithPreview = await Promise.all(
          conversationsData.map(async (conv: any) => {
            const messagesResponse = await fetch(
              `/api/messages?conversationId=${conv.id}&firebaseUid=${user.uid}&limit=1`,
            )
            let messagePreview = "Click to view conversation"
            let title = conv.title || "New Chat"

            if (messagesResponse.ok) {
              const messagesData = await messagesResponse.json()
              const messages = messagesData.messages || []

              if (messages.length > 0) {
                if (title === "New Chat" && messages[0]?.role === "user") {
                  title = await chatService.generateSmartTitle(messages[0].content)
                  await chatService.updateConversation(conv.id, { title })
                }

                const lastMessage = messages[0]
                if (lastMessage) {
                  const previewText = lastMessage.content?.substring(0, 60) || ""
                  const rolePrefix = lastMessage.role === "user" ? "You: " : "AI: "
                  messagePreview = rolePrefix + previewText + (lastMessage.content?.length > 60 ? "..." : "")
                }
              }
            }

            return {
              ...conv,
              title,
              message_preview: messagePreview,
            }
          }),
        )

        console.log("[v0] Loaded conversations:", conversationsWithPreview.length)

        if (append) {
          setConversations((prev) => [...prev, ...conversationsWithPreview])
        } else {
          setConversations(conversationsWithPreview)
        }
      } else {
        const errorText = await response.text()
        console.error("Failed to fetch conversations:", errorText)
        if (!append) setConversations([])

        if (response.status !== 404) {
          toast({
            title: "Error",
            description: "Failed to load conversations",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("Error fetching conversations:", error)
      if (!append) setConversations([])
    } finally {
      if (!append) setLoading(false)
      else setLoadingMore(false)
      setFetchingLock(false)
    }
  }

  const loadMoreConversations = () => {
    if (fetchingLock) return
    const nextPage = page + 1
    setPage(nextPage)
    fetchConversations(nextPage, true)
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
    if (!user || creatingChat) return

    setCreatingChat(true)

    try {
      console.log("[v0] Creating new conversation for user:", user.uid)

      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: user.uid,
          title: "New Chat",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const newConversation = data.conversation
        console.log("[v0] New conversation created:", newConversation)

        onConversationSelect(newConversation.id)

        setConversations((prev) => [newConversation, ...prev])

        setTimeout(() => {
          if (!fetchingLock) {
            fetchConversations()
          }
        }, 300)

        toast({
          title: "New chat created!",
          description: "Ready to start your conversation",
        })
      } else {
        const errorText = await response.text()
        console.error("Failed to create conversation:", errorText)
        throw new Error("Failed to create conversation")
      }
    } catch (error) {
      console.error("Create conversation error:", error)
      toast({
        title: "Error",
        description: "Failed to create conversation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCreatingChat(false)
    }
  }

  const deleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm("Are you sure you want to delete this conversation? This action cannot be undone.")) return

    try {
      const success = await chatService.deleteConversation(conversationId)
      if (success) {
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
      const updated = await chatService.updateConversation(conversationId, { title: editTitle.trim() })
      if (updated) {
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

  const handleConversationSelect = async (conversationId: string) => {
    console.log("[v0] Selecting conversation:", conversationId)
    onConversationSelect(conversationId)

    setConversations((prev) =>
      prev.map((conv) => (conv.id === conversationId ? { ...conv, updated_at: new Date().toISOString() } : conv)),
    )
  }

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.message_preview?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  const sortedConversations = filteredConversations.sort((a, b) => {
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })

  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <img
            src="https://raw.githubusercontent.com/berlianoel/my-database-berlianoel/refs/heads/main/20250903_214554.png"
            alt="VenTY AI"
            className="h-8 w-8 rounded-lg object-cover"
            style={{
              userSelect: "none",
              WebkitUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none",
              WebkitUserDrag: "none",
              KhtmlUserDrag: "none",
              MozUserDrag: "none",
              OUserDrag: "none",
              userDrag: "none",
              pointerEvents: "none",
            }}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
          />
          <div>
            <h1 className="text-white font-semibold">VenTY AI</h1>
            <p className="text-xs text-gray-400">Your AI Assistant</p>
          </div>
        </div>

        <Button
          onClick={createNewConversation}
          disabled={creatingChat}
          className="w-full bg-red-600 hover:bg-red-700 text-white mb-3 disabled:opacity-50"
        >
          {creatingChat ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              <span className="text-white">Creating...</span>
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              <span className="text-white">New Chat</span>
            </>
          )}
        </Button>

        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-600 text-white text-sm placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>

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
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500 mx-auto"></div>
            </div>
          ) : sortedConversations.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{searchQuery ? "No conversations found" : "No conversations yet"}</p>
            </div>
          ) : (
            <>
              {sortedConversations.map((conversation) => (
                <div key={conversation.id} className="group relative">
                  <Button
                    variant="ghost"
                    onClick={() => handleConversationSelect(conversation.id)}
                    className={`w-full justify-start text-left p-3 h-auto pr-12 ${
                      currentConversationId === conversation.id
                        ? "bg-red-600/20 text-white border border-red-500/30"
                        : "text-white hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="h-3 w-3 flex-shrink-0 text-red-400" />

                        {editingId === conversation.id ? (
                          <div className="flex items-center gap-1 flex-1">
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="h-6 text-xs bg-gray-800 border-gray-600 text-white"
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
                              className="h-6 w-6 p-0 text-green-400 hover:text-green-300"
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
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm font-medium truncate text-white">{conversation.title}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{conversation.message_preview}</p>
                      <p className="text-xs text-gray-500 mt-1">
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
                          className="p-1 h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-700"
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-gray-800 border-gray-600 text-white">
                        <DropdownMenuItem
                          onClick={(e) => startEditing(conversation, e)}
                          className="text-white hover:bg-gray-700 cursor-pointer"
                        >
                          <Edit2 className="h-3 w-3 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-gray-600" />
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
              ))}

              {hasMore && !searchQuery && (
                <div className="text-center py-4">
                  <Button
                    onClick={loadMoreConversations}
                    disabled={loadingMore || fetchingLock}
                    variant="ghost"
                    className="text-gray-400 hover:text-white hover:bg-gray-800"
                  >
                    {loadingMore ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                        Loading...
                      </>
                    ) : (
                      "Load More"
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-700">
        {userProfile && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-white truncate">
                {userProfile.display_name?.split("@")[0] || userProfile.display_name}
              </span>
            </div>
            <Badge
              variant={userProfile.subscription_type === "pro" ? "default" : "secondary"}
              className={
                userProfile.subscription_type === "pro" ? "bg-red-600 text-white" : "bg-gray-700 text-gray-300"
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
          className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
