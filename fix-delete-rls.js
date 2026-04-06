const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8').split('\n');
  envConfig.forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRLS() {
  console.log('Adding DELETE policy to approval_requests...');
  
  const sql = `
    DROP POLICY IF EXISTS "Usuarios pueden eliminar solicitudes" ON approval_requests;
    CREATE POLICY "Usuarios pueden eliminar solicitudes"
        ON approval_requests FOR DELETE
        TO authenticated
        USING (
            auth.uid() = asesor_id OR 
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND role IN ('evaluador', 'admin')
            )
        );
  `;
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  // Si no tienen la funcion exec_sql en la BD (frecuente), nos dará error.
  // Vamos a intentar insertar por POST usando fetch directo a su GraphQL o rest si es necesario
  // pero la manera real sin la DB pass es avisarle al usuario que lo meta, 
  // O podemos modificar el endpoint de Supabase del server temporariamente.
  
  if (error && (error.code === 'PGRST202' || error.details?.includes('function exec_sql does not exist'))) {
    console.log("No pg_rest function found. Let's create an api route and make a direct driver call if pg string exists...");
  }
}

fixRLS();
