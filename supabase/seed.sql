-- ============================================================================
-- TrMato MVP Platform — Development Seed Data
-- ============================================================================
-- Populates the database with:
--   • 2 teachers, 4 students (in auth.users + auth.identities + public.users)
--   • 6 sessions (4 upcoming, 1 completed, 1 cancelled) across Biology & Maths
--   • ~20 session_tags (curriculum-relevant, mix of single + multi-word)
--   • 4 enrollments covering pending / approved / rejected payment states
--   • 2 topic requests (one authenticated, one anonymous) with sample votes
--
-- ─── Idempotency ────────────────────────────────────────────────────────────
-- Re-runnable. Stable UUIDs + existence guards + ON CONFLICT clauses mean
-- subsequent runs leave existing rows untouched and only fill in missing
-- ones. Safe in dev. DO NOT run against production.
--
-- ─── How to run ─────────────────────────────────────────────────────────────
-- 1. Apply migrations 001–003 first (see supabase/migrations/).
-- 2. Open Supabase Dashboard → SQL Editor → New query.
-- 3. Paste this entire file → Run.
-- 4. All seed accounts share the password: SeedPass!1
--    (dev-only credentials — never reuse in production).
--
-- ─── Seed accounts ──────────────────────────────────────────────────────────
--   Teachers:
--     mary.biology@trmato.test       ms_mary       (Biology)
--     joseph.maths@trmato.test       mr_joseph     (Mathematics)
--   Students:
--     alice.student@trmato.test      alice
--     bob.student@trmato.test        bob
--     chloe.student@trmato.test      chloe
--     daniel.student@trmato.test     daniel
--
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) AUTH USERS + IDENTITIES
-- ----------------------------------------------------------------------------
-- We insert directly into auth.users; the on_auth_user_created trigger then
-- populates public.users via raw_user_meta_data (username + role). For each
-- user we also create a matching auth.identities row so email/password sign-in
-- works without an additional confirmation step (email_confirmed_at is set).
--
-- Each insert is guarded by NOT EXISTS so a re-run is a no-op.

DO $seed_users$
DECLARE
  v_pw text := crypt('SeedPass!1', gen_salt('bf'));
  r record;
BEGIN
  -- (uid, email, username, role) tuples processed in a loop below.
  -- Stable UUIDs visually grouped by role for easy debugging:
  --   1xxxx = teachers, 3xxxx = students.
  FOR r IN
    SELECT * FROM (VALUES
      ('11111111-1111-1111-1111-111111111111'::uuid,
        'mary.biology@trmato.test',   'ms_mary',   'teacher'),
      ('22222222-2222-2222-2222-222222222222'::uuid,
        'joseph.maths@trmato.test',   'mr_joseph', 'teacher'),
      ('31111111-1111-1111-1111-111111111111'::uuid,
        'alice.student@trmato.test',  'alice',     'student'),
      ('32222222-2222-2222-2222-222222222222'::uuid,
        'bob.student@trmato.test',    'bob',       'student'),
      ('33333333-3333-3333-3333-333333333333'::uuid,
        'chloe.student@trmato.test',  'chloe',     'student'),
      ('34444444-4444-4444-4444-444444444444'::uuid,
        'daniel.student@trmato.test', 'daniel',    'student')
    ) AS t(uid, email, username, role)
  LOOP
    -- If an auth.users row already exists with this email but a different
    -- id (e.g., the email was used in a manual signup) skip the whole row
    -- with a notice rather than crashing on the unique-email constraint.
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = r.email AND id <> r.uid) THEN
      RAISE NOTICE 'Skipping seed user %: email already claimed by another auth user', r.email;
      CONTINUE;
    END IF;

    -- auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = r.uid) THEN
      INSERT INTO auth.users (
        id, instance_id, aud, role,
        email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at
      )
      VALUES (
        r.uid,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        r.email,
        v_pw,
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('username', r.username, 'role', r.role),
        NOW(),
        NOW()
      );
    END IF;

    -- auth.identities (email/password identity record so sign-in works).
    -- Identity id reuses user id for the seed (one identity per user).
    IF NOT EXISTS (
      SELECT 1 FROM auth.identities
      WHERE provider = 'email' AND user_id = r.uid
    ) THEN
      INSERT INTO auth.identities (
        id, user_id,
        identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      )
      VALUES (
        r.uid,
        r.uid,
        jsonb_build_object(
          'sub',            r.uid::text,
          'email',          r.email,
          'email_verified', true,
          'phone_verified', false
        ),
        'email',
        r.email,
        NOW(),
        NOW(),
        NOW()
      );
    END IF;

    -- The handle_new_user trigger should have populated public.users via the
    -- INSERT above. As a defensive backstop (e.g., trigger disabled in some
    -- environments) ensure the profile row exists with the correct role.
    INSERT INTO public.users (id, username, email, role, created_at)
    VALUES (r.uid, r.username, r.email, r.role, NOW())
    ON CONFLICT (id) DO UPDATE
      SET username = EXCLUDED.username,
          email    = EXCLUDED.email,
          role     = EXCLUDED.role;
  END LOOP;
