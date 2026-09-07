const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const VITE_SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
const VITE_SUPABASE_ANON_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, video_url')
    .in('title', ['Why Statistics Matters in Data & Analytics', 'Descriptive vs Inferential Statistics']);
  
  console.log('--- LESSONS ---');
  console.log(JSON.stringify(lessons, null, 2));

  if (lessons && lessons.length > 0) {
    const { data: resources } = await supabase
      .from('lesson_resources')
      .select('id, lesson_id, title, file_url, resource_type, display_order')
      .in('lesson_id', lessons.map(l => l.id));
    console.log('--- RESOURCES ---');
    console.log(JSON.stringify(resources, null, 2));
  }
}

run().catch(console.error);
