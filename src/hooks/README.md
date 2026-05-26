# Custom Hooks

## useUpcomingSessions

A custom React hook for fetching upcoming tutoring sessions with tags and 5-minute caching.

### Features

- Fetches sessions where `status = 'upcoming'` ordered by `scheduled_at`
- Joins with `session_tags` table to include tags array for each session
- Implements 5-minute cache to reduce database queries (Requirement 12.1)
- Handles loading and error states
- Provides refetch function to force refresh

### Usage

```javascript
import { useUpcomingSessions } from '../hooks/useUpcomingSessions'

function LandingPage() {
  const { sessions, loading, error, refetch } = useUpcomingSessions()

  if (loading) {
    return <div>Loading sessions...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      {sessions.map(session => (
        <div key={session.id}>
          <h3>{session.title}</h3>
          <p>{session.subject}</p>
          <p>{new Date(session.scheduled_at).toLocaleDateString()}</p>
          <p>Price: {session.price_ugx} UGX</p>
          <div>
            {session.tags.map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

### Return Value

```typescript
{
  sessions: Array<Session>,  // Array of session objects with tags
  loading: boolean,           // True while fetching data
  error: string | null,       // Error message if fetch fails
  refetch: () => Promise<void> // Function to force refresh (bypasses cache)
}
```

### Session Object Structure

```typescript
{
  id: string
  title: string
  subject: string
  description: string
  scheduled_at: string
  price_ugx: number
  status: 'upcoming' | 'completed' | 'cancelled'
  explainer_video: string | null
  video_thumbnail: string | null
  meet_link: string
  payment_number: string
  payment_name: string
  created_by: string
  created_at: string
  tags: string[]  // Array of tag names from session_tags table
}
```

### Caching Behavior

The hook implements a 5-minute cache to reduce database load:

- First call: Fetches from database
- Subsequent calls within 5 minutes: Returns cached data
- After 5 minutes: Automatically refetches from database
- Manual refresh: Call `refetch()` to bypass cache

### Requirements Validated

- **Requirement 2.1**: Display all sessions where Session_Status equals 'upcoming'
- **Requirement 12.1**: Cache the session list with a 5-minute time-to-live to reduce database queries
- **Requirement 15.5**: Fetch and display all associated tags from the session_tags table

### Error Handling

- Session fetch errors: Sets `error` state with error message
- Tag fetch errors: Logs error but continues with empty tags array (graceful degradation)
- Network failures during refresh: Keeps showing cached data if available
