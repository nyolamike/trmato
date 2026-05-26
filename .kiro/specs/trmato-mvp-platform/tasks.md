# Implementation Plan: TrMato MVP Platform

## Overview

This implementation plan breaks down the TrMato MVP platform into discrete coding tasks. The platform is a minimal live tutoring platform for Uganda students built with React, Supabase, and Vercel. The implementation follows a logical progression: setup → authentication → core features → advanced features → testing and polish.

**Tech Stack**: React (JavaScript), Tailwind CSS, Supabase (database, auth, storage), Vercel deployment

**Target Timeline**: ~135 minutes for MVP completion

## Tasks

### Phase 1: Project Setup and Infrastructure (15 minutes)

- [x] 1. Initialize project structure and dependencies
  - Create React app with Vite or Create React App
  - Install dependencies: @supabase/supabase-js, react-router-dom, tailwindcss
  - Configure Tailwind CSS with mobile-first breakpoints
  - Set up project folder structure: /components, /pages, /contexts, /utils, /hooks
  - Create .env file template for Supabase credentials
  - _Requirements: 12.1, 14.3, 14.4_

- [x] 2. Configure Supabase backend
  - Create Supabase project and obtain API keys
  - Initialize Supabase client in /utils/supabase.js
  - Configure environment variables for Supabase URL and anon key
  - _Requirements: 1.1, 1.2_

- [x] 3. Set up database schema and tables
  - Create users table with id, username, email, role, created_at
  - Create sessions table with all fields including explainer_video, video_thumbnail
  - Create enrollments table with payment_proof_screenshot, payment_proof_note
  - Create session_tags table with session_id, tag, created_at
  - Create topic_requests table with all fields including is_anonymous, email
  - Create topic_request_votes table with request_id, student_id, created_at
  - Add unique constraints: (session_id, student_id) on enrollments, (session_id, tag) on session_tags, (request_id, student_id) on topic_request_votes
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 15.3, 20.3, 21.4_

- [x] 4. Create database indexes for performance
  - Create index on sessions(scheduled_at, status) for filtering upcoming sessions
  - Create index on sessions(subject) for subject filtering
  - Create full-text search index on sessions(title, description) for text search
  - Create index on session_tags(tag) for tag filtering
  - Create index on session_tags(session_id) for tag lookup
  - Create index on enrollments(student_id, payment_status) for dashboard queries
  - Create index on topic_requests(status, is_anonymous, created_at, student_id)
  - Create index on topic_request_votes(request_id, student_id)
  - _Requirements: 9.7, 9.8, 9.9, 9.10, 9.11, 9.12, 9.13, 9.14, 9.15, 9.16, 9.17, 9.18, 9.19_

- [x] 5. Configure Row Level Security (RLS) policies
  - Enable RLS on all tables
  - Users table: users can read their own data only
  - Sessions table: public read for upcoming sessions, teachers can create/update their own
  - Enrollments table: students can create/read their own, teachers can read/update for their sessions
  - Session_tags table: public read, only session owner can create/delete
  - Topic_requests table: public insert, students read their own, teachers read all, only teachers update status
  - Topic_request_votes table: students can insert/delete their own votes, public read for counts
  - _Requirements: 8.4, 8.5, 8.6, 8.7, 17.11, 19.13, 20.11, 20.12_

- [x] 6. Set up Supabase Storage buckets
  - Create 'media' bucket (public) for videos and thumbnails
  - Create 'payment-proofs' bucket (private) for payment screenshots
  - Configure storage policies: teachers upload to media, students upload to payment-proofs
  - Configure read policies: media is public, payment-proofs restricted to owner and session teacher
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.7, 10.8_

### Phase 2: Authentication System (20 minutes)

