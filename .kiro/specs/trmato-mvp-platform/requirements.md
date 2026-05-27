# Requirements Document: TrMato MVP Platform

## Introduction

TrMato is a minimal live tutoring platform designed for secondary school students in Uganda. The system enables a teacher to create scheduled discussion sessions with optional explainer videos, allows students to browse and enroll in sessions via trust-based mobile money payment, and coordinates live meetings through embedded Google Meet links. The platform prioritizes rapid MVP delivery (80 minutes) with zero infrastructure cost using React, Supabase, and Vercel.

## Glossary

- **System**: The TrMato web application
- **Student**: A user with role 'student' who can browse and enroll in sessions
- **Teacher**: A user with role 'teacher' who can create sessions and manage enrollments
- **Session**: A scheduled tutoring discussion with details, optional video, and payment information
- **Enrollment**: A student's registration for a specific session with payment proof
- **Payment_Proof**: Either a screenshot image or text note submitted as evidence of mobile money payment
- **Explainer_Video**: An optional video file (MP4 or WebM, max 50MB) uploaded by teacher to explain session content
- **Video_Thumbnail**: An optional image file (JPG or PNG, max 2MB) used as video poster
- **Supabase**: The backend-as-a-service providing database, authentication, and file storage
- **Landing_Page**: The public homepage displaying all upcoming sessions
- **Session_Modal**: A popup dialog showing full session details with video player and enrollment form
- **Student_Dashboard**: The authenticated view showing a student's enrollments and payment status
- **Admin_Panel**: The authenticated view for teachers to create sessions and manage enrollments
- **Meet_Link**: A Google Meet URL for the live tutoring session
- **Payment_Status**: One of 'pending', 'approved', or 'rejected'
- **Session_Status**: One of 'upcoming', 'completed', or 'cancelled'
- **Session_Tags**: A table storing tags associated with sessions for categorization and filtering
- **Tag**: A short text label (max 50 characters) used to categorize sessions (e.g., "osmosis", "cell biology")
- **SearchFilterBar**: A component providing search input, subject dropdown, and tag filtering controls
- **TagPill**: A clickable badge component displaying a tag name
- **Popular_Tags**: The top 10 most frequently used tags across all upcoming sessions
- **Search_Query**: User-entered text used to filter sessions by title or description
- **Subject_Filter**: A selected subject used to filter sessions by subject field
- **Tag_Filter**: One or more selected tags used to filter sessions by their associated tags
- **Active_Filter**: Any currently applied filter (search, subject, or tag) that is modifying the displayed session list
- **Debouncing**: A technique to delay search execution until user stops typing (300ms delay)
- **Topic_Request**: A student or anonymous user submission requesting a specific topic to be covered in a future session
- **TopicRequestPage**: A public page displaying all topic requests where users can browse and submit new requests
- **TopicRequestForm**: A form component for submitting topic requests (supports both authenticated and anonymous submissions)
- **Topic_Request_Votes**: A table storing upvotes from authenticated students on topic requests
- **Vote_Count**: The number of upvotes a topic request has received from authenticated students
- **Anonymous_Request**: A topic request submitted without authentication, requiring an email address for future contact
- **Request_Status**: One of 'pending', 'approved', or 'rejected' indicating the state of a topic request
- **Approved_Session_ID**: A foreign key linking an approved topic request to the session created from it
- **Rejection_Reason**: Optional text explaining why a topic request was rejected by the teacher
- **Resend_Confirmation_Action**: A UI control on the sign-in form that lets a user request a new email-confirmation message when sign-in fails because their email address has not yet been confirmed

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to create an account and log in, so that I can access platform features based on my role.

#### Acceptance Criteria

