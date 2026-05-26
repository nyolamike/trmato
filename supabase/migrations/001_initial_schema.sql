-- TrMato MVP Platform - Initial Database Schema
-- This migration creates all tables with proper constraints, indexes, and RLS policies

-- ============================================================================
-- TABLE: users
-- ============================================================================
-- Stores user profile information linked to Supabase Auth
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add constraints for username length
ALTER TABLE users ADD CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30);

-- Create index for faster lookups
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- TABLE: sessions
-- ============================================================================
-- Stores tutoring session information with optional video content
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) >= 10 AND char_length(title) <= 200),
  subject TEXT NOT NULL,
  description TEXT NOT NULL CHECK (char_length(description) >= 20),
  meet_link TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  price_ugx INTEGER NOT NULL CHECK (price_ugx >= 0),
  payment_number TEXT NOT NULL,
  payment_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  explainer_video TEXT,
  video_thumbnail TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for query performance (Requirement 9.7, 9.9, 9.10)
CREATE INDEX idx_sessions_scheduled_at ON sessions(scheduled_at);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_subject ON sessions(subject);
CREATE INDEX idx_sessions_created_by ON sessions(created_by);

-- Full-text search index for title and description (Requirement 9.10)
CREATE INDEX idx_sessions_search ON sessions USING GIN (to_tsvector('english', title || ' ' || description));

-- ============================================================================
-- TABLE: enrollments
-- ============================================================================
-- Stores student enrollments with payment proof
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'rejected')),
  payment_screenshot TEXT,
  payment_note TEXT,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one enrollment per student per session (Requirement 9.1)
  CONSTRAINT unique_enrollment UNIQUE (session_id, student_id),
  
  -- Check constraint: at least one payment proof must be provided (Requirement 9.2)
  CONSTRAINT payment_proof_required CHECK (
    payment_screenshot IS NOT NULL OR payment_note IS NOT NULL
  )
);

-- Create composite index for query performance (Requirement 9.8)
CREATE INDEX idx_enrollments_student_payment ON enrollments(student_id, payment_status);
CREATE INDEX idx_enrollments_session ON enrollments(session_id);

-- ============================================================================
-- TABLE: session_tags
-- ============================================================================
-- Stores tags associated with sessions for categorization and filtering
CREATE TABLE IF NOT EXISTS session_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  tag TEXT NOT NULL CHECK (char_length(tag) >= 1 AND char_length(tag) <= 50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: prevent duplicate tags for same session
  CONSTRAINT unique_session_tag UNIQUE (session_id, tag)
);

-- Create indexes for tag filtering and lookup (Requirement 9.11, 9.12)
CREATE INDEX idx_session_tags_tag ON session_tags(tag);
CREATE INDEX idx_session_tags_session_id ON session_tags(session_id);

-- ============================================================================
-- TABLE: topic_requests
-- ============================================================================
-- Stores topic requests from students and anonymous users
CREATE TABLE IF NOT EXISTS topic_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL CHECK (char_length(topic) >= 5 AND char_length(topic) <= 200),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 1000),
  email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  approved_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Check constraint: email required for anonymous requests
  CONSTRAINT email_required_for_anonymous CHECK (
    (is_anonymous = false) OR (is_anonymous = true AND email IS NOT NULL)
  )
);

-- Create indexes for query performance (Requirement 9.13, 9.14, 9.15, 9.16)
CREATE INDEX idx_topic_requests_status ON topic_requests(status);
CREATE INDEX idx_topic_requests_student_id ON topic_requests(student_id);
CREATE INDEX idx_topic_requests_is_anonymous ON topic_requests(is_anonymous);
CREATE INDEX idx_topic_requests_created_at ON topic_requests(created_at DESC);

-- ============================================================================
-- TABLE: topic_request_votes
-- ============================================================================
-- Stores upvotes from authenticated students on topic requests
CREATE TABLE IF NOT EXISTS topic_request_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES topic_requests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one vote per student per request
  CONSTRAINT unique_vote UNIQUE (request_id, student_id)
);

-- Create indexes for vote counting and checking (Requirement 9.17, 9.18, 9.19)
CREATE INDEX idx_topic_request_votes_request_id ON topic_request_votes(request_id);
CREATE INDEX idx_topic_request_votes_student_id ON topic_request_votes(student_id);

-- ============================================================================
-- TRIGGER: Auto-create user profile on signup
-- ============================================================================
-- Automatically create a users table entry when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_request_votes ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- USERS TABLE POLICIES
-- ----------------------------------------------------------------------------
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- SESSIONS TABLE POLICIES
-- ----------------------------------------------------------------------------
-- Public read access for upcoming sessions (Requirement 8.7)
CREATE POLICY "Public read for upcoming sessions"
  ON sessions FOR SELECT
  USING (status = 'upcoming');

-- Teachers can read all their own sessions
CREATE POLICY "Teachers can read own sessions"
  ON sessions FOR SELECT
  USING (
    auth.uid() = created_by AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'teacher')
  );

-- Teachers can create sessions (Requirement 8.4)
CREATE POLICY "Teachers can create sessions"
  ON sessions FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'teacher')
  );

-- Teachers can update their own sessions (Requirement 8.6)
CREATE POLICY "Teachers can update own sessions"
  ON sessions FOR UPDATE
  USING (
    auth.uid() = created_by AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'teacher')
  );