- [-] 7. Create authentication context and provider
  - [x] 7.1 Implement AuthContext with user state, signUp, signIn, signOut, loading
    - Create /contexts/AuthContext.js with React Context
    - Implement signUp function using Supabase Auth with default role 'student'
    - Implement signIn function with email/password
    - Implement signOut function
    - Handle session persistence across page reloads
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 7.2 Write unit tests for authentication functions
    - Test signUp creates user with role 'student'
    - Test signIn with valid credentials
    - Test signOut clears session
    - Test session persistence
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 8. Build authentication UI components
  - [x] 8.1 Create SignUp component with username, email, password fields
    - Validate email format using regex
    - Validate username length (3-30 characters)
    - Display validation errors inline
    - Handle form submission with AuthContext.signUp
    - _Requirements: 1.5, 1.6, 1.7, 1.8_

  - [x] 8.2 Create SignIn component with email, password fields
    - Handle form submission with AuthContext.signIn
    - Display error messages for invalid credentials
    - Redirect to dashboard on successful login
    - _Requirements: 1.2, 11.4_

  - [x] 8.3 Write unit tests for auth UI components
    - Test form validation for email and username
    - Test error message display
    - Test successful signup/signin flow
    - _Requirements: 1.5, 1.6_

- [x] 9. Implement protected routes and role-based redirects
  - Create ProtectedRoute component checking authentication status
  - Implement role-based redirect: students → Student_Dashboard, teachers → Admin_Panel
  - Prevent students from accessing Admin_Panel (redirect with error message)
  - Prevent teachers from accessing Student_Dashboard (redirect to Admin_Panel)
  - _Requirements: 8.1, 8.2, 8.3, 11.4_

- [x] 10. Checkpoint - Ensure authentication works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10a. Add resend-confirmation flow on the sign-in form
  - Add `resendConfirmation(email)` to AuthContext wrapping `supabase.auth.resend({ type: 'signup', email })`
  - Show a "Resend confirmation email" action in the SignIn server-error block only when sign-in fails with an unconfirmed-email error
  - Handle resend states (idle / sending / sent / error) with inline feedback and disable the action while in flight
  - Hide the action when the user edits the email field after the error
  - Cover the flow with unit tests in `SignIn.test.jsx`
  - _Requirements: 1.9, 1.10, 1.11, 1.12, 1.13, 1.14, 1.15_

### Phase 3: Public Landing Page and Session Discovery (25 minutes)

- [-] 11. Create session data fetching hooks
  - [x] 11.1 Implement useUpcomingSessions hook
    - Fetch sessions where status = 'upcoming' ordered by scheduled_at
    - Join with session_tags to include tags array for each session
    - Implement 5-minute cache using React Query or custom caching
    - Handle loading and error states
    - _Requirements: 2.1, 12.1, 15.5_

  - [x] 11.2 Write property test for upcoming session filtering
    - **Property 7: Upcoming Session Filtering**
    - **Validates: Requirements 2.1**
    - Test that all returned sessions have status = 'upcoming'

- [x] 12. Build Landing Page layout and session grid
  - [x] 12.1 Create LandingPage component with responsive grid
    - Implement mobile-first responsive grid (1 column mobile, 2-3 desktop)
    - Fetch sessions using useUpcomingSessions hook
    - Display loading spinner while fetching
    - Display empty state if no sessions
    - _Requirements: 2.1, 2.5, 14.3, 14.4_

  - [x] 12.2 Create SessionCard component
    - Display title, subject, scheduled date, price
    - Display tags as clickable pills below title
    - Handle click to open Session_Modal
    - Responsive card layout with Tailwind CSS
    - _Requirements: 2.2, 15.10_

  - [x]* 12.3 Write unit tests for SessionCard
    - Test all required fields are displayed
    - Test click handler opens modal
    - Test tag pills are rendered
    - _Requirements: 2.2_

- [x] 13. Implement search and filter functionality
  - [x] 13.1 Create SearchFilterBar component
    - Add search input with 300ms debounce
    - Add subject dropdown filter
    - Display popular tags (top 10 by usage) as clickable pills
    - Show active filters with individual clear buttons
    - Show "Clear All Filters" button when filters active
    - _Requirements: 16.1, 16.2, 16.5, 16.7, 16.8, 16.9, 16.10, 16.13_

  - [x] 13.2 Implement filter logic in LandingPage
    - Apply text search on title and description (case-insensitive)
    - Apply subject filter (exact match)
    - Apply tag filters (AND logic for multiple tags)
    - Combine all filters with AND logic
    - Display "No sessions found" message when results empty
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.11, 16.12_

  - [x]* 13.3 Write property tests for filtering logic
    - **Property 74: Text Search Filtering**
    - **Validates: Requirements 16.1**
    - **Property 75: Subject Filter Application**
    - **Validates: Requirements 16.2**
    - **Property 76: Tag Filter Application**
    - **Validates: Requirements 16.3**
    - **Property 77: Combined Filter AND Logic**
    - **Validates: Requirements 16.4**