1. WHEN a user submits a signup form with username, email, and password, THE System SHALL create a new user account with role 'student' by default
2. WHEN a user submits valid login credentials, THE System SHALL authenticate the user and establish a session
3. WHEN a user's session is established, THE System SHALL persist the session across page reloads
4. WHEN an authenticated user logs out, THE System SHALL terminate the session and redirect to the Landing_Page
5. THE System SHALL validate that email addresses follow valid email format
6. THE System SHALL validate that usernames are between 3 and 30 characters
7. THE System SHALL enforce that email addresses are unique across all users
8. THE System SHALL enforce that usernames are unique across all users
9. WHEN a sign-in attempt fails because the user's email address has not yet been confirmed, THE System SHALL display a "Resend confirmation email" action alongside the error message
10. WHEN a user activates the "Resend confirmation email" action, THE System SHALL send a new confirmation email to the email address currently entered in the sign-in form
11. WHILE a confirmation email is being resent, THE System SHALL disable the "Resend confirmation email" action and display a sending indicator
12. WHEN a confirmation email is successfully resent, THE System SHALL display a confirmation message that includes the destination email address and instruct the user to check their inbox
13. WHEN a confirmation email resend request fails, THE System SHALL display the failure reason inline and keep the "Resend confirmation email" action available for retry
14. WHEN a user edits the email field after an unconfirmed-email error, THE System SHALL hide the "Resend confirmation email" action until a new unconfirmed-email error occurs
15. THE System SHALL only display the "Resend confirmation email" action for unconfirmed-email errors, and NOT for other sign-in failures such as invalid credentials

### Requirement 2: Public Session Discovery

**User Story:** As a visitor, I want to browse upcoming tutoring sessions without logging in, so that I can decide if I want to enroll.

#### Acceptance Criteria

1. WHEN any user visits the Landing_Page, THE System SHALL display all sessions where Session_Status equals 'upcoming'
2. WHEN displaying sessions on the Landing_Page, THE System SHALL show title, subject, scheduled date, and price for each session
3. WHEN a user clicks on a session card, THE System SHALL open the Session_Modal with full session details
4. THE System SHALL render the Landing_Page in a responsive grid layout optimized for mobile devices
5. THE System SHALL allow unauthenticated users to view the Landing_Page and session list

### Requirement 3: Session Detail Viewing with Video Playback

**User Story:** As a visitor, I want to view detailed session information with an explainer video, so that I can understand what the session covers before enrolling.

#### Acceptance Criteria

1. WHEN a Session_Modal opens for a session where Explainer_Video is not null, THE System SHALL display a video player at the top of the modal
2. WHEN a video player is displayed, THE System SHALL autoplay the video in muted mode
3. WHEN a video player is displayed, THE System SHALL show the Video_Thumbnail as the poster image
4. WHEN a video player is displayed, THE System SHALL provide standard playback controls including play, pause, volume, and fullscreen
5. WHEN a video player is displayed on mobile devices, THE System SHALL render touch-friendly controls and support playsInline mode
6. WHEN a Session_Modal opens for a session where Explainer_Video is null, THE System SHALL display session description without a video player
7. WHEN a video fails to load or play, THE System SHALL display a fallback message and show session description normally
8. THE System SHALL maintain video aspect ratio automatically across all screen sizes
9. THE System SHALL use preload='metadata' to optimize initial video loading performance

### Requirement 4: Student Enrollment with Payment Proof

**User Story:** As a student, I want to enroll in a session by submitting payment proof, so that I can attend the live tutoring session.

#### Acceptance Criteria

1. WHEN an authenticated Student views a Session_Modal, THE System SHALL display payment instructions including mobile money number and account holder name
2. WHEN a Student submits an enrollment, THE System SHALL require either a payment screenshot or a payment note
3. WHEN a Student submits an enrollment with valid Payment_Proof, THE System SHALL create an enrollment record with Payment_Status 'pending'
4. WHEN a Student attempts to enroll in a session they are already enrolled in, THE System SHALL prevent the duplicate enrollment and display an error message
5. WHEN a Student submits an enrollment without any Payment_Proof, THE System SHALL display a validation error and prevent submission
6. WHEN an enrollment is created, THE System SHALL display a confirmation message indicating payment is under review
7. THE System SHALL enforce a unique constraint preventing multiple enrollments by the same Student for the same Session

### Requirement 5: Student Enrollment Management

**User Story:** As a student, I want to view my enrolled sessions and their payment status, so that I can track my enrollments and access approved sessions.

#### Acceptance Criteria

