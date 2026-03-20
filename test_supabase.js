import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function runTests() {
    console.log('--- Iniciando Testeo de Profundidad ---');

    // Test 1: Autenticación con credenciales falsas (debe dar error controlado, confirmando que Auth responde)
    console.log('1. Probando Auth...');
    const { error: authError } = await supabase.auth.signInWithPassword({ email: 'test@test.com', password: 'wrongpassword' });
    if (authError) {
        console.log('   ✅ Auth responde correctamente (Rechazado credenciales inválidas).');
    } else {
        console.log('   ❌ Error en Auth: Aceptó credenciales inválidas.');
    }

    // Test 2: Consulta pública a Profiles (RLS dice: "Public profiles are viewable by everyone")
    console.log('2. Probando RLS en Profiles...');
    const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*').limit(1);
    if (profilesError) {
        console.log('   ❌ Error leyendo Profiles:', profilesError.message);
    } else {
        console.log('   ✅ Políticas RLS correctas. Perfiles encontrados:', profiles?.length);
    }

    // Test 3: Inserción anónima a Clients (Debería ser DENEGADA por RLS ya que requiere estar autenticado)
    console.log('3. Probando seguridad en Clients (Inserción anónima)...');
    const { error: clientError } = await supabase.from('clients').insert([{ first_name: 'Hacker', last_name: 'Test', phone: '123', status: 'potential' }]);
    if (clientError) {
        console.log('   ✅ RLS de Clients funciona. Bloqueó inserción anónima:', clientError.message);
    } else {
        console.log('   ❌ FALLO DE SEGURIDAD: Permitió inserción anónima en Clients.');
    }

    console.log('--- Testeo completado ---');
}

runTests();
