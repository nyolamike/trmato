-- ============================================================================
-- Storage Verification Script
-- Run this after applying migration 003_storage_buckets.sql
-- ============================================================================

-- ============================================================================
-- 1. Verify Storage Buckets Exist
-- ============================================================================

SELECT 
  '=== STORAGE BUCKETS ===' AS section;

SELECT 
  id AS bucket_id,
  name AS bucket_name,
  CASE WHEN public THEN 'Public' ELSE 'Private' END AS access_type,
  file_size_limit / 1024 / 1024 AS size_limit_mb,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id IN ('media', 'payment-proofs')
ORDER BY id;

-- Expected Results:
-- media: Public, 50MB, ['video/mp4', 'video/webm', 'image/jpeg', 'image/png']
-- payment-proofs: Private, 5MB, ['image/jpeg', 'image/png']

-- ============================================================================
-- 2. Verify Storage Policies Exist
-- ============================================================================

SELECT 
  '=== STORAGE POLICIES ===' AS section;

SELECT 
  policyname AS policy_name,
  cmd AS operation,
  CASE 
    WHEN policyname LIKE '%media%' THEN 'media'
    WHEN policyname LIKE '%payment%' THEN 'payment-proofs'
    ELSE 'unknown'
  END AS bucket,
  CASE 
    WHEN policyname LIKE '%public%' OR policyname LIKE '%Public%' THEN 'Public'
    WHEN policyname LIKE '%Teacher%' OR policyname LIKE '%teacher%' THEN 'Teachers'
    WHEN policyname LIKE '%Student%' OR policyname LIKE '%student%' THEN 'Students'
    ELSE 'Other'
  END AS who_can_access
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
ORDER BY bucket, operation, policy_name;

-- Expected Policies:
-- Media bucket:
--   - Public read access to media (SELECT)
--   - Teachers can upload media (INSERT)
--   - Teachers can update own media (UPDATE)
--   - Teachers can delete own session media (DELETE)
--
-- Payment-proofs bucket:
--   - Students can upload payment proofs (INSERT)
--   - Students can read own payment proofs (SELECT)
--   - Teachers can read session payment proofs (SELECT)
--   - Students can update own payment proofs (UPDATE)
--   - Students can delete own payment proofs (DELETE)

-- ============================================================================
-- 3. Count Storage Policies by Bucket
-- ============================================================================

SELECT 
  '=== POLICY COUNT BY BUCKET ===' AS section;

SELECT 
  CASE 
    WHEN policyname LIKE '%media%' THEN 'media'
    WHEN policyname LIKE '%payment%' THEN 'payment-proofs'
    ELSE 'other'
  END AS bucket,
  COUNT(*) AS policy_count
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
GROUP BY bucket
ORDER BY bucket;

-- Expected Results:
-- media: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- payment-proofs: 5 policies (INSERT, 2x SELECT, UPDATE, DELETE)

-- ============================================================================
-- 4. Verify Policy Operations Coverage
-- ============================================================================

SELECT 
  '=== POLICY OPERATIONS COVERAGE ===' AS section;

SELECT 
  CASE 
    WHEN policyname LIKE '%media%' THEN 'media'
    WHEN policyname LIKE '%payment%' THEN 'payment-proofs'
    ELSE 'other'
  END AS bucket,
  cmd AS operation,
  COUNT(*) AS policy_count
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
GROUP BY bucket, cmd
ORDER BY bucket, cmd;

-- Expected Results:
-- media: SELECT (1), INSERT (1), UPDATE (1), DELETE (1)
-- payment-proofs: SELECT (2), INSERT (1), UPDATE (1), DELETE (1)

-- ============================================================================
-- 5. Test Bucket Configuration
-- ============================================================================

SELECT 
  '=== BUCKET CONFIGURATION TEST ===' AS section;

-- Check media bucket is public
SELECT 
  'media bucket is public' AS test,
  CASE WHEN public THEN 'PASS ✓' ELSE 'FAIL ✗' END AS result
FROM storage.buckets
WHERE id = 'media';

-- Check payment-proofs bucket is private
SELECT 
  'payment-proofs bucket is private' AS test,
  CASE WHEN NOT public THEN 'PASS ✓' ELSE 'FAIL ✗' END AS result
FROM storage.buckets
WHERE id = 'payment-proofs';

-- Check media bucket size limit is 50MB
SELECT 
  'media bucket size limit is 50MB' AS test,
  CASE WHEN file_size_limit = 52428800 THEN 'PASS ✓' ELSE 'FAIL ✗' END AS result
FROM storage.buckets
WHERE id = 'media';

-- Check payment-proofs bucket size limit is 5MB
SELECT 
  'payment-proofs bucket size limit is 5MB' AS test,
  CASE WHEN file_size_limit = 5242880 THEN 'PASS ✓' ELSE 'FAIL ✗' END AS result
FROM storage.buckets
WHERE id = 'payment-proofs';

-- ============================================================================
-- 6. Verify MIME Types
-- ============================================================================

SELECT 
  '=== MIME TYPE VALIDATION ===' AS section;

