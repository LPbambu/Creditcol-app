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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixBucket() {
  console.log('Fixing bucket desprendibles...');
  const { data, error } = await supabase.storage.updateBucket('desprendibles', {
    public: true,
  });
  
  if (error) {
    if (error.message.includes('not found') || error.message.includes('Resource not found') || error.message.includes('Bucket not found')) {
      console.log('Bucket not found. Creating it as public...');
      const { data: createData, error: createError } = await supabase.storage.createBucket('desprendibles', {
        public: true,
      });
      if (createError) {
         console.error('Error creating bucket:', createError);
      } else {
         console.log('Bucket created public successfully!', createData);
      }
    } else {
      console.error('Error updating bucket:', error);
    }
  } else {
    console.log('Bucket updated to public successfully!', data);
  }
}

fixBucket();
