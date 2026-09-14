import axios from 'axios'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import type { ApiErrorResponse, UserRole } from '../types'

function buildRegisterErrorMessage(apiError?: ApiErrorResponse): string {
  if (!apiError) {
    return 'Registration failed. Please try again.'
  }

  if (apiError.message && apiError.message !== 'Validation failed.') {
    return apiError.message
  }

  if (Array.isArray(apiError.errors)) {
    const messages = apiError.errors
      .map((errorItem) => {
        if (typeof errorItem !== 'object' || errorItem === null) {
          return null
        }

        const item = errorItem as { msg?: unknown }
        const message = typeof item.msg === 'string' ? item.msg : null

        if (!message) {
          return null
        }

        return message
      })
      .filter((message): message is string => Boolean(message))

    if (messages.length > 0) {
      return messages.join(' ')
    }
  }

  if (apiError.errors && !Array.isArray(apiError.errors)) {
    const messages = Object.values(apiError.errors)
      .filter((value): value is string => typeof value === 'string')

    if (messages.length > 0) {
      return messages.join(' ')
    }
  }

  return apiError.message || 'Registration failed. Please check your input and try again.'
}

function RegisterPage() {
  const { register, loading } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('adjuster')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      await register(name, email, password, role)
      navigate('/login')
    } catch (requestError) {
      if (axios.isAxiosError<ApiErrorResponse>(requestError)) {
        setError(buildRegisterErrorMessage(requestError.response?.data))
        return
      }

      setError('Registration failed. Please try again.')
    }
  }

  return (
    <main className="auth-page auth-page-register">
      <h1 className="auth-app-title">Policy Claims Tracker</h1>
      <section className="auth-card" aria-labelledby="register-title">
        <h1 id="register-title">Register</h1>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <label htmlFor="role">Role</label>
          <select
            id="role"
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
            required
          >
            <option value="adjuster">Adjuster</option>
            <option value="admin">Admin</option>
          </select>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </section>
    </main>
  )
}

export default RegisterPage
