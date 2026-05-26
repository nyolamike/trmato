# Database Schema Reference

Quick reference guide for the TrMato MVP Platform database schema.

## Tables Overview

### 1. users

User profiles linked to Supabase Auth.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,              -- Links to auth.users(id)
  username TEXT UNIQUE NOT NULL,    -- 3-30 characters
  email TEXT UNIQUE NOT NULL,       -- Valid email format
  role TEXT NOT NULL,               -- 'student' | 'teacher'
  created_at TIMESTAMPTZ NOT NULL
);
```

**Indexes:**
- `idx_users_role` on `role`
- `idx_users_email` on `email`

**RLS Policies:**
- Users can read/update their own profile

---

### 2. sessions

Tutoring sessions with optional video content.

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,              -- 10-200 characters
  subject TEXT NOT NULL,            -- e.g., "Biology", "Physics"
  description TEXT NOT NULL,        -- Min 20 characters
  meet_link TEXT NOT NULL,          -- Google Meet URL
  scheduled_at TIMESTAMPTZ NOT NULL,
  price_ugx INTEGER NOT NULL,       -- Min 0
  payment_number TEXT NOT NULL,     -- Mobile money number
  payment_name TEXT NOT NULL,       -- Account holder name
  status TEXT NOT NULL,             -- 'upcoming' | 'completed' | 'cancelled'
  explainer_video TEXT,             -- URL to Supabase Storage (nullable)
  video_thumbnail TEXT,             -- URL to Supabase Storage (nullable)
  created_by UUID NOT NULL,         -- FK to users(id)
  created_at TIMESTAMPTZ NOT NULL
);
```

**Indexes:**
- `idx_sessions_scheduled_at` on `scheduled_at`
- `idx_sessions_status` on `status`
- `idx_sessions_subject` on `subject`
- `idx_sessions_search` - Full-text search on `title` + `description`

**RLS Policies:**
- Public read for upcoming sessions
- Teachers can CRUD their own sessions

---

### 3. enrollments

Student enrollments with payment proof.

```sql
CREATE TABLE enrollments (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL,         -- FK to sessions(id)
  student_id UUID NOT NULL,         -- FK to users(id)
  payment_status TEXT NOT NULL,     -- 'pending' | 'approved' | 'rejected'
  payment_screenshot TEXT,          -- URL to Supabase Storage (nullable)
  payment_note TEXT,                -- Text note (nullable)
  enrolled_at TIMESTAMPTZ NOT NULL,
  
  UNIQUE (session_id, student_id),  -- One enrollment per student per session
  CHECK (payment_screenshot IS NOT NULL OR payment_note IS NOT NULL)
);
```

**Indexes:**
- `idx_enrollments_student_payment` on `(student_id, payment_status)`
- `idx_enrollments_session` on `session_id`

**RLS Policies:**
- Students can create/read their own enrollments
- Teachers can read/update enrollments for their sessions

---

### 4. session_tags

Tags for session categorization and filtering.

```sql
CREATE TABLE session_tags (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL,         -- FK to sessions(id)
  tag TEXT NOT NULL,                -- 1-50 characters, lowercase
  created_at TIMESTAMPTZ NOT NULL,
  
  UNIQUE (session_id, tag)          -- No duplicate tags per session
);
```

**Indexes:**
- `idx_session_tags_tag` on `tag`
- `idx_session_tags_session_id` on `session_id`

**RLS Policies:**
- Public read access
- Teachers can create/delete tags for their sessions

---

### 5. topic_requests

Topic requests from students and anonymous users.

```sql
CREATE TABLE topic_requests (
  id UUID PRIMARY KEY,
  student_id UUID,                  -- FK to users(id), nullable for anonymous
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,              -- 5-200 characters
  description TEXT,                 -- Max 1000 characters (nullable)
  email TEXT,                       -- Required for anonymous requests
  status TEXT NOT NULL,             -- 'pending' | 'approved' | 'rejected'
  is_anonymous BOOLEAN NOT NULL,    -- Default false
  approved_session_id UUID,         -- FK to sessions(id), nullable
  rejection_reason TEXT,            -- Nullable
  created_at TIMESTAMPTZ NOT NULL,
  
  CHECK ((is_anonymous = false) OR (is_anonymous = true AND email IS NOT NULL))
);
```