1. WHEN an authenticated Student accesses the Student_Dashboard, THE System SHALL display all enrollments for that Student
2. WHEN displaying enrollments, THE System SHALL show the session details and Payment_Status for each enrollment
3. WHEN displaying an enrollment where Payment_Status equals 'approved', THE System SHALL display the Meet_Link for that session
4. WHEN displaying an enrollment where Payment_Status equals 'pending' or 'rejected', THE System SHALL hide the Meet_Link
5. THE System SHALL display Payment_Status using visual badges indicating 'pending', 'approved', or 'rejected'
6. THE System SHALL allow Students to filter enrollments by upcoming versus past sessions

### Requirement 6: Teacher Session Creation with Video Upload

**User Story:** As a teacher, I want to create tutoring sessions with optional explainer videos, so that students can understand the session content before enrolling.

#### Acceptance Criteria

1. WHEN an authenticated Teacher submits a session creation form, THE System SHALL create a new session with the provided details
2. WHEN creating a session, THE System SHALL require title, subject, description, scheduled date/time, price, Meet_Link, payment number, and payment name
3. WHEN creating a session, THE System SHALL validate that the title is between 10 and 200 characters
4. WHEN creating a session, THE System SHALL validate that the description is at least 20 characters
5. WHEN creating a session, THE System SHALL validate that the scheduled date/time is in the future
6. WHEN creating a session, THE System SHALL validate that the price is a positive integer
7. WHEN creating a session, THE System SHALL validate that the Meet_Link is a valid URL
8. WHEN a Teacher uploads an Explainer_Video file, THE System SHALL validate that the file format is MP4 or WebM
9. WHEN a Teacher uploads an Explainer_Video file, THE System SHALL validate that the file size does not exceed 50MB
10. WHEN a Teacher uploads a Video_Thumbnail file, THE System SHALL validate that the file format is JPG or PNG
11. WHEN a Teacher uploads a Video_Thumbnail file, THE System SHALL validate that the file size does not exceed 2MB
12. WHEN a Teacher uploads valid video and thumbnail files, THE System SHALL upload them to Supabase Storage and store the public URLs in the session record
13. WHEN a Teacher uploads a Video_Thumbnail without an Explainer_Video, THE System SHALL display a warning and not upload the thumbnail
14. WHEN video or thumbnail upload fails, THE System SHALL display an error message and allow session creation without the video
15. THE System SHALL provide a preview of uploaded video and thumbnail before final submission
16. THE System SHALL set Session_Status to 'upcoming' by default for newly created sessions

### Requirement 7: Teacher Enrollment Management

**User Story:** As a teacher, I want to review payment proofs and approve enrollments, so that I can control who attends my sessions.

#### Acceptance Criteria

1. WHEN an authenticated Teacher accesses the Admin_Panel, THE System SHALL display all sessions created by that Teacher
2. WHEN a Teacher views a session in the Admin_Panel, THE System SHALL display all enrollments for that session
3. WHEN displaying enrollments, THE System SHALL show the student information, Payment_Status, and Payment_Proof for each enrollment
4. WHEN a Teacher views an enrollment with a payment screenshot, THE System SHALL display the screenshot image
5. WHEN a Teacher views an enrollment with a payment note, THE System SHALL display the text note
6. WHEN a Teacher approves an enrollment, THE System SHALL update the Payment_Status to 'approved'
7. WHEN a Teacher rejects an enrollment, THE System SHALL update the Payment_Status to 'rejected'
8. THE System SHALL allow only the Teacher who created a session to view and manage enrollments for that session

### Requirement 8: Role-Based Access Control

**User Story:** As a system administrator, I want to enforce role-based permissions, so that users can only access features appropriate to their role.

#### Acceptance Criteria

1. WHEN an authenticated Student attempts to access the Admin_Panel, THE System SHALL redirect to the Student_Dashboard and display an access denied message
2. WHEN an authenticated Teacher attempts to access the Student_Dashboard, THE System SHALL redirect to the Admin_Panel
3. WHEN an authenticated user accesses a protected route, THE System SHALL verify the user's role and redirect accordingly
4. THE System SHALL enforce Row Level Security policies preventing Students from modifying sessions
5. THE System SHALL enforce Row Level Security policies preventing Students from viewing other students' enrollments
6. THE System SHALL enforce Row Level Security policies preventing Teachers from modifying sessions they did not create
7. THE System SHALL allow public read access to sessions where Session_Status equals 'upcoming'

