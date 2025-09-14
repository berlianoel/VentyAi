"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/components/auth-provider"
import { fileService } from "@/lib/supabase/file-service"
import { Upload, X, ImageIcon, FileText, Loader2, Cloud, Database, AlertCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface EnhancedFileUploadProps {
  onFileUploaded: (file: { url: string; type: string; name: string; id: string }) => void
  disabled?: boolean
  conversationId?: string
  maxSize?: number // in MB
  acceptedTypes?: string[]
  onCancel?: () => void
}

export function EnhancedFileUpload({
  onFileUploaded,
  disabled,
  conversationId,
  maxSize = 10,
  acceptedTypes = ["image/*", ".pdf", ".txt", ".md", ".doc", ".docx"],
  onCancel,
}: EnhancedFileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadMethod, setUploadMethod] = useState<"supabase" | "base64" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadAbortController, setUploadAbortController] = useState<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`
    }

    // Check file type
    const fileType = file.type
    const fileName = file.name.toLowerCase()

    const isValidType = acceptedTypes.some((type) => {
      if (type.startsWith(".")) {
        return fileName.endsWith(type)
      }
      if (type.includes("*")) {
        const baseType = type.split("/")[0]
        return fileType.startsWith(baseType)
      }
      return fileType === type
    })

    if (!isValidType) {
      return `File type not supported. Accepted types: ${acceptedTypes.join(", ")}`
    }

    return null
  }

  const handleFileSelect = async (file: File) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upload files",
        variant: "destructive",
      })
      return
    }

    // Validate file
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      toast({
        title: "Invalid File",
        description: validationError,
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setUploadMethod(null)
    setError(null)

    const controller = new AbortController()
    setUploadAbortController(controller)

    let progressInterval: NodeJS.Timeout | null = null

    try {
      console.log("[v0] Starting file upload:", file.name, file.size, "bytes")

      progressInterval = setInterval(() => {
        if (controller.signal.aborted) {
          if (progressInterval) clearInterval(progressInterval)
          return
        }
        setUploadProgress((prev) => {
          if (prev >= 90) {
            if (progressInterval) clearInterval(progressInterval)
            return 90
          }
          return prev + Math.random() * 10 + 5 // Slightly faster progress
        })
      }, 300)

      const result = await fileService.uploadFile(file, user.email || user.uid, conversationId)

      if (controller.signal.aborted) {
        if (progressInterval) clearInterval(progressInterval)
        return
      }

      if (progressInterval) clearInterval(progressInterval)
      setUploadProgress(100)

      if (!result) {
        throw new Error("Upload failed - please try again")
      }

      const method = result.url.startsWith("data:") ? "base64" : "supabase"
      setUploadMethod(method)

      console.log("[v0] Upload successful:", method, result.name)

      onFileUploaded(result)

      toast({
        title: "Upload Successful!",
        description: `${file.name} uploaded successfully`,
      })
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval)

      if (controller.signal.aborted) {
        return
      }

      console.error("[v0] Upload error:", error)
      let errorMessage = "Failed to upload file"

      if (error instanceof Error) {
        if (error.message.includes("timeout")) {
          errorMessage = "Upload timeout - please try a smaller file or check your connection"
        } else if (error.message.includes("Failed to fetch")) {
          errorMessage = "Network error - please check your connection"
        } else if (error.message.includes("Storage")) {
          errorMessage = "Storage error - trying alternative method"
        } else if (error.message.includes("FileReader")) {
          errorMessage = "File reading error - please try again"
        } else {
          errorMessage = error.message
        }
      }

      setError(errorMessage)
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      if (!controller.signal.aborted) {
        setTimeout(() => {
          setUploading(false)
          setUploadProgress(0)
          setUploadMethod(null)
          if (!controller.signal.aborted) {
            setError(null)
          }
          setUploadAbortController(null)
        }, 1000)
      }
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const cancelUpload = () => {
    if (uploadAbortController) {
      uploadAbortController.abort()
      setUploadAbortController(null)
      setUploading(false)
      setUploadProgress(0)
      setUploadMethod(null)
      setError(null)

      toast({
        title: "Upload Cancelled",
        description: "File upload has been cancelled",
        variant: "default",
      })
    }

    if (onCancel) {
      onCancel()
    }
  }

  return (
    <div className="space-y-3">
      <label htmlFor="file-upload-input" className="cursor-pointer">
        <Input
          id="file-upload-input"
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          accept={acceptedTypes.join(",")}
          className="hidden"
          disabled={disabled || uploading}
        />
      </label>

      {/* Upload Area */}
      <label
        htmlFor="file-upload-input"
        className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 cursor-pointer block ${
          dragOver
            ? "border-red-500 bg-red-500/10"
            : uploading
              ? "border-blue-500 bg-blue-500/10"
              : error
                ? "border-red-500 bg-red-500/5"
                : "border-gray-600 hover:border-gray-500 bg-gray-800/50"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {uploading && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 rounded-full bg-red-600 hover:bg-red-700 text-white p-0 z-10"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              cancelUpload()
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}

        <div className="flex flex-col items-center gap-3 text-center">
          {uploading ? (
            <>
              <div className="relative">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                {uploadMethod && (
                  <div className="absolute -top-1 -right-1">
                    {uploadMethod === "supabase" ? (
                      <Cloud className="h-2 w-2 text-green-500" />
                    ) : (
                      <Database className="h-2 w-2 text-orange-500" />
                    )}
                  </div>
                )}
              </div>
              <div className="w-full max-w-xs">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-gray-400 mt-2">
                  Uploading... {Math.round(uploadProgress)}%
                  {uploadMethod && (
                    <span className="ml-2 text-xs">
                      via {uploadMethod === "supabase" ? "Supabase Storage" : "Base64 Encoding"}
                    </span>
                  )}
                </p>
              </div>
            </>
          ) : error ? (
            <>
              <AlertCircle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-400">Upload Failed</p>
                <p className="text-xs text-gray-400 mt-1">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setError(null)
                  }}
                  className="mt-2 text-xs text-gray-400 hover:text-white"
                >
                  Try Again
                </Button>
              </div>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-white">Drop files here or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">Max {maxSize}MB • Images, PDFs, Documents</p>
              </div>
            </>
          )}
        </div>
      </label>

      {/* Upload Method Indicator */}
      {!uploading && !error && (
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Cloud className="h-3 w-3 text-green-500" />
            <span>Supabase Storage</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Database className="h-3 w-3 text-orange-500" />
            <span>Base64 Fallback</span>
          </div>
        </div>
      )}
    </div>
  )
}

interface EnhancedFilePreviewProps {
  file: { url: string; type: string; name: string; id?: string }
  onRemove: () => void
  showDetails?: boolean
}

export function EnhancedFilePreview({ file, onRemove, showDetails = false }: EnhancedFilePreviewProps) {
  const { user } = useAuth()

  if (!file) {
    console.error("[v0] File object is null or undefined")
    return null
  }

  if (!file.type) {
    console.error("[v0] File type is undefined:", file)
    return null
  }

  if (!file.name) {
    console.error("[v0] File name is undefined:", file)
    return null
  }

  if (!file.url) {
    console.error("[v0] File URL is undefined:", file)
    return null
  }

  const isImage = file.type.startsWith("image/")
  const isBase64 = file.url.startsWith("data:") || false

  const handleDelete = async () => {
    if (file.id && user && !file.id.startsWith("base64_")) {
      try {
        const success = await fileService.deleteFile(file.id, user.email || user.uid)
        if (success) {
          toast({
            title: "File Deleted",
            description: "File has been removed from storage",
          })
        }
      } catch (error) {
        console.error("Delete error:", error)
      }
    }
    onRemove()
  }

  return (
    <div className="relative inline-block bg-gray-800 rounded-lg p-3 max-w-xs border border-gray-700 shadow-sm">
      <Button
        variant="ghost"
        size="sm"
        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 hover:bg-red-700 text-white p-0 shadow-sm z-10"
        onClick={handleDelete}
      >
        <X className="h-3 w-3" />
      </Button>

      {isImage ? (
        <div className="space-y-2">
          <img
            src={file.url || "/placeholder.svg"}
            alt={file.name}
            className="max-w-full max-h-32 rounded object-cover"
            onError={(e) => {
              console.error("Image load error:", e)
              e.currentTarget.src = "/placeholder.svg"
            }}
          />
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <ImageIcon className="h-3 w-3" />
            <span className="truncate max-w-[120px] text-white">{file.name}</span>
            {showDetails && (
              <div className="flex items-center gap-1">
                {isBase64 ? (
                  <Database className="h-3 w-3 text-orange-500" title="Base64 Storage" />
                ) : (
                  <Cloud className="h-3 w-3 text-green-500" title="Supabase Storage" />
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-1">
          <div className="p-1 rounded bg-red-600/20">
            <FileText className="h-4 w-4 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs text-white truncate block max-w-[100px]">{file.name}</span>
            {showDetails && (
              <div className="flex items-center gap-1 mt-1">
                {isBase64 ? (
                  <>
                    <Database className="h-3 w-3 text-orange-500" />
                    <span className="text-xs text-orange-400">Base64</span>
                  </>
                ) : (
                  <>
                    <Cloud className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-400">Supabase</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
