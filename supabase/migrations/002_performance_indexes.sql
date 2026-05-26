-- TrMato MVP Platform - Performance Indexes Migration
-- This migration adds composite indexes for optimized query performance
-- Task 4: Create database indexes for performance

-- ============================================================================
-- COMPOSITE INDEX: sessions(scheduled_at, status)
-- ============================================================================
-- Purpose: Optimize queries filtering upcoming sessions by date and status
-- Use case: Landing page queries like "WHERE status = 'upcoming' AND scheduled_at > NOW()"
-- Requirement: 9.7
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_status 
  ON sessions(scheduled_at, status);

-- ============================================================================
-- COMPOSITE INDEX: topic_requests(status, is_anonymous, created_at, student_id)
-- ============================================================================
-- Purpose: Optimize complex queries filtering and sorting topic requests
-- Use case: Admin panel queries filtering by status, separating anonymous vs student requests,
--           and sorting by date
-- Requirements: 9.13, 9.14, 9.15, 9.16
CREATE INDEX IF NOT EXISTS idx_topic_requests_composite 
  ON topic_requests(status, is_anonymous, created_at DESC, student_id);

-- ============================================================================
-- COMPOSITE INDEX: topic_request_votes(request_id, student_id)
-- ============================================================================
-- Purpose: Optimize vote counting and uniqueness checks
-- Use case: Checking if a student has already voted for a request,
--           counting votes per request
-- Requirements: 9.17, 9.18, 9.19
-- Note: This also serves as the backing index for the unique constraint
CREATE INDEX IF NOT EXISTS idx_topic_request_votes_composite 
  ON topic_request_votes(request_id, student_id);

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- These composite indexes complement the existing single-column indexes
-- in the initial schema (001_initial_schema.sql).
--
-- Composite indexes are more efficient for queries that filter on multiple
-- columns in the same order as the index definition.
--
-- The database query planner will automatically choose between single-column
-- and composite indexes based on the query pattern.
--
-- Performance benefits:
-- 1. Faster filtering of upcoming sessions by date and status
-- 2. Optimized topic request queries in admin panel
-- 3. Efficient vote counting and duplicate vote prevention
-- 4. Reduced query execution time for dashboard queries
--
-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