- [x] 14. Create TagPill component
  - Render tag as styled badge with Tailwind CSS
  - Support variants: default, active, removable
  - Handle click events for filtering
  - Show remove icon for removable variant
  - Responsive sizing (small on mobile, medium on desktop)
  - _Requirements: 15.10, 16.14_

- [x] 15. Checkpoint - Ensure landing page and filtering work correctly
  - Ensure all tests pass, ask the user if questions arise.

### Phase 4: Session Detail Modal with Video Player (20 minutes)

- [-] 16. Build Session Detail Modal component
  - [x] 16.1 Create SessionDetailModal component structure
    - Implement modal overlay with close button
    - Fetch full session details including video URLs and tags
    - Display session information below video player
    - Show payment instructions (mobile money number and name)
    - Handle modal open/close state
    - Lazy load content only when modal opens
    - _Requirements: 2.3, 3.6, 12.2_

  - [x] 16.2 Implement video player with autoplay
    - Render HTML5 video element when explainer_video is not null
    - Set autoplay, muted, controls, playsInline attributes
    - Use video_thumbnail as poster image
    - Set preload="metadata" for performance
    - Handle video load errors with fallback message
    - Responsive video sizing (max-width: 100%, height: auto)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.9, 11.11, 14.5, 14.6_

  - [x]* 16.3 Write property tests for video player
    - **Property 9: Video Player Conditional Rendering**
    - **Validates: Requirements 3.1**
    - **Property 10: Video Autoplay Configuration**
    - **Validates: Requirements 3.2**
    - **Property 11: Video Thumbnail as Poster**
    - **Validates: Requirements 3.3**
    - **Property 14: No Video Player Without Video**
    - **Validates: Requirements 3.6**

- [-] 17. Implement enrollment form in modal
  - [x] 17.1 Create enrollment form with payment proof upload
    - Show form only for authenticated students
    - Add file input for payment screenshot (optional)
    - Add textarea for payment note (optional)
    - Validate that at least one payment proof is provided
    - Handle form submission to create enrollment
    - Display "Payment under review" message on success
    - Prevent duplicate enrollments (check existing enrollment)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 11.2_

  - [x]* 17.2 Write property tests for enrollment validation
    - **Property 16: Payment Proof Requirement**
    - **Validates: Requirements 4.2**
    - **Property 17: Enrollment Initial Status**
    - **Validates: Requirements 4.3**
    - **Property 18: Enrollment Uniqueness**
    - **Validates: Requirements 4.4**

- [x] 18. Add tag filtering from modal
  - Make tags clickable in SessionDetailModal
  - On tag click, close modal and apply tag filter to landing page
  - Maintain filter state when navigating between modal and landing page
  - _Requirements: 16.6, 16.15_

- [x] 19. Checkpoint - Ensure session modal and enrollment work correctly
  - Ensure all tests pass, ask the user if questions arise.

### Phase 5: Student Dashboard (15 minutes)

- [ ] 20. Create Student Dashboard page
  - [ ] 20.1 Implement enrollment list display
    - Fetch enrollments for current student with session details
    - Display session title, date, price, payment status
    - Show payment status badges (pending/approved/rejected)
    - Display Meet_Link only for approved enrollments
    - Implement filter toggle for upcoming vs past sessions
    - Paginate enrollments (20 per page)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 12.3_

  - [ ]* 20.2 Write property tests for enrollment display
    - **Property 19: Student Enrollment Filtering**
    - **Validates: Requirements 5.1**
    - **Property 20: Meet Link Conditional Visibility**
    - **Validates: Requirements 5.3, 5.4**