### Requirement 9: Data Validation and Integrity

**User Story:** As a system architect, I want to enforce data validation rules, so that the database maintains consistent and valid data.

#### Acceptance Criteria

1. THE System SHALL enforce that each enrollment has exactly one Student and one Session
2. THE System SHALL enforce that Payment_Proof contains either a payment screenshot or a payment note (or both)
3. THE System SHALL enforce that Session_Status is one of 'upcoming', 'completed', or 'cancelled'
4. THE System SHALL enforce that Payment_Status is one of 'pending', 'approved', or 'rejected'
5. THE System SHALL enforce that user roles are either 'student' or 'teacher'
6. WHEN a session is deleted, THE System SHALL cascade delete all associated enrollments
7. THE System SHALL create database indexes on sessions.scheduled_at and sessions.status for query performance
8. THE System SHALL create a composite index on enrollments(student_id, payment_status) for query performance
9. THE System SHALL create a database index on sessions.subject for subject filtering performance
10. THE System SHALL create a full-text search index on sessions(title, description) for text search performance
11. THE System SHALL create a database index on session_tags.tag for tag filtering performance
12. THE System SHALL create a database index on session_tags.session_id for tag lookup performance
13. THE System SHALL create a database index on topic_requests.status for filtering by status
14. THE System SHALL create a database index on topic_requests.student_id for student dashboard queries
15. THE System SHALL create a database index on topic_requests.is_anonymous for separating student versus anonymous requests
16. THE System SHALL create a database index on topic_requests.created_at for sorting by date
17. THE System SHALL create a database index on topic_request_votes.request_id for vote counting queries
18. THE System SHALL create a database index on topic_request_votes.student_id for checking user's votes
19. THE System SHALL create a composite index on topic_request_votes(request_id, student_id) for uniqueness enforcement

### Requirement 10: File Storage and Access Control

**User Story:** As a system architect, I want to manage file uploads securely, so that videos are publicly accessible while payment proofs remain private.

#### Acceptance Criteria

1. THE System SHALL store Explainer_Video files in a public Supabase Storage bucket named 'media'
2. THE System SHALL store Video_Thumbnail files in the public 'media' bucket
3. THE System SHALL store payment screenshot files in a private Supabase Storage bucket named 'payment-proofs'
4. THE System SHALL allow any user to read files from the 'media' bucket for video streaming
5. THE System SHALL allow only authenticated Teachers to upload files to the 'media' bucket
6. THE System SHALL allow only the session owner Teacher to delete files from the 'media' bucket
7. THE System SHALL allow only authenticated Students to upload files to the 'payment-proofs' bucket
8. THE System SHALL allow only the enrollment owner Student and the session owner Teacher to read files from the 'payment-proofs' bucket
9. THE System SHALL organize video files using path structure: media/videos/{session_id}/{timestamp}_{filename}
10. THE System SHALL organize thumbnail files using path structure: media/thumbnails/{session_id}/{timestamp}_{filename}

### Requirement 11: Error Handling and User Feedback

**User Story:** As a user, I want clear error messages when something goes wrong, so that I can understand and resolve issues.

#### Acceptance Criteria

