# Task 6 Summary: Set up Supabase Storage Buckets

## Task Completion

✅ **Task 6: Set up Supabase Storage buckets** - COMPLETED

## What Was Implemented

### 1. Storage Bucket Creation (Migration 003)

Created a new SQL migration file: `supabase/migrations/003_storage_buckets.sql`

**Buckets Created:**
- **media** (Public)
  - Purpose: Store explainer videos and thumbnails
  - Size Limit: 50MB
  - Allowed Types: MP4, WebM, JPEG, PNG
  - Public Access: Yes (for video streaming)

- **payment-proofs** (Private)
  - Purpose: Store payment proof screenshots
  - Size Limit: 5MB
  - Allowed Types: JPEG, PNG
  - Public Access: No (restricted to owner and teacher)

### 2. Storage Policies Implemented

**Media Bucket Policies:**
1. Public read access (anyone can view/stream videos)
2. Teachers can upload media files
3. Teachers can update their own media files
4. Session owner teachers can delete their session media

**Payment-Proofs Bucket Policies:**
1. Students can upload payment proofs
2. Students can read their own payment proofs
3. Session owner teachers can read payment proofs for their sessions
4. Students can update their own payment proofs
5. Students can delete their own payment proofs

### 3. File Path Structures

Implemented standardized path structures as per requirements:

- **Videos**: `media/videos/{session_id}/{timestamp}_{filename}`
- **Thumbnails**: `media/thumbnails/{session_id}/{timestamp}_{filename}`
- **Payment Proofs**: `payment-proofs/{enrollment_id}/{timestamp}_{filename}`

### 4. Documentation Created

1. **Updated README.md**
   - Added migration 003 to the migration list
   - Updated setup instructions to include storage bucket migration
   - Added storage bucket verification steps
   - Updated requirements validation section

2. **Created STORAGE_REFERENCE.md**
   - Comprehensive storage configuration reference
   - File path structure examples
   - Access control policy details
   - Upload/download code examples
   - Security considerations
   - Troubleshooting guide
   - Testing checklist

3. **Created verify-storage.sql**
   - Comprehensive verification script
   - Tests bucket configuration
   - Validates all storage policies
   - Checks MIME type configuration
   - Validates all requirements (10.1-10.10)
   - Provides summary report

4. **Created TASK_6_SUMMARY.md** (this file)
   - Task completion summary
   - Implementation details
   - Requirements mapping

## Requirements Satisfied

This implementation satisfies all requirements from Requirement 10:

| Requirement | Description | Status |
|-------------|-------------|--------|
| 10.1 | Store Explainer_Video files in public 'media' bucket | ✅ |
| 10.2 | Store Video_Thumbnail files in public 'media' bucket | ✅ |
| 10.3 | Store payment screenshots in private 'payment-proofs' bucket | ✅ |
| 10.4 | Allow any user to read files from 'media' bucket | ✅ |
| 10.5 | Allow only authenticated Teachers to upload to 'media' bucket | ✅ |
| 10.6 | Allow only session owner Teacher to delete from 'media' bucket | ✅ |
| 10.7 | Allow only authenticated Students to upload to 'payment-proofs' bucket | ✅ |
| 10.8 | Allow only enrollment owner and session teacher to read from 'payment-proofs' | ✅ |
| 10.9 | Video path structure: media/videos/{session_id}/{timestamp}_{filename} | ✅ |
| 10.10 | Thumbnail path structure: media/thumbnails/{session_id}/{timestamp}_{filename} | ✅ |

## Files Created/Modified

### Created Files:
1. `supabase/migrations/003_storage_buckets.sql` - Storage bucket creation and policies
2. `supabase/STORAGE_REFERENCE.md` - Comprehensive storage documentation
3. `supabase/verify-storage.sql` - Storage verification script
4. `supabase/TASK_6_SUMMARY.md` - This summary document

### Modified Files:
1. `supabase/README.md` - Updated with storage bucket information

## How to Apply This Migration

### Option 1: Supabase Dashboard (Recommended)

1. Log in to your Supabase project at https://app.supabase.com
2. Navigate to **SQL Editor** in the left sidebar
3. Click **"New query"**
4. Copy the entire contents of `supabase/migrations/003_storage_buckets.sql`
5. Paste into the SQL editor
6. Click **"Run"** to execute the migration
7. Verify success by running `supabase/verify-storage.sql`

### Option 2: Supabase CLI

```bash
# Apply the migration
supabase db push

# Or apply specific migration
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/003_storage_buckets.sql
```

## Verification Steps

After applying the migration:

1. **Check buckets exist:**
   ```sql
   SELECT id, name, public, file_size_limit 
   FROM storage.buckets 
   WHERE id IN ('media', 'payment-proofs');
   ```

2. **Check policies exist:**
   ```sql
   SELECT policyname, cmd 
   FROM pg_policies 
   WHERE tablename = 'objects' AND schemaname = 'storage';
   ```

3. **Run comprehensive verification:**
   - Execute `supabase/verify-storage.sql` in SQL Editor
   - All tests should show "PASS ✓"

## Testing Recommendations

### Manual Testing Checklist:

1. **Media Bucket (Public)**
   - [ ] Teacher can upload video file
   - [ ] Teacher can upload thumbnail file
   - [ ] Public user can view/stream video
   - [ ] Student cannot upload to media bucket
   - [ ] Teacher can delete their own session media
   - [ ] Teacher cannot delete other teachers' media

