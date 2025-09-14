"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { resetPassword } from "@/lib/firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { X, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const router = useRouter()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.")
      setIsLoading(false)
      return
    }

    try {
      const { error } = await resetPassword(email)

      if (error) {
        if (error.includes("user-not-found")) {
          setError("No account found with this email address. Please check your email or create a new account.")
        } else if (error.includes("invalid-email")) {
          setError("Please enter a valid email address.")
        } else if (error.includes("too-many-requests")) {
          setError("Too many reset attempts. Please wait a few minutes before trying again.")
        } else {
          setError("Failed to send reset email. Please try again.")
        }
        return
      }

      setShowSuccess(true)
      toast({
        title: "Reset Email Sent!",
        description: "Check your email for password reset instructions.",
      })
    } catch (error: any) {
      console.error("Password reset error:", error)
      setError("Failed to send reset email. Please try again.")
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
              <h2 className="text-2xl font-bold text-white">Check Your Email</h2>
              <p className="text-gray-400">We've sent password reset instructions to your email address.</p>
              <Link href="/auth/login">
                <Button className="w-full bg-red-600 hover:bg-red-700 text-white">Back to Sign In</Button>
              </Link>
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
          <CardTitle className="text-2xl font-bold text-white">Reset Password</CardTitle>
          <CardDescription className="text-gray-400">
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
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
                  <span>Sending...</span>
                </div>
              ) : (
                "Send Reset Email"
              )}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Remember your password?{" "}
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