1. WHEN a Student attempts to enroll in a session twice, THE System SHALL display error message "You are already enrolled in this session"
2. WHEN a Student submits enrollment without Payment_Proof, THE System SHALL display error message "Please provide payment proof"
3. WHEN a Teacher creates a session with a past date, THE System SHALL display error message "Session date must be in the future"
4. WHEN an unauthorized user attempts to access a protected route, THE System SHALL display error message "Access denied"
5. WHEN a network request fails, THE System SHALL display error message "Connection error. Please try again."
6. WHEN a Teacher uploads a video file exceeding 50MB, THE System SHALL display error message "Video file must be under 50MB"
7. WHEN a Teacher uploads an unsupported video format, THE System SHALL display error message "Only MP4 and WebM formats are supported"
8. WHEN a Teacher uploads a thumbnail exceeding 2MB, THE System SHALL display error message "Thumbnail must be under 2MB"
9. WHEN a Teacher uploads an unsupported thumbnail format, THE System SHALL display error message "Only JPG and PNG formats are supported"
10. WHEN video upload to Supabase Storage fails, THE System SHALL display error message "Failed to upload video. Please try again."
11. WHEN a video fails to play in the browser, THE System SHALL display fallback message "Video unavailable" and show session description
12. WHEN form validation fails, THE System SHALL keep the modal or form open and highlight the invalid fields
13. WHEN a Teacher attempts to add a tag exceeding 50 characters, THE System SHALL display error message "Tags must be 1-50 characters"
14. WHEN a Teacher attempts to add an empty tag, THE System SHALL display error message "Tags must be 1-50 characters"
15. WHEN a Teacher attempts to add a duplicate tag to a session, THE System SHALL display error message "Tag already added"
16. WHEN a user enters a search query exceeding 200 characters, THE System SHALL truncate the query to 200 characters
17. WHEN active filters return zero sessions, THE System SHALL display message "No sessions found. Try adjusting your filters."
18. WHEN fetching session tags fails, THE System SHALL display sessions with empty tags array and log the error
19. WHEN an anonymous user submits a topic request without an email, THE System SHALL display error message "Email is required for anonymous requests"
20. WHEN any user submits a topic request with an invalid email format, THE System SHALL display error message "Please enter a valid email address"
21. WHEN any user submits a topic request with a topic less than 5 characters, THE System SHALL display error message "Topic must be at least 5 characters"
22. WHEN any user submits a topic request with a topic exceeding 200 characters, THE System SHALL display error message "Topic must be 200 characters or less"
23. WHEN any user submits a topic request with a description exceeding 1000 characters, THE System SHALL display error message "Description must be 1000 characters or less"
24. WHEN a Student attempts to vote for the same request twice due to a race condition, THE System SHALL silently ignore the duplicate vote and show the current vote state
25. WHEN an unauthenticated user attempts to vote on a topic request, THE System SHALL display message "Please sign in to vote"
26. WHEN fetching topic requests fails, THE System SHALL display error message "Unable to load topic requests. Please try again." with a retry button
27. WHEN a Teacher approves a topic request without creating a session, THE System SHALL update the status to 'approved' and leave Approved_Session_ID as null

### Requirement 12: Performance and Scalability

**User Story:** As a system architect, I want the platform to perform efficiently within free tier limits, so that we can serve students without infrastructure costs.

#### Acceptance Criteria

1. THE System SHALL cache the session list with a 5-minute time-to-live to reduce database queries
2. THE System SHALL lazy load the Session_Modal to avoid loading video content until the modal opens
3. THE System SHALL paginate enrollment lists displaying 20 enrollments per page
4. THE System SHALL use video preload='metadata' to load only video metadata initially
5. THE System SHALL stream video files from Supabase Storage without requiring full download
6. THE System SHALL compress videos to H.264 codec at 720p resolution with 1-2 Mbps bitrate
7. THE System SHALL compress thumbnails to JPEG quality 80% with maximum resolution 1920×1080
8. WHEN video streaming bandwidth approaches 2GB per month, THE System SHALL log a warning for monitoring
9. THE System SHALL support up to 50 concurrent students within Supabase free tier limits
10. THE System SHALL support up to 10 sessions per month with 10MB average video size
11. THE System SHALL debounce search input by 300ms to reduce database queries while typing
12. THE System SHALL memoize filtered session calculations to avoid redundant filtering operations

### Requirement 13: Security and Privacy

**User Story:** As a user, I want my data to be secure and private, so that my personal information and payment details are protected.

#### Acceptance Criteria

