const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config({ path: __dirname + '/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, video_url')
    .in('title', ['Why Statistics Matters in Data & Analytics', 'Descriptive vs Inferential Statistics']);
  
  let out = 'Lessons:\n' + JSON.stringify(lessons, null, 2) + '\n';

  if (lessons && lessons.length > 0) {
    const { data: resources } = await supabase
      .from('lesson_resources')
      .select('id, lesson_id, title, file_url, resource_type')
      .in('lesson_id', lessons.map(l => l.id));
    out += 'Resources:\n' + JSON.stringify(resources, null, 2) + '\n';
  }
  
  fs.writeFileSync('db_out.txt', out);
}

run().catch(console.error);
