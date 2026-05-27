import { useState } from 'react'
import { supabase } from '../utils/supabase'
import {
  DEFAULT_TOPIC_REQUEST_FORM_VALUES,
  TOPIC_REQUEST_SUBJECTS,
  buildTopicRequestInsertPayload,
  validateTopicRequestForm,
} from '../utils/topicRequest'

export const TopicRequestForm = ({
  isAuthenticated = false,
  userEmail = null,
  studentId = null,
  onSubmitted,
}) => {
  const [values, setValues] = useState(DEFAULT_TOPIC_REQUEST_FORM_VALUES)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitMessage, setSubmitMessage] = useState('')

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

    if (submitError) {
      setSubmitError('')
    }
  }

  const resetForm = () => {
    setValues(DEFAULT_TOPIC_REQUEST_FORM_VALUES)
    setErrors({})
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    setSubmitMessage('')

    const validationErrors = validateTopicRequestForm(values, isAuthenticated)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)

    try {
      const payload = buildTopicRequestInsertPayload(values, {
        studentId,
        userEmail,
      })

      const { error: insertError } = await supabase
        .from('topic_requests')
        .insert(payload)

      if (insertError) throw insertError

      resetForm()
      const message = isAuthenticated
        ? 'Your topic request was submitted. Track its status on your dashboard.'
        : 'Your topic request was submitted. We will contact you via email with updates.'
      setSubmitMessage(message)
      onSubmitted?.()
    } catch (submitFailure) {
      console.error('Failed to submit topic request:', submitFailure)
      setSubmitError('Unable to submit your topic request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-semibold text-gray-900">Request a Topic</h2>
      <p className="mt-1 text-sm text-gray-600">
        Tell us what you would like covered in a future session.
      </p>

      {submitMessage && (
        <div
          role="status"
          className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
        >
          {submitMessage}
        </div>
      )}

      {submitError && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-col gap-4">
        <div>
          <label htmlFor="topic-request-subject" className="block text-sm font-medium text-gray-700">
            Subject
          </label>
          <select
            id="topic-request-subject"
            name="subject"
            value={values.subject}
            onChange={handleChange}
            disabled={isSubmitting}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">Select a subject</option>
            {TOPIC_REQUEST_SUBJECTS.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
          {errors.subject && (
            <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
          )}
        </div>

        <div>
          <label htmlFor="topic-request-topic" className="block text-sm font-medium text-gray-700">
            Topic
          </label>
          <input
            id="topic-request-topic"
            name="topic"
            type="text"
            value={values.topic}
            onChange={handleChange}
            disabled={isSubmitting}
            placeholder="e.g. Newton's laws made easy"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {errors.topic && <p className="mt-1 text-sm text-red-600">{errors.topic}</p>}
        </div>

        <div>
          <label
            htmlFor="topic-request-description"
            className="block text-sm font-medium text-gray-700"
          >
            Description (optional)
          </label>
          <textarea
            id="topic-request-description"
            name="description"
            value={values.description}
            onChange={handleChange}
            disabled={isSubmitting}
            rows={4}
            placeholder="Explain what you would like covered and why it would help."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
        </div>

        <div>
          <label htmlFor="topic-request-email" className="block text-sm font-medium text-gray-700">
            Email
            {!isAuthenticated && <span className="text-red-600"> *</span>}
            {isAuthenticated && (
              <span className="font-normal text-gray-500"> (optional)</span>
            )}
          </label>
          <input
            id="topic-request-email"
            name="email"
            type="email"
            value={values.email}
            onChange={handleChange}
            disabled={isSubmitting}
            placeholder={isAuthenticated ? userEmail || 'you@example.com' : 'you@example.com'}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Submitting…' : 'Submit Request'}
        </button>
      </form>
    </section>
  )
}

export default TopicRequestForm
