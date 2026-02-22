const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walk(dirPath, callback);
        } else {
            callback(path.join(dir, f));
        }
    });
}

const targetDir = path.join(__dirname, 'src');

walk(targetDir, (filePath) => {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;

        // Strip out common user_id filter patterns
        // E.g., .eq('user_id', user.id) -> removing the whole line or just the expression
        // Because they're often chained like:
        // .select('*')
        // .eq('user_id', user.id)
        // .order('created_at')

        // This regex removes lines containing the exact filter expressions
        // We match any whitespace before the .eq and an optional comma after it
        content = content.replace(/\s*\.eq\('user_id',\s*(user\.id|userId|campaign\.user_id)\)/g, '');

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated: ${filePath}`);
        }
    }
});

console.log('✅ Filters removed successfully.');
