"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signUp } from "@/lib/firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { X, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please make sure both passwords are identical.")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long for security.")
      setIsLoading(false)
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.")
      setIsLoading(false)
      return
    }

    try {
      const { user, error } = await signUp(email, password)

      if (error) {
        if (error.includes("email-already-in-use")) {
          setError("An account with this email already exists. Please sign in instead.")
        } else if (error.includes("weak-password")) {
          setError("Password is too weak. Please use a stronger password with at least 6 characters.")
        } else if (error.includes("invalid-email")) {
          setError("Please enter a valid email address.")
        } else {
          setError("Registration failed. Please try again.")
        }
        return
      }

      if (user) {
        // Create user in database
        try {
          await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              firebaseUid: user.uid,
              email: user.email,
              displayName: displayName || user.email?.split("@")[0],
            }),
          })
        } catch (dbError) {
          console.error("Database user creation error:", dbError)
          // Continue anyway, user is created in Firebase
        }

        setShowSuccess(true)
        toast({
          title: "Account Created Successfully!",
          description: `Welcome to VenTY AI, ${displayName || user.email}!`,
        })

        setTimeout(() => {
          router.push("/chat")
        }, 1500)
      }
    } catch (error: any) {
      console.error("Registration error:", error)
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
              <h2 className="text-2xl font-bold text-white">Welcome to VenTY AI!</h2>
              <p className="text-gray-400">Your account has been created successfully.</p>
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
          <CardTitle className="text-2xl font-bold text-white">Join VenTY AI</CardTitle>
          <CardDescription className="text-gray-400">Create your account and start chatting with AI</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-gray-300">
                Display Name
              </Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white focus:border-red-500 focus:ring-red-500"
                placeholder="Your name"
                disabled={isLoading}
              />
            </div>
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
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-300">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white focus:border-red-500 focus:ring-red-500 pr-10"
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                  <span>Creating account...</span>
                </div>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-red-400 hover:text-red-300 underline">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
