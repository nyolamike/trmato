# Database Setup Guide - TrMato MVP Platform

This guide walks you through setting up the complete database schema for the TrMato MVP Platform.

## Prerequisites

- ✅ Supabase project created
- ✅ Environment variables configured in `.env`
- ✅ Supabase client initialized (`src/utils/supabase.js`)

## Step 1: Apply Database Schema Migration

### Using Supabase Dashboard (Easiest Method)

1. **Open Supabase Dashboard**
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Select your `trmato-mvp` project

2. **Navigate to SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **"New query"** button

3. **Execute the Migration**
   - Open the file `supabase/migrations/001_initial_schema.sql` in your code editor
   - Copy the entire contents (Ctrl+A, Ctrl+C)
   - Paste into the Supabase SQL Editor
   - Click **"Run"** (or press Ctrl+Enter)
   - Wait for the query to complete (should take 2-3 seconds)

4. **Verify Success**
   - You should see a success message: "Success. No rows returned"
   - Click **Table Editor** in the left sidebar
   - You should see 6 new tables:
     - ✅ users
     - ✅ sessions
     - ✅ enrollments
     - ✅ session_tags
     - ✅ topic_requests
     - ✅ topic_request_votes

## Step 2: Create Storage Buckets

### Create 'media' Bucket (Public)

1. **Navigate to Storage**
   - Click **Storage** in the left sidebar
   - Click **"New bucket"** button

2. **Configure Media Bucket**
   - **Name**: `media`
   - **Public bucket**: Toggle **ON** ✓
   - **File size limit**: 52428800 (50MB in bytes)
   - **Allowed MIME types**: `video/mp4,video/webm,image/jpeg,image/png`
   - Click **"Create bucket"**

### Create 'payment-proofs' Bucket (Private)

1. **Create Second Bucket**
   - Click **"New bucket"** button again

2. **Configure Payment Proofs Bucket**
   - **Name**: `payment-proofs`
   - **Public bucket**: Toggle **OFF** ✗
   - **File size limit**: 5242880 (5MB in bytes)
   - **Allowed MIME types**: `image/jpeg,image/png`
   - Click **"Create bucket"**

## Step 3: Apply Storage Policies

1. **Open SQL Editor Again**
   - Click **SQL Editor** in the left sidebar
   - Click **"New query"**

2. **Execute Storage Policies**
   - Open the file `supabase/setup-storage.sql` in your code editor
   - Copy the entire contents
   - Paste into the Supabase SQL Editor
   - Click **"Run"**
   - Wait for completion

3. **Verify Storage Policies**
   - Go to **Storage** → **Policies**
   - You should see policies for both buckets:
     - **media**: 4 policies (public read, teacher upload/update/delete)
     - **payment-proofs**: 5 policies (student upload/read/update/delete, teacher read)

## Step 4: Verify Database Setup

### Check Tables

Run this query in SQL Editor:

```sql
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Expected Output:**
```
users               5 columns
sessions           13 columns
enrollments         7 columns
session_tags        4 columns
topic_requests     10 columns
topic_request_votes 4 columns
```

### Check Indexes

Run this query:

```sql
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'sessions', 'enrollments', 'session_tags', 'topic_requests', 'topic_request_votes')
ORDER BY tablename, indexname;
```

**Expected Output:** Should show 20+ indexes including:
- `idx_sessions_scheduled_at`
- `idx_sessions_status`
- `idx_sessions_subject`
- `idx_sessions_search` (full-text search)
- `idx_enrollments_student_payment`
- `idx_session_tags_tag`
- `idx_topic_requests_status`
- And more...

### Check RLS Policies

Run this query:

```sql
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

**Expected Output:**
```
users                    2 policies
sessions                 5 policies
enrollments              4 policies
session_tags             3 policies
topic_requests           5 policies
topic_request_votes      3 policies
```

### Check Trigger

Run this query:

```sql
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
  AND trigger_name = 'on_auth_user_created';
```

**Expected Output:** Should show the `on_auth_user_created` trigger on `auth.users` table.

## Step 5: Test the Setup

### Test 1: User Signup and Auto-Profile Creation

1. **Start your development server**
   ```bash
   npm run dev
   ```

