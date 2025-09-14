"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signIn } from "@/lib/firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { X, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { user, error } = await signIn(email, password)

      if (error) {
        if (error.includes("user-not-found")) {
          setError("No account found with this email address. Please check your email or create a new account.")
        } else if (error.includes("wrong-password") || error.includes("invalid-credential")) {
          setError("Incorrect password. Please try again or reset your password.")
        } else if (error.includes("invalid-email")) {
          setError("Please enter a valid email address.")
        } else if (error.includes("too-many-requests")) {
          setError("Too many failed attempts. Please wait a few minutes before trying again.")
        } else if (error.includes("user-disabled")) {
          setError("This account has been disabled. Please contact support.")
        } else {
          setError("Login failed. Please check your email and password.")
        }
        return
      }

      if (user) {
        setShowSuccess(true)
        toast({
          title: "Login Successful!",
          description: `Welcome back, ${user.displayName || user.email}!`,
        })

        setTimeout(() => {
          router.push("/chat")
        }, 1500)
      }
    } catch (error: any) {
      console.error("Login error:", error)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoHome = () => {
    router.push("/")
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900 flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-gray-800/50 border-gray-700">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Welcome Back!</h2>
              <p className="text-gray-400">Redirecting you to chat...</p>
              <div className="flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900 flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-gray-800/50 border-gray-700 relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGoHome}
          className="absolute top-4 right-4 text-gray-400 hover:text-white hover:bg-gray-700 p-2 rounded-lg"
        >
          <X className="h-4 w-4" />
        </Button>

        <CardHeader className="text-center pt-12">
          <div className="mx-auto mb-4">
            <img
              src="https://raw.githubusercontent.com/berlianoel/my-database-berlianoel/refs/heads/main/20250903_214554.png"
              alt="VenTY AI"
              className="h-12 w-auto mx-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Welcome Back</CardTitle>
          <CardDescription className="text-gray-400">Sign in to continue your AI conversations</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white focus:border-red-500 focus:ring-red-500"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white focus:border-red-500 focus:ring-red-500 pr-10"
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400 hover:text-white" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400 hover:text-white" />
                  )}
                </Button>
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Don't have an account?{" "}
              <Link href="/auth/register" className="text-red-400 hover:text-red-300 underline">
                Sign up
              </Link>
            </p>
            <p className="text-gray-400 text-sm mt-2">
              <Link href="/auth/forgot-password" className="text-gray-400 hover:text-gray-300 underline">
                Forgot your password?
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
