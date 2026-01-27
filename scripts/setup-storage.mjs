import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

const buckets = [
  {
    id: 'pdf-documents',
    name: 'pdf-documents',
    public: false,
    fileSizeLimit: 104857600, // 100MB
    allowedMimeTypes: ['application/pdf'],
  },
  {
    id: 'pdf-pages',
    name: 'pdf-pages',
    public: false,
    fileSizeLimit: 10485760, // 10MB per page image
    allowedMimeTypes: ['image/jpeg', 'image/png'],
  },
  {
    id: 'bid-attachments',
    name: 'bid-attachments',
    public: false,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: null, // Allow all file types
  },
];

async function setupStorage() {
  console.log('Setting up Supabase Storage buckets...\n');

  for (const bucket of buckets) {
    console.log(`Creating bucket: ${bucket.id}`);

    // Check if bucket exists
    const { data: existing } = await supabase.storage.getBucket(bucket.id);

    if (existing) {
      console.log(`  Bucket "${bucket.id}" already exists, updating...`);

      const { error: updateError } = await supabase.storage.updateBucket(bucket.id, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: bucket.allowedMimeTypes,
      });

      if (updateError) {
        console.error(`  Error updating bucket: ${updateError.message}`);
      } else {
        console.log(`  Updated successfully`);
      }
    } else {
      // Create new bucket
      const { error: createError } = await supabase.storage.createBucket(bucket.id, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: bucket.allowedMimeTypes,
      });

      if (createError) {
        console.error(`  Error creating bucket: ${createError.message}`);
      } else {
        console.log(`  Created successfully`);
      }
    }
  }

  console.log('\nStorage setup complete!');

  // List all buckets
  const { data: allBuckets } = await supabase.storage.listBuckets();
  console.log('\nExisting buckets:');
  allBuckets?.forEach((b) => {
    console.log(`  - ${b.id} (public: ${b.public})`);
  });
}

setupStorage().catch(console.error);
