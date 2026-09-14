import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'

interface ProtectedRouteProps {
  children?: ReactNode
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { token, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return null
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return (
    <>
      <Navbar />
      {children ? <>{children}</> : <Outlet />}
    </>
  )
}

export default ProtectedRoute
