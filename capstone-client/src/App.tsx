import './App.css'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import ClaimDetailPage from './pages/ClaimDetailPage'
import ClaimsPage from './pages/ClaimsPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import PoliciesPage from './pages/PoliciesPage'
import RegisterPage from './pages/RegisterPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/claims" element={<ClaimsPage />} />
          <Route path="/claims/:id" element={<ClaimDetailPage />} />
          <Route path="/policies" element={<PoliciesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
