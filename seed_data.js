import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error("Error: Faltan credenciales VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el .env")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const services = [
    { name: 'Limpieza Facial Profunda Dermaplaning', price: 120.00 },
    { name: 'Rejuvenecimiento Facial con Toxina Botulínica', price: 450.00 },
    { name: 'Relleno con Ácido Hialurónico 1ml', price: 800.00 },
    { name: 'Paquete Reductor Enzimático x10', price: 600.00 },
    { name: 'Depilación Láser Diodo - Cuerpo Completo', price: 350.00 },
    { name: 'Consulta y Evaluación Dermatológica', price: 50.00 },
    { name: 'Peeling Químico', price: 150.00 }
];

const inventory = [
    { product_name: 'Guantes de Nitrilo Talla M', current_stock: 100, minimum_stock: 50 },
    { product_name: 'Discos de Algodón Premium', current_stock: 12, minimum_stock: 5 },
    { product_name: 'Jeringas de Insulina 1ml', current_stock: 50, minimum_stock: 20 },
    { product_name: 'Crema Anestésica Tópica TKTX', current_stock: 4, minimum_stock: 2 },
    { product_name: 'Viales de Ácido Hialurónico', current_stock: 8, minimum_stock: 3 },
    { product_name: 'Frascos de Toxina Botulínica 100U', current_stock: 6, minimum_stock: 2 },
    { product_name: 'Gasas Estériles (Caja)', current_stock: 15, minimum_stock: 10 }
];

async function seed() {
    console.log("🌱 Iniciando inyección de la Base de Datos Nunayta...");

    // Inyectar Servicios
    console.log("\n📦 Inyectando Catálogo de Servicios...");
    for (const svc of services) {
        const { error } = await supabase.from('services').insert([svc]);
        if (error) {
            console.error(`❌ Error insertando servicio [${svc.name}]:`, error.message);
        } else {
            console.log(`✅ Agregado: ${svc.name} (S/ ${svc.price})`);
        }
    }

    // Inyectar Inventario
    console.log("\n💉 Inyectando Inventario Base...");
    for (const item of inventory) {
        const { error } = await supabase.from('inventory').insert([item]);
        if (error) {
            console.error(`❌ Error insertando insumo [${item.product_name}]:`, error.message);
        } else {
            console.log(`✅ Agregado: ${item.product_name} (Stock: ${item.current_stock})`);
        }
    }

    console.log("\n🚀 ¡Inyección completa y existosa! El sistema ya tiene datos reales.");
    process.exit(0);
}

seed();
