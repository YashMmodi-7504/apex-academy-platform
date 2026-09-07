import { supabaseAdmin } from './src/backend/database/supabaseAdmin.ts';

async function run() {
  const sql = `
    ALTER TABLE public.lesson_resources 
      DROP CONSTRAINT IF EXISTS lesson_resources_resource_type_check;

    ALTER TABLE public.lesson_resources 
      ADD CONSTRAINT lesson_resources_resource_type_check 
      CHECK (resource_type IN ('PDF', 'PPT', 'NOTE', 'CODE', 'DATASET', 'LINK', 'SUBTITLE', 'NOTEBOOK', 'VIDEO'));
  `;

  try {
    const { data, error } = await supabaseAdmin.rpc('run_sql', { query: sql });
    if (error) {
      console.error('Error executing via rpc:', error);
      process.exit(1);
    }
    console.log('Success:', data);
    process.exit(0);
  } catch (err) {
    console.error('Exception:', err);
    process.exit(1);
  }
}

run();
