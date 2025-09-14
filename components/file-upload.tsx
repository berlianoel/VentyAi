"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/components/auth-provider"
import { Upload, X, ImageIcon, FileText, Loader2 } from "lucide-react"

interface FileUploadProps {
  onFileUploaded: (file: { url: string; type: string; name: string }) => void
  disabled?: boolean
}

export function FileUpload({ onFileUploaded, disabled }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  const handleFileSelect = async (file: File) => {
    if (!user) {
      alert("Please sign in to upload files")
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 100)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("firebaseUid", user.uid)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Upload failed")
      }

      const result = await response.json()
      onFileUploaded({
        url: result.url,
        type: result.file.file_type,
        name: result.file.filename,
      })
    } catch (error) {
      console.error("Upload error:", error)
      alert(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  return (
    <div className="relative">
      <Input
        ref={fileInputRef}
        type="file"
        onChange={handleFileInputChange}
        accept="image/*,.pdf,.txt,.md,.doc,.docx"
        className="hidden"
        disabled={disabled || uploading}
      />

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 rounded-full border border-border hover:border-accent transition-colors"
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        disabled={disabled || uploading}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
        ) : (
          <Upload className="h-4 w-4 text-muted-foreground hover:text-accent" />
        )}
      </Button>

      {/* Upload progress indicator */}
      {uploading && uploadProgress > 0 && (
        <div className="absolute -top-1 -right-1 h-2 w-2 bg-accent rounded-full animate-pulse" />
      )}
    </div>
  )
}

interface FilePreviewProps {
  file: { url: string; type: string; name: string }
  onRemove: () => void
}

export function FilePreview({ file, onRemove }: FilePreviewProps) {
  const isImage = file.type.startsWith("image/")

  return (
    <div className="relative inline-block bg-card rounded-lg p-2 max-w-xs border border-border shadow-sm">
      <Button
        variant="ghost"
        size="sm"
        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground p-0 shadow-sm"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>

      {isImage ? (
        <div className="space-y-1">
          <img
            src={file.url || "/placeholder.svg"}
            alt={file.name}
            className="max-w-full max-h-20 rounded object-cover"
          />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ImageIcon className="h-3 w-3" />
            <span className="truncate max-w-[120px]">{file.name}</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-1">
          <div className="p-1 rounded bg-accent/10">
            <FileText className="h-3 w-3 text-accent" />
          </div>
          <span className="text-xs text-card-foreground truncate max-w-[100px]">{file.name}</span>
        </div>
      )}
    </div>
  )
}
