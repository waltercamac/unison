import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function setAdmin() {
    console.log('--- Escalando perfiles a ADMIN ---');

    // Update all profiles to admin just for quick MVP testing
    const { data, error } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .neq('role', 'admin'); // or just update all

    if (error) {
        console.error('Error updating profile:', error.message);
    } else {
        console.log('✅ Listo. Tu usuario ahora tiene rol "admin".');
    }
}

setAdmin();