-- Teachers can delete their own sessions
CREATE POLICY "Teachers can delete own sessions"
  ON sessions FOR DELETE
  USING (
    auth.uid() = created_by AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'teacher')
  );

-- ----------------------------------------------------------------------------
-- ENROLLMENTS TABLE POLICIES
-- ----------------------------------------------------------------------------
-- Students can create their own enrollments
CREATE POLICY "Students can create enrollments"
  ON enrollments FOR INSERT
  WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'student')
  );

-- Students can read their own enrollments (Requirement 8.5)
CREATE POLICY "Students can read own enrollments"
  ON enrollments FOR SELECT
  USING (auth.uid() = student_id);

-- Teachers can read enrollments for their sessions (Requirement 8.8)
CREATE POLICY "Teachers can read session enrollments"
  ON enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = enrollments.session_id 
      AND sessions.created_by = auth.uid()
    )
  );

-- Teachers can update enrollments for their sessions
CREATE POLICY "Teachers can update session enrollments"
  ON enrollments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = enrollments.session_id 
      AND sessions.created_by = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- SESSION_TAGS TABLE POLICIES
-- ----------------------------------------------------------------------------
-- Public read access for all tags
CREATE POLICY "Public read for session tags"
  ON session_tags FOR SELECT
  USING (true);

-- Teachers can create tags for their sessions
CREATE POLICY "Teachers can create tags for own sessions"
  ON session_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_tags.session_id 
      AND sessions.created_by = auth.uid()
    )
  );

-- Teachers can delete tags from their sessions
CREATE POLICY "Teachers can delete tags from own sessions"
  ON session_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_tags.session_id 
      AND sessions.created_by = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- TOPIC_REQUESTS TABLE POLICIES
-- ----------------------------------------------------------------------------
-- Public insert access for anonymous submissions
CREATE POLICY "Public can create topic requests"
  ON topic_requests FOR INSERT
  WITH CHECK (true);

-- Students can read their own requests
CREATE POLICY "Students can read own requests"
  ON topic_requests FOR SELECT
  USING (auth.uid() = student_id);

-- Teachers can read all requests
CREATE POLICY "Teachers can read all requests"
  ON topic_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'teacher')
  );

-- Public read for approved and pending non-anonymous requests (for voting page)
CREATE POLICY "Public read for votable requests"
  ON topic_requests FOR SELECT
  USING (
    is_anonymous = false AND 
    status IN ('pending', 'approved')
  );

-- Teachers can update request status
CREATE POLICY "Teachers can update requests"
  ON topic_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'teacher')
  );

-- ----------------------------------------------------------------------------
-- TOPIC_REQUEST_VOTES TABLE POLICIES
-- ----------------------------------------------------------------------------
-- Public read access for vote counts
CREATE POLICY "Public read for votes"
  ON topic_request_votes FOR SELECT
  USING (true);

-- Authenticated students can insert votes
CREATE POLICY "Students can create votes"
  ON topic_request_votes FOR INSERT
  WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'student')
  );

-- Students can delete their own votes
CREATE POLICY "Students can delete own votes"
  ON topic_request_votes FOR DELETE
  USING (auth.uid() = student_id);

-- ============================================================================
-- STORAGE BUCKETS SETUP
-- ============================================================================
-- Note: Storage buckets need to be created via Supabase Dashboard or API
-- This is documented here for reference

-- Bucket: media (public)
-- - Used for: explainer_video, video_thumbnail
-- - Access: Public read, Teacher write
-- - Path structure: 
--   - media/videos/{session_id}/{timestamp}_{filename}
--   - media/thumbnails/{session_id}/{timestamp}_{filename}

-- Bucket: payment-proofs (private)
-- - Used for: payment_screenshot
-- - Access: Student (owner) and session Teacher only
-- - Path structure: payment-proofs/{enrollment_id}/{timestamp}_{filename}

-- ============================================================================
-- HELPER VIEWS (Optional - for convenience)
-- ============================================================================

-- View: sessions_with_tags
-- Aggregates tags for each session for easier querying
CREATE OR REPLACE VIEW sessions_with_tags AS
SELECT 
  s.*,
  COALESCE(
    array_agg(st.tag ORDER BY st.tag) FILTER (WHERE st.tag IS NOT NULL),
    ARRAY[]::TEXT[]
  ) AS tags
FROM sessions s
LEFT JOIN session_tags st ON s.id = st.session_id
GROUP BY s.id;

-- View: topic_requests_with_votes
-- Aggregates vote counts for each topic request
CREATE OR REPLACE VIEW topic_requests_with_votes AS
SELECT 
  tr.*,
  COUNT(trv.id) AS vote_count
FROM topic_requests tr
LEFT JOIN topic_request_votes trv ON tr.id = trv.request_id
GROUP BY tr.id;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant access to anonymous users (for public read operations)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON users TO anon;
GRANT SELECT ON sessions TO anon;
GRANT SELECT ON session_tags TO anon;
GRANT INSERT ON topic_requests TO anon;
GRANT SELECT ON topic_requests TO anon;
GRANT SELECT ON topic_request_votes TO anon;

-- Grant access to views
GRANT SELECT ON sessions_with_tags TO authenticated, anon;
GRANT SELECT ON topic_requests_with_votes TO authenticated, anon;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All tables, indexes, constraints, triggers, and RLS policies have been created
-- Next steps:
-- 1. Create storage buckets in Supabase Dashboard
-- 2. Configure storage policies
-- 3. Test the schema with sample data
