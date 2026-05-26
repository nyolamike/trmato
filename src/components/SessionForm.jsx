import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../utils/supabase'
import { TagInput } from './TagInput'
import {
  buildMediaPath,
  buildSessionInsertPayload,
  DEFAULT_SESSION_FORM_VALUES,
  getUniqueNormalizedTags,
  THUMBNAIL_MAX_SIZE_BYTES,
  validateSessionValues,
  validateThumbnailFile,
  validateVideoFile,
  VIDEO_MAX_SIZE_BYTES,
} from '../utils/sessionForm'

const MEGABYTE = 1024 * 1024

export const SessionForm = ({
  teacherId,
  onCreated,
  initialValues,
  initialTags = [],
  title = 'Create Session',
  description = 'Publish a new tutoring session with optional preview media and tags.',
  submitLabel = 'Create session',
  successMessage = 'Session created successfully.',
  onCancel,
}) => {
  const resolvedInitialValues = useMemo(
    () => ({
      ...DEFAULT_SESSION_FORM_VALUES,
      ...(initialValues || {}),
    }),
    [initialValues]
  )

  const [values, setValues] = useState(resolvedInitialValues)
  const [tags, setTags] = useState(initialTags)
  const [videoFile, setVideoFile] = useState(null)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitWarning, setSubmitWarning] = useState('')

  const videoPreviewUrl = useMemo(
    () => (videoFile ? URL.createObjectURL(videoFile) : ''),
    [videoFile]
  )
  const thumbnailPreviewUrl = useMemo(
    () => (thumbnailFile ? URL.createObjectURL(thumbnailFile) : ''),
    [thumbnailFile]
  )

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl)
      }
    }
  }, [videoPreviewUrl])

  useEffect(() => {
    return () => {
      if (thumbnailPreviewUrl) {
        URL.revokeObjectURL(thumbnailPreviewUrl)
      }
    }
  }, [thumbnailPreviewUrl])

  const thumbnailWithoutVideoWarning =
    thumbnailFile && !videoFile
      ? 'Thumbnail will only be uploaded when an explainer video is attached.'
      : ''

  const handleChange = (event) => {
    const { name, value } = event.target

    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))

    if (errors[name]) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [name]: '',
      }))
    }
  }

  const resetForm = () => {
    setValues(resolvedInitialValues)
    setTags(initialTags)
    setVideoFile(null)
    setThumbnailFile(null)
    setErrors({})
  }

  const uploadMediaFile = async (path, file) => {
    const { error } = await supabase.storage.from('media').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })

    if (error) {
      throw error
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('media').getPublicUrl(path)

    return publicUrl
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setSubmitError('')
    setSubmitMessage('')
    setSubmitWarning('')

    const normalizedTags = getUniqueNormalizedTags(tags)
    const nextErrors = validateSessionValues(values, { tags: normalizedTags })
    const videoError = validateVideoFile(videoFile)
    const thumbnailError = validateThumbnailFile(thumbnailFile)

    if (videoError) {
      nextErrors.explainer_video = videoError
    }

    if (thumbnailError) {
      nextErrors.video_thumbnail = thumbnailError
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    if (!teacherId) {
      setSubmitError('Unable to confirm the active teacher account.')
      return
    }

    setIsSubmitting(true)

    let createdSession = null

    try {
      const { data, error: createError } = await supabase
        .from('sessions')
        .insert(buildSessionInsertPayload(values, teacherId))
        .select('*')
        .single()

      if (createError) {
        throw createError
      }

      createdSession = data

      if (normalizedTags.length > 0) {
        const { error: tagsError } = await supabase.from('session_tags').insert(
          normalizedTags.map((tag) => ({
            session_id: createdSession.id,
            tag,
          }))
        )

        if (tagsError) {
          try {
            await supabase.from('sessions').delete().eq('id', createdSession.id)
          } catch (rollbackError) {
            console.error('Failed to rollback session after tag error:', rollbackError)
          }

          throw tagsError
        }
      }

      const mediaWarnings = []
      const mediaUpdate = {}

      if (videoFile) {
        try {
          const timestamp = Date.now()
          const videoPath = buildMediaPath('video', createdSession.id, videoFile, timestamp)
          mediaUpdate.explainer_video = await uploadMediaFile(videoPath, videoFile)

          if (thumbnailFile) {
            const thumbnailPath = buildMediaPath(
              'thumbnail',
              createdSession.id,
              thumbnailFile,
              timestamp
            )
            mediaUpdate.video_thumbnail = await uploadMediaFile(
              thumbnailPath,
              thumbnailFile
            )
          }
        } catch (mediaError) {
          console.error('Media upload failed:', mediaError)
          mediaWarnings.push(
            'The session was created, but the video or thumbnail upload could not be completed.'
          )
        }
      } else if (thumbnailFile) {
        mediaWarnings.push(
          'The session was created, but the thumbnail was skipped because no video was attached.'
        )
      }

      if (Object.keys(mediaUpdate).length > 0) {
        const { error: updateError } = await supabase
          .from('sessions')
          .update(mediaUpdate)
          .eq('id', createdSession.id)

        if (updateError) {
          console.error('Failed to store media URLs on session:', updateError)
          mediaWarnings.push(
            'Media uploaded successfully, but the session record could not be updated with those URLs.'
          )
        }
      }

      resetForm()
      setSubmitMessage(successMessage)
      setSubmitWarning(mediaWarnings.join(' '))

      await onCreated?.(createdSession)
    } catch (error) {
      console.error('Failed to create session:', error)
      setSubmitError(error.message || 'Unable to create session. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>

      {submitMessage && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {submitMessage}
        </div>
      )}

      {(submitWarning || thumbnailWithoutVideoWarning) && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {submitWarning || thumbnailWithoutVideoWarning}
        </div>
      )}

      {submitError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {submitError}
        </div>
      )}

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            id="session-title"
            name="title"
            label="Title"
            value={values.title}
            onChange={handleChange}
            error={errors.title}
            placeholder="O-Level Biology: Cell Division Revision"
          />

          <FormField
            id="session-subject"
            name="subject"
            label="Subject"
            value={values.subject}
            onChange={handleChange}
            error={errors.subject}
            placeholder="Biology"
          />
        </div>

        <FormField
          id="session-description"
          name="description"
          label="Description"
          value={values.description}
          onChange={handleChange}
          error={errors.description}
          as="textarea"
          rows={4}
          placeholder="Explain what the class will cover, who it is for, and how students should prepare."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            id="session-scheduled-at"
            name="scheduled_at"
            label="Scheduled Date & Time"
            type="datetime-local"
            value={values.scheduled_at}
            onChange={handleChange}
            error={errors.scheduled_at}
          />

          <FormField
            id="session-price"
            name="price_ugx"
            label="Price (UGX)"
            type="number"
            min="1"
            step="1"
            value={values.price_ugx}
            onChange={handleChange}
            error={errors.price_ugx}
            placeholder="5000"
          />
        </div>

        <FormField
          id="session-meet-link"
          name="meet_link"
          label="Google Meet Link"
          type="url"
          value={values.meet_link}
          onChange={handleChange}
          error={errors.meet_link}
          placeholder="https://meet.google.com/..."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            id="session-payment-number"
            name="payment_number"
            label="Payment Number"
            value={values.payment_number}
            onChange={handleChange}
            error={errors.payment_number}
            placeholder="0772000000"
          />

          <FormField
            id="session-payment-name"
            name="payment_name"
            label="Payment Name"
            value={values.payment_name}
            onChange={handleChange}
            error={errors.payment_name}
            placeholder="TrMato Classes"
          />
        </div>

        <TagInput
          tags={tags}
          onChange={(nextTags) => {
            setTags(nextTags)
            if (errors.tags) {
              setErrors((currentErrors) => ({
                ...currentErrors,
                tags: '',
              }))
            }
          }}
          error={errors.tags}
          disabled={isSubmitting}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FileField
            id="session-video"
            label={`Explainer Video (MP4 or WebM, max ${VIDEO_MAX_SIZE_BYTES / MEGABYTE}MB)`}
            accept="video/mp4,video/webm,.mp4,.webm"
            error={errors.explainer_video}
            onChange={(event) => {
              const nextFile = event.target.files?.[0] || null
              setVideoFile(nextFile)
              if (errors.explainer_video) {
                setErrors((currentErrors) => ({
                  ...currentErrors,
                  explainer_video: '',
                }))
              }
            }}
          />

          <FileField
            id="session-thumbnail"
            label={`Thumbnail (JPG or PNG, max ${THUMBNAIL_MAX_SIZE_BYTES / MEGABYTE}MB)`}
            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
            error={errors.video_thumbnail}
            onChange={(event) => {
              const nextFile = event.target.files?.[0] || null
              setThumbnailFile(nextFile)
              if (errors.video_thumbnail) {
                setErrors((currentErrors) => ({
                  ...currentErrors,
                  video_thumbnail: '',
                }))
              }
            }}
          />
        </div>

        {(videoPreviewUrl || thumbnailPreviewUrl) && (
          <div className="grid gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-2">
            {videoPreviewUrl ? (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Video preview</p>
                <video
                  controls
                  className="w-full rounded-lg bg-black"
                  src={videoPreviewUrl}
                  poster={thumbnailPreviewUrl || undefined}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">
                Add a video to preview it here.
              </div>
            )}

            {thumbnailPreviewUrl ? (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Thumbnail preview</p>
                <img
                  src={thumbnailPreviewUrl}
                  alt="Selected video thumbnail preview"
                  className="h-48 w-full rounded-lg object-cover"
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">
                Add a thumbnail image to preview it here.
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            New sessions are published with status <strong>upcoming</strong>.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Creating session...' : submitLabel}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}

const FormField = ({
  id,
  label,
  error,
  as = 'input',
  className = '',
  ...inputProps
}) => {
  const Component = as

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <Component
        id={id}
        className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm text-gray-900 outline-none transition ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
            : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
        } ${className}`.trim()}
        {...inputProps}
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}

const FileField = ({ id, label, error, onChange, accept }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700">
      {label}
    </label>
    <input
      id={id}
      type="file"
      accept={accept}
      onChange={onChange}
      className={`mt-2 block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 ${
        error ? 'border-red-300' : 'border-gray-300'
      }`}
    />
    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
  </div>
)

export default SessionForm
