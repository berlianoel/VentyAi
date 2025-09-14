import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
})

export const metadata: Metadata = {
  title: "VenTY - Visionary Engine New Thinking Yield",
  description:
    "Advanced AI chat application with file upload capabilities. Choose between VenTY Lite for free chat or VenTY Pro for advanced features with file uploads.",
  icons: {
    icon: "https://raw.githubusercontent.com/berlianoel/my-database-berlianoel/refs/heads/main/20250903_214635.png",
    shortcut: "https://raw.githubusercontent.com/berlianoel/my-database-berlianoel/refs/heads/main/20250903_214635.png",
    apple: "https://raw.githubusercontent.com/berlianoel/my-database-berlianoel/refs/heads/main/20250903_214635.png",
  },
  openGraph: {
    title: "VenTY - Visionary Engine New Thinking Yield",
    description: "Advanced AI chat application with file upload capabilities",
    images: ["https://raw.githubusercontent.com/berlianoel/my-database-berlianoel/refs/heads/main/20250903_214554.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VenTY - Visionary Engine New Thinking Yield",
    description: "Advanced AI chat application with file upload capabilities",
    images: ["https://raw.githubusercontent.com/berlianoel/my-database-berlianoel/refs/heads/main/20250903_214554.png"],
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