END
$seed_users$;

-- ----------------------------------------------------------------------------
-- 2) SESSIONS
-- ----------------------------------------------------------------------------
-- Mix of statuses so the Landing_Page filter (status = 'upcoming') has
-- something to exclude. scheduled_at uses NOW()-relative offsets so the
-- "upcoming" set stays in the future on every re-run.

INSERT INTO public.sessions (
  id, title, subject, description, meet_link, scheduled_at,
  price_ugx, payment_number, payment_name, status,
  explainer_video, video_thumbnail, created_by, created_at
)
VALUES
  (
    '51111111-1111-1111-1111-111111111111',
    'Cell Biology Fundamentals: Structure and Function',
    'Biology',
    'A deep dive into the building blocks of life. We cover prokaryotic vs eukaryotic cells, organelle functions, and the cell cycle, with diagrams tailored to the UNEB syllabus.',
    'https://meet.google.com/abc-defg-hij',
    NOW() + INTERVAL '3 days',
    5000,
    '+256700000001',
    'Mary Nakato',
    'upcoming',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg',
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '2 days'
  ),
  (
    '52222222-2222-2222-2222-222222222222',
    'Genetics & Inheritance for Senior 4',
    'Biology',
    'Mendelian genetics, Punnett squares, and how traits pass from generation to generation. Includes plenty of worked exam-style questions.',
    'https://meet.google.com/jkl-mnop-qrs',
    NOW() + INTERVAL '10 days',
    8000,
    '+256700000001',
    'Mary Nakato',
    'upcoming',
    NULL,
    NULL,
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '1 day'
  ),
  (
    '53333333-3333-3333-3333-333333333333',
    'Mastering Algebra: From Equations to Functions',
    'Mathematics',
    'Linear equations, quadratics, factoring, and an introduction to functions. Designed for Senior 3 and 4 students preparing for end-of-term exams.',
    'https://meet.google.com/tuv-wxyz-abc',
    NOW() + INTERVAL '5 days',
    6000,
    '+256700000002',
    'Joseph Okello',
    'upcoming',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg',
    '22222222-2222-2222-2222-222222222222',
    NOW() - INTERVAL '3 days'
  ),
  (
    '54444444-4444-4444-4444-444444444444',
    'Trigonometry for Senior 4: Sin, Cos, Tan Made Simple',
    'Mathematics',
    'Right-angled triangles, trig ratios, the unit circle, and solving real-world problems. Includes a 30-question practice pack you can keep.',
    'https://meet.google.com/def-ghij-klm',
    NOW() + INTERVAL '21 days',
    7000,
    '+256700000002',
    'Joseph Okello',
    'upcoming',
    NULL,
    NULL,
    '22222222-2222-2222-2222-222222222222',
    NOW() - INTERVAL '4 hours'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'Osmosis and Diffusion: Movement Across Membranes',
    'Biology',
    'Concentration gradients, isotonic/hypertonic/hypotonic solutions, and the practical experiments most likely to appear in UNEB papers.',
    'https://meet.google.com/nop-qrst-uvw',
    NOW() - INTERVAL '5 days',
    5000,
    '+256700000001',
    'Mary Nakato',
    'completed',
    NULL,
    NULL,
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '20 days'
  ),
  (
    '56666666-6666-6666-6666-666666666666',
    'Statistics Crash Course: Mean, Median, Mode',
    'Mathematics',
    'Was scheduled but cancelled while the teacher recovers from illness. Will be rescheduled in the next intake.',
    'https://meet.google.com/xyz-1234-567',
    NOW() + INTERVAL '7 days',
    6000,
    '+256700000002',
    'Joseph Okello',
    'cancelled',
    NULL,
    NULL,
    '22222222-2222-2222-2222-222222222222',
    NOW() - INTERVAL '6 days'
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3) SESSION TAGS
-- ----------------------------------------------------------------------------
-- Mix of single-word and multi-word tags. Unique (session_id, tag) constraint
-- makes ON CONFLICT DO NOTHING the right idempotency strategy.

