# Supabase Backend Configuration Guide

This guide will help you set up your Supabase backend for the TrMato MVP Platform.

## Prerequisites

- A Supabase account (free tier is sufficient)
- The project dependencies already installed (✅ @supabase/supabase-js is installed)

## Step 1: Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in or create a free account
3. Click **"New Project"**
4. Fill in the project details:
   - **Name**: `trmato-mvp` (or any name you prefer)
   - **Database Password**: Create a strong password (save this securely!)
   - **Region**: Choose the closest region to Uganda (e.g., `eu-west-1` or `ap-south-1`)
   - **Pricing Plan**: Select **Free** tier
5. Click **"Create new project"**
6. Wait 2-3 minutes for the project to be provisioned

## Step 2: Get Your API Keys

1. Once your project is ready, navigate to **Settings** (gear icon in the left sidebar)
2. Click on **API** in the settings menu
3. You'll see two important values:
   - **Project URL**: This is your `VITE_SUPABASE_URL`
   - **anon public**: This is your `VITE_SUPABASE_ANON_KEY`

## Step 3: Configure Environment Variables

1. Open the `.env` file in the root of your project
2. Replace the placeholder values with your actual Supabase credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

**Example:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjI0MjQwMCwiZXhwIjoxOTMxODE4NDAwfQ.example-signature
```

⚠️ **Important**: Never commit your `.env` file to version control. It's already in `.gitignore`.

## Step 4: Verify the Configuration

The Supabase client has been initialized in `src/utils/supabase.js` with the following features:

- ✅ Automatic token refresh
- ✅ Session persistence across page reloads
- ✅ Session detection from URL (for email confirmations)
- ✅ Environment variable validation

### Test the Connection

You can test if your Supabase connection is working by importing the client:

```javascript
import { supabase } from './utils/supabase'

// Test the connection
const testConnection = async () => {
  const { data, error } = await supabase.from('users').select('count')
  if (error) {
    console.error('Connection error:', error)
  } else {
    console.log('Connected to Supabase!')
  }
}
```

## Step 5: Next Steps - Database Setup

After configuring the Supabase client, you'll need to:

1. **Create database tables** (users, sessions, enrollments, session_tags, topic_requests, topic_request_votes)
2. **Set up Row Level Security (RLS) policies**
3. **Create storage buckets** for media files and payment proofs
4. **Configure authentication settings**

These will be handled in subsequent tasks.

## Troubleshooting

### Error: "Missing Supabase environment variables"

- Make sure your `.env` file exists in the project root
- Verify that the variable names are exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart your development server after changing `.env` values

### Error: "Invalid API key"

- Double-check that you copied the **anon public** key, not the service_role key
- Ensure there are no extra spaces or line breaks in your `.env` file

### Connection Issues

- Verify your Supabase project is active (not paused)
- Check that your internet connection is stable
- Ensure the Project URL includes `https://` and ends with `.supabase.co`

## Security Notes

- The **anon key** is safe to use in client-side code
- Never use the **service_role** key in your frontend application
- Row Level Security (RLS) policies will protect your data even with the anon key exposed
- The `.env` file is gitignored to prevent accidental commits

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Status**: ✅ Supabase client configured and ready to use

**Next Task**: Set up database schema and authentication
