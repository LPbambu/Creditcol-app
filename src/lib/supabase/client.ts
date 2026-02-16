import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Typed client for strict type checking where needed
export const supabaseTyped = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

// Untyped client for components where type inference causes issues
// This is a workaround for @supabase/ssr type inference problems
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
