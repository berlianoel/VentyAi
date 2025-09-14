# VenTY AI - Your Intelligent Chat Assistant

A modern AI chat application built with Next.js, featuring two subscription tiers and advanced AI capabilities.

## Features

### VenTY Lite (Free)
- Unlimited text conversations
- Fast AI responses powered by OpenRouter
- Chat history and conversation management
- Clean, modern interface

### VenTY Pro (Premium)
- Everything in VenTY Lite
- File and image upload capabilities
- Advanced AI model (GPT-4) via Zuki Journey API
- Image analysis and document processing
- Priority support

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Serverless Functions)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Firebase Auth
- **AI APIs**: 
  - Zuki Journey API (VenTY Pro)
  - OpenRouter API (VenTY Lite)
- **File Storage**: Supabase Storage
- **Deployment**: Vercel

## Environment Variables

Create a `.env.local` file with the following variables:

\`\`\`env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Site URL (required for OpenRouter API)
NEXT_PUBLIC_SITE_URL=https://your-app-name.vercel.app

# AI APIs
ZUKI_API_KEY=your_zuki_api_key
OPENROUTER_API_KEY=your_openrouter_api_key

# Firebase
FIREBASE_SERVICE_ACCOUNT_JSON=your_firebase_service_account_json
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
\`\`\`

## Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

The app will be available as both a web interface and API backend for native mobile apps.

## API Endpoints

- `POST /api/chat` - Send chat messages
- `POST /api/chat/stream` - Stream chat responses
- `POST /api/upload` - Upload files (Pro only)
- `GET /api/conversations` - Get user conversations
- `POST /api/users` - Create/update user profiles

## Admin Panel

Access the admin panel at `/admin/login` with the configured admin credentials to manage users and view system statistics.

## License

MIT License
