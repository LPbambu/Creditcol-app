const { Client } = require('ssh2');

const conn = new Client();

const SUPABASE_URL = 'http://creditcolpro-supabase-6fb396-76-13-123-210.traefik.me';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzAxNDg2NjksImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.BwYKN3Mh64LqRPSi66JnliwmPyS_kTJOldBTQuJnu7Q';
const SUPABASE_SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzAxNDg2NjksImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlzcyI6InN1cGFiYXNlIn0.4y_wCCqoZzntTaaXY1mpXebMgJnzADTRriwEVfMJ-Rk';

function runCommand(conn, cmd, timeout = 600000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { reject(new Error('Timeout')); }, timeout);
        conn.exec(cmd, (err, stream) => {
            if (err) { clearTimeout(timer); return reject(err); }
            let stdout = '', stderr = '';
            stream.on('data', (data) => { stdout += data; process.stdout.write(data); });
            stream.stderr.on('data', (data) => { stderr += data; process.stderr.write(data); });
            stream.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
        });
    });
}

async function deploy() {
    return new Promise((resolve, reject) => {
        conn.on('ready', async () => {
            console.log('✅ Conectado al VPS!\n');

            try {
                // Pull latest code
                console.log('📦 Actualizando repositorio...');
                await runCommand(conn, 'cd /opt/creditcol-app && git pull origin main');

                // Create env file
                console.log('\n⚙️ Configurando entorno...');
                await runCommand(conn, `echo "NEXT_PUBLIC_APP_URL=http://76.13.123.210:3001" > /opt/creditcol-app/.env.local`);
                await runCommand(conn, `echo "NODE_ENV=production" >> /opt/creditcol-app/.env.local`);
                await runCommand(conn, `echo "NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}" >> /opt/creditcol-app/.env.local`);
                await runCommand(conn, `echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON}" >> /opt/creditcol-app/.env.local`);
                await runCommand(conn, `echo "SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE}" >> /opt/creditcol-app/.env.local`);
                console.log('✅ Entorno configurado\n');

                // Build Docker image with build args
                console.log('🔨 Construyendo imagen Docker (3-5 minutos)...\n');
                const buildCmd = `cd /opt/creditcol-app && docker build --build-arg NEXT_PUBLIC_SUPABASE_URL="${SUPABASE_URL}" --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${SUPABASE_ANON}" --build-arg SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE}" -t creditcol-app:latest .`;
                const buildResult = await runCommand(conn, buildCmd);

                if (buildResult.code !== 0) {
                    console.error('\n❌ Error en la construcción');
                    conn.end();
                    return;
                }
                console.log('\n✅ Imagen construida exitosamente\n');

                // Stop old container
                console.log('🔄 Limpiando contenedor anterior...');
                await runCommand(conn, 'docker stop creditcol-app 2>/dev/null; docker rm creditcol-app 2>/dev/null; echo ok');

                // Run new container
                console.log('\n🚀 Lanzando CreditCol...');
                const runResult = await runCommand(conn,
                    `docker run -d --name creditcol-app --restart unless-stopped -p 3001:3000 -e NEXT_PUBLIC_SUPABASE_URL="${SUPABASE_URL}" -e NEXT_PUBLIC_SUPABASE_ANON_KEY="${SUPABASE_ANON}" -e SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE}" -e NODE_ENV=production creditcol-app:latest`
                );

                // Wait a moment and verify
                await new Promise(r => setTimeout(r, 3000));
                console.log('\n\n📋 Estado:');
                await runCommand(conn, 'docker ps --filter name=creditcol-app --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"');

                // Check logs
                console.log('\n📜 Logs recientes:');
                await runCommand(conn, 'docker logs creditcol-app --tail 5 2>&1');

                console.log('\n\n🎉 ¡DESPLIEGUE COMPLETADO!');
                console.log('🌐 Accede a tu app en: http://76.13.123.210:3001');

                conn.end();
                resolve();
            } catch (err) {
                console.error('❌ Error:', err.message);
                conn.end();
                reject(err);
            }
        }).on('error', reject).connect({
            host: '76.13.123.210',
            port: 22,
            username: 'root',
            password: '1/a@Yndz.VeceRwMVd-3',
            readyTimeout: 30000
        });
    });
}

deploy().catch(console.error);
