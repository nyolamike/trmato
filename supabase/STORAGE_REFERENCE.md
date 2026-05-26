# Storage Buckets Reference

This document provides a quick reference for the Supabase Storage configuration in the TrMato MVP Platform.

## Buckets Overview

| Bucket Name | Public | Size Limit | Allowed Types | Purpose |
|-------------|--------|------------|---------------|---------|
| `media` | Yes | 50MB | MP4, WebM, JPEG, PNG | Explainer videos and thumbnails |
| `payment-proofs` | No | 5MB | JPEG, PNG | Payment proof screenshots |

## File Path Structures

### Media Bucket

**Videos:**
```
media/videos/{session_id}/{timestamp}_{filename}
```
Example: `media/videos/550e8400-e29b-41d4-a716-446655440000/1704067200_biology_intro.mp4`

**Thumbnails:**
```
media/thumbnails/{session_id}/{timestamp}_{filename}
```
Example: `media/thumbnails/550e8400-e29b-41d4-a716-446655440000/1704067200_thumbnail.jpg`

### Payment-Proofs Bucket

**Payment Screenshots:**
```
payment-proofs/{enrollment_id}/{timestamp}_{filename}
```
Example: `payment-proofs/660e8400-e29b-41d4-a716-446655440000/1704067200_payment.jpg`

## Access Control Policies

### Media Bucket (Public)

| Action | Who Can Access | Policy Name |
|--------|----------------|-------------|
| **Read** | Anyone (public) | `Public read access to media` |
| **Upload** | Teachers only | `Teachers can upload media` |
| **Update** | Teachers only | `Teachers can update own media` |
| **Delete** | Session owner teacher | `Teachers can delete own session media` |

**Use Cases:**
- Students and visitors can stream videos without authentication
- Teachers upload videos when creating sessions
- Teachers can replace videos if needed
- Teachers can delete videos for sessions they created

### Payment-Proofs Bucket (Private)

| Action | Who Can Access | Policy Name |
|--------|----------------|-------------|
| **Upload** | Students only | `Students can upload payment proofs` |
| **Read** | Student (owner) + Session teacher | `Students can read own payment proofs` + `Teachers can read session payment proofs` |
| **Update** | Student (owner) | `Students can update own payment proofs` |
| **Delete** | Student (owner) | `Students can delete own payment proofs` |

**Use Cases:**
- Students upload payment screenshots when enrolling
- Students can view their own payment proofs
- Teachers can view payment proofs for enrollments in their sessions
- Students can replace payment screenshots before approval

## File Size Limits

### Application-Level Validation

```javascript
const FILE_SIZE_LIMITS = {
  video: 50 * 1024 * 1024,      // 50MB
  thumbnail: 2 * 1024 * 1024,   // 2MB
  paymentProof: 5 * 1024 * 1024 // 5MB
};

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
```

### Bucket-Level Enforcement

- **media bucket**: 50MB limit (enforced by Supabase)
- **payment-proofs bucket**: 5MB limit (enforced by Supabase)

## MIME Type Validation

### Media Bucket
- `video/mp4` - MP4 video files
- `video/webm` - WebM video files
- `image/jpeg` - JPEG images (thumbnails)
- `image/png` - PNG images (thumbnails)

### Payment-Proofs Bucket
- `image/jpeg` - JPEG images
- `image/png` - PNG images

## Upload Examples

### Upload Video (Teacher)

```javascript
import { supabase } from './supabaseClient';

async function uploadVideo(sessionId, videoFile) {
  const timestamp = Date.now();
  const filename = `${timestamp}_${videoFile.name}`;
  const filePath = `videos/${sessionId}/${filename}`;
  
  const { data, error } = await supabase.storage
    .from('media')
    .upload(filePath, videoFile, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) throw error;
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('media')
    .getPublicUrl(filePath);
  
  return publicUrl;
}
```

### Upload Thumbnail (Teacher)

```javascript
async function uploadThumbnail(sessionId, thumbnailFile) {
  const timestamp = Date.now();
  const filename = `${timestamp}_${thumbnailFile.name}`;
  const filePath = `thumbnails/${sessionId}/${filename}`;
  
  const { data, error } = await supabase.storage
    .from('media')
    .upload(filePath, thumbnailFile, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('media')
    .getPublicUrl(filePath);
  
  return publicUrl;
}
```

### Upload Payment Proof (Student)

```javascript
async function uploadPaymentProof(enrollmentId, paymentFile) {
  const timestamp = Date.now();
  const filename = `${timestamp}_${paymentFile.name}`;
  const filePath = `${enrollmentId}/${filename}`;
  
  const { data, error } = await supabase.storage
    .from('payment-proofs')
    .upload(filePath, paymentFile, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) throw error;
  
  // Get signed URL (private bucket)
  const { data: { signedUrl } } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(filePath, 3600); // 1 hour expiry
  
  return signedUrl;
}
```

## Delete Examples

### Delete Video (Session Owner Teacher)

```javascript
async function deleteVideo(videoUrl) {
  // Extract path from URL
  const path = videoUrl.split('/storage/v1/object/public/media/')[1];
  
  const { error } = await supabase.storage
    .from('media')
    .remove([path]);
  
  if (error) throw error;
}
```