**Indexes:**
- `idx_topic_requests_status` on `status`
- `idx_topic_requests_student_id` on `student_id`
- `idx_topic_requests_is_anonymous` on `is_anonymous`
- `idx_topic_requests_created_at` on `created_at DESC`

**RLS Policies:**
- Public insert access (for anonymous submissions)
- Students can read their own requests
- Teachers can read all requests and update status
- Public read for approved/pending non-anonymous requests

---

### 6. topic_request_votes

Upvotes from authenticated students on topic requests.

```sql
CREATE TABLE topic_request_votes (
  id UUID PRIMARY KEY,
  request_id UUID NOT NULL,         -- FK to topic_requests(id)
  student_id UUID NOT NULL,         -- FK to users(id)
  created_at TIMESTAMPTZ NOT NULL,
  
  UNIQUE (request_id, student_id)   -- One vote per student per request
);
```

**Indexes:**
- `idx_topic_request_votes_request_id` on `request_id`
- `idx_topic_request_votes_student_id` on `student_id`

**RLS Policies:**
- Public read access for vote counts
- Students can insert/delete their own votes

---

## Helper Views

### sessions_with_tags

Sessions with aggregated tags array.

```sql
CREATE VIEW sessions_with_tags AS
SELECT 
  s.*,
  COALESCE(array_agg(st.tag), ARRAY[]::TEXT[]) AS tags
FROM sessions s
LEFT JOIN session_tags st ON s.id = st.session_id
GROUP BY s.id;
```

**Usage:**
```sql
SELECT * FROM sessions_with_tags WHERE status = 'upcoming';
```

---

### topic_requests_with_votes

Topic requests with vote counts.

```sql
CREATE VIEW topic_requests_with_votes AS
SELECT 
  tr.*,
  COUNT(trv.id) AS vote_count
FROM topic_requests tr
LEFT JOIN topic_request_votes trv ON tr.id = trv.request_id
GROUP BY tr.id;
```

**Usage:**
```sql
SELECT * FROM topic_requests_with_votes 
WHERE status = 'pending' 
ORDER BY vote_count DESC;
```

---

## Common Queries

### Get upcoming sessions with tags

```sql
SELECT * FROM sessions_with_tags 
WHERE status = 'upcoming' 
  AND scheduled_at > NOW()
ORDER BY scheduled_at ASC;
```

### Search sessions by text

```sql
SELECT * FROM sessions 
WHERE to_tsvector('english', title || ' ' || description) 
      @@ plainto_tsquery('english', 'cell biology')
  AND status = 'upcoming';
```

### Filter sessions by subject and tag

```sql
SELECT DISTINCT s.* 
FROM sessions s
JOIN session_tags st ON s.id = st.session_id
WHERE s.subject = 'Biology'
  AND st.tag = 'osmosis'
  AND s.status = 'upcoming';
```

### Get student's enrollments with session details

```sql
SELECT 
  e.*,
  s.title,
  s.subject,
  s.scheduled_at,
  s.meet_link,
  s.status
FROM enrollments e
JOIN sessions s ON e.session_id = s.id
WHERE e.student_id = 'user-uuid-here'
ORDER BY s.scheduled_at DESC;
```

### Get teacher's sessions with enrollment counts

```sql
SELECT 
  s.*,
  COUNT(e.id) as enrollment_count,
  COUNT(e.id) FILTER (WHERE e.payment_status = 'approved') as approved_count,
  COUNT(e.id) FILTER (WHERE e.payment_status = 'pending') as pending_count
FROM sessions s
LEFT JOIN enrollments e ON s.id = e.session_id
WHERE s.created_by = 'teacher-uuid-here'
GROUP BY s.id
ORDER BY s.scheduled_at DESC;
```

### Get popular tags (top 10)

```sql
SELECT tag, COUNT(*) as usage_count
FROM session_tags st
JOIN sessions s ON st.session_id = s.id
WHERE s.status = 'upcoming'
GROUP BY tag
ORDER BY usage_count DESC
LIMIT 10;
```

### Get topic requests sorted by votes

```sql
SELECT * FROM topic_requests_with_votes
WHERE status = 'pending'
  AND is_anonymous = false
ORDER BY vote_count DESC, created_at DESC;
```

