# 📚 TrMato — Project Specification
### *TR = Teacher Room. Mato = Matovu. A Live Discussion & Tutoring Platform for Secondary School Students in Uganda*

---

## 🎯 Project Overview

**TrMato** is a lightweight web platform that allows a teacher (Matovu) to host paid, scheduled live discussion sessions for secondary school students outside of school hours. Students subscribe per session or per period, coordinate entry is managed manually (via Google Meet), and payments are collected via mobile money. The platform starts simple and is built to grow.

---

## 💡 Suggested Domain Names

All names below use "matovu" as the root, are creatively meaningful, and as of mid-2025 are highly likely to be **unregistered** and purchasable for **~$10–15/year** via Namecheap, Porkbun, or Cloudflare Registrar.

| Domain | Vibe | Why it works |
|---|---|---|
| **trmato.com** | Warm, classroom-like | A "room" you enter to learn — familiar metaphor |
| **matovudesk.com** | Clean, professional | The teacher's desk — where knowledge originates |
| **matovuclass.net** | Straightforward | Simple, direct; `.net` keeps cost low |
| **matovunotes.com** | Study-culture forward | Notes = learning; very student-friendly |
| **mrmato.com** | Punchy nickname | Short, memorable, brandable like a startup |
| **matovuhub.ug** | Locally rooted | `.ug` domain signals Uganda — great for trust |
| **deskwithmatovu.com** | Friendly & personal | Has a "learn with me" narrative feel |
| **matovulearn.com** | Crystal clear | Exactly what it does — learn with Matovu |

> ✅ **Top Recommendation:** `trmato.com` — short, available, memorable, and metaphorically perfect for a virtual classroom experience. Pair with `trmato.ug` later for local credibility.

---

## 🧱 Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| **Frontend** | React (JavaScript only, no TypeScript) | Familiar, component-based, huge ecosystem |
| **Styling** | Tailwind CSS | Rapid, consistent UI without writing custom CSS files |
| **Backend / DB** | Supabase | Postgres DB, Auth, Storage, Realtime — all as a service |
| **Auth** | Supabase Auth (email/password + username lookup) | Built-in, free tier generous |
| **File Storage** | Supabase Storage | For explainer video uploads |
| **Hosting** | GitHub Pages or Vercel (via GitHub repo) | Free, CI/CD on push |
| **Video Calls** | Google Meet (manual link embed) | No integration needed — just paste the link |
| **Payments** | Mobile Money (manual, MTN/Airtel Uganda) | No API integration for now — trust-based |

---

## 👥 User Roles

### 1. `student`
- Signs up with username + password
- Browses and views session listings
- Clicks a session → sees popup with description + explainer video
- Submits payment proof (screenshot or note) via the platform
- Requests discussion topics

### 2. `coordinator`
- Assigned by the teacher
- Views list of students who have confirmed payment for each session
- Controls who gets admitted to the Google Meet (manually)
- Can mark students as "paid / admitted"

### 3. `teacher` (Matovu / admin)
- Creates and manages sessions
- Uploads explainer videos and session descriptions
- Sets mobile money payment number and amount per session
- Reviews topic requests from students
- Views payment confirmations

---

## 🗄️ Database Schema (Supabase / PostgreSQL)

### `users`
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
username      text UNIQUE NOT NULL
email         text UNIQUE
password_hash text  -- handled by Supabase Auth
role          text DEFAULT 'student'  -- 'student' | 'coordinator' | 'teacher'
full_name     text
school        text
class_level   text   -- e.g. "S3", "S4", "S6"
parent_phone  text
profile_photo text   -- URL from Supabase Storage
created_at    timestamptz DEFAULT now()
```

### `sessions`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
title           text NOT NULL
subject         text NOT NULL         -- e.g. "Biology", "Physics"
description     text NOT NULL
meet_link       text NOT NULL
explainer_video text                  -- URL from Supabase Storage
scheduled_at    timestamptz NOT NULL
duration_mins   integer DEFAULT 60
price_ugx       integer NOT NULL      -- price in Uganda Shillings
payment_number  text NOT NULL         -- MTN/Airtel number for payment
payment_name    text NOT NULL         -- Name on the mobile money account
max_students    integer
status          text DEFAULT 'upcoming'  -- 'upcoming' | 'live' | 'ended'
created_by      uuid REFERENCES users(id)
created_at      timestamptz DEFAULT now()
```

### `session_tags`
```sql
id         uuid PRIMARY KEY DEFAULT gen_random_uuid()
session_id uuid REFERENCES sessions(id) ON DELETE CASCADE
tag        text NOT NULL   -- e.g. "friction", "osmosis", "organic chemistry"
```

### `enrollments`
```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
session_id          uuid REFERENCES sessions(id)
student_id          uuid REFERENCES users(id)
payment_status      text DEFAULT 'pending'  -- 'pending' | 'confirmed' | 'rejected'
payment_screenshot  text    -- URL of uploaded payment proof
payment_note        text    -- student's note e.g. "Sent 5000 from 0772..."
confirmed_by        uuid REFERENCES users(id)   -- coordinator who confirmed
admitted_to_meet    boolean DEFAULT false
enrolled_at         timestamptz DEFAULT now()
```

### `topic_requests`
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
student_id   uuid REFERENCES users(id)
subject      text NOT NULL
topic        text NOT NULL
description  text
votes        integer DEFAULT 0
status       text DEFAULT 'pending'  -- 'pending' | 'scheduled' | 'declined'
created_at   timestamptz DEFAULT now()
```

### `topic_request_votes`
```sql
id         uuid PRIMARY KEY DEFAULT gen_random_uuid()
request_id uuid REFERENCES topic_requests(id)
student_id uuid REFERENCES users(id)
voted_at   timestamptz DEFAULT now()
UNIQUE(request_id, student_id)
```

---

## 🗂️ Application Modules

---

### Module 1 — Public Landing Page

**Route:** `/`

**What it shows:**
- Hero section: platform name, tagline, brief description
- Upcoming sessions (cards with subject, date, price, tags)
- CTA: "Sign up to join a session"
- Teacher's brief bio section

**Behaviour:**
- Unauthenticated users can browse upcoming sessions
- Clicking a session card triggers a **popup modal** (see Module 2)
- Sign up / Login buttons in the navbar

---

### Module 2 — Session Detail Popup (Modal)

**Triggered by:** Clicking any session card (anywhere on the site)

**Popup contains:**
- Session title and subject
- Tags (clickable pills, e.g. `#Biology` `#Osmosis`)
- Scheduled date and time (in EAT timezone)
- Duration estimate
- Short explainer video (embedded, autoplay muted)
- Full description of what will be discussed
- Price (in UGX)
- Payment instructions:
  - Mobile money number
  - Name on account
  - Amount to send
  - What to include in the reference (username)
- "I've Paid — Submit Proof" button (visible only to logged-in students)
- Upload field for payment screenshot OR text field for payment note

**After submitting proof:**
- Enrollment record created with `payment_status: 'pending'`
- Student sees: *"Your payment is being verified. You'll be notified once confirmed."*

---

### Module 3 — Sessions Explorer

**Route:** `/sessions`

**Features:**
- Grid/list of all upcoming sessions
- Filter by subject (Biology, Physics, Chemistry, etc.)
- Filter/search by tag
- Status badges: `Upcoming` / `Live Now` / `Ended`
- Each card shows: title, subject, tags, date, price, slots remaining

---

### Module 4 — Student Signup & Auth

**Routes:** `/signup`, `/login`

**Signup form (minimal at first):**
```
Username*       → unique, used for payment reference
Password*       → confirmed twice
```

**After signup → redirect to profile page to optionally complete:**
```
Full Name
Email
School Name
Class / Level (S1–S6)
Parent/Guardian Phone Number
Profile Photo (upload)
```

**Auth notes:**
- Use Supabase Auth with email OR username lookup
- Store username in the `users` table, linked to Supabase auth UUID
- Session persists via Supabase session tokens (localStorage)

---

### Module 5 — Student Dashboard

**Route:** `/dashboard`

