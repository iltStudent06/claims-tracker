import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import api from '../api'
import type { ReactNode } from 'react'
import type { AuthResponse, User, UserRole } from '../types'

// Local storage keys used to persist authentication state across page reloads.
const AUTH_TOKEN_KEY = 'token'
const AUTH_USER_KEY = 'user'

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (
    name: string,
    email: string,
    password: string,
    role: UserRole
  ) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  // In-memory auth state consumed by the rest of the app.
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Saves auth data in localStorage and updates React state.
  const persistAuth = useCallback((nextToken: string, nextUser: User) => {
    localStorage.setItem(AUTH_TOKEN_KEY, nextToken)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser))
    setToken(nextToken)
    setUser(nextUser)
  }, [])

  // Clears persisted auth and resets state to signed-out mode.
  const clearAuth = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  // On first render, rehydrate auth state from localStorage if present.
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY)
      const storedUser = localStorage.getItem(AUTH_USER_KEY)

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser) as User
        setToken(storedToken)
        setUser(parsedUser)
      } else {
        clearAuth()
      }
    } catch {
      clearAuth()
    } finally {
      setLoading(false)
    }
  }, [clearAuth])

  // Authenticates an existing user and stores returned token/user profile.
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    try {
      const response = await api.post<AuthResponse>('/auth/login', { email, password })
      persistAuth(response.data.token, response.data.user)
    } finally {
      setLoading(false)
    }
  }, [persistAuth])

  // Creates a new account, then signs the user in with returned credentials.
  const register = useCallback(
    async (name: string, email: string, password: string, role: UserRole) => {
      setLoading(true)
      try {
        const response = await api.post<AuthResponse>('/auth/register', {
          name,
          email,
          password,
          role,
        })
        persistAuth(response.data.token, response.data.user)
      } finally {
        setLoading(false)
      }
    },
    [persistAuth]
  )

  // Signs out locally by clearing persisted auth state.
  const logout = useCallback(() => {
    clearAuth()
  }, [clearAuth])

  // Memoized context value to avoid unnecessary downstream re-renders.
  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading, login, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  // Convenience hook with guard to enforce provider usage.
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
