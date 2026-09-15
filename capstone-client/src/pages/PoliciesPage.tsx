import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import api from '../api'
import { formatPolicyNumber } from '../utils/policyNumber'
import type {
  ApiErrorResponse,
  PaginationMeta,
  Policy,
  PolicyListResponse,
  PolicyStatus,
  PolicyType,
} from '../types'

const POLICY_TYPES: Array<{ label: string; value: PolicyType | '' }> = [
  { label: 'All Types', value: '' },
  { label: 'Auto', value: 'auto' },
  { label: 'Home', value: 'home' },
  { label: 'Life', value: 'life' },
]

const POLICY_STATUS_OPTIONS: PolicyStatus[] = ['active', 'expired', 'canceled']

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

function capitalizeFirstLetter(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatPolicyStatus(status: PolicyStatus): string {
  if (status === 'cancelled' || status === 'canceled') {
    return 'Canceled'
  }

  return capitalizeFirstLetter(status)
}

type PolicySortColumn =
  | 'policyNumber'
  | 'holderName'
  | 'type'
  | 'premium'
  | 'status'
  | 'effectiveDate'
  | 'expirationDate'

type SortDirection = 'asc' | 'desc'

function getSortValue(policy: Policy, column: PolicySortColumn): string | number {
  switch (column) {
    case 'policyNumber':
      return formatPolicyNumber(policy.policyNumber, policy.type)
    case 'holderName':
      return policy.holderName
    case 'type':
      return policy.type
    case 'premium':
      return policy.premium
    case 'status':
      return policy.status
    case 'effectiveDate': {
      const effectiveTime = new Date(policy.effectiveDate).getTime()
      return Number.isNaN(effectiveTime) ? 0 : effectiveTime
    }
    case 'expirationDate': {
      const expirationTime = new Date(policy.expirationDate).getTime()
      return Number.isNaN(expirationTime) ? 0 : expirationTime
    }
    default:
      return ''
  }
}

function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION)
  const [typeFilter, setTypeFilter] = useState<PolicyType | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)

  const [policyNumber, setPolicyNumber] = useState('')
  const [holderName, setHolderName] = useState('')
  const [policyType, setPolicyType] = useState<PolicyType>('auto')
  const [premium, setPremium] = useState('')
  const [status, setStatus] = useState<PolicyStatus>('active')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [sortColumn, setSortColumn] = useState<PolicySortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  useEffect(() => {
    const fetchPolicies = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await api.get<PolicyListResponse>('/policies', {
          params: {
            page,
            limit: PAGE_SIZE,
            type: typeFilter || undefined,
            search: search.trim() || undefined,
          },
        })
        setPolicies(response.data.data)
        setPagination(response.data.pagination)
      } catch (requestError) {
        if (axios.isAxiosError<ApiErrorResponse>(requestError)) {
          setError(requestError.response?.data?.message ?? 'Failed to load policies.')
        } else {
          setError('Failed to load policies.')
        }
      } finally {
        setLoading(false)
      }
    }

    void fetchPolicies()
  }, [page, reloadKey, search, typeFilter])

  const sortedPolicies = useMemo(() => {
    if (!sortColumn) {
      return policies
    }

    return [...policies].sort((leftPolicy, rightPolicy) => {
      const leftValue = getSortValue(leftPolicy, sortColumn)
      const rightValue = getSortValue(rightPolicy, sortColumn)

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
  }, [policies, sortColumn, sortDirection])

  const handleSort = (column: PolicySortColumn) => {
    if (sortColumn === column) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortColumn(column)
    setSortDirection('asc')
  }

  const getSortIndicator = (column: PolicySortColumn): string => {
    if (sortColumn !== column) {
      return ''
    }

    return sortDirection === 'asc' ? ' ▲' : ' ▼'
  }

  const resetForm = () => {
    setPolicyNumber('')
    setHolderName('')
    setPolicyType('auto')
    setPremium('')
    setStatus('active')
    setEffectiveDate('')
    setExpirationDate('')
    setFormError(null)
  }

  const handleCreatePolicy = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setSubmitting(true)

    try {
      await api.post('/policies', {
        policyNumber,
        holderName,
        type: policyType,
        premium: Number(premium),
        status,
        effectiveDate,
        expirationDate,
      })

      resetForm()
      setShowNewForm(false)
      setPage(1)
      setReloadKey((value) => value + 1)
    } catch (requestError) {
      if (axios.isAxiosError<ApiErrorResponse>(requestError)) {
        setFormError(requestError.response?.data?.message ?? 'Failed to create policy.')
      } else {
        setFormError('Failed to create policy.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePolicy = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this policy?')
    if (!confirmed) {
      return
    }

    setDeletingId(id)
    setError(null)

    try {
      await api.delete(`/policies/${id}`)
      setReloadKey((value) => value + 1)
    } catch (requestError) {
      if (axios.isAxiosError<ApiErrorResponse>(requestError)) {
        setError(requestError.response?.data?.message ?? 'Failed to delete policy.')
      } else {
        setError('Failed to delete policy.')
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="policies-page">
      <header className="policies-header">
        <h1>Policies ({pagination.total})</h1>
        <button type="button" onClick={() => setShowNewForm((open) => !open)}>
          {showNewForm ? 'Cancel' : 'Add New Policy'}
        </button>
      </header>

      {showNewForm && (
        <section className="policies-form-card" aria-label="New policy form">
          <h2>New Policy</h2>
          <form className="policies-form" onSubmit={handleCreatePolicy}>
            <label htmlFor="policyNumber">Policy Number</label>
            <input
              id="policyNumber"
              type="text"
              value={policyNumber}
              onChange={(event) => setPolicyNumber(event.target.value)}
              required
            />

            <label htmlFor="holderName">Policyholder Name</label>
            <input
              id="holderName"
              type="text"
              value={holderName}
              onChange={(event) => setHolderName(event.target.value)}
              required
            />

            <label htmlFor="policyType">Type</label>
            <select
              id="policyType"
              value={policyType}
              onChange={(event) => setPolicyType(event.target.value as PolicyType)}
              required
            >
              <option value="auto">Auto</option>
              <option value="home">Home</option>
              <option value="life">Life</option>
            </select>

            <label htmlFor="premium">Premium</label>
            <input
              id="premium"
              type="number"
              min="0"
              step="0.01"
              value={premium}
              onChange={(event) => setPremium(event.target.value)}
              required
            />

            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={status}
              onChange={(event) => setStatus(event.target.value as PolicyStatus)}
              required
            >
              {POLICY_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {formatPolicyStatus(option)}
                </option>
              ))}
            </select>

            <label htmlFor="effectiveDate">Effective Date</label>
            <input
              id="effectiveDate"
              type="date"
              value={effectiveDate}
              onChange={(event) => setEffectiveDate(event.target.value)}
              required
            />

            <label htmlFor="expirationDate">Expiration Date</label>
            <input
              id="expirationDate"
              type="date"
              value={expirationDate}
              onChange={(event) => setExpirationDate(event.target.value)}
              required
            />

            {formError && (
              <p className="policies-error" role="alert">
                {formError}
              </p>
            )}

            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Create Policy'}
            </button>
          </form>
        </section>
      )}

      <section className="policies-table-card" aria-label="Policies list">
        <div className="policies-controls">
          <div className="policies-control-group">
            <label htmlFor="typeFilter">Type</label>
            <select
              id="typeFilter"
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value as PolicyType | '')
                setPage(1)
              }}
            >
              {POLICY_TYPES.map((type) => (
                <option key={type.label} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="policies-control-group policies-search-group">
            <label htmlFor="policySearch">Search</label>
            <input
              id="policySearch"
              type="search"
              placeholder="Policy number or holder"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>

        {error && (
          <p className="policies-error" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p>Loading policies...</p>
        ) : (
          <>
            <div className="table-scroll">
              <table className="policies-table">
                <thead>
                  <tr>
                    <th>
                      <button type="button" className="policies-sort-button" onClick={() => handleSort('policyNumber')}>
                        Policy Number{getSortIndicator('policyNumber')}
                      </button>
                    </th>
                    <th>
                      <button type="button" className="policies-sort-button" onClick={() => handleSort('holderName')}>
                        Policyholder Name{getSortIndicator('holderName')}
                      </button>
                    </th>
                    <th>
                      <button type="button" className="policies-sort-button" onClick={() => handleSort('type')}>
                        Type{getSortIndicator('type')}
                      </button>
                    </th>
                    <th>
                      <button type="button" className="policies-sort-button" onClick={() => handleSort('premium')}>
                        Premium{getSortIndicator('premium')}
                      </button>
                    </th>
                    <th>
                      <button type="button" className="policies-sort-button" onClick={() => handleSort('status')}>
                        Status{getSortIndicator('status')}
                      </button>
                    </th>
                    <th>
                      <button type="button" className="policies-sort-button" onClick={() => handleSort('effectiveDate')}>
                        Effective Date{getSortIndicator('effectiveDate')}
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="policies-sort-button"
                        onClick={() => handleSort('expirationDate')}
                      >
                        Expiration Date{getSortIndicator('expirationDate')}
                      </button>
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPolicies.length === 0 ? (
                    <tr>
                      <td colSpan={8}>No policies found.</td>
                    </tr>
                  ) : (
                    sortedPolicies.map((policy) => {
                      const policyId = policy.id ?? policy._id ?? ''

                      return (
                        <tr key={policyId || policy.policyNumber}>
                          <td>{formatPolicyNumber(policy.policyNumber, policy.type)}</td>
                          <td>{policy.holderName}</td>
                          <td>{capitalizeFirstLetter(policy.type)}</td>
                          <td>{formatCurrency(policy.premium)}</td>
                          <td>{formatPolicyStatus(policy.status)}</td>
                          <td>{new Date(policy.effectiveDate).toLocaleDateString()}</td>
                          <td>{new Date(policy.expirationDate).toLocaleDateString()}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => policyId && handleDeletePolicy(policyId)}
                              disabled={!policyId || deletingId === policyId}
                            >
                              {deletingId === policyId ? 'Deleting...' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="policies-pagination">
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

export default PoliciesPage