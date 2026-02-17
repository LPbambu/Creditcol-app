const { Client } = require('ssh2');

const conn = new Client();
const commands = [
    'docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Size}}"',
    'echo "===MEMORIA==="',
    'free -h',
    'echo "===DISCO==="',
    'df -h /',
    'echo "===TOP PROCESOS CPU==="',
    'ps aux --sort=-%cpu | head -10',
    'echo "===DOCKER IMAGES==="',
    'docker images --format "table {{.Repository}}\\t{{.Size}}"',
    'echo "===DOCKER VOLUMES==="',
    'docker system df'
];

conn.on('ready', () => {
    console.log('✅ Conectado al VPS exitosamente!\n');
    conn.exec(commands.join(' && '), (err, stream) => {
        if (err) { console.error('Error:', err); conn.end(); return; }
        let output = '';
        stream.on('data', (data) => { output += data.toString(); process.stdout.write(data); });
        stream.stderr.on('data', (data) => { process.stderr.write(data); });
        stream.on('close', () => { conn.end(); });
    });
}).on('error', (err) => {
    console.error('❌ Error de conexión:', err.message);
}).connect({
    host: '76.13.123.210',
    port: 22,
    username: 'root',
    password: '1/a@Yndz.VeceRwMVd-3',
    readyTimeout: 20000
});
