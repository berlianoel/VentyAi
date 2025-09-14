"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { ChatInterface } from "@/components/chat-interface"
import { EnhancedSidebar } from "@/components/enhanced-sidebar"
import { Button } from "@/components/ui/button"
import { Menu, X, User, LogOut, Download } from "lucide-react"
import Link from "next/link"

export default function ChatPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-950 flex overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[50vw] max-w-80 bg-gray-900 border-r border-gray-800">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="text-white font-semibold">Conversations</h2>
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
                <X className="h-4 w-4 text-white" />
              </Button>
            </div>
            <div className="p-4 border-b border-gray-800">
              {user ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-white truncate max-w-[120px]">
                      {user.email?.split("@")[0] || user.email}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => signOut()}>
                    <LogOut className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/auth/login")}
                  className="w-full border-gray-700 text-white hover:bg-red-600 hover:text-white"
                >
                  Sign In
                </Button>
              )}
            </div>
            {user && (
              <EnhancedSidebar
                currentConversationId={currentConversationId}
                onConversationSelect={(id) => {
                  setCurrentConversationId(id)
                  setSidebarOpen(false)
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Desktop sidebar - only show for authenticated users */}
      {user && (
        <div className="hidden lg:block w-80 bg-gray-900 border-r border-gray-800 flex-shrink-0">
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-white truncate max-w-[160px]">
                  {user.email?.split("@")[0] || user.email}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="h-4 w-4 text-gray-400" />
              </Button>
            </div>
          </div>
          <EnhancedSidebar
            currentConversationId={currentConversationId}
            onConversationSelect={setCurrentConversationId}
          />
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="sticky top-0 z-40 flex items-center justify-between p-3 md:p-4 border-b border-gray-800 bg-gray-950/95 backdrop-blur-sm shadow-lg">
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden bg-gray-800 border border-gray-600 text-white hover:text-white hover:bg-gray-700 p-2 md:p-3 rounded-lg"
            >
              <Menu className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </Button>
          )}

          <Link href="/" className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity">
            <img
              src="https://raw.githubusercontent.com/berlianoel/my-database-berlianoel/refs/heads/main/20250903_214554.png"
              alt="VenTY AI"
              className="h-6 md:h-8 w-auto select-none pointer-events-none"
              onError={(e) => {
                e.currentTarget.style.display = "none"
              }}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              style={{
                userSelect: "none",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none",
                WebkitUserDrag: "none",
              }}
            />
            <span className="text-white font-bold text-lg md:text-xl tracking-tight">VenTY AI</span>
          </Link>

          <div className="flex items-center gap-2 md:gap-3">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-600 text-white hover:bg-red-600 hover:text-white hover:border-red-600 bg-gray-800/50 text-xs md:text-sm px-2 md:px-3"
              onClick={() => window.open("https://example.com/download", "_blank")}
            >
              <Download className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Download</span>
            </Button>

            {!user && (
              <Button
                size="sm"
                onClick={() => router.push("/auth/login")}
                className="bg-red-600 hover:bg-red-700 text-white border-0 text-xs md:text-sm px-2 md:px-3"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>

        <ChatInterface conversationId={currentConversationId} onConversationChange={setCurrentConversationId} />
      </div>
    </div>
  )
}