- [ ] 21. Add "My Topic Requests" section to dashboard
  - [ ] 21.1 Display student's topic requests
    - Fetch topic requests where student_id matches current user
    - Display subject, topic, description, vote count, status
    - Show status badges (pending/approved/rejected)
    - Display link to created session if approved and approved_session_id not null
    - Display rejection reason if rejected and reason provided
    - Sort by created_at descending (newest first)
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_

  - [ ]* 21.2 Write property test for topic request filtering
    - **Property 108: Student Topic Request Filtering**
    - **Validates: Requirements 18.1**

### Phase 6: Teacher Admin Panel - Session Management (25 minutes)

- [ ] 22. Create Admin Panel layout
  - Create AdminPanel component with tabs: Sessions, Enrollments, Topic Requests
  - Implement tab navigation
  - Restrict access to teachers only (role check)
  - _Requirements: 7.1, 8.1_

- [ ] 23. Build session creation form with video upload
  - [ ] 23.1 Create SessionForm component
    - Add fields: title, subject, description, scheduled_at, price, meet_link, payment_number, payment_name
    - Add tag input component (comma-separated or chip style)
    - Add video file input (MP4/WebM, max 50MB)
    - Add thumbnail file input (JPG/PNG, max 2MB)
    - Validate all required fields
    - Validate title length (10-200 chars)
    - Validate description length (min 20 chars)
    - Validate scheduled_at is future date
    - Validate price is positive integer
    - Validate meet_link is valid URL
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ] 23.2 Implement video and thumbnail upload
    - Validate video format (MP4, WebM) and size (max 50MB)
    - Validate thumbnail format (JPG, PNG) and size (max 2MB)
    - Upload video to Supabase Storage 'media' bucket with path: media/videos/{session_id}/{timestamp}_{filename}
    - Upload thumbnail to 'media' bucket with path: media/thumbnails/{session_id}/{timestamp}_{filename}
    - Store public URLs in session record
    - Show preview of uploaded video and thumbnail
    - Display warning if thumbnail uploaded without video
    - Handle upload errors gracefully (allow session creation without video)
    - _Requirements: 6.8, 6.9, 6.10, 6.11, 6.12, 6.13, 6.14, 6.15, 10.9, 10.10_

  - [ ] 23.3 Implement tag management in session form
    - Create TagInput component with add/remove functionality
    - Validate tag length (1-50 chars)
    - Normalize tags to lowercase and trim whitespace
    - Prevent duplicate tags (case-insensitive)
    - Display tags as removable pills
    - Store tags in session_tags table on session creation
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.8, 15.9_

  - [ ]* 23.4 Write property tests for session validation
    - **Property 22: Session Title Length Validation**
    - **Validates: Requirements 6.3**
    - **Property 24: Future Date Validation**
    - **Validates: Requirements 6.5**
    - **Property 27: Video Format Validation**
    - **Validates: Requirements 6.8**
    - **Property 28: Video File Size Limit**
    - **Validates: Requirements 6.9**
    - **Property 70: Tag Length Validation**
    - **Validates: Requirements 15.2**

- [ ] 24. Display teacher's sessions list
  - Fetch sessions where created_by equals current teacher's user ID
  - Display sessions with title, subject, date, status, tags
  - Show session count and basic stats
  - _Requirements: 7.1, 7.2, 15.5_

- [ ] 25. Checkpoint - Ensure session creation and video upload work correctly
  - Ensure all tests pass, ask the user if questions arise.

### Phase 7: Teacher Admin Panel - Enrollment Management (15 minutes)

- [ ] 26. Build enrollment management interface
  - [ ] 26.1 Display enrollments for teacher's sessions
    - Fetch enrollments for sessions created by current teacher
    - Group enrollments by session
    - Display student info, payment status, payment proof
    - Show payment screenshot if provided (fetch from payment-proofs bucket)
    - Show payment note if provided
    - Paginate enrollments (20 per page)
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 12.3_

  - [ ] 26.2 Implement approve/reject actions
    - Add approve button to update payment_status to 'approved'
    - Add reject button to update payment_status to 'rejected'
    - Verify teacher owns the session before allowing updates
    - Display success message on status update
    - Refresh enrollment list after update
    - _Requirements: 7.6, 7.7, 7.8_

  - [ ]* 26.3 Write property tests for enrollment management
    - **Property 34: Teacher Session Ownership Filtering**
    - **Validates: Requirements 7.1**
    - **Property 35: Payment Status Transition on Approval**
    - **Validates: Requirements 7.6**
    - **Property 37: Session Enrollment Authorization**
    - **Validates: Requirements 7.8**

