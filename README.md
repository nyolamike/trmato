# TrMato MVP Platform

A minimal live tutoring platform for secondary school students in Uganda, built with React, Supabase, and Tailwind CSS.

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Page-level components
├── contexts/       # React Context providers (Auth, etc.)
├── utils/          # Utility functions and helpers
├── hooks/          # Custom React hooks
└── assets/         # Static assets (images, icons)
```

## Tech Stack

- **Frontend**: React with Vite
- **Styling**: Tailwind CSS (mobile-first approach)
- **Backend**: Supabase (database, auth, storage)
- **Routing**: React Router DOM
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Add your Supabase project URL and anon key

4. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these values from your Supabase project settings at:
https://app.supabase.com/project/_/settings/api

## Features

- User authentication (students and teachers)
- Session browsing and discovery
- Video-based session explanations
- Mobile money payment verification
- Student enrollment management
- Teacher admin panel
- Topic request system
- Search and filtering

## Mobile-First Design

The platform is designed with a mobile-first approach, supporting screen sizes from 320px to 2560px width. All components are responsive and optimized for touch interactions.

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Deployment (Vercel)

The frontend is configured for deployment on Vercel's free tier.

### Prerequisites

- A [Vercel account](https://vercel.com/signup)
- A Supabase project with migrations applied and seed data loaded
- Git repository connected to Vercel (recommended)

### Environment Variables

Set these in the Vercel project dashboard under **Settings → Environment Variables**:

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

Get both values from: https://app.supabase.com/project/_/settings/api

### Deploy via Git (recommended)

1. Push the repository to GitHub
2. Import the repo in [Vercel Dashboard](https://vercel.com/new)
3. Vercel auto-detects Vite — no custom build settings needed
4. Add the environment variables above
5. Deploy — Vercel auto-deploys on every push to `main`

### Deploy via CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

When prompted, accept the defaults. Add environment variables with:

```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

### Post-Deploy Checklist

- [ ] Landing page loads and shows upcoming sessions
- [ ] Student sign-up redirects to `/dashboard`
- [ ] Teacher sign-up/sign-in redirects to `/admin`
- [ ] Session modal opens and video streams
- [ ] Enrollment form submits payment proof
- [ ] Topic requests page loads and accepts votes

The `vercel.json` config handles SPA routing (all paths rewrite to `index.html`) and sets long-lived cache headers for static assets.

## License

MIT
