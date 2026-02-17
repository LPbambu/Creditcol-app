const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
    console.log('✅ Conectado');

    const sql = [
        "ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS whatsapp_template_id TEXT DEFAULT NULL",
        "ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS is_whatsapp_approved BOOLEAN DEFAULT false",
        "UPDATE message_templates SET whatsapp_template_id = 'HXfbe62d470ba6aab309c5a174c3550ef5', is_whatsapp_approved = true WHERE id = '01fc7fa7-a82c-4cc7-8091-02ca57e122bb'"
    ];

    const fullCmd = sql.map(s => `docker exec creditcolpro-supabase-et7b7a-supabase-db psql -U supabase_admin -d postgres -c "${s}"`).join(' && ');

    conn.exec(fullCmd, (err, stream) => {
        if (err) { console.error(err); conn.end(); return; }
        stream.on('data', (d) => process.stdout.write(d));
        stream.stderr.on('data', (d) => process.stderr.write(d));
        stream.on('close', () => { console.log('\n✅ Base de datos actualizada'); conn.end(); });
    });
}).connect({ host: '76.13.123.210', port: 22, username: 'root', password: '1/a@Yndz.VeceRwMVd-3', readyTimeout: 20000 });