### Phase 8: Topic Request System (20 minutes)

- [ ] 27. Create Topic Request Page (public)
  - [ ] 27.1 Build TopicRequestPage component
    - Fetch approved and pending non-anonymous requests (is_anonymous = false)
    - Display requests sorted by vote_count descending
    - Show subject, topic, description, vote count, status
    - Display vote buttons for authenticated students
    - Show filled button state for requests user has voted for
    - Display "Please sign in to vote" for unauthenticated users
    - _Requirements: 20.1, 20.2, 20.8, 20.10_

  - [ ] 27.2 Implement voting functionality
    - Handle upvote action: insert into topic_request_votes
    - Handle remove vote action: delete from topic_request_votes
    - Enforce unique constraint (one vote per student per request)
    - Update vote_count on vote/unvote
    - Toggle vote button state based on user's votes
    - Require authentication for voting
    - _Requirements: 20.3, 20.4, 20.5, 20.6, 20.7, 20.9_

  - [ ]* 27.3 Write property tests for voting
    - **Property 120: Vote Uniqueness Per Student Per Request**
    - **Validates: Requirements 20.3**
    - **Property 123: Vote Count Update on Vote**
    - **Validates: Requirements 20.6**
    - **Property 124: Vote Count Update on Unvote**
    - **Validates: Requirements 20.7**

- [ ] 28. Create Topic Request Form
  - [ ] 28.1 Build TopicRequestForm component
    - Add fields: subject dropdown, topic input, description textarea, email input
    - Show email as required for anonymous users
    - Show email as optional for authenticated users
    - Validate subject is non-empty
    - Validate topic length (5-200 chars)
    - Validate description length (max 1000 chars)
    - Validate email format when provided
    - Handle submission for both authenticated and anonymous users
    - Set is_anonymous flag based on authentication status
    - Display success message after submission
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.7, 17.8, 17.12_

  - [ ]* 28.2 Write property tests for topic request validation
    - **Property 102: Topic Request Topic Length Validation**
    - **Validates: Requirements 17.2**
    - **Property 104: Anonymous Request Email Requirement**
    - **Validates: Requirements 17.4**
    - **Property 106: Topic Request Default Status**
    - **Validates: Requirements 17.6**

- [ ] 29. Add Topic Requests tab to Admin Panel
  - [ ] 29.1 Display student requests section
    - Fetch requests where is_anonymous = false
    - Sort by vote_count descending (highest votes first)
    - Display subject, topic, description, email, vote count, created_at
    - Show status badges (pending/approved/rejected)
    - _Requirements: 19.1, 19.7, 19.12_

  - [ ] 29.2 Display anonymous requests section
    - Fetch requests where is_anonymous = true
    - Sort by created_at descending (newest first)
    - Display subject, topic, description, email, created_at
    - Show status badges
    - _Requirements: 19.2, 19.8, 19.12_

  - [ ] 29.3 Implement approve/reject actions
    - Add approve button with option to create session
    - Pre-fill session form with request data if creating session
    - Update status to 'approved' and set approved_session_id if session created
    - Allow approval without creating session (approved_session_id remains null)
    - Add reject button with optional reason input
    - Update status to 'rejected' and store rejection_reason
    - _Requirements: 19.3, 19.4, 19.5, 19.6, 19.10, 19.11_

  - [ ]* 29.4 Write property tests for topic request management
    - **Property 112: Student Requests Sorting by Votes**
    - **Validates: Requirements 19.1**
    - **Property 113: Anonymous Requests Sorting by Date**
    - **Validates: Requirements 19.2**

- [ ] 30. Checkpoint - Ensure topic request system works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

### Phase 9: Error Handling and User Feedback (10 minutes)

