"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Crown, Search, Users } from "lucide-react"

interface User {
  id: string
  firebase_uid: string
  email: string
  display_name: string
  subscription_type: "lite" | "pro"
  created_at: string
  updated_at: string
}

export default function AdminUsers() {
  const { user } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const adminStatus = localStorage.getItem("isAdmin")
    if (!adminStatus || adminStatus !== "true") {
      router.push("/admin/login")
      return
    }
    setIsAdmin(true)
  }, [router])

  useEffect(() => {
    if (isAdmin && user) {
      fetchUsers()
    }
  }, [isAdmin, user])

  useEffect(() => {
    const filtered = users.filter(
      (user) =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredUsers(filtered)
  }, [users, searchTerm])

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/admin/users?firebaseUid=${user?.uid}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateSubscription = async (userId: string, newType: "lite" | "pro") => {
    try {
      const response = await fetch("/api/admin/users/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          subscriptionType: newType,
          firebaseUid: user?.uid,
        }),
      })

      if (response.ok) {
        // Refresh users list
        fetchUsers()
      }
    } catch (error) {
      console.error("Failed to update subscription:", error)
    }
  }

  if (!isAdmin || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/dashboard")}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-4">
            <Users className="h-8 w-8 text-red-500" />
            <div>
              <h1 className="text-3xl font-bold text-white">User Management</h1>
              <p className="text-gray-400">Manage VenTY AI users and subscriptions</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <Card className="bg-gray-800/50 border-gray-700 mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-white">{user.display_name || "No Name"}</h3>
                      <Badge
                        variant={user.subscription_type === "pro" ? "default" : "secondary"}
                        className={
                          user.subscription_type === "pro"
                            ? "bg-yellow-600 text-yellow-100"
                            : "bg-blue-600 text-blue-100"
                        }
                      >
                        {user.subscription_type === "pro" ? (
                          <>
                            <Crown className="h-3 w-3 mr-1" />
                            VenTY Pro
                          </>
                        ) : (
                          "VenTY Lite"
                        )}
                      </Badge>
                    </div>
                    <p className="text-gray-400 text-sm">{user.email}</p>
                    <p className="text-gray-500 text-xs">Joined: {new Date(user.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    {user.subscription_type === "lite" ? (
                      <Button
                        size="sm"
                        onClick={() => updateSubscription(user.id, "pro")}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white"
                      >
                        <Crown className="h-3 w-3 mr-1" />
                        Upgrade to Pro
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateSubscription(user.id, "lite")}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        Downgrade to Lite
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  {searchTerm ? "No users found matching your search." : "No users found."}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
