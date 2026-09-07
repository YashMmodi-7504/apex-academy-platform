import { supabaseAdmin } from './src/backend/database/supabaseAdmin.ts';

async function main() {
  const bucketsToEnsure = [
    { name: 'course-materials', public: false },
    { name: 'lesson-resources', public: false },
    { name: 'certificates', public: false },
    { name: 'avatars', public: true },
  ];

  for (const bucket of bucketsToEnsure) {
    const { data: existing, error: err } = await supabaseAdmin.storage.getBucket(bucket.name);
    if (err || !existing) {
      console.log(`Creating bucket: ${bucket.name}...`);
      const { data, error } = await supabaseAdmin.storage.createBucket(bucket.name, {
        public: bucket.public,
      });
      if (error) {
        console.error(`Failed to create bucket ${bucket.name}:`, error.message);
      } else {
        console.log(`Successfully created bucket ${bucket.name}`);
      }
    } else {
      console.log(`Bucket ${bucket.name} already exists. Updating public status to ${bucket.public}...`);
      const { error } = await supabaseAdmin.storage.updateBucket(bucket.name, {
        public: bucket.public,
      });
      if (error) {
        console.error(`Failed to update bucket ${bucket.name}:`, error.message);
      } else {
        console.log(`Successfully updated bucket ${bucket.name}`);
      }
    }
  }

  // Print all buckets
  const { data: allBuckets, error: listErr } = await supabaseAdmin.storage.listBuckets();
  if (listErr) {
    console.error('Failed to list buckets:', listErr.message);
  } else {
    console.log('\nCurrent Buckets:');
    for (const b of allBuckets) {
      console.log(`- ${b.name} (Public: ${b.public})`);
    }
  }
}

main().catch(console.error);
