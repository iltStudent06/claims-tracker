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
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const persistAuth = useCallback((nextToken: string, nextUser: User) => {
    localStorage.setItem(AUTH_TOKEN_KEY, nextToken)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser))
    setToken(nextToken)
    setUser(nextUser)
  }, [])

  const clearAuth = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

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

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    try {
      const response = await api.post<AuthResponse>('/auth/login', { email, password })
      persistAuth(response.data.token, response.data.user)
    } finally {
      setLoading(false)
    }
  }, [persistAuth])

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

  const logout = useCallback(() => {
    clearAuth()
  }, [clearAuth])

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading, login, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
