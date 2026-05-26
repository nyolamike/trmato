-- Verification Script for TrMato MVP Database Setup
-- Run this script to verify that all tables, indexes, policies, and triggers are correctly set up

-- ============================================================================
-- 1. CHECK TABLES
-- ============================================================================
SELECT 
  '1. TABLES CHECK' as check_type,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('users', 'sessions', 'enrollments', 'session_tags', 'topic_requests', 'topic_request_votes')
ORDER BY table_name;

-- Expected: 6 tables with correct column counts
-- users: 5, sessions: 13, enrollments: 7, session_tags: 4, topic_requests: 10, topic_request_votes: 4

-- ============================================================================
-- 2. CHECK INDEXES
-- ============================================================================
SELECT 
  '2. INDEXES CHECK' as check_type,
  tablename,
  COUNT(*) as index_count
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'sessions', 'enrollments', 'session_tags', 'topic_requests', 'topic_request_votes')
GROUP BY tablename
ORDER BY tablename;

-- Expected: Multiple indexes per table
-- users: 3+, sessions: 5+, enrollments: 3+, session_tags: 3+, topic_requests: 5+, topic_request_votes: 3+

-- ============================================================================
-- 3. CHECK CONSTRAINTS
-- ============================================================================
SELECT 
  '3. CONSTRAINTS CHECK' as check_type,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('users', 'sessions', 'enrollments', 'session_tags', 'topic_requests', 'topic_request_votes')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- Expected: PRIMARY KEY, FOREIGN KEY, UNIQUE, and CHECK constraints

-- ============================================================================
-- 4. CHECK UNIQUE CONSTRAINTS (Critical for Requirements)
-- ============================================================================
SELECT 
  '4. UNIQUE CONSTRAINTS CHECK' as check_type,
  tc.table_name,
  tc.constraint_name,
  STRING_AGG(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('users', 'sessions', 'enrollments', 'session_tags', 'topic_requests', 'topic_request_votes')
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;

-- Expected:
-- users: username, email
-- enrollments: (session_id, student_id)
-- session_tags: (session_id, tag)
-- topic_request_votes: (request_id, student_id)

-- ============================================================================
-- 5. CHECK FOREIGN KEYS
-- ============================================================================
SELECT 
  '5. FOREIGN KEYS CHECK' as check_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('users', 'sessions', 'enrollments', 'session_tags', 'topic_requests', 'topic_request_votes')
ORDER BY tc.table_name, kcu.column_name;

-- Expected: All foreign keys with appropriate CASCADE or SET NULL rules

-- ============================================================================
-- 6. CHECK ROW LEVEL SECURITY (RLS)
-- ============================================================================
SELECT 
  '6. RLS ENABLED CHECK' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('users', 'sessions', 'enrollments', 'session_tags', 'topic_requests', 'topic_request_votes')
ORDER BY tablename;

-- Expected: All tables should have rls_enabled = true

-- ============================================================================
-- 7. CHECK RLS POLICIES
-- ============================================================================
SELECT 
  '7. RLS POLICIES CHECK' as check_type,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('users', 'sessions', 'enrollments', 'session_tags', 'topic_requests', 'topic_request_votes')
GROUP BY tablename
ORDER BY tablename;

-- Expected policy counts:
-- users: 2, sessions: 5, enrollments: 4, session_tags: 3, topic_requests: 5, topic_request_votes: 3

-- ============================================================================
-- 8. CHECK SPECIFIC INDEXES (Performance Requirements)
-- ============================================================================
SELECT 
  '8. CRITICAL INDEXES CHECK' as check_type,
  indexname,
  tablename,
  CASE 
    WHEN indexname LIKE '%search%' THEN 'Full-text search (Req 9.10)'
    WHEN indexname LIKE '%scheduled_at%' THEN 'Scheduled date index (Req 9.7)'
    WHEN indexname LIKE '%status%' THEN 'Status index (Req 9.7, 9.13)'
    WHEN indexname LIKE '%subject%' THEN 'Subject index (Req 9.9)'
    WHEN indexname LIKE '%student_payment%' THEN 'Composite index (Req 9.8)'
    WHEN indexname LIKE '%tag%' THEN 'Tag index (Req 9.11, 9.12)'
    ELSE 'Other index'
  END as requirement
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname IN (
    'idx_sessions_search',
    'idx_sessions_scheduled_at',
    'idx_sessions_status',
    'idx_sessions_subject',
    'idx_enrollments_student_payment',
    'idx_session_tags_tag',
    'idx_session_tags_session_id',
    'idx_topic_requests_status',
    'idx_topic_request_votes_request_id'
  )
ORDER BY tablename, indexname;

-- Expected: All critical indexes should be present

-- ============================================================================
-- 9. CHECK TRIGGERS
-- ============================================================================
SELECT 
  '9. TRIGGERS CHECK' as check_type,
  trigger_name,
  event_object_table as table_name,
  action_timing,
  event_manipulation as event_type
FROM information_schema.triggers
WHERE trigger_schema IN ('public', 'auth')
  AND trigger_name = 'on_auth_user_created'
ORDER BY trigger_name;

-- Expected: on_auth_user_created trigger on auth.users table

-- ============================================================================
-- 10. CHECK VIEWS
-- ============================================================================
SELECT 
  '10. VIEWS CHECK' as check_type,
  table_name as view_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('sessions_with_tags', 'topic_requests_with_votes')
ORDER BY table_name;

-- Expected: 2 views (sessions_with_tags, topic_requests_with_votes)

-- ============================================================================
-- 11. CHECK STORAGE BUCKETS
-- ============================================================================
SELECT 
  '11. STORAGE BUCKETS CHECK' as check_type,
  id as bucket_id,
  name as bucket_name,
  public as is_public
FROM storage.buckets
WHERE name IN ('media', 'payment-proofs')
ORDER BY name;

-- Expected: 
-- media (public = true)
-- payment-proofs (public = false)

-- ============================================================================
-- 12. CHECK STORAGE POLICIES
-- ============================================================================
SELECT 
  '12. STORAGE POLICIES CHECK' as check_type,
  policyname,
  CASE 
    WHEN policyname LIKE '%media%' THEN 'media'
    WHEN policyname LIKE '%payment%' THEN 'payment-proofs'
    ELSE 'unknown'
  END as bucket
FROM pg_policies 
WHERE tablename = 'objects'
  AND schemaname = 'storage'
ORDER BY bucket, policyname;

-- Expected: Multiple policies for both buckets

-- ============================================================================
-- 13. SUMMARY REPORT
-- ============================================================================
SELECT 
  '13. SETUP SUMMARY' as check_type,
  'Tables' as component,
  COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('users', 'sessions', 'enrollments', 'session_tags', 'topic_requests', 'topic_request_votes')

UNION ALL

SELECT 
  '13. SETUP SUMMARY',
  'Indexes',
  COUNT(*)
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'sessions', 'enrollments', 'session_tags', 'topic_requests', 'topic_request_votes')