2. **Sign up a test user**
   - Go to your app (http://localhost:5173)
   - Click "Sign Up"
   - Enter:
     - Username: `testteacher`
     - Email: `teacher@test.com`
     - Password: `Test123!`
   - Submit the form

3. **Verify in Supabase**
   - Go to **Authentication** → **Users**
   - You should see the new user
   - Go to **Table Editor** → **users**
   - You should see a row with:
     - username: `testteacher`
     - email: `teacher@test.com`
     - role: `student` (default)

4. **Update role to teacher** (for testing)
   ```sql
   UPDATE users 
   SET role = 'teacher' 
   WHERE email = 'teacher@test.com';
   ```

### Test 2: Create a Test Session

Run this in SQL Editor:

```sql
-- Insert a test session
INSERT INTO sessions (
  title,
  subject,
  description,
  meet_link,
  scheduled_at,
  price_ugx,
  payment_number,
  payment_name,
  status,
  created_by
) VALUES (
  'Introduction to Cell Biology',
  'Biology',
  'Learn about cell structure, organelles, and basic cellular processes in this comprehensive session.',
  'https://meet.google.com/abc-defg-hij',
  NOW() + INTERVAL '2 days',
  5000,
  '0700123456',
  'Matovu Teacher',
  'upcoming',
  (SELECT id FROM users WHERE email = 'teacher@test.com')
) RETURNING *;
```

### Test 3: Add Tags to Session

```sql
-- Get the session ID from the previous query, then:
INSERT INTO session_tags (session_id, tag) VALUES
  ((SELECT id FROM sessions WHERE title = 'Introduction to Cell Biology'), 'cell biology'),
  ((SELECT id FROM sessions WHERE title = 'Introduction to Cell Biology'), 'osmosis'),
  ((SELECT id FROM sessions WHERE title = 'Introduction to Cell Biology'), 'mitochondria');
```

### Test 4: Query Sessions with Tags

```sql
SELECT * FROM sessions_with_tags 
WHERE status = 'upcoming';
```

**Expected Output:** Should show the session with a `tags` array containing the three tags.

## Troubleshooting

### Error: "relation does not exist"

**Solution:** The migration didn't run successfully. Re-run `001_initial_schema.sql`.

### Error: "permission denied for table"

**Solution:** RLS policies might not be set up correctly. Check that RLS is enabled:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

All tables should have `rowsecurity = true`.

### Error: "duplicate key value violates unique constraint"

**Solution:** You're trying to insert duplicate data. Check unique constraints:
- `users.username` must be unique
- `users.email` must be unique
- `(session_id, student_id)` must be unique in enrollments
- `(session_id, tag)` must be unique in session_tags
- `(request_id, student_id)` must be unique in topic_request_votes

### Storage Upload Fails

**Solution:** 
1. Verify buckets exist in **Storage** section
2. Check storage policies are applied
3. Verify file size and MIME type restrictions
4. Check user role (only teachers can upload to 'media', only students to 'payment-proofs')

## Database Schema Summary

### Tables Created

| Table | Purpose | Key Constraints |
|-------|---------|----------------|
| **users** | User profiles | Unique username/email, role check |
| **sessions** | Tutoring sessions | Title length, future date, status enum |
| **enrollments** | Student enrollments | Unique per student/session, payment proof required |
| **session_tags** | Session categorization | Unique per session/tag, tag length 1-50 |
| **topic_requests** | Topic suggestions | Email required for anonymous, topic length 5-200 |
| **topic_request_votes** | Upvotes on requests | Unique per student/request |

### Indexes Created (20 total)

- **Performance indexes**: scheduled_at, status, subject, student_id, tag, etc.
- **Full-text search**: title + description on sessions
- **Composite indexes**: (student_id, payment_status), (request_id, student_id)

### RLS Policies (22 total)

- **Public read**: Upcoming sessions, session tags, votable topic requests
- **Student access**: Own enrollments, own requests, voting
- **Teacher access**: Own sessions, session enrollments, all requests
- **Anonymous access**: Create topic requests

### Storage Buckets

- **media** (public): Videos and thumbnails, teacher upload
- **payment-proofs** (private): Payment screenshots, student upload

## Next Steps

After successful database setup:

1. ✅ Database schema created
2. ✅ Storage buckets configured
3. ⬜ Implement authentication UI components
4. ⬜ Implement session creation form
5. ⬜ Implement enrollment flow
6. ⬜ Implement topic request features

## Requirements Satisfied

This database setup satisfies the following requirements from the spec:

- **Requirement 9.1**: Unique enrollment constraint ✅
- **Requirement 9.2**: Payment proof validation ✅
- **Requirement 9.3**: Session status enum ✅
- **Requirement 9.4**: Payment status enum ✅
- **Requirement 9.5**: User role enum ✅
- **Requirement 9.6**: Cascade deletes ✅
- **Requirement 9.7-9.19**: All performance indexes ✅
- **Requirement 15.3**: Session tags unique constraint ✅
- **Requirement 20.3**: Vote unique constraint ✅
- **Requirement 21.4**: Vote cascade delete ✅

---

**Status**: ✅ Database setup complete and ready for application development

**Task Completion**: Task 3 - Set up database schema and tables ✅