- [ ] 31. Implement comprehensive error handling
  - Add error boundaries for React components
  - Display user-friendly error messages for all validation failures
  - Handle network errors with retry options
  - Display specific error messages per requirement 11 (duplicate enrollment, missing payment proof, past date, etc.)
  - Keep forms open on validation failure with highlighted invalid fields
  - Display fallback message when video fails to load
  - Handle file upload errors gracefully
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10, 11.11, 11.12, 11.13, 11.14, 11.15, 11.16, 11.17, 11.18, 11.19, 11.20, 11.21, 11.22, 11.23, 11.24, 11.25, 11.26, 11.27_

- [ ] 32. Add loading states and spinners
  - Show loading spinner while fetching data
  - Disable buttons during form submission
  - Show progress indicator for file uploads
  - Display skeleton loaders for session cards
  - _Requirements: 12.1, 12.2_

### Phase 10: Security and Data Validation (10 minutes)

- [ ] 33. Implement input sanitization
  - Sanitize all user text inputs to prevent XSS attacks
  - Escape HTML tags in titles, descriptions, notes
  - Validate file MIME types match declared types
  - Validate file extensions match allowed types
  - _Requirements: 13.4, 13.5, 13.6_

- [ ] 34. Verify RLS policies and access control
  - Test that students cannot modify sessions
  - Test that students can only see their own enrollments
  - Test that teachers can only modify their own sessions
  - Test that payment proofs are only visible to owner and session teacher
  - Test that meet links are only visible for approved enrollments
  - _Requirements: 8.4, 8.5, 8.6, 10.8, 13.7, 13.9_

- [ ] 35. Implement secure file upload validation
  - Verify MIME types server-side for all uploads
  - Check file extensions match allowed types
  - Enforce file size limits (50MB video, 2MB thumbnail)
  - Prevent malicious file uploads
  - _Requirements: 13.5, 13.6_

### Phase 11: Responsive Design and Browser Compatibility (10 minutes)

- [ ] 36. Ensure mobile-first responsive design
  - Test all pages on mobile viewport (320px width)
  - Verify responsive grid layouts work correctly
  - Test video player responsiveness and aspect ratio
  - Ensure touch-friendly controls on mobile
  - Test fullscreen video mode on mobile
  - Verify all components stack properly on small screens
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

- [ ] 37. Test browser compatibility
  - Test on Chrome, Firefox, Safari, Edge (latest 2 versions)
  - Test on iOS Safari and Chrome Android
  - Verify video autoplay behavior across browsers
  - Implement autoplay fallback for browsers that block autoplay
  - _Requirements: 14.1, 14.2, 14.8_

### Phase 12: Performance Optimization (5 minutes)

- [ ] 38. Optimize video delivery
  - Verify video streaming works without full download
  - Test video preload="metadata" reduces initial load
  - Ensure lazy loading of modal content
  - Monitor bandwidth usage (log warning at 2GB/month)
  - _Requirements: 12.4, 12.5, 12.8_

- [ ] 39. Optimize database queries
  - Verify indexes are used for all filter queries
  - Test pagination works correctly (20 items per page)
  - Verify 5-minute cache reduces database load
  - Test debounced search reduces query count
  - _Requirements: 12.1, 12.3, 12.11_

### Phase 13: Final Integration and Testing (10 minutes)

- [ ] 40. End-to-end integration testing
  - Test complete student enrollment flow: browse → view session → enroll → dashboard
  - Test complete teacher flow: create session with video → manage enrollments → approve payment
  - Test topic request flow: submit request → vote → teacher approve → session created
  - Test search and filter combinations
  - Test authentication flows and role-based redirects
  - _Requirements: All_

- [ ] 41. Deploy to Vercel
  - Configure Vercel project with environment variables
  - Deploy frontend to Vercel free tier
  - Verify production build works correctly
  - Test deployed app with real Supabase backend
  - _Requirements: 12.9, 12.10_

- [ ] 42. Final checkpoint and handoff
  - Verify all core features work in production
  - Document any known issues or limitations
  - Provide deployment credentials and access
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout development
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation follows a logical progression to minimize rework and enable early testing
- Video upload and topic request features are advanced features that can be deprioritized if time is constrained
- Focus on core enrollment flow first (phases 1-7) before implementing topic requests (phase 8)
