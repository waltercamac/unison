import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function run() {
    const res1 = await supabase.from('appointments').update({ status: 'no_show' }).eq('id', '11111111-1111-1111-1111-111111111111')
    console.log("NO_SHOW:", res1.error?.message || "OK")

    const res2 = await supabase.from('clients').insert([{ first_name: 'test', last_name: 'test', phone: '123', status: 'evaluacion' }])
    console.log("EVALUACION:", res2.error?.message || "OK")

    // Clean up if it actually inserted
    if (res2.data) {
        await supabase.from('clients').delete().eq('id', res2.data[0].id)
    }
}
run()