INSERT INTO public.session_tags (session_id, tag)
VALUES
  -- Cell Biology Fundamentals
  ('51111111-1111-1111-1111-111111111111', 'biology'),
  ('51111111-1111-1111-1111-111111111111', 'cell biology'),
  ('51111111-1111-1111-1111-111111111111', 'mitosis'),
  ('51111111-1111-1111-1111-111111111111', 'organelles'),
  -- Genetics & Inheritance
  ('52222222-2222-2222-2222-222222222222', 'biology'),
  ('52222222-2222-2222-2222-222222222222', 'genetics'),
  ('52222222-2222-2222-2222-222222222222', 'inheritance'),
  ('52222222-2222-2222-2222-222222222222', 'mendel'),
  -- Algebra
  ('53333333-3333-3333-3333-333333333333', 'mathematics'),
  ('53333333-3333-3333-3333-333333333333', 'algebra'),
  ('53333333-3333-3333-3333-333333333333', 'equations'),
  ('53333333-3333-3333-3333-333333333333', 'functions'),
  -- Trigonometry
  ('54444444-4444-4444-4444-444444444444', 'mathematics'),
  ('54444444-4444-4444-4444-444444444444', 'trigonometry'),
  ('54444444-4444-4444-4444-444444444444', 'geometry'),
  -- Osmosis (completed)
  ('55555555-5555-5555-5555-555555555555', 'biology'),
  ('55555555-5555-5555-5555-555555555555', 'osmosis'),
  ('55555555-5555-5555-5555-555555555555', 'diffusion'),
  ('55555555-5555-5555-5555-555555555555', 'cell biology'),
  -- Statistics (cancelled)
  ('56666666-6666-6666-6666-666666666666', 'mathematics'),
  ('56666666-6666-6666-6666-666666666666', 'statistics'),
  ('56666666-6666-6666-6666-666666666666', 'probability')
ON CONFLICT (session_id, tag) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4) ENROLLMENTS
-- ----------------------------------------------------------------------------
-- Mix of payment_status values so the Student/Admin dashboards render all
-- three states. unique_enrollment(session_id, student_id) drives idempotency.

INSERT INTO public.enrollments (
  id, session_id, student_id, payment_status,
  payment_screenshot, payment_note, enrolled_at
)
VALUES
  -- Alice → Cell Biology (approved, paid via mobile money)
  (
    '61111111-1111-1111-1111-111111111111',
    '51111111-1111-1111-1111-111111111111',
    '31111111-1111-1111-1111-111111111111',
    'approved',
    NULL,
    'Paid 5,000 UGX via MTN MoMo, transaction ID MP240115.0001.A12345',
    NOW() - INTERVAL '1 day'
  ),
  -- Alice → Algebra (pending review)
  (
    '62222222-2222-2222-2222-222222222222',
    '53333333-3333-3333-3333-333333333333',
    '31111111-1111-1111-1111-111111111111',
    'pending',
    NULL,
    'Sent 6,000 UGX from 0772-XXX-XXX — screenshot attached on WhatsApp',
    NOW() - INTERVAL '3 hours'
  ),
  -- Bob → Cell Biology (pending review)
  (
    '63333333-3333-3333-3333-333333333333',
    '51111111-1111-1111-1111-111111111111',
    '32222222-2222-2222-2222-222222222222',
    'pending',
    NULL,
    'Payment from Airtel Money, 5,000 UGX, ref AM2024-78821',
    NOW() - INTERVAL '6 hours'
  ),
  -- Chloe → Osmosis (approved — historical, completed session)
  (
    '64444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555',
    '33333333-3333-3333-3333-333333333333',
    'approved',
    NULL,
    'Paid 5,000 UGX via MTN MoMo before the session ran',
    NOW() - INTERVAL '8 days'
  ),
  -- Daniel → Algebra (rejected — duplicate/insufficient proof)
  (
    '65555555-5555-5555-5555-555555555555',
    '53333333-3333-3333-3333-333333333333',
    '34444444-4444-4444-4444-444444444444',
    'rejected',
    NULL,
    'Forwarded SMS without transaction ID; teacher asked for screenshot',
    NOW() - INTERVAL '12 hours'
  )
