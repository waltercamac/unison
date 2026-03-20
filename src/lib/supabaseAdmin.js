import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// IMPORTANTE: Este cliente tiene privilegios de administrador total.
// Solo debe usarse para funciones privilegiadas como auth.admin.createUser
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || 'MISSING_SERVICE_ROLE_KEY', {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})
