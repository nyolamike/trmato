export const LoadingSpinner = ({
  message = 'Loading...',
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-12 w-12 border-[3px]',
  }

  return (
    <div
      role="status"
      className={`flex items-center gap-3 text-sm text-gray-600 ${className}`.trim()}
    >
      <span
        aria-hidden="true"
        className={`animate-spin rounded-full border-blue-200 border-t-blue-600 ${sizeClasses[size] || sizeClasses.md}`}
      />
      <span>{message}</span>
    </div>
  )
}

export default LoadingSpinner
