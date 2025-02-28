import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Session } from '@supabase/supabase-js'

interface ProtectedRouteProps {
  session: Session | null
  children: ReactNode
}

const ProtectedRoute = ({ session, children }: ProtectedRouteProps) => {
  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute 