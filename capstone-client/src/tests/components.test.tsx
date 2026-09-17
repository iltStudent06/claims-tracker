import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import LoginPage from '../pages/LoginPage'
import Navbar from '../components/Navbar'
import ProtectedRoute from '../components/ProtectedRoute'

const useAuthMock = vi.fn()

vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('React component tests', () => {
  it('Login page renders email and password fields', () => {
    useAuthMock.mockReturnValue({
      login: vi.fn(),
      loading: false,
      token: null,
      user: null,
      logout: vi.fn(),
      register: vi.fn(),
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('Navbar renders navigation links and the app name', () => {
    useAuthMock.mockReturnValue({
      user: { name: 'Test User', role: 'admin' },
      logout: vi.fn(),
      loading: false,
      token: 'token',
      login: vi.fn(),
      register: vi.fn(),
    })

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    )

    expect(screen.getByText('Policy Claims Tracker')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Claims' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Policies' })).toBeInTheDocument()
  })

  it('Protected routes redirect unauthenticated users', () => {
    useAuthMock.mockReturnValue({
      token: null,
      loading: false,
      user: null,
      logout: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>Private Page</div>} />
          </Route>
          <Route path="/login" element={<div>Login Screen</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Login Screen')).toBeInTheDocument()
  })
})