**Tabs:**
1. **My Sessions** — sessions the student has enrolled in + payment status
2. **Upcoming** — all future sessions
3. **My Requests** — topic requests the student has submitted
4. **Profile** — edit profile details

**My Sessions card shows:**
- Session name, date, subject
- Payment status badge: `Pending` / `Confirmed` / `Rejected`
- If confirmed: Google Meet link becomes visible (button: "Join Session")
- If rejected: note from coordinator + option to re-submit proof

---

### Module 6 — Topic Request Module

**Route:** `/requests`

**Student view:**
- Form to submit a topic request:
  - Subject (dropdown: Biology, Physics, Chemistry, Math, etc.)
  - Topic name
  - Description / why they want it discussed
- List of all submitted topic requests (by all students)
- Upvote button on each request (one vote per student)
- Status badge: `Pending` / `Scheduled` / `Declined`

**Teacher view (in admin panel):**
- Sorted by votes (most requested first)
- Mark as `Scheduled` (optionally link to a new session)
- Mark as `Declined` with an optional reason

---

### Module 7 — Coordinator Panel

**Route:** `/coordinator`
**Access:** Users with role `coordinator`

**Features:**
- Session selector (dropdown of upcoming/live sessions)
- For the selected session:
  - List of all enrolled students
  - Payment status filter: All / Pending / Confirmed
  - For each student:
    - Name, username, school
    - Payment screenshot (viewable in modal) or payment note
    - Buttons: ✅ Confirm Payment | ❌ Reject | 📋 Mark as Admitted to Meet
- Admitted count vs. enrolled count shown at top
- "Copy Meet Link" button for easy sharing

---

### Module 8 — Teacher Admin Panel

**Route:** `/admin`
**Access:** Users with role `teacher`

**Sections:**

#### A. Session Management
- Create new session (full form)
- Edit / cancel existing sessions
- Upload explainer video (Supabase Storage)
- Set payment number + name per session

#### B. Topic Requests Management
- View all requests sorted by votes
- Approve → optionally auto-fill a new session from the request
- Decline with note

#### C. Student Management
- View all registered students
- View enrollment history per student
- Assign coordinator role to a user

#### D. Stats Dashboard (simple)
- Total students registered
- Sessions held this month
- Enrollments pending payment confirmation
- Most requested subjects/topics

---

## 📁 Project Folder Structure

```
trmato/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── main.jsx                    # App entry point
│   ├── App.jsx                     # Router setup
│   ├── supabaseClient.js           # Supabase init
│   │
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── SessionCard.jsx
│   │   ├── SessionModal.jsx        # The popup with video + payment info
│   │   ├── TagPill.jsx
│   │   ├── PaymentProofForm.jsx
│   │   └── VideoPlayer.jsx
│   │
│   ├── pages/
│   │   ├── LandingPage.jsx
│   │   ├── SessionsPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── SignupPage.jsx
│   │   ├── StudentDashboard.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── TopicRequestsPage.jsx
│   │   ├── CoordinatorPanel.jsx
│   │   └── AdminPanel.jsx
│   │
│   ├── hooks/
│   │   ├── useAuth.js              # Auth state + helpers
│   │   ├── useSessions.js          # Fetch sessions + filters
│   │   └── useTopicRequests.js
│   │
│   ├── context/
│   │   └── AuthContext.jsx         # Global auth provider
│   │
│   └── utils/
│       ├── formatDate.js           # EAT timezone formatting
│       ├── subjects.js             # Subject list constants
│       └── roles.js                # Role constants + guards
│
├── .env                            # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── package.json
├── vite.config.js
└── README.md
```

---

## ⚙️ Supabase Setup Checklist

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema (all tables above) in the Supabase SQL Editor
3. Enable **Row Level Security (RLS)** on all tables
4. Set RLS policies:
   - Students can only read/write their own enrollments and requests
   - Coordinators can update `enrollments.payment_status` and `admitted_to_meet`
   - Teachers can do everything
   - All roles can read `sessions` and `session_tags`
