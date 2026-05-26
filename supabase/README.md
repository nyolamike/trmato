# Supabase Database Setup

This directory contains SQL migration files for the TrMato MVP Platform database schema.

## Migration Files

- `001_initial_schema.sql` - Initial database schema with all tables, indexes, constraints, and RLS policies
- `002_performance_indexes.sql` - Composite indexes for optimized query performance
- `003_storage_buckets.sql` - Storage buckets and policies for media files and payment proofs

## How to Apply Migrations

### Option 1: Using Supabase Dashboard (Recommended for MVP)

1. Log in to your Supabase project at [https://app.supabase.com](https://app.supabase.com)
2. Navigate to **SQL Editor** in the left sidebar
3. Click **"New query"**
4. Copy the entire contents of `001_initial_schema.sql`
5. Paste into the SQL editor
6. Click **"Run"** to execute the migration
7. Repeat steps 3-6 for `002_performance_indexes.sql`
8. Repeat steps 3-6 for `003_storage_buckets.sql`
9. Verify that all tables, indexes, and storage buckets were created successfully

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Link to your remote project
supabase link --project-ref your-project-ref

# Apply the migration
supabase db push
```

### Option 3: Manual Execution via psql

If you have direct database access:

```bash
psql -h db.your-project.supabase.co -U postgres -d postgres -f supabase/migrations/001_initial_schema.sql
```

## Database Schema Overview

### Tables Created

1. **users** - User profiles linked to Supabase Auth
   - Fields: id, username, email, role, created_at
   - Constraints: Unique username and email, role check

2. **sessions** - Tutoring sessions with optional video content
   - Fields: id, title, subject, description, meet_link, scheduled_at, price_ugx, payment_number, payment_name, status, explainer_video, video_thumbnail, created_by, created_at
   - Indexes: scheduled_at, status, subject, full-text search on title/description

3. **enrollments** - Student enrollments with payment proof
   - Fields: id, session_id, student_id, payment_status, payment_screenshot, payment_note, enrolled_at
   - Constraints: Unique (session_id, student_id), payment proof required

4. **session_tags** - Tags for session categorization
   - Fields: id, session_id, tag, created_at
   - Constraints: Unique (session_id, tag), tag length 1-50 chars

5. **topic_requests** - Student and anonymous topic requests
   - Fields: id, student_id, subject, topic, description, email, status, is_anonymous, approved_session_id, rejection_reason, created_at
   - Constraints: Email required for anonymous requests

6. **topic_request_votes** - Upvotes on topic requests
   - Fields: id, request_id, student_id, created_at
   - Constraints: Unique (request_id, student_id)

### Views Created

- **sessions_with_tags** - Sessions with aggregated tags array
- **topic_requests_with_votes** - Topic requests with vote counts

### Triggers

- **on_auth_user_created** - Automatically creates user profile when auth user signs up

## Storage Buckets Setup

Storage buckets are now created automatically via the `003_storage_buckets.sql` migration. This migration creates:

### 1. 'media' Bucket (Public)

- **Purpose**: Store explainer videos and thumbnails
- **Public Access**: Yes (allows video streaming)
- **File Size Limit**: 50MB
- **Allowed Types**: MP4, WebM, JPEG, PNG
- **Path Structure**:
  - Videos: `media/videos/{session_id}/{timestamp}_{filename}`
  - Thumbnails: `media/thumbnails/{session_id}/{timestamp}_{filename}`

### 2. 'payment-proofs' Bucket (Private)

- **Purpose**: Store payment proof screenshots
- **Public Access**: No (private, restricted access)
- **File Size Limit**: 5MB
- **Allowed Types**: JPEG, PNG
- **Path Structure**: `payment-proofs/{enrollment_id}/{timestamp}_{filename}`

### Storage Policies

The migration automatically creates the following RLS policies:

**Media Bucket:**
- Public read access (anyone can view/stream videos)
- Teachers can upload media files
- Teachers can update their own media files
- Session owner teachers can delete their session media

**Payment-Proofs Bucket:**
- Students can upload payment proofs
- Students can read their own payment proofs
- Session owner teachers can read payment proofs for their sessions
- Students can update/delete their own payment proofs

### Manual Setup (Alternative)

If you prefer to create buckets manually via the Supabase Dashboard instead of using the migration:

### 1. Create 'media' Bucket (Public)

1. Go to **Storage** in Supabase Dashboard
2. Click **"New bucket"**
3. Name: `media`
4. Public bucket: **Yes** ✓
5. Click **"Create bucket"**

**Storage Policies for 'media' bucket:**

```sql
-- Allow public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

-- Allow teachers to upload
CREATE POLICY "Teachers can upload media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media' AND
  auth.uid() IN (SELECT id FROM users WHERE role = 'teacher')
);