1. THE System SHALL hash all passwords using bcrypt through Supabase Auth
2. THE System SHALL store session tokens in httpOnly cookies to prevent XSS attacks
3. THE System SHALL automatically refresh authentication tokens before expiration
4. THE System SHALL sanitize all user input to prevent XSS attacks
5. THE System SHALL verify MIME types for all uploaded files to prevent malicious uploads
6. THE System SHALL validate file extensions for all uploaded files
7. THE System SHALL enforce that payment screenshots are only viewable by the Student who uploaded them and the Teacher who owns the session
8. THE System SHALL enforce that Explainer_Video and Video_Thumbnail files do not contain sensitive student information
9. THE System SHALL enforce that Meet_Link is only visible to Students with approved enrollments
10. THE System SHALL provide GDPR-compliant data deletion upon user request

### Requirement 14: Browser Compatibility and Responsiveness

**User Story:** As a user, I want the platform to work on my device, so that I can access it from desktop or mobile.

#### Acceptance Criteria

1. THE System SHALL support the latest 2 versions of Chrome, Edge, Firefox, and Safari
2. THE System SHALL support iOS Safari and Chrome Android mobile browsers
3. THE System SHALL render all pages responsively on screen sizes from 320px to 2560px width
4. THE System SHALL render the Landing_Page in a mobile-first responsive grid layout
5. THE System SHALL render the video player responsively maintaining aspect ratio on all devices
6. THE System SHALL provide touch-friendly video controls on mobile devices
7. THE System SHALL support video fullscreen mode on all supported browsers
8. WHEN autoplay is blocked by browser policy, THE System SHALL display a play button for manual video start

### Requirement 15: Tag Management

**User Story:** As a teacher, I want to add descriptive tags to my sessions, so that students can find sessions by topic and filter by relevant subjects.

#### Acceptance Criteria

1. WHEN a Teacher creates a session with tags, THE System SHALL store each tag as a separate row in the session_tags table linked to that session
2. WHEN a Teacher submits a tag, THE System SHALL validate that the tag length is between 1 and 50 characters inclusive
3. WHEN a Teacher submits a tag for a session, THE System SHALL prevent duplicate tags for that session (case-insensitive)
4. WHEN a Teacher submits a tag, THE System SHALL normalize the tag to lowercase and trim leading/trailing whitespace before storage
5. WHEN displaying a session, THE System SHALL fetch and display all associated tags from the session_tags table
6. WHEN a session is deleted, THE System SHALL automatically delete all associated rows in session_tags (cascade delete)
7. WHEN a Teacher creates a session, THE System SHALL provide a tag input component allowing multiple tags to be added and removed
8. WHEN a Teacher adds a tag in the tag input, THE System SHALL display the tag as a removable pill/badge
9. WHEN a Teacher clicks the remove button on a tag pill in the input, THE System SHALL remove that tag from the session's tag list
10. WHEN displaying sessions on the Landing_Page, THE System SHALL show tags as clickable pills below the session title

### Requirement 16: Search and Filtering

**User Story:** As a visitor, I want to search and filter sessions by text, subject, and tags, so that I can quickly find sessions relevant to my learning needs.

#### Acceptance Criteria

1. WHEN a user enters text in the search input, THE System SHALL filter sessions to show only those where the search text appears in the title OR description (case-insensitive)
2. WHEN a user selects a subject from the subject filter dropdown, THE System SHALL filter sessions to show only those with the selected subject
3. WHEN a user clicks a tag pill to filter, THE System SHALL filter sessions to show only those that have that tag in the session_tags table
4. WHEN multiple filters are active (search text, subject, and/or tags), THE System SHALL apply AND logic showing only sessions that satisfy ALL active filter conditions
5. WHEN the Landing_Page loads, THE System SHALL calculate and display the top 10 most frequently used tags across all upcoming sessions as Popular_Tags
6. WHEN a user clicks a tag pill on a session card or in the Session_Modal, THE System SHALL apply that tag as an active filter and update the displayed sessions
7. WHEN any filter is active, THE System SHALL display a visual indicator (badge, pill, or highlight) in the SearchFilterBar showing which filters are active
8. WHEN a user clicks the clear button on an individual active filter, THE System SHALL remove only that specific filter while keeping other filters active
9. WHEN a user clicks the "Clear All Filters" button, THE System SHALL reset all filters (search text, subject, tags) to empty state and display all upcoming sessions
10. WHEN a user types in the search input, THE System SHALL debounce the search execution by 300ms to avoid excessive queries while typing
11. WHEN a user selects multiple tags for filtering, THE System SHALL show only sessions that have ALL selected tags (AND logic for multiple tags)
12. WHEN no sessions match the active filters, THE System SHALL display an empty state message "No sessions found. Try adjusting your filters."
13. THE System SHALL provide a SearchFilterBar component containing search input, subject dropdown, popular tags display, and active filter indicators
14. THE System SHALL render tag pills as clickable elements with appropriate hover and active states
15. THE System SHALL maintain filter state when navigating between Landing_Page and Session_Modal

### Requirement 17: Topic Request Submission

**User Story:** As a student or visitor, I want to request topics I'd like to learn about, so that the teacher can create sessions based on student demand.

#### Acceptance Criteria

1. WHEN any user submits a topic request, THE System SHALL require that the subject field is non-empty
2. WHEN any user submits a topic request, THE System SHALL validate that the topic is between 5 and 200 characters inclusive
3. WHEN any user submits a topic request with a description, THE System SHALL validate that the description does not exceed 1000 characters
4. WHEN an anonymous user submits a topic request, THE System SHALL require that the email field is non-empty and matches valid email format
5. WHEN an authenticated Student submits a topic request, THE System SHALL allow the email field to be optional
6. WHEN a topic request is created, THE System SHALL set the Request_Status to 'pending' by default
7. WHEN a topic request is created by an anonymous user, THE System SHALL set is_anonymous to true and student_id to null
8. WHEN a topic request is created by an authenticated Student, THE System SHALL set is_anonymous to false and student_id to the Student's user ID
9. WHEN an anonymous user successfully submits a topic request, THE System SHALL display a confirmation message indicating they will be contacted via email
10. WHEN an authenticated Student successfully submits a topic request, THE System SHALL display a confirmation message and add the request to their dashboard
11. THE System SHALL allow public insert access to the topic_requests table for anonymous submissions
12. THE System SHALL validate email format using the pattern /^[^\s@]+@[^\s@]+\.[^\s@]+$/ when email is provided

### Requirement 18: Student Topic Request Management

**User Story:** As a student, I want to view my submitted topic requests and their status, so that I can track which topics have been approved or rejected.

#### Acceptance Criteria

1. WHEN an authenticated Student accesses the Student_Dashboard, THE System SHALL display a "My Topic Requests" section showing all topic requests where student_id equals that Student's user ID
2. WHEN displaying topic requests in the Student_Dashboard, THE System SHALL show status badges indicating 'pending', 'approved', or 'rejected'
3. WHEN displaying a topic request where Request_Status equals 'approved' and Approved_Session_ID is not null, THE System SHALL display a link to the created session
4. WHEN displaying topic requests in the Student_Dashboard, THE System SHALL show the Vote_Count for each request
5. WHEN displaying topic requests in the Student_Dashboard, THE System SHALL sort requests by created_at in descending order (newest first)
6. WHEN a Student views an approved topic request, THE System SHALL display which session was created from that request
7. WHEN a Student views a rejected topic request, THE System SHALL display the Rejection_Reason if one was provided

### Requirement 19: Teacher Topic Request Management

**User Story:** As a teacher, I want to review student topic requests and approve or reject them, so that I can create sessions based on popular demand.

#### Acceptance Criteria

