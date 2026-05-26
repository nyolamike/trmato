-- TrMato MVP Platform - Index Verification Queries
-- Use these queries to verify that all required indexes have been created

-- ============================================================================
-- CHECK ALL INDEXES BY TABLE
-- ============================================================================

-- 1. Check indexes on sessions table
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'sessions' 
  AND schemaname = 'public'
ORDER BY indexname;

-- Expected indexes:
-- - idx_sessions_created_by
-- - idx_sessions_scheduled_at
-- - idx_sessions_scheduled_status (NEW - composite)
-- - idx_sessions_search (full-text)
-- - idx_sessions_status
-- - idx_sessions_subject

-- ============================================================================

-- 2. Check indexes on enrollments table
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'enrollments' 
  AND schemaname = 'public'
ORDER BY indexname;

-- Expected indexes:
-- - idx_enrollments_session
-- - idx_enrollments_student_payment (composite)

-- ============================================================================

-- 3. Check indexes on session_tags table
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'session_tags' 
  AND schemaname = 'public'
ORDER BY indexname;

-- Expected indexes:
-- - idx_session_tags_session_id
-- - idx_session_tags_tag

-- ============================================================================

-- 4. Check indexes on topic_requests table
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'topic_requests' 
  AND schemaname = 'public'
ORDER BY indexname;

-- Expected indexes:
-- - idx_topic_requests_composite (NEW - composite)
-- - idx_topic_requests_created_at
-- - idx_topic_requests_is_anonymous
-- - idx_topic_requests_status
-- - idx_topic_requests_student_id

-- ============================================================================

-- 5. Check indexes on topic_request_votes table
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'topic_request_votes' 
  AND schemaname = 'public'
ORDER BY indexname;

-- Expected indexes:
-- - idx_topic_request_votes_composite (NEW - composite)
-- - idx_topic_request_votes_request_id
-- - idx_topic_request_votes_student_id

-- ============================================================================
-- CHECK ALL INDEXES IN PUBLIC SCHEMA
-- ============================================================================

-- Get a complete list of all indexes
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- TEST INDEX USAGE WITH EXPLAIN ANALYZE
-- ============================================================================

-- Test 1: Session filtering (should use idx_sessions_scheduled_status)
EXPLAIN ANALYZE
SELECT * FROM sessions 
WHERE status = 'upcoming' 
  AND scheduled_at > NOW() 
ORDER BY scheduled_at
LIMIT 20;

-- Test 2: Topic request filtering (should use idx_topic_requests_composite)
EXPLAIN ANALYZE
SELECT * FROM topic_requests 
WHERE status = 'pending' 
  AND is_anonymous = false 
ORDER BY created_at DESC
LIMIT 20;

-- Test 3: Vote counting (should use idx_topic_request_votes_composite)
EXPLAIN ANALYZE
SELECT request_id, COUNT(*) as vote_count
FROM topic_request_votes 
GROUP BY request_id;

-- Test 4: Check if student voted (should use idx_topic_request_votes_composite)
EXPLAIN ANALYZE
SELECT EXISTS(
  SELECT 1 FROM topic_request_votes 
  WHERE request_id = '00000000-0000-0000-0000-000000000000'::uuid
    AND student_id = '00000000-0000-0000-0000-000000000000'::uuid
);

-- Test 5: Full-text search (should use idx_sessions_search)
EXPLAIN ANALYZE
SELECT * FROM sessions 
WHERE to_tsvector('english', title || ' ' || description) 
  @@ to_tsquery('english', 'biology');

-- Test 6: Tag filtering (should use idx_session_tags_tag)
EXPLAIN ANALYZE
SELECT s.* 
FROM sessions s
JOIN session_tags st ON s.id = st.session_id
WHERE st.tag = 'osmosis';

-- Test 7: Student enrollments (should use idx_enrollments_student_payment)
EXPLAIN ANALYZE
SELECT * FROM enrollments 
WHERE student_id = '00000000-0000-0000-0000-000000000000'::uuid
  AND payment_status = 'approved';

-- ============================================================================
-- INDEX SIZE ANALYSIS
-- ============================================================================

-- Check the size of all indexes
SELECT
  pg_stat_user_indexes.schemaname,
  pg_stat_user_indexes.relname as tablename,
  pg_stat_user_indexes.indexrelname as indexname,
  pg_size_pretty(pg_relation_size(pg_stat_user_indexes.indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE pg_stat_user_indexes.schemaname = 'public'
ORDER BY pg_relation_size(pg_stat_user_indexes.indexrelid) DESC;

-- ============================================================================
-- REQUIREMENTS CHECKLIST
-- ============================================================================

/*
Requirement 9.7: ✅ Index on sessions(scheduled_at, status)
  - idx_sessions_scheduled_status

Requirement 9.8: ✅ Composite index on enrollments(student_id, payment_status)
  - idx_enrollments_student_payment

Requirement 9.9: ✅ Index on sessions.subject
  - idx_sessions_subject

Requirement 9.10: ✅ Full-text search index on sessions(title, description)
  - idx_sessions_search

Requirement 9.11: ✅ Index on session_tags.tag
  - idx_session_tags_tag

Requirement 9.12: ✅ Index on session_tags.session_id
  - idx_session_tags_session_id

Requirement 9.13: ✅ Index on topic_requests.status
  - idx_topic_requests_status
  - idx_topic_requests_composite (includes status)

Requirement 9.14: ✅ Index on topic_requests.student_id
  - idx_topic_requests_student_id
  - idx_topic_requests_composite (includes student_id)

Requirement 9.15: ✅ Index on topic_requests.is_anonymous
  - idx_topic_requests_is_anonymous
  - idx_topic_requests_composite (includes is_anonymous)

Requirement 9.16: ✅ Index on topic_requests.created_at
  - idx_topic_requests_created_at
  - idx_topic_requests_composite (includes created_at)

Requirement 9.17: ✅ Index on topic_request_votes.request_id
  - idx_topic_request_votes_request_id
  - idx_topic_request_votes_composite (includes request_id)

Requirement 9.18: ✅ Index on topic_request_votes.student_id
  - idx_topic_request_votes_student_id
  - idx_topic_request_votes_composite (includes student_id)

Requirement 9.19: ✅ Composite index on topic_request_votes(request_id, student_id)
  - idx_topic_request_votes_composite
*/
