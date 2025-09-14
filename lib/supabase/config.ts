import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fyrgawcllvttxsknyoue.supabase.co"
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5cmdhd2NsbHZ0dHhza255b3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNTkyNzgsImV4cCI6MjA3MjczNTI3OH0.6f9nYeAN9w6UQra3aeL3Ilwl_hPXcZU4c7cxJPNVdV8"
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5cmdhd2NsbHZ0dHhza255b3VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE1OTI3OCwiZXhwIjoyMDcyNzM1Mjc4fQ.XCZwse4zXw95DQrxSLH-8_qFOIkHyVMxmBBWj4F4SqQ"
const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.NEON_DATABASE_URL ||
  "postgresql://postgres.fyrgawcllvttxsknyoue:YejiUs_XX33@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"

export const getSupabaseServiceClient = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase configuration")
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL }
