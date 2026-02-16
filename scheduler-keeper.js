const http = require('http');
const https = require('https');

const CHECK_INTERVAL = 60 * 1000; // 1 minuto
const SCHEDULER_URL = 'http://localhost:3000/api/campaigns/scheduler'; // Cambia a https si usas SSL local

console.log(`Iniciando monitor de campañas programadas...`);
console.log(`Verificando cada ${CHECK_INTERVAL / 1000} segundos en ${SCHEDULER_URL}`);

function checkScheduler() {
    const protocol = SCHEDULER_URL.startsWith('https') ? https : http;

    const req = protocol.get(SCHEDULER_URL, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log(`[${new Date().toISOString()}] Scheduler check: ${res.statusCode}`);
            // console.log(data); // Descomentar para ver respuesta detallada
        });
    });

    req.on('error', (e) => {
        console.error(`[${new Date().toISOString()}] Error conectando al scheduler: ${e.message}`);
    });
}

// Ejecutar inmediatamente y luego en intervalo
checkScheduler();
setInterval(checkScheduler, CHECK_INTERVAL);
