export function getImagePlaceholder(originalUrl?: string, fileType?: string): string {
  // Check if image URL is likely expired (contains blob.v0.dev or supabase storage)
  if (originalUrl && (originalUrl.includes("blob.v0.dev") || originalUrl.includes("supabase"))) {
    // Return a placeholder image URL instead of the expired one
    return `/placeholder.svg?height=200&width=300&query=uploaded image placeholder`
  }

  // For other image types, return the original URL
  return originalUrl || `/placeholder.svg?height=200&width=300&query=image placeholder`
}

export function isImageExpired(url?: string): boolean {
  if (!url) return false

  // Check for temporary storage URLs that expire
  return (
    url.includes("blob.v0.dev") ||
    url.includes("supabase.co/storage/") ||
    url.includes("temp-") ||
    url.includes("upload-")
  )
}