-- Allow teachers to delete their own media
CREATE POLICY "Teachers can delete own media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'media' AND
  auth.uid() IN (SELECT id FROM users WHERE role = 'teacher')
);
```

### 2. Create 'payment-proofs' Bucket (Private)

1. Go to **Storage** in Supabase Dashboard
2. Click **"New bucket"**
3. Name: `payment-proofs`
4. Public bucket: **No** ✗
5. Click **"Create bucket"**

**Storage Policies for 'payment-proofs' bucket:**

```sql
-- Allow students to upload their payment proofs
CREATE POLICY "Students can upload payment proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  auth.uid() IN (SELECT id FROM users WHERE role = 'student')
);

-- Allow students to read their own payment proofs
CREATE POLICY "Students can read own payment proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow teachers to read payment proofs for their sessions
CREATE POLICY "Teachers can read session payment proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs' AND
  auth.uid() IN (
    SELECT s.created_by 
    FROM enrollments e
    JOIN sessions s ON e.session_id = s.id
    WHERE e.id::text = (storage.foldername(name))[1]
  )
);
```

## Verification Steps

After applying all migrations:

1. **Check Tables:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

2. **Check Indexes:**
   ```sql
   SELECT tablename, indexname FROM pg_indexes 
   WHERE schemaname = 'public' 
   ORDER BY tablename, indexname;
   ```

3. **Check RLS Policies:**
   ```sql
   SELECT schemaname, tablename, policyname 
   FROM pg_policies 
   WHERE schemaname = 'public';
   ```

4. **Check Storage Buckets:**
   ```sql
   SELECT id, name, public, file_size_limit, allowed_mime_types
   FROM storage.buckets
   WHERE id IN ('media', 'payment-proofs');
   ```

5. **Check Storage Policies:**
   ```sql
   SELECT policyname, cmd
   FROM pg_policies 
   WHERE tablename = 'objects' AND schemaname = 'storage'
   ORDER BY policyname;
   ```

6. **Run Complete Storage Verification:**
   ```bash
   # Run the comprehensive storage verification script
   psql -h your-db-host -U postgres -d postgres -f supabase/verify-storage.sql
   ```
   Or execute `verify-storage.sql` in the Supabase SQL Editor

7. **Test User Creation:**
   - Sign up a test user via your app
   - Check that a row appears in the `users` table
   - Verify the trigger worked correctly

## Rollback (if needed)

To rollback all migrations:

```sql
-- Drop storage policies (from migration 003)
DROP POLICY IF EXISTS "Public read access to media" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can update own media" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can delete own session media" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Students can read own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can read session payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Students can update own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Students can delete own payment proofs" ON storage.objects;

-- Delete storage buckets (from migration 003)
DELETE FROM storage.buckets WHERE id IN ('media', 'payment-proofs');

-- Drop all tables (from migration 001)
DROP TABLE IF EXISTS topic_request_votes CASCADE;
DROP TABLE IF EXISTS topic_requests CASCADE;
DROP TABLE IF EXISTS session_tags CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop views
DROP VIEW IF EXISTS sessions_with_tags;
DROP VIEW IF EXISTS topic_requests_with_votes;

-- Drop trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
```

## Next Steps

After successful migration:

1. ✅ Database schema created
2. ✅ Storage buckets configured (via migration 003)
3. ⬜ Test authentication flow
4. ⬜ Test session creation with video upload
5. ⬜ Test enrollment flow with payment proof upload
6. ⬜ Test topic request submission

## Requirements Validated

This migration satisfies the following requirements:

- **Requirement 9.1**: Unique constraint on (session_id, student_id) for enrollments
- **Requirement 9.2**: Payment proof validation (screenshot or note required)
- **Requirement 9.3**: Session status enum constraint
- **Requirement 9.4**: Payment status enum constraint
- **Requirement 9.5**: User role enum constraint
- **Requirement 9.6**: Cascade delete for sessions → enrollments
- **Requirement 9.7**: Index on sessions.scheduled_at and sessions.status
- **Requirement 9.8**: Composite index on enrollments(student_id, payment_status)
- **Requirement 9.9**: Index on sessions.subject
- **Requirement 9.10**: Full-text search index on sessions(title, description)
- **Requirement 9.11**: Index on session_tags.tag
- **Requirement 9.12**: Index on session_tags.session_id
- **Requirement 9.13-9.19**: All topic_requests and topic_request_votes indexes
- **Requirement 10.1-10.10**: Storage buckets and policies for media and payment proofs
- **Requirement 15.3**: Unique constraint on (session_id, tag) for session_tags
- **Requirement 20.3**: Unique constraint on (request_id, student_id) for votes
- **Requirement 21.4**: Cascade delete for topic_requests → votes

## Support

For issues or questions:
- Check Supabase logs in the Dashboard
- Review RLS policies if you get permission errors
- Ensure your `.env` file has correct credentials
- Verify storage buckets are created and policies are applied
