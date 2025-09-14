# VenTY AI Native App API Documentation

This documentation provides comprehensive information for integrating VenTY AI backend services with native mobile applications.

## Base URL
\`\`\`
https://your-vercel-app.vercel.app/api
\`\`\`

## Authentication
All API endpoints require Firebase UID for user identification. Include `firebaseUid` in request parameters or body.

## API Endpoints

### 1. Conversations Management

#### Get Conversations (with Pagination)
\`\`\`http
GET /api/conversations?firebaseUid={uid}&page={page}&limit={limit}
\`\`\`

**Parameters:**
- `firebaseUid` (required): Firebase user ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of conversations per page (default: 10, max: 50)

**Response:**
\`\`\`json
{
  "conversations": [
    {
      "id": "conv_123",
      "title": "Chat about AI",
      "ai_model": "smart",
      "created_at": "2025-01-07T10:00:00Z",
      "updated_at": "2025-01-07T10:30:00Z",
      "is_pinned": false,
      "is_archived": false
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "hasMore": true
}
\`\`\`

#### Create Conversation
\`\`\`http
POST /api/conversations
\`\`\`

**Body:**
\`\`\`json
{
  "firebaseUid": "user123",
  "title": "New Chat"
}
\`\`\`

**Response:**
\`\`\`json
{
  "conversation": {
    "id": "conv_456",
    "title": "New Chat",
    "firebase_uid": "user123",
    "ai_model": "smart",
    "created_at": "2025-01-07T11:00:00Z"
  }
}
\`\`\`

### 2. Messages Management

#### Get Messages
\`\`\`http
GET /api/messages?conversationId={id}&firebaseUid={uid}&limit={limit}
\`\`\`

**Parameters:**
- `conversationId` (required): Conversation ID
- `firebaseUid` (required): Firebase user ID
- `limit` (optional): Number of messages to retrieve (default: 50)

**Response:**
\`\`\`json
{
  "messages": [
    {
      "id": "msg_123",
      "conversation_id": "conv_123",
      "role": "user",
      "content": "Hello AI",
      "file_url": null,
      "file_type": null,
      "created_at": "2025-01-07T10:00:00Z",
      "isCancelled": false
    },
    {
      "id": "msg_124",
      "conversation_id": "conv_123",
      "role": "assistant",
      "content": "Hello! How can I help you?",
      "created_at": "2025-01-07T10:00:30Z",
      "isCancelled": false
    }
  ]
}
\`\`\`

#### Send Message
\`\`\`http
POST /api/messages
\`\`\`

**Body:**
\`\`\`json
{
  "conversation_id": "conv_123",
  "role": "user",
  "content": "What is AI?",
  "firebaseUid": "user123",
  "file_url": null,
  "file_type": null
}
\`\`\`

### 3. Chat Completion

#### Send Chat Message (Main Endpoint)
\`\`\`http
POST /api/chat
\`\`\`

**Body:**
\`\`\`json
{
  "messages": [
    {
      "role": "user",
      "content": "Explain quantum computing",
      "fileUrl": null,
      "fileType": null
    }
  ],
  "conversationId": "conv_123",
  "aiModel": "smart",
  "firebaseUid": "user123",
  "fileUrl": null,
  "fileType": null
}
\`\`\`

**Response:**
\`\`\`json
{
  "message": "Quantum computing is a revolutionary technology that uses quantum mechanical phenomena...",
  "conversationId": "conv_123",
  "messageId": "msg_125"
}
\`\`\`

#### Guest Chat (No Authentication)
\`\`\`http
POST /api/chat/guest
\`\`\`

**Body:**
\`\`\`json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello"
    }
  ],
  "aiModel": "smart"
}
\`\`\`

**Response:**
\`\`\`json
{
  "message": "Hello! How can I assist you today?"
}
\`\`\`

### 4. User Management

#### Get User Profile
\`\`\`http
GET /api/users?firebaseUid={uid}
\`\`\`

**Response:**
\`\`\`json
{
  "user": {
    "firebase_uid": "user123",
    "display_name": "John Doe",
    "email": "john@example.com",
    "subscription_type": "pro",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
\`\`\`

## AI Models

### Available Models:
- `smart`: VenTY Standard (DeepSeek Chat) - Available for all users
- `smartest`: VenTY Advanced (GPT-4o-mini with vision support) - Requires authentication

## Session Management & Performance

### Optimized Chat Flow:
1. **Immediate UI Update**: Show user message instantly
2. **Background Session Creation**: Create conversation asynchronously if needed
3. **Streaming Response**: AI response appears in real-time
4. **History Pagination**: Load conversations in batches of 2-10 items

### Loading States:
- Show loading spinner on send button during session creation
- Display "VenTY is thinking..." with animated dots during AI processing
- Implement proper cancellation with "Cancelled by user" messages

## Error Handling

### Standard Error Format:
\`\`\`json
{
  "error": "Error description",
  "details": "Additional error details (optional)"
}
\`\`\`

### Common HTTP Status Codes:
- `200`: Success
- `400`: Bad Request (missing parameters)
- `401`: Unauthorized (invalid Firebase UID)
- `500`: Internal Server Error
- `503`: Service Unavailable (AI service down)

### Cancellation Handling:
When user cancels a request, the system will:
1. Abort the ongoing AI request
2. Save a "Cancelled by user" message to history
3. Display the cancellation in chat interface
4. Persist cancellation state for history loading

## Image Handling

### Expired Images:
- Images uploaded to temporary storage expire after 20 minutes
- System automatically replaces expired images with placeholders
- Use `/abstract-geometric-shapes.png` as fallback for expired images

### Image Placeholders:
\`\`\`javascript
// Check if image is expired
const isExpired = (url) => {
  return url && (url.includes('blob.v0.dev') || url.includes('supabase'))
}

// Get placeholder
const getPlaceholder = (originalUrl, fileType) => {
  return isExpired(originalUrl) ? '/abstract-geometric-shapes.png' : originalUrl
}
\`\`\`

## Rate Limiting & Performance

### Recommendations:
- Implement client-side throttling (max 1 request per second)
- Use pagination for conversations (load 2-5 initially, then load more)
- Cache conversations locally for offline viewing
- Compress message content for better performance

### Pagination Best Practices:
\`\`\`javascript
// Load conversations with pagination
const loadConversations = async (page = 1, limit = 5) => {
  const response = await fetch(
    `/api/conversations?firebaseUid=${uid}&page=${page}&limit=${limit}`
  )
  const data = await response.json()
  return {
    conversations: data.conversations,
    hasMore: data.hasMore,
    total: data.total
  }
}
\`\`\`

## Example Integration (React Native)

\`\`\`javascript
class VenTYAPI {
  constructor(baseURL, firebaseUid) {
    this.baseURL = baseURL
    this.firebaseUid = firebaseUid
    this.abortController = null
  }

  async getConversations(page = 1, limit = 5) {
    const response = await fetch(
      `${this.baseURL}/conversations?firebaseUid=${this.firebaseUid}&page=${page}&limit=${limit}`
    )
    return response.json()
  }

  async createConversation(title = "New Chat") {
    const response = await fetch(`${this.baseURL}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firebaseUid: this.firebaseUid,
        title
      })
    })
    return response.json()
  }

  async sendMessage(conversationId, content, aiModel = 'smart') {
    // Cancel previous request if exists
    if (this.abortController) {
      this.abortController.abort()
    }
    
    this.abortController = new AbortController()
    
    const response = await fetch(`${this.baseURL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content }],
        conversationId,
        aiModel,
        firebaseUid: this.firebaseUid
      }),
      signal: this.abortController.signal
    })
    
    return response.json()
  }

  cancelRequest() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  async getMessages(conversationId, limit = 50) {
    const response = await fetch(
      `${this.baseURL}/messages?conversationId=${conversationId}&firebaseUid=${this.firebaseUid}&limit=${limit}`
    )
    return response.json()
  }
}

// Usage Example
const api = new VenTYAPI('https://your-app.vercel.app/api', 'user123')

// Load conversations with pagination
const conversations = await api.getConversations(1, 5)

// Create new conversation
const newConv = await api.createConversation("My Chat")

// Send message with cancellation support
try {
  const result = await api.sendMessage(newConv.conversation.id, 'Hello AI', 'smart')
  console.log('AI Response:', result.message)
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request was cancelled')
  }
}

// Cancel ongoing request
api.cancelRequest()
\`\`\`

## Deployment & Environment

### Required Environment Variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `DEEPSEEK_API_KEY`: DeepSeek API key for smart model
- `OPENAI_API_KEY`: OpenAI API key for smartest model
- `NEXT_PUBLIC_FIREBASE_*`: Firebase configuration

### Deployment URL:
After deploying to Vercel, your API will be available at:
\`\`\`
https://your-project-name.vercel.app/api
\`\`\`

## Support & Troubleshooting

### Common Issues:
1. **Session Creation Slow**: Implement async session creation with loading states
2. **Duplicate AI Responses**: Ensure proper request cancellation and state management
3. **Images Not Loading**: Check for expired URLs and implement placeholder fallbacks
4. **History Loading Slow**: Use pagination and limit initial load to 2-5 conversations

### Debug Tips:
- Check browser console for `[v0]` prefixed logs
- Verify Firebase UID is correctly passed in all requests
- Test with guest mode first (no authentication required)
- Use network tab to monitor API response times

For technical support or questions about the API, please contact the development team.