### Delete Payment Proof (Student Owner)

```javascript
async function deletePaymentProof(enrollmentId, filename) {
  const filePath = `${enrollmentId}/${filename}`;
  
  const { error } = await supabase.storage
    .from('payment-proofs')
    .remove([filePath]);
  
  if (error) throw error;
}
```

## Retrieve Examples

### Get Public Video URL

```javascript
// For public media bucket, construct URL directly
function getVideoUrl(sessionId, filename) {
  const { data: { publicUrl } } = supabase.storage
    .from('media')
    .getPublicUrl(`videos/${sessionId}/${filename}`);
  
  return publicUrl;
}
```

### Get Private Payment Proof URL

```javascript
// For private bucket, use signed URLs
async function getPaymentProofUrl(enrollmentId, filename) {
  const filePath = `${enrollmentId}/${filename}`;
  
  const { data, error } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(filePath, 3600); // 1 hour expiry
  
  if (error) throw error;
  
  return data.signedUrl;
}
```

## Security Considerations

### Media Bucket (Public)
- ✅ Videos are publicly accessible for streaming
- ✅ Only teachers can upload/modify media
- ✅ Session owner can delete their media
- ⚠️ Anyone with the URL can access videos (by design)

### Payment-Proofs Bucket (Private)
- ✅ Payment proofs are private by default
- ✅ Only student owner and session teacher can view
- ✅ Students can only upload to their own enrollments
- ✅ Signed URLs expire after 1 hour
- ⚠️ Store only enrollment_id in path, not student_id

## Error Handling

### Common Upload Errors

```javascript
async function handleUpload(file, bucket, path) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file);
    
    if (error) {
      if (error.message.includes('already exists')) {
        throw new Error('File already exists. Use a unique filename.');
      }
      if (error.message.includes('size')) {
        throw new Error('File size exceeds limit.');
      }
      if (error.message.includes('type')) {
        throw new Error('File type not allowed.');
      }
      throw error;
    }
    
    return data;
  } catch (err) {
    console.error('Upload failed:', err);
    throw err;
  }
}
```

## Performance Optimization

### Video Compression Recommendations

```javascript
// Recommended video settings for optimal streaming
const VIDEO_SETTINGS = {
  codec: 'H.264',
  resolution: '720p',
  bitrate: '1-2 Mbps',
  format: 'MP4'
};

// Recommended thumbnail settings
const THUMBNAIL_SETTINGS = {
  format: 'JPEG',
  quality: '80%',
  maxResolution: '1920x1080'
};
```

### Caching Strategy

```javascript
// Set cache headers for better performance
const uploadOptions = {
  cacheControl: '3600',  // 1 hour cache
  upsert: false          // Prevent accidental overwrites
};
```

## Requirements Mapping

This storage configuration satisfies the following requirements:

- **10.1**: Explainer videos stored in public 'media' bucket ✅
- **10.2**: Video thumbnails stored in public 'media' bucket ✅
- **10.3**: Payment screenshots stored in private 'payment-proofs' bucket ✅
- **10.4**: Public read access to 'media' bucket ✅
- **10.5**: Only teachers can upload to 'media' bucket ✅
- **10.6**: Only session owner can delete from 'media' bucket ✅
- **10.7**: Only students can upload to 'payment-proofs' bucket ✅
- **10.8**: Restricted read access to 'payment-proofs' bucket ✅
- **10.9**: Video path structure: `media/videos/{session_id}/{timestamp}_{filename}` ✅
- **10.10**: Thumbnail path structure: `media/thumbnails/{session_id}/{timestamp}_{filename}` ✅

## Troubleshooting

### Issue: "Permission denied" when uploading

**Solution**: Check that:
1. User is authenticated
2. User has correct role (teacher for media, student for payment-proofs)
3. RLS policies are applied correctly

### Issue: "File already exists"

**Solution**: Use unique filenames with timestamps:
```javascript
const filename = `${Date.now()}_${originalFilename}`;
```

### Issue: "File size exceeds limit"

**Solution**: Validate file size before upload:
```javascript
if (file.size > FILE_SIZE_LIMITS.video) {
  throw new Error('Video must be under 50MB');
}
```

### Issue: "Invalid MIME type"

**Solution**: Validate file type before upload:
```javascript
if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
  throw new Error('Only MP4 and WebM formats are supported');
}
```

## Testing Checklist

- [ ] Teacher can upload video to media bucket
- [ ] Teacher can upload thumbnail to media bucket
- [ ] Public user can view/stream video from media bucket
- [ ] Student can upload payment proof to payment-proofs bucket
- [ ] Student can view their own payment proof
- [ ] Teacher can view payment proof for their session enrollment
- [ ] Student cannot view other students' payment proofs
- [ ] Teacher cannot view payment proofs for other teachers' sessions
- [ ] File size limits are enforced
- [ ] MIME type validation works correctly
- [ ] Session owner can delete their media files
- [ ] Non-owner teacher cannot delete other teachers' media files

## Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase Storage RLS](https://supabase.com/docs/guides/storage/security/access-control)
- [File Upload Best Practices](https://supabase.com/docs/guides/storage/uploads)
