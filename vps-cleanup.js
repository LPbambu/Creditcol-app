const { Client } = require('ssh2');

const conn = new Client();

// Stop non-essential containers to free RAM
const commands = [
    'echo "=== ANTES ==="',
    'free -h',
    'echo ""',
    'echo "Deteniendo servicios no esenciales..."',
    'docker stop creditcolpro-supabase-et7b7a-supabase-analytics || true',
    'docker stop creditcolpro-supabase-et7b7a-supabase-studio || true',
    'docker stop creditcolpro-supabase-et7b7a-supabase-imgproxy || true',
    'docker stop creditcolpro-supabase-et7b7a-supabase-edge-functions || true',
    'docker stop creditcolpro-supabase-et7b7a-supabase-vector || true',
    'echo ""',
    'echo "Limpiando cache de Docker..."',
    'docker system prune -f',
    'echo ""',
    'echo "=== DESPUÉS ==="',
    'free -h',
    'echo ""',
    'echo "Contenedores activos:"',
    'docker ps --format "table {{.Names}}\\t{{.Status}}"',
];

conn.on('ready', () => {
    console.log('✅ Conectado al VPS!\n');
    conn.exec(commands.join(' && '), (err, stream) => {
        if (err) { console.error('Error:', err); conn.end(); return; }
        stream.on('data', (data) => { process.stdout.write(data); });
        stream.stderr.on('data', (data) => { process.stderr.write(data); });
        stream.on('close', () => {
            console.log('\n✅ ¡Limpieza completada!');
            conn.end();
        });
    });
}).on('error', (err) => {
    console.error('❌ Error:', err.message);
}).connect({
    host: '76.13.123.210',
    port: 22,
    username: 'root',
    password: '1/a@Yndz.VeceRwMVd-3',
    readyTimeout: 20000
});
