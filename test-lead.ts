import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

async function test() {
  const { data, error } = await supabase.from('leads').insert([{
    nombre: 'camilo ojeda panneflek',
    telefono: '3245833561',
    tipo_cliente: 'pensionado',
    reportado_datacredito: false,
    fuente: 'directo',
    estado: 'nuevo',
    observaciones: null
  }])
  console.log('Result:', { data, error })
}
test()
