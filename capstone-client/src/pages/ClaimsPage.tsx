import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { FormEvent } from 'react'
import api from '../api'
import { formatPolicyNumber } from '../utils/policyNumber'
import type {
  ApiErrorResponse,
  Claim,
  ClaimListResponse,
  ClaimStatus,
  PaginationMeta,
  Policy,
  PolicyListResponse,
} from '../types'

const CLAIM_STATUSES: Array<{ label: string; value: ClaimStatus | '' }> = [
  { label: 'All Statuses', value: '' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Under Review', value: 'under-review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Denied', value: 'denied' },
  { label: 'Closed', value: 'closed' },
]

const PAGE_SIZE = 10

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 1,
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatClaimStatus(status: string): string {
  return status
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

type ClaimSortColumn =
  | 'claimNumber'
  | 'policy'
  | 'description'
  | 'amount'
  | 'status'
  | 'incidentDate'

type SortDirection = 'asc' | 'desc'

function getSortValue(claim: Claim, column: ClaimSortColumn): string | number {
  switch (column) {
    case 'claimNumber':
      return claim.claimNumber
    case 'policy':
      return typeof claim.policy === 'object'
        ? formatPolicyNumber(claim.policy.policyNumber, claim.policy.type)
        : formatPolicyNumber(claim.policy)
    case 'description':
      return claim.description
    case 'amount':
      return claim.amount
    case 'status':
      return claim.status
    case 'incidentDate': {
      const incidentTime = new Date(claim.incidentDate).getTime()
      return Number.isNaN(incidentTime) ? 0 : incidentTime
    }
    default:
      return ''
  }
}

function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [policies, setPolicies] = useState<Policy[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION)
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)

  const [policyId, setPolicyId] = useState('')
  const [description, setDescription] = useState('')
  const [incidentDate, setIncidentDate] = useState('')
  const [amount, setAmount] = useState('')
  const [noteText, setNoteText] = useState('')
  const [sortColumn, setSortColumn] = useState<ClaimSortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const response = await api.get<PolicyListResponse>('/policies', {
          params: { page: 1, limit: 100 },
        })
        setPolicies(response.data.data)
      } catch {
        setPolicies([])
      }
    }

    void fetchPolicies()
  }, [])

  useEffect(() => {
    const fetchClaims = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await api.get<ClaimListResponse>('/claims', {
          params: {
            page,
            limit: PAGE_SIZE,
            status: statusFilter || undefined,
            search: search.trim() || undefined,
          },
        })

        setClaims(response.data.data)
        setPagination(response.data.pagination)
      } catch (requestError) {
        if (axios.isAxiosError<ApiErrorResponse>(requestError)) {
          setError(requestError.response?.data?.message ?? 'Failed to load claims.')
        } else {
          setError('Failed to load claims.')
        }
      } finally {
        setLoading(false)
      }
    }

    void fetchClaims()
  }, [page, reloadKey, search, statusFilter])

  const policyOptions = useMemo(
    () =>
      policies.map((policy) => ({
        id: policy.id ?? policy._id ?? '',
        label: `${formatPolicyNumber(policy.policyNumber, policy.type)} — ${policy.holderName}`,
      })),
    [policies]
  )

  const sortedClaims = useMemo(() => {
    if (!sortColumn) {
      return claims
    }

    return [...claims].sort((leftClaim, rightClaim) => {
      const leftValue = getSortValue(leftClaim, sortColumn)
      const rightValue = getSortValue(rightClaim, sortColumn)

      let comparison = 0
      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        comparison = leftValue - rightValue
      } else {
        comparison = String(leftValue).localeCompare(String(rightValue), undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [claims, sortColumn, sortDirection])

  const handleSort = (column: ClaimSortColumn) => {
    if (sortColumn === column) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortColumn(column)
    setSortDirection('asc')
  }

  const getSortIndicator = (column: ClaimSortColumn): string => {
    if (sortColumn !== column) {
      return ''
    }

    return sortDirection === 'asc' ? ' ▲' : ' ▼'
  }

  const resetForm = () => {
    setPolicyId('')
    setDescription('')
    setIncidentDate('')
    setAmount('')
    setNoteText('')
    setFormError(null)
  }

  const handleCreateClaim = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setSubmitting(true)

    try {
      const claimResponse = await api.post<Claim>('/claims', {
        policy: policyId,
        description,
        incidentDate,
        amount: Number(amount),
      })

      const createdClaimId = claimResponse.data.id ?? claimResponse.data._id
      if (createdClaimId && noteText.trim()) {
        await api.post(`/claims/${createdClaimId}/notes`, {
          text: noteText.trim(),
        })
      }

      resetForm()
      setShowNewForm(false)
      setPage(1)
      setReloadKey((value) => value + 1)
    } catch (requestError) {
      if (axios.isAxiosError<ApiErrorResponse>(requestError)) {
        setFormError(requestError.response?.data?.message ?? 'Failed to create claim.')
      } else {
        setFormError('Failed to create claim.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="claims-page">
      <header className="claims-header">
        <h1>Claims ({pagination.total})</h1>
        <button type="button" onClick={() => setShowNewForm((open) => !open)}>
          {showNewForm ? 'Cancel' : 'Add New Claim'}
        </button>
      </header>

      {showNewForm && (
        <section className="claims-form-card" aria-label="New claim form">
          <h2>New Claim</h2>
          <form className="claims-form" onSubmit={handleCreateClaim}>
            <label htmlFor="policy">Policy</label>
            <select
              id="policy"
              value={policyId}
              onChange={(event) => setPolicyId(event.target.value)}
              required
            >
              <option value="">Select a policy</option>
              {policyOptions.map((policy) => (
                <option key={policy.id} value={policy.id}>
                  {policy.label}
                </option>
              ))}
            </select>

            <label htmlFor="description">Description</label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />

            <label htmlFor="incidentDate">Incident Date</label>
            <input
              id="incidentDate"
              type="date"
              value={incidentDate}
              onChange={(event) => setIncidentDate(event.target.value)}
              required
            />

            <label htmlFor="amount">Amount</label>
            <input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />

            <label htmlFor="noteText">Notes</label>
            <textarea
              id="noteText"
              rows={3}
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              placeholder="Add an initial note"
            />

            {formError && (
              <p className="claims-error" role="alert">
                {formError}
              </p>
            )}

            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Create Claim'}
            </button>
          </form>
        </section>
      )}

      <section className="claims-table-card" aria-label="Claims list">
        <div className="claims-controls">
          <div className="claims-control-group">
            <label htmlFor="statusFilter">Status</label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as ClaimStatus | '')
                setPage(1)
              }}
            >
              {CLAIM_STATUSES.map((status) => (
                <option key={status.label} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="claims-control-group claims-search-group">
            <label htmlFor="claimSearch">Search</label>
            <input
              id="claimSearch"
              type="search"
              placeholder="Claim number or description"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>

        {error && (
          <p className="claims-error" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p>Loading claims...</p>
        ) : (
          <>
            <div className="table-scroll">
              <table className="claims-table">
                <thead>
                  <tr>
                    <th>
                      <button type="button" className="claims-sort-button" onClick={() => handleSort('claimNumber')}>
                        Claim Number{getSortIndicator('claimNumber')}
                      </button>
                    </th>
                    <th>
                      <button type="button" className="claims-sort-button" onClick={() => handleSort('policy')}>
                        Policy{getSortIndicator('policy')}
                      </button>
                    </th>
                    <th>
                      <button type="button" className="claims-sort-button" onClick={() => handleSort('description')}>
                        Description{getSortIndicator('description')}
                      </button>
                    </th>
                    <th>
                      <button type="button" className="claims-sort-button" onClick={() => handleSort('amount')}>
                        Amount{getSortIndicator('amount')}
                      </button>
                    </th>
                    <th>
                      <button type="button" className="claims-sort-button" onClick={() => handleSort('status')}>
                        Status{getSortIndicator('status')}
                      </button>
                    </th>
                    <th>
                      <button type="button" className="claims-sort-button" onClick={() => handleSort('incidentDate')}>
                        Incident Date{getSortIndicator('incidentDate')}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedClaims.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No claims found.</td>
                    </tr>
                  ) : (
                    sortedClaims.map((claim) => {
                      const claimId = claim.id ?? claim._id ?? ''
                      const policyNumber =
                        typeof claim.policy === 'object'
                          ? formatPolicyNumber(claim.policy.policyNumber, claim.policy.type)
                          : formatPolicyNumber(claim.policy)

                      return (
                        <tr key={claimId || claim.claimNumber}>
                          <td>
                            {claimId ? <Link to={`/claims/${claimId}`}>{claim.claimNumber}</Link> : claim.claimNumber}
                          </td>
                          <td>{policyNumber}</td>
                          <td>{claim.description}</td>
                          <td>{formatCurrency(claim.amount)}</td>
                          <td>
                            <span className={`status-badge status-${claim.status}`}>
                              {formatClaimStatus(claim.status)}
                            </span>
                          </td>
                          <td>{new Date(claim.incidentDate).toLocaleDateString()}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="claims-pagination">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(value - 1, 1))}
                disabled={pagination.page <= 1}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((value) => Math.min(value + 1, Math.max(pagination.totalPages, 1)))
                }
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  )
}

export default ClaimsPage
