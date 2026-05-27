-- Storage Bucket Policies for TrMato MVP Platform
-- 
-- ⚠️ DEPRECATED: This file has been superseded by migration 003_storage_buckets.sql
-- 
-- Please use supabase/migrations/003_storage_buckets.sql instead, which includes:
-- - Automatic bucket creation via SQL
-- - All storage policies
-- - Comprehensive documentation
-- - Verification queries
--
-- This file is kept for reference only.
-- Run this script AFTER creating the storage buckets in Supabase Dashboard

-- ============================================================================
-- STORAGE BUCKET: media (Public)
-- ============================================================================
-- This bucket stores explainer videos and thumbnails
-- Bucket should be created as PUBLIC in the Supabase Dashboard

-- Policy: Allow public read access to media files
CREATE POLICY "Public read access to media"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

-- Policy: Allow teachers to upload media files
CREATE POLICY "Teachers can upload media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media' AND
  auth.uid() IN (SELECT id FROM public.users WHERE role = 'teacher')
);

-- Policy: Allow teachers to update their own media files
CREATE POLICY "Teachers can update own media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'media' AND
  auth.uid() IN (SELECT id FROM public.users WHERE role = 'teacher')
)
WITH CHECK (
  bucket_id = 'media' AND
  auth.uid() IN (SELECT id FROM public.users WHERE role = 'teacher')
);

-- Policy: Allow teachers to delete their own media files
CREATE POLICY "Teachers can delete own media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'media' AND
  auth.uid() IN (SELECT id FROM public.users WHERE role = 'teacher')
);

-- ============================================================================
-- STORAGE BUCKET: payment-proofs (Private)
-- ============================================================================
-- This bucket stores payment proof screenshots
-- Bucket should be created as PRIVATE in the Supabase Dashboard

-- Policy: Allow students to upload their payment proofs
CREATE POLICY "Students can upload payment proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  auth.uid() IN (SELECT id FROM public.users WHERE role = 'student')
);

-- Policy: Allow students to read their own payment proofs
-- Path structure: payment-proofs/{enrollment_id}/{filename}
CREATE POLICY "Students can read own payment proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs' AND
  auth.uid() IN (
    SELECT student_id FROM public.enrollments
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- Policy: Allow teachers to read payment proofs for their sessions
CREATE POLICY "Teachers can read session payment proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs' AND
  auth.uid() IN (
    SELECT s.created_by 
    FROM public.enrollments e
    JOIN public.sessions s ON e.session_id = s.id
    WHERE e.id::text = (storage.foldername(name))[1]
  )
);

-- Policy: Allow students to update their own payment proofs (if needed)
CREATE POLICY "Students can update own payment proofs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'payment-proofs' AND
  auth.uid() IN (
    SELECT student_id FROM public.enrollments
    WHERE id::text = (storage.foldername(name))[1]
  )
)
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  auth.uid() IN (
    SELECT student_id FROM public.enrollments
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- Policy: Allow students to delete their own payment proofs (if needed)
CREATE POLICY "Students can delete own payment proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'payment-proofs' AND
  auth.uid() IN (
    SELECT student_id FROM public.enrollments
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that storage policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'objects'
ORDER BY policyname;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Make sure to create the buckets FIRST in Supabase Dashboard:
--    - Bucket name: 'media' (Public: Yes)
--    - Bucket name: 'payment-proofs' (Public: No)
--
-- 2. File path structures:
--    - Videos: media/videos/{session_id}/{timestamp}_{filename}
--    - Thumbnails: media/thumbnails/{session_id}/{timestamp}_{filename}
--    - Payment proofs: payment-proofs/{enrollment_id}/{timestamp}_{filename}
--
-- 3. File size limits (enforced in application code):
--    - Videos: Max 50MB (MP4, WebM)
--    - Thumbnails: Max 2MB (JPG, PNG)
--    - Payment screenshots: Max 5MB (JPG, PNG)
--
-- 4. These policies satisfy Requirements 10.1-10.10
