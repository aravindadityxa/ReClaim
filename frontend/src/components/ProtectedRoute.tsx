import { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import LoadingState from './LoadingState'

interface ProtectedRouteProps {
  children: ReactNode
  requiredPermission?: string
  requiredRole?: string
}

export default function ProtectedRoute({
  children,
  requiredPermission,
  requiredRole,
}: ProtectedRouteProps) {
  const { isAuthenticated, currentUser, loading } = useAuth()

  if (loading) {
    return <LoadingState />
  }

  // Not authenticated
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Not Authenticated</h2>
          <p className="text-gray-600">Please log in to access this page.</p>
        </div>
      </div>
    )
  }

  // Check permission if required
  if (requiredPermission && !currentUser.permissions.includes(requiredPermission)) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  // Check role if required
  if (requiredRole && currentUser.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">This page requires {requiredRole} role.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