UNION ALL

SELECT 
  '13. SETUP SUMMARY',
  'RLS Policies',
  COUNT(*)
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('users', 'sessions', 'enrollments', 'session_tags', 'topic_requests', 'topic_request_votes')

UNION ALL

SELECT 
  '13. SETUP SUMMARY',
  'Foreign Keys',
  COUNT(*)
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND table_schema = 'public'
  AND table_name IN ('users', 'sessions', 'enrollments', 'session_tags', 'topic_requests', 'topic_request_votes')

UNION ALL

SELECT 
  '13. SETUP SUMMARY',
  'Unique Constraints',
  COUNT(*)
FROM information_schema.table_constraints
WHERE constraint_type = 'UNIQUE'
  AND table_schema = 'public'
  AND table_name IN ('users', 'sessions', 'enrollments', 'session_tags', 'topic_requests', 'topic_request_votes')

UNION ALL

SELECT 
  '13. SETUP SUMMARY',
  'Check Constraints',
  COUNT(*)
FROM information_schema.table_constraints
WHERE constraint_type = 'CHECK'
  AND table_schema = 'public'
  AND table_name IN ('users', 'sessions', 'enrollments', 'session_tags', 'topic_requests', 'topic_request_votes')

UNION ALL

SELECT 
  '13. SETUP SUMMARY',
  'Views',
  COUNT(*)
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('sessions_with_tags', 'topic_requests_with_votes')

UNION ALL

SELECT 
  '13. SETUP SUMMARY',
  'Triggers',
  COUNT(*)
FROM information_schema.triggers
WHERE trigger_schema IN ('public', 'auth')
  AND trigger_name = 'on_auth_user_created'

ORDER BY component;

-- ============================================================================
-- EXPECTED SUMMARY RESULTS:
-- ============================================================================
-- Tables: 6
-- Indexes: 20+
-- RLS Policies: 22
-- Foreign Keys: 10+
-- Unique Constraints: 6+
-- Check Constraints: 15+
-- Views: 2
-- Triggers: 1

-- ============================================================================
-- VERIFICATION COMPLETE
-- ============================================================================
-- If all checks pass, your database is correctly set up!
-- 
-- Next steps:
-- 1. Test user signup (trigger should auto-create user profile)
-- 2. Create a test session
-- 3. Add tags to the session
-- 4. Test enrollment creation
-- 5. Test topic request submission
-- 6. Test voting on topic requests
