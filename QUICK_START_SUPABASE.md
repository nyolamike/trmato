# 🚀 Quick Start: Supabase Configuration

## ⚡ 5-Minute Setup

### Step 1: Create Supabase Project (2 min)
1. Go to https://app.supabase.com
2. Click "New Project"
3. Choose free tier, pick a region close to Uganda
4. Wait for provisioning

### Step 2: Get Your Keys (1 min)
1. Settings → API
2. Copy **Project URL** and **anon public** key

### Step 3: Update .env (1 min)
```bash
# Open .env file and replace:
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4: Restart Server (1 min)
```bash
npm run dev
```

## ✅ You're Done!

The Supabase client is now available throughout your app:

```javascript
import { supabase } from './utils/supabase'
```

## 🧪 Test It (Optional)

Add this to any component:
```javascript
import { testSupabaseConnection } from './utils/supabaseTest'

useEffect(() => {
  testSupabaseConnection()
}, [])
```

Check the browser console for ✅ success message.

## 📖 Full Guide

See `SUPABASE_SETUP_GUIDE.md` for detailed instructions and troubleshooting.

## 🔐 Security Reminder

- ✅ `.env` is gitignored (safe)
- ✅ Using anon key (safe for frontend)
- ⚠️ Never commit your `.env` file
- ⚠️ Never use service_role key in frontend

---

**Next**: Set up database tables and authentication