2. **Payment-Proofs Bucket (Private)**
   - [ ] Student can upload payment proof
   - [ ] Student can view their own payment proof
   - [ ] Teacher can view payment proof for their session
   - [ ] Student cannot view other students' payment proofs
   - [ ] Teacher cannot view payment proofs for other teachers' sessions
   - [ ] Student can update/delete their own payment proof

3. **File Validation**
   - [ ] 50MB video file uploads successfully
   - [ ] 51MB video file is rejected
   - [ ] 5MB payment proof uploads successfully
   - [ ] 6MB payment proof is rejected
   - [ ] MP4 video uploads successfully
   - [ ] WebM video uploads successfully
   - [ ] JPEG image uploads successfully
   - [ ] PNG image uploads successfully
   - [ ] PDF file is rejected (not in allowed types)

## Integration with Application Code

### Example: Upload Video (Teacher)

```javascript
import { supabase } from './supabaseClient';

async function uploadVideo(sessionId, videoFile) {
  // Validate file size
  if (videoFile.size > 50 * 1024 * 1024) {
    throw new Error('Video must be under 50MB');
  }
  
  // Validate file type
  if (!['video/mp4', 'video/webm'].includes(videoFile.type)) {
    throw new Error('Only MP4 and WebM formats are supported');
  }
  
  // Upload to storage
  const timestamp = Date.now();
  const filename = `${timestamp}_${videoFile.name}`;
  const filePath = `videos/${sessionId}/${filename}`;
  
  const { data, error } = await supabase.storage
    .from('media')
    .upload(filePath, videoFile);
  
  if (error) throw error;
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('media')
    .getPublicUrl(filePath);
  
  return publicUrl;
}
```

### Example: Upload Payment Proof (Student)

```javascript
async function uploadPaymentProof(enrollmentId, paymentFile) {
  // Validate file size
  if (paymentFile.size > 5 * 1024 * 1024) {
    throw new Error('Payment proof must be under 5MB');
  }
  
  // Validate file type
  if (!['image/jpeg', 'image/png'].includes(paymentFile.type)) {
    throw new Error('Only JPG and PNG formats are supported');
  }
  
  // Upload to storage
  const timestamp = Date.now();
  const filename = `${timestamp}_${paymentFile.name}`;
  const filePath = `${enrollmentId}/${filename}`;
  
  const { data, error } = await supabase.storage
    .from('payment-proofs')
    .upload(filePath, paymentFile);
  
  if (error) throw error;
  
  // Get signed URL (private bucket)
  const { data: { signedUrl } } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(filePath, 3600); // 1 hour expiry
  
  return signedUrl;
}
```

## Security Considerations

### Media Bucket (Public)
- ✅ Videos are publicly accessible by design (for streaming)
- ✅ Only teachers can upload/modify media
- ✅ Session owner can delete their media
- ⚠️ Anyone with the URL can access videos (intentional for video streaming)

### Payment-Proofs Bucket (Private)
- ✅ Payment proofs are private by default
- ✅ Only student owner and session teacher can view
- ✅ Students can only upload to their own enrollments
- ✅ Signed URLs expire after 1 hour
- ✅ Path structure uses enrollment_id for access control

## Performance Considerations

### File Size Limits
- Videos: 50MB max (enforced at bucket level)
- Thumbnails: 2MB max (enforced in application)
- Payment proofs: 5MB max (enforced at bucket level)

### Recommended Compression
- Videos: H.264 codec, 720p, 1-2 Mbps bitrate
- Thumbnails: JPEG 80% quality, max 1920×1080
- Payment proofs: JPEG 80% quality

### Caching Strategy
- Set `cacheControl: '3600'` for 1-hour cache
- Use `preload='metadata'` for video elements
- Lazy load videos when modal opens

## Rollback Instructions

If you need to rollback this migration:

```sql
-- Drop all storage policies
DROP POLICY IF EXISTS "Public read access to media" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can update own media" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can delete own session media" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Students can read own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can read session payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Students can update own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Students can delete own payment proofs" ON storage.objects;

-- Delete storage buckets
DELETE FROM storage.buckets WHERE id IN ('media', 'payment-proofs');
```

## Next Steps

After applying this migration:

1. ✅ Storage buckets configured
2. ⬜ Implement video upload in Teacher Admin Panel
3. ⬜ Implement thumbnail upload in Teacher Admin Panel
4. ⬜ Implement payment proof upload in Student Enrollment flow
5. ⬜ Implement video player in Session Detail Modal
6. ⬜ Test file upload/download functionality
7. ⬜ Test access control policies

## Support and Troubleshooting

For issues or questions:
- Review `supabase/STORAGE_REFERENCE.md` for detailed documentation
- Run `supabase/verify-storage.sql` to check configuration
- Check Supabase logs in the Dashboard for permission errors
- Verify RLS policies are applied correctly
- Ensure user roles are set correctly in the users table

## References

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase Storage RLS](https://supabase.com/docs/guides/storage/security/access-control)
- [File Upload Best Practices](https://supabase.com/docs/guides/storage/uploads)
- Project Requirements: `.kiro/specs/trmato-mvp-platform/requirements.md` (Requirement 10)
- Project Design: `.kiro/specs/trmato-mvp-platform/design.md`