-- Check media bucket MIME types
SELECT 
  'media bucket allows video/mp4' AS test,
  CASE WHEN 'video/mp4' = ANY(allowed_mime_types) THEN 'PASS ✓' ELSE 'FAIL ✗' END AS result
FROM storage.buckets
WHERE id = 'media';

SELECT 
  'media bucket allows video/webm' AS test,
  CASE WHEN 'video/webm' = ANY(allowed_mime_types) THEN 'PASS ✓' ELSE 'FAIL ✗' END AS result
FROM storage.buckets
WHERE id = 'media';

SELECT 
  'media bucket allows image/jpeg' AS test,
  CASE WHEN 'image/jpeg' = ANY(allowed_mime_types) THEN 'PASS ✓' ELSE 'FAIL ✗' END AS result
FROM storage.buckets
WHERE id = 'media';

SELECT 
  'media bucket allows image/png' AS test,
  CASE WHEN 'image/png' = ANY(allowed_mime_types) THEN 'PASS ✓' ELSE 'FAIL ✗' END AS result
FROM storage.buckets
WHERE id = 'media';

-- Check payment-proofs bucket MIME types
SELECT 
  'payment-proofs bucket allows image/jpeg' AS test,
  CASE WHEN 'image/jpeg' = ANY(allowed_mime_types) THEN 'PASS ✓' ELSE 'FAIL ✗' END AS result
FROM storage.buckets
WHERE id = 'payment-proofs';

SELECT 
  'payment-proofs bucket allows image/png' AS test,
  CASE WHEN 'image/png' = ANY(allowed_mime_types) THEN 'PASS ✓' ELSE 'FAIL ✗' END AS result
FROM storage.buckets
WHERE id = 'payment-proofs';

-- ============================================================================
-- 7. Requirements Validation Summary
-- ============================================================================

SELECT 
  '=== REQUIREMENTS VALIDATION ===' AS section;

SELECT 
  '10.1' AS requirement,
  'Explainer videos in public media bucket' AS description,
  CASE WHEN EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'media' AND public = true
  ) THEN 'PASS ✓' ELSE 'FAIL ✗' END AS status;

SELECT 
  '10.2' AS requirement,
  'Video thumbnails in public media bucket' AS description,
  CASE WHEN EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'media' AND public = true
  ) THEN 'PASS ✓' ELSE 'FAIL ✗' END AS status;

SELECT 
  '10.3' AS requirement,
  'Payment screenshots in private payment-proofs bucket' AS description,
  CASE WHEN EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'payment-proofs' AND public = false
  ) THEN 'PASS ✓' ELSE 'FAIL ✗' END AS status;

SELECT 
  '10.4' AS requirement,
  'Public read access to media bucket' AS description,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
      AND policyname = 'Public read access to media'
      AND cmd = 'SELECT'
  ) THEN 'PASS ✓' ELSE 'FAIL ✗' END AS status;

SELECT 
  '10.5' AS requirement,
  'Teachers can upload to media bucket' AS description,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
      AND policyname = 'Teachers can upload media'
      AND cmd = 'INSERT'
  ) THEN 'PASS ✓' ELSE 'FAIL ✗' END AS status;

SELECT 
  '10.6' AS requirement,
  'Session owner can delete from media bucket' AS description,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
      AND policyname LIKE '%delete%media%'
      AND cmd = 'DELETE'
  ) THEN 'PASS ✓' ELSE 'FAIL ✗' END AS status;

SELECT 
  '10.7' AS requirement,
  'Students can upload to payment-proofs bucket' AS description,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
      AND policyname = 'Students can upload payment proofs'
      AND cmd = 'INSERT'
  ) THEN 'PASS ✓' ELSE 'FAIL ✗' END AS status;

SELECT 
  '10.8' AS requirement,
  'Restricted read access to payment-proofs bucket' AS description,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
      AND policyname LIKE '%read%payment%'
      AND cmd = 'SELECT'
  ) THEN 'PASS ✓' ELSE 'FAIL ✗' END AS status;

-- ============================================================================
-- 8. Summary
-- ============================================================================

SELECT 
  '=== VERIFICATION SUMMARY ===' AS section;

SELECT 
  'Total storage buckets created' AS metric,
  COUNT(*)::text AS value
FROM storage.buckets
WHERE id IN ('media', 'payment-proofs');

SELECT 
  'Total storage policies created' AS metric,
  COUNT(*)::text AS value
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND (policyname LIKE '%media%' OR policyname LIKE '%payment%');

SELECT 
  'All requirements validated' AS metric,
  CASE WHEN (
    SELECT COUNT(*) FROM storage.buckets WHERE id IN ('media', 'payment-proofs')
  ) = 2 AND (
    SELECT COUNT(*) FROM pg_policies 
    WHERE tablename = 'objects' 
      AND schemaname = 'storage'
      AND (policyname LIKE '%media%' OR policyname LIKE '%payment%')
  ) >= 9 THEN 'YES ✓' ELSE 'NO ✗' END AS value;

-- ============================================================================
-- END OF VERIFICATION
-- ============================================================================
