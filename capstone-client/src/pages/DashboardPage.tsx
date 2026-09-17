import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { formatClaimNumber } from '../utils/claimNumber'
import { formatPolicyNumber } from '../utils/policyNumber'
import type { ApiErrorResponse, DashboardStats } from '../types'

const CLAIM_STATUS_ORDER = ['submitted', 'under-review', 'approved', 'denied', 'closed'] as const

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatClaimStatus(status: string): string {
  return status
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await api.get<DashboardStats>('/dashboard')
        setStats(response.data)
      } catch (requestError) {
        if (axios.isAxiosError<ApiErrorResponse>(requestError)) {
          setError(requestError.response?.data?.message ?? 'Failed to load dashboard data.')
        } else {
          setError('Failed to load dashboard data.')
        }
      } finally {
        setLoading(false)
      }
    }

    void fetchDashboard()
  }, [])

  const statusEntries = useMemo(
    () =>
      CLAIM_STATUS_ORDER.map((status) => [status, stats?.claimsByStatus?.[status] ?? 0] as const),
    [stats?.claimsByStatus]
  )

  const maxStatusCount = useMemo(
    () => Math.max(...statusEntries.map(([, count]) => count), 1),
    [statusEntries]
  )

  if (loading) {
    return (
      <main className="dashboard-page">
        <p>Loading dashboard...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="dashboard-page">
        <p className="dashboard-error" role="alert">
          {error}
        </p>
      </main>
    )
  }

  if (!stats) {
    return (
      <main className="dashboard-page">
        <p className="dashboard-error" role="alert">
          Dashboard data is unavailable.
        </p>
      </main>
    )
  }

  return (
    <main className="dashboard-page">
      <h1>Dashboard</h1>

      <section className="summary-grid" aria-label="Summary statistics">
        <article className="summary-card">
          <h2>Total Claims</h2>
          <p>{stats.totalClaims}</p>
        </article>
        <article className="summary-card">
          <h2>Total Policies</h2>
          <p>{stats.totalPolicies}</p>
        </article>
        <article className="summary-card">
          <h2>Total Users</h2>
          <p>{stats.totalUsers}</p>
        </article>
        <article className="summary-card">
          <h2>Total Claim Amount</h2>
          <p>{formatCurrency(stats.totalClaimAmount)}</p>
        </article>
      </section>

      <section className="chart-card" aria-label="Claims by status chart">
        <h2>Claims by Status</h2>
        {statusEntries.length === 0 ? (
          <p>No status data available.</p>
        ) : (
          <div className="status-bars">
            {statusEntries.map(([status, count]) => {
              const widthPercent = (count / maxStatusCount) * 100

              return (
                <div className="status-row" key={status}>
                  <span className={`status-badge status-${status}`}>{formatClaimStatus(status)}</span>
                  <div className="status-track" aria-hidden="true">
                    <div className={`status-fill status-fill-${status}`} style={{ width: `${widthPercent}%` }} />
                  </div>
                  <span className="status-value">{count}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="table-card" aria-label="Recent claims">
        <h2>Most Recent Claims</h2>
        <div className="table-scroll">
          <table className="claims-table">
            <thead>
              <tr>
                <th>Claim #</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Policy</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentClaims.length === 0 ? (
                <tr>
                  <td colSpan={4}>No recent claims found.</td>
                </tr>
              ) : (
                stats.recentClaims.slice(0, 5).map((claim) => {
                  const claimId = claim.id ?? claim._id ?? ''
                  const policyNumber =
                    claim.policy && typeof claim.policy === 'object'
                      ? formatPolicyNumber(claim.policy.policyNumber, claim.policy.type)
                      : typeof claim.policy === 'string'
                        ? formatPolicyNumber(claim.policy)
                        : 'Deleted policy'

                  return (
                    <tr key={claimId || claim.claimNumber}>
                      <td>
                        {claimId ? (
                          <Link to={`/claims/${claimId}`}>{formatClaimNumber(claim.claimNumber)}</Link>
                        ) : (
                          formatClaimNumber(claim.claimNumber)
                        )}
                      </td>
                      <td>
                        <span className={`status-badge status-${claim.status}`}>
                          {formatClaimStatus(claim.status)}
                        </span>
                      </td>
                      <td>{formatCurrency(claim.amount)}</td>
                      <td>{policyNumber}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

export default DashboardPage
