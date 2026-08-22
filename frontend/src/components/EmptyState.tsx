import { Database } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  message: string
}

export default function EmptyState({
  title = 'No data available',
  message,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Database size={48} className="text-gray-400 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-center max-w-md">{message}</p>
    </div>
  )
}
