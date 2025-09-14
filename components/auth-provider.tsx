"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "firebase/auth"
import { onAuthStateChange, signOut as firebaseSignOut } from "@/lib/firebase/auth"
import { useToast } from "@/hooks/use-toast"

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user)
      setLoading(false)

      if (user && !loading) {
        toast({
          title: "Login Berhasil",
          description: `Selamat datang, ${user.displayName || user.email}!`,
          variant: "success",
        })
        createUserInDatabase(user)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [toast])

  const createUserInDatabase = async (user: User) => {
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split("@")[0],
        }),
      })

      if (!response.ok) {
        console.error("Failed to create user in database")
        toast({
          title: "Error Database",
          description: "Gagal menyimpan data user ke database",
          variant: "error",
        })
      }
    } catch (error) {
      console.error("Failed to create user in database:", error)
      toast({
        title: "Error Database",
        description: "Gagal menyimpan data user ke database",
        variant: "error",
      })
    }
  }

  const handleSignOut = async () => {
    try {
      await firebaseSignOut()
      toast({
        title: "Logout Berhasil",
        description: "Anda telah keluar dari akun",
        variant: "success",
      })
    } catch (error) {
      console.error("Error signing out:", error)
      toast({
        title: "Error Logout",
        description: "Gagal keluar dari akun",
        variant: "error",
      })
    }
  }

  return <AuthContext.Provider value={{ user, loading, signOut: handleSignOut }}>{children}</AuthContext.Provider>
}
