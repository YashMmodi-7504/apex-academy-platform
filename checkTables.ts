import { supabaseAdmin } from './src/backend/database/supabaseAdmin.ts';

async function main() {
  const { data: stories, error: err1 } = await supabaseAdmin.from('success_stories').select('*');
  console.log('Success stories:', JSON.stringify(stories, null, 2), err1);

  const { data: articles, error: err2 } = await supabaseAdmin.from('articles').select('*');
  console.log('Articles:', JSON.stringify(articles, null, 2), err2);
}

main();
