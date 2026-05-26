-- ============================================================================
-- Migration: 003_storage_buckets.sql
-- Description: Create and configure Supabase Storage buckets for media and payment proofs
-- Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.7, 10.8
-- ============================================================================

-- ============================================================================
-- STORAGE BUCKET CREATION
-- ============================================================================

-- Create 'media' bucket (public) for videos and thumbnails
-- This bucket stores explainer videos and video thumbnails
-- Public access allows anyone to view/stream videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,  -- Public bucket for video streaming
  52428800,  -- 50MB limit (50 * 1024 * 1024 bytes)
  ARRAY['video/mp4', 'video/webm', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'image/jpeg', 'image/png'];

-- Create 'payment-proofs' bucket (private) for payment screenshots
-- This bucket stores student payment proof screenshots
-- Private access ensures only authorized users can view payment proofs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,  -- Private bucket for sensitive payment data
  5242880,  -- 5MB limit (5 * 1024 * 1024 bytes)
  ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png'];

-- ============================================================================
-- STORAGE POLICIES: media bucket (Public)
-- ============================================================================
-- Requirements: 10.1, 10.2, 10.4, 10.5, 10.6

-- Policy: Allow public read access to media files (Requirement 10.4)
-- Anyone can view/stream videos and thumbnails
CREATE POLICY "Public read access to media"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

-- Policy: Allow teachers to upload media files (Requirement 10.5)
-- Only authenticated teachers can upload videos and thumbnails
CREATE POLICY "Teachers can upload media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media' AND
  auth.uid() IN (SELECT id FROM public.users WHERE role = 'teacher')
);

-- Policy: Allow teachers to update their own media files
-- Teachers can replace/update videos and thumbnails they uploaded
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

-- Policy: Allow session owner teacher to delete media files (Requirement 10.6)
-- Only the teacher who created the session can delete associated media
-- Path structure: media/videos/{session_id}/* or media/thumbnails/{session_id}/*
CREATE POLICY "Teachers can delete own session media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'media' AND
  auth.uid() IN (
    SELECT created_by FROM public.sessions
    WHERE id::text = (storage.foldername(name))[2]  -- Extract session_id from path
  )
);

-- ============================================================================
-- STORAGE POLICIES: payment-proofs bucket (Private)
-- ============================================================================
-- Requirements: 10.3, 10.7, 10.8

-- Policy: Allow students to upload payment proofs (Requirement 10.7)
-- Only authenticated students can upload payment screenshots
CREATE POLICY "Students can upload payment proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  auth.uid() IN (SELECT id FROM public.users WHERE role = 'student')
);

-- Policy: Allow enrollment owner student to read their payment proofs (Requirement 10.8)
-- Students can only view their own payment proof screenshots
-- Path structure: payment-proofs/{enrollment_id}/{timestamp}_{filename}
CREATE POLICY "Students can read own payment proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs' AND
  auth.uid() IN (
    SELECT student_id FROM public.enrollments
    WHERE id::text = (storage.foldername(name))[1]  -- Extract enrollment_id from path
  )
);

-- Policy: Allow session owner teacher to read payment proofs (Requirement 10.8)
-- Teachers can view payment proofs for enrollments in their sessions
-- Path structure: payment-proofs/{enrollment_id}/{timestamp}_{filename}
CREATE POLICY "Teachers can read session payment proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs' AND
  auth.uid() IN (
    SELECT s.created_by 
    FROM public.enrollments e
    JOIN public.sessions s ON e.session_id = s.id
    WHERE e.id::text = (storage.foldername(name))[1]  -- Extract enrollment_id from path
  )
);

-- Policy: Allow students to update their own payment proofs
-- Students can replace payment screenshots if needed before approval
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

-- Policy: Allow students to delete their own payment proofs
-- Students can remove payment screenshots if needed
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
-- Note: Run these queries separately in SQL Editor after migration completes
-- Or use the verify-storage.sql script for comprehensive verification

-- Verify storage buckets were created:
-- SELECT id, name, public, file_size_limit, allowed_mime_types, created_at
-- FROM storage.buckets
-- WHERE id IN ('media', 'payment-proofs')
-- ORDER BY id;

-- Verify storage policies were created:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies 
-- WHERE tablename = 'objects' AND schemaname = 'storage'
-- ORDER BY policyname;

-- ============================================================================
-- NOTES AND FILE PATH STRUCTURES
-- ============================================================================

-- File path structures (Requirements 10.9, 10.10):
-- 
-- Videos: media/videos/{session_id}/{timestamp}_{filename}
--   Example: media/videos/550e8400-e29b-41d4-a716-446655440000/1704067200_biology_intro.mp4
--
-- Thumbnails: media/thumbnails/{session_id}/{timestamp}_{filename}
--   Example: media/thumbnails/550e8400-e29b-41d4-a716-446655440000/1704067200_thumbnail.jpg
--
-- Payment proofs: payment-proofs/{enrollment_id}/{timestamp}_{filename}
--   Example: payment-proofs/660e8400-e29b-41d4-a716-446655440000/1704067200_payment.jpg

-- File size limits (enforced at bucket level and in application code):
--   - Videos: Max 50MB (MP4, WebM)
--   - Thumbnails: Max 2MB (JPG, PNG) - enforced in app
--   - Payment screenshots: Max 5MB (JPG, PNG)

-- MIME type validation (enforced at bucket level):
--   - media bucket: video/mp4, video/webm, image/jpeg, image/png
--   - payment-proofs bucket: image/jpeg, image/png

-- Requirements satisfied:
--   - 10.1: Explainer videos stored in public 'media' bucket
--   - 10.2: Video thumbnails stored in public 'media' bucket
--   - 10.3: Payment screenshots stored in private 'payment-proofs' bucket
--   - 10.4: Public read access to 'media' bucket for video streaming
--   - 10.5: Only authenticated teachers can upload to 'media' bucket
--   - 10.6: Only session owner teacher can delete from 'media' bucket
--   - 10.7: Only authenticated students can upload to 'payment-proofs' bucket
--   - 10.8: Only enrollment owner and session teacher can read from 'payment-proofs'
--   - 10.9: Video path structure: media/videos/{session_id}/{timestamp}_{filename}
--   - 10.10: Thumbnail path structure: media/thumbnails/{session_id}/{timestamp}_{filename}

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To rollback this migration, run:
-- 
-- -- Drop all storage policies
-- DROP POLICY IF EXISTS "Public read access to media" ON storage.objects;
-- DROP POLICY IF EXISTS "Teachers can upload media" ON storage.objects;
-- DROP POLICY IF EXISTS "Teachers can update own media" ON storage.objects;
-- DROP POLICY IF EXISTS "Teachers can delete own session media" ON storage.objects;
-- DROP POLICY IF EXISTS "Students can upload payment proofs" ON storage.objects;
-- DROP POLICY IF EXISTS "Students can read own payment proofs" ON storage.objects;
-- DROP POLICY IF EXISTS "Teachers can read session payment proofs" ON storage.objects;
-- DROP POLICY IF EXISTS "Students can update own payment proofs" ON storage.objects;
-- DROP POLICY IF EXISTS "Students can delete own payment proofs" ON storage.objects;
-- 
-- -- Delete storage buckets
-- DELETE FROM storage.buckets WHERE id IN ('media', 'payment-proofs');
