-- ============================================================================
-- TrMato MVP Platform — Rollback for seed.sql
-- ============================================================================
-- Removes every row inserted by supabase/seed.sql. Safe to run repeatedly;
-- rows are matched by the stable seed UUIDs / @trmato.test domain so
-- non-seed data is left alone.
--
-- DO NOT run against production.
-- ============================================================================

BEGIN;

-- Delete in FK-safe order. Most child rows cascade from auth.users / sessions,
-- but explicit deletes make the intent clear and protect against tables that
-- might (in some forks of this schema) have ON DELETE NO ACTION instead of
-- CASCADE.

DELETE FROM public.topic_request_votes
 WHERE request_id IN (
   '71111111-1111-1111-1111-111111111111',
   '72222222-2222-2222-2222-222222222222'
 );

DELETE FROM public.topic_requests
 WHERE id IN (
   '71111111-1111-1111-1111-111111111111',
   '72222222-2222-2222-2222-222222222222'
 );

DELETE FROM public.enrollments
 WHERE id IN (
   '61111111-1111-1111-1111-111111111111',
   '62222222-2222-2222-2222-222222222222',
   '63333333-3333-3333-3333-333333333333',
   '64444444-4444-4444-4444-444444444444',
   '65555555-5555-5555-5555-555555555555'
 );

DELETE FROM public.session_tags
 WHERE session_id IN (
   '51111111-1111-1111-1111-111111111111',
   '52222222-2222-2222-2222-222222222222',
   '53333333-3333-3333-3333-333333333333',
   '54444444-4444-4444-4444-444444444444',
   '55555555-5555-5555-5555-555555555555',
   '56666666-6666-6666-6666-666666666666'
 );

DELETE FROM public.sessions
 WHERE id IN (
   '51111111-1111-1111-1111-111111111111',
   '52222222-2222-2222-2222-222222222222',
   '53333333-3333-3333-3333-333333333333',
   '54444444-4444-4444-4444-444444444444',
   '55555555-5555-5555-5555-555555555555',
   '56666666-6666-6666-6666-666666666666'
 );

-- public.users + auth.identities cascade from auth.users → these go last.
-- auth.users.id deletion cascades to public.users via the FK in 001.
DELETE FROM auth.users
 WHERE id IN (
   '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222',
   '31111111-1111-1111-1111-111111111111',
   '32222222-2222-2222-2222-222222222222',
   '33333333-3333-3333-3333-333333333333',
   '34444444-4444-4444-4444-444444444444'
 );

COMMIT;