### Check if student has voted on a request

```sql
SELECT EXISTS (
  SELECT 1 FROM topic_request_votes
  WHERE request_id = 'request-uuid-here'
    AND student_id = 'student-uuid-here'
) as has_voted;
```

---

## Storage Buckets

### media (Public)

**Purpose:** Store explainer videos and thumbnails

**Path Structure:**
- Videos: `media/videos/{session_id}/{timestamp}_{filename}`
- Thumbnails: `media/thumbnails/{session_id}/{timestamp}_{filename}`

**Access:**
- Read: Public
- Write: Teachers only

**File Limits:**
- Videos: Max 50MB, formats: MP4, WebM
- Thumbnails: Max 2MB, formats: JPG, PNG

---

### payment-proofs (Private)

**Purpose:** Store payment proof screenshots

**Path Structure:**
- `payment-proofs/{enrollment_id}/{timestamp}_{filename}`

**Access:**
- Read: Student (owner) and session teacher
- Write: Students only

**File Limits:**
- Max 5MB, formats: JPG, PNG

---

## Foreign Key Relationships

```
users (id)
  ├─> sessions (created_by) [CASCADE]
  ├─> enrollments (student_id) [CASCADE]
  ├─> topic_requests (student_id) [SET NULL]
  └─> topic_request_votes (student_id) [CASCADE]

sessions (id)
  ├─> enrollments (session_id) [CASCADE]
  ├─> session_tags (session_id) [CASCADE]
  └─> topic_requests (approved_session_id) [SET NULL]

topic_requests (id)
  └─> topic_request_votes (request_id) [CASCADE]
```

---

## Cascade Delete Behavior

| Parent Table | Child Table | Delete Rule | Effect |
|--------------|-------------|-------------|--------|
| users | sessions | CASCADE | Deleting user deletes their sessions |
| users | enrollments | CASCADE | Deleting user deletes their enrollments |
| users | topic_requests | SET NULL | Deleting user sets student_id to NULL |
| users | topic_request_votes | CASCADE | Deleting user deletes their votes |
| sessions | enrollments | CASCADE | Deleting session deletes enrollments |
| sessions | session_tags | CASCADE | Deleting session deletes tags |
| sessions | topic_requests | SET NULL | Deleting session sets approved_session_id to NULL |
| topic_requests | topic_request_votes | CASCADE | Deleting request deletes votes |

---

## Requirements Mapping

| Requirement | Implementation |
|-------------|----------------|
| 9.1 | UNIQUE (session_id, student_id) on enrollments |
| 9.2 | CHECK constraint on payment_screenshot OR payment_note |
| 9.3 | CHECK constraint on session status enum |
| 9.4 | CHECK constraint on payment_status enum |
| 9.5 | CHECK constraint on user role enum |
| 9.6 | CASCADE DELETE on sessions → enrollments |
| 9.7 | Indexes on sessions.scheduled_at and sessions.status |
| 9.8 | Composite index on enrollments(student_id, payment_status) |
| 9.9 | Index on sessions.subject |
| 9.10 | Full-text search index on sessions(title, description) |
| 9.11 | Index on session_tags.tag |
| 9.12 | Index on session_tags.session_id |
| 9.13-9.19 | All topic_requests and topic_request_votes indexes |
| 15.3 | UNIQUE (session_id, tag) on session_tags |
| 20.3 | UNIQUE (request_id, student_id) on topic_request_votes |
| 21.4 | CASCADE DELETE on topic_requests → votes |

---

## Quick Reference: Field Validations

| Field | Validation |
|-------|------------|
| users.username | 3-30 characters, unique |
| users.email | Valid email format, unique |
| users.role | 'student' or 'teacher' |
| sessions.title | 10-200 characters |
| sessions.description | Min 20 characters |
| sessions.price_ugx | >= 0 |
| sessions.status | 'upcoming', 'completed', or 'cancelled' |
| enrollments.payment_status | 'pending', 'approved', or 'rejected' |
| session_tags.tag | 1-50 characters |
| topic_requests.topic | 5-200 characters |
| topic_requests.description | Max 1000 characters |
| topic_requests.status | 'pending', 'approved', or 'rejected' |

---

**Last Updated:** Task 3 completion
**Schema Version:** 1.0.0
