import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("⚠️ ERROR: Faltan variables de entorno de Supabase. Revisa Vercel Settings -> Environment Variables.")
}

export const supabase = createClient(
    supabaseUrl || 'https://missing-url.supabase.co', 
    supabaseAnonKey || 'missing-key'
)