5. Create a **Supabase Storage bucket** called `media` for explainer videos
6. Set bucket to public reads (so videos stream without auth)
7. Copy `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `.env`

---

## 🔐 Row Level Security (RLS) Policy Summary

| Table | Student | Coordinator | Teacher |
|---|---|---|---|
| `users` | Read/update own | Read all | Full |
| `sessions` | Read all | Read all | Full |
| `session_tags` | Read all | Read all | Full |
| `enrollments` | Read/insert own | Read + update status/admitted | Full |
| `topic_requests` | Read all, insert own | Read all | Full |
| `topic_request_votes` | Insert/delete own | Read all | Full |

---

## 🚀 GitHub + Hosting Setup

1. Create a GitHub repo: `trmato` (or chosen name)
2. Initialize with Vite + React:
   ```bash
   npm create vite@latest trmato -- --template react
   ```
3. Install dependencies:
   ```bash
   npm install @supabase/supabase-js react-router-dom @tailwindcss/vite tailwindcss
   ```
4. Push to GitHub
5. Connect repo to **Vercel** (free):
   - Import GitHub repo
   - Set env variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - Vercel auto-deploys on every push to `main`
6. (Optional) Add custom domain (e.g. `trmato.com`) in Vercel settings

---

## 📱 Mobile Considerations

- All pages must be **mobile-first responsive** (Tailwind handles this)
- Session popup should be a **full-screen bottom sheet** on mobile
- Payment instructions should be **copy-to-clipboard** friendly
- Video player should be fluid width

---

## 🔮 Phase 2 (Future Features — Don't Build Yet)

| Feature | Notes |
|---|---|
| MTN Mobile Money API integration | Automate payment confirmation |
| SMS notifications (Africa's Talking) | Notify students of confirmation |
| Recorded session replays | Upload post-session recordings |
| Student progress tracking | Track which topics each student attended |
| Referral system | Students earn free sessions by inviting others |
| Certificates of attendance | PDF generated per session |
| Multi-teacher support | Other teachers join the platform |
| Subscription plans | Weekly/monthly access bundles |

---

## 📋 Build Order Recommendation for Kiro / AI Coding Tool

Follow this sequence for the smoothest build:

```
Phase 1 — Foundation
  1. Supabase project setup + schema + RLS policies
  2. Vite + React app scaffold + Tailwind + Router
  3. Supabase client config + AuthContext

Phase 2 — Auth
  4. Signup page (username + password)
  5. Login page
  6. Protected route wrapper (role-based)
  7. Basic profile page

Phase 3 — Core Student Experience
  8. Landing page with session cards
  9. Session detail modal (description + video + payment info)
  10. Sessions explorer with subject/tag filters
  11. Payment proof submission form
  12. Student dashboard (my sessions + payment status)

Phase 4 — Topic Requests
  13. Topic request submission form
  14. Public topic request board with upvoting

Phase 5 — Coordinator Panel
  15. Coordinator dashboard + student enrollment list
  16. Payment confirmation + admit-to-meet flow

Phase 6 — Teacher Admin
  17. Session creation form + video upload
  18. Topic request management
  19. Student management + role assignment
  20. Simple stats dashboard
```

---

## 🏷️ Supported Subjects & Example Tags

**Subjects (dropdown):**
Biology, Physics, Chemistry, Mathematics, Geography, History, Computer Science, Economics, English, Luganda

**Example Tags:**
`osmosis`, `photosynthesis`, `cell division`, `friction`, `Newton's laws`, `acids & bases`, `organic chemistry`, `probability`, `tectonic plates`, `colonial history`, `binary`, `supply & demand`, `essay writing`, `grammar`

---

## 📌 Key Design Principles

1. **Simple first** — no payment gateway, no SMS, no video hosting (YouTube/Supabase is fine)
2. **Mobile-first** — most Ugandan students browse on phones
3. **Trust-based** — payment is manual, coordinator manually admits; keep it honest
4. **Affordable stack** — Supabase free tier + Vercel free tier = **zero hosting cost to start**
5. **Expandable** — every table and module is designed to grow without rebuilding

---

*Built for Matovu — a teacher who shows up. Now his students can show up for him too.* 🇺🇬