1. WHEN an authenticated Teacher accesses the Admin_Panel "Topic Requests" tab, THE System SHALL display student requests (is_anonymous = false) sorted by Vote_Count in descending order (highest votes first)
2. WHEN an authenticated Teacher accesses the Admin_Panel "Topic Requests" tab, THE System SHALL display anonymous requests (is_anonymous = true) sorted by created_at in descending order (newest first)
3. WHEN a Teacher approves a topic request, THE System SHALL update the Request_Status to 'approved'
4. WHEN a Teacher rejects a topic request, THE System SHALL update the Request_Status to 'rejected'
5. WHEN a Teacher approves a topic request and creates a session, THE System SHALL set the Approved_Session_ID to the created session's ID
6. WHEN a Teacher rejects a topic request with a reason, THE System SHALL store the reason in the Rejection_Reason field
7. WHEN displaying student requests in the Admin_Panel, THE System SHALL show only requests where is_anonymous equals false and student_id is not null
8. WHEN displaying anonymous requests in the Admin_Panel, THE System SHALL show only requests where is_anonymous equals true and student_id is null
9. WHEN displaying topic requests in the Admin_Panel, THE System SHALL show the email field value if it is not null
10. WHEN a Teacher approves a topic request and chooses to create a session, THE System SHALL pre-fill the session creation form with subject from the request's subject, title from the request's topic, and description from the request's description
11. THE System SHALL allow Teachers to approve a topic request without immediately creating a session
12. THE System SHALL display request details including subject, topic, description, email, Vote_Count, and created_at for each request
13. THE System SHALL enforce Row Level Security policies allowing only Teachers to update Request_Status, Approved_Session_ID, and Rejection_Reason

### Requirement 20: Topic Request Voting

**User Story:** As a student, I want to upvote topic requests I'm interested in, so that the teacher knows which topics are most in demand.

#### Acceptance Criteria

1. WHEN any user visits the TopicRequestPage, THE System SHALL display all topic requests where is_anonymous equals false and Request_Status is 'pending' or 'approved'
2. WHEN displaying topic requests on the TopicRequestPage, THE System SHALL exclude all requests where is_anonymous equals true (anonymous requests not shown publicly)
3. WHEN an authenticated Student attempts to upvote a topic request, THE System SHALL enforce that at most one vote exists per Student per request (unique constraint on request_id and student_id)
4. WHEN an unauthenticated user attempts to upvote a topic request, THE System SHALL display message "Please sign in to vote" and prevent the vote
5. WHEN an authenticated Student views the TopicRequestPage, THE System SHALL display vote buttons in filled/active state for requests the Student has already voted for
6. WHEN an authenticated Student successfully upvotes a topic request, THE System SHALL increment the Vote_Count by 1
7. WHEN an authenticated Student removes their vote from a topic request, THE System SHALL decrement the Vote_Count by 1
8. WHEN displaying topic requests on the TopicRequestPage, THE System SHALL sort requests by Vote_Count in descending order (most voted first)
9. THE System SHALL allow authenticated Students to toggle their vote (upvote if not voted, remove vote if already voted)
10. THE System SHALL display the current Vote_Count for each topic request on the TopicRequestPage
11. THE System SHALL enforce Row Level Security policies allowing only authenticated Students to insert and delete their own votes
12. THE System SHALL allow public read access to vote counts for displaying on the TopicRequestPage

### Requirement 21: Topic Request Data Integrity

**User Story:** As a system architect, I want to enforce data integrity rules for topic requests, so that the database maintains consistent and valid data.

#### Acceptance Criteria

1. THE System SHALL conditionally require the email field based on authentication status (required when student_id is null, optional when student_id is not null)
2. WHEN a topic request is deleted, THE System SHALL cascade delete all associated rows in topic_request_votes
3. THE System SHALL enforce that Request_Status is one of 'pending', 'approved', or 'rejected'
4. THE System SHALL enforce a unique constraint on topic_request_votes(request_id, student_id) to prevent duplicate votes
5. THE System SHALL create a database index on topic_requests.status for filtering by status
6. THE System SHALL create a database index on topic_requests.student_id for student dashboard queries
7. THE System SHALL create a database index on topic_requests.is_anonymous for separating student versus anonymous requests
8. THE System SHALL create a database index on topic_requests.created_at for sorting by date
9. THE System SHALL create a database index on topic_request_votes.request_id for vote counting queries
10. THE System SHALL create a database index on topic_request_votes.student_id for checking user's votes
11. THE System SHALL create a composite index on topic_request_votes(request_id, student_id) for uniqueness enforcement
12. THE System SHALL set student_id as a nullable foreign key to users.id with no cascade delete
13. THE System SHALL set Approved_Session_ID as a nullable foreign key to sessions.id

