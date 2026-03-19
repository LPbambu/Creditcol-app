const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
    const commands = [
        "ALTER TABLE leads DISABLE ROW LEVEL SECURITY;"
    ];

    const fullCmd = commands.map(c =>
        `docker exec creditcolpro-supabase-et7b7a-supabase-db psql -U supabase_admin -d postgres -c "${c}"`
    ).join(' && ');

    conn.exec(fullCmd, (err, stream) => {
        if (err) { console.error(err); conn.end(); return; }
        stream.on('data', (d) => process.stdout.write(d));
        stream.stderr.on('data', (d) => process.stderr.write(d));
        stream.on('close', () => { console.log('\n✅ Leads RLS disabled'); conn.end(); });
    });
}).connect({ host: '76.13.123.210', port: 22, username: 'root', password: '1/a@Yndz.VeceRwMVd-3', readyTimeout: 20000 });
