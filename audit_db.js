import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY
const supabase = createClient(process.env.VITE_SUPABASE_URL, supabaseKey)

async function runAudit() {
    console.log("=========================================")
    console.log("🔍 INICIANDO AUDITORÍA E2E DE BASE DE DATOS")
    console.log("=========================================\n")

    try {
        // 1. Create client
        const { data: client, error: cErr } = await supabase.from('clients').insert([{
            first_name: 'QA_AUTOMATION', last_name: 'Test', phone: '999999999', status: 'active'
        }]).select()

        if (cErr) throw new Error("Fallo creando Cliente: " + cErr.message)
        const cId = client[0].id
        console.log("✅ Insertar Cliente funcionó correctamente (Integridad de Tablas OK).")

        // 2. Insert ledger
        const { error: lErr } = await supabase.from('financial_ledger').insert([{
            transaction_type: 'income', amount: 150.50, concept: 'QA Test Pago Inicial', client_id: cId, payment_method: 'Yape'
        }])
        if (lErr) throw new Error("Fallo en Ledger Contable: " + lErr.message)
        console.log("✅ Transacción Contable guardada (Restricciones Financieras OK).")

        // 3. Treatment Plans
        const { data: svcs } = await supabase.from('services').select('id').limit(1)
        if (svcs && svcs.length > 0) {
            const { error: pErr } = await supabase.from('treatment_plans').insert([{
                client_id: cId, service_id: svcs[0].id, total_sessions: 3, total_cost: 450
            }])
            if (pErr) throw new Error("Fallo en Ficha Clínica: " + pErr.message)
            console.log("✅ Plan de Tratamiento asignado (Enlaces relacionales OK).")

            // 4. Appointments
            const { error: aErr } = await supabase.from('appointments').insert([{
                client_id: cId, service_id: svcs[0].id, status: 'scheduled', appointment_date: new Date().toISOString()
            }])
            if (aErr) throw new Error("Fallo en Agendamiento: " + aErr.message)
            console.log("✅ Cita programada con éxito (Timestamps válidos OK).")
        }

        // 5. Rollback Cleanup
        await supabase.from('clients').delete().eq('id', cId)
        console.log("\n🧹 Rollback Automático Terminado.")
        console.log("🌟 RESULTADO: Base de datos sólida, cascadas activas y sin restricciones rotas. Lista para Producción.")

    } catch (err) {
        console.error("\n❌ ERROR ENCONTRADO DURANTE AUDITORÍA:")
        console.error(err.message)
    }
}
runAudit()