ON CONFLICT (session_id, student_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5) TOPIC REQUESTS
-- ----------------------------------------------------------------------------
-- One authenticated request (Bob, pending) and one anonymous request
-- (approved + linked to a session).

INSERT INTO public.topic_requests (
  id, student_id, subject, topic, description, email,
  status, is_anonymous, approved_session_id, rejection_reason, created_at
)
VALUES
  (
    '71111111-1111-1111-1111-111111111111',
    '32222222-2222-2222-2222-222222222222',
    'Physics',
    'Newton''s Three Laws of Motion explained simply',
    'I keep mixing up the third law. Could a teacher walk through everyday examples (kicking a ball, walking, rocket launch) and link each one to the right law?',
    NULL,
    'pending',
    false,
    NULL,
    NULL,
    NOW() - INTERVAL '2 days'
  ),
  (
    '72222222-2222-2222-2222-222222222222',
    NULL,
    'Chemistry',
    'How to balance chemical equations confidently',
    'A walk-through of balancing strategies for tricky reactions (redox especially) would help a lot before the mock exam.',
    'visitor@example.com',
    'approved',
    true,
    NULL,
    NULL,
    NOW() - INTERVAL '5 days'
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6) TOPIC REQUEST VOTES
-- ----------------------------------------------------------------------------
-- Sample votes on the public (non-anonymous) request so the voting UI has
-- something to show.

INSERT INTO public.topic_request_votes (request_id, student_id)
VALUES
  -- Alice, Chloe, and Daniel upvote Bob's Physics request
  ('71111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111'),
  ('71111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333'),
  ('71111111-1111-1111-1111-111111111111', '34444444-4444-4444-4444-444444444444')
ON CONFLICT (request_id, student_id) DO NOTHING;

COMMIT;

-- ============================================================================
-- SUMMARY (read-only — run after the script to confirm what was created)
-- ============================================================================
-- Uncomment to inspect:
--
-- SELECT 'users'           AS entity, COUNT(*) FROM public.users
--   WHERE email LIKE '%@trmato.test'
-- UNION ALL SELECT 'sessions',        COUNT(*) FROM public.sessions
--   WHERE created_by IN (
--     '11111111-1111-1111-1111-111111111111',
--     '22222222-2222-2222-2222-222222222222')
-- UNION ALL SELECT 'session_tags',    COUNT(*) FROM public.session_tags st
--   JOIN public.sessions s ON s.id = st.session_id
--   WHERE s.created_by IN (
--     '11111111-1111-1111-1111-111111111111',
--     '22222222-2222-2222-2222-222222222222')
-- UNION ALL SELECT 'enrollments',     COUNT(*) FROM public.enrollments
--   WHERE student_id IN (
--     '31111111-1111-1111-1111-111111111111',
--     '32222222-2222-2222-2222-222222222222',
--     '33333333-3333-3333-3333-333333333333',
--     '34444444-4444-4444-4444-444444444444')
-- UNION ALL SELECT 'topic_requests',  COUNT(*) FROM public.topic_requests
--   WHERE id IN (
--     '71111111-1111-1111-1111-111111111111',
--     '72222222-2222-2222-2222-222222222222')
-- UNION ALL SELECT 'topic_request_votes', COUNT(*) FROM public.topic_request_votes
--   WHERE request_id = '71111111-1111-1111-1111-111111111111';
