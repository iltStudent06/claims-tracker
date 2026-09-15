import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../api'
import { formatPolicyNumber } from '../utils/policyNumber'
import type { ApiErrorResponse, Claim, ClaimStatus } from '../types'

interface EditableNote {
  authorId: string
  authorName: string
  text: string
  createdAt: string
  isNew: boolean
}

const STATUS_OPTIONS: ClaimStatus[] = [
  'submitted',
  'under-review',
  'approved',
  'denied',
  'closed',
]

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value?: string): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString()
}

function formatDateWithShortTime(value?: string): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatClaimStatus(status: string): string {
  return status
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function toEditableNotes(claim: Claim): EditableNote[] {
  return claim.notes.map((note) => {
    const authorId =
      typeof note.author === 'object' && note.author
        ? note.author.id ?? note.author._id ?? ''
        : String(note.author)
    const authorName =
      typeof note.author === 'object' && note.author ? note.author.name : String(note.author)

    return {
      authorId,
      authorName,
      text: note.text,
      createdAt: note.createdAt,
      isNew: false,
    }
  })
}

function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [claim, setClaim] = useState<Claim | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editStatus, setEditStatus] = useState<ClaimStatus>('submitted')
  const [editAmount, setEditAmount] = useState('')
  const [editIncidentDate, setEditIncidentDate] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editNotes, setEditNotes] = useState<EditableNote[]>([])
  const [newNoteText, setNewNoteText] = useState('')
  const [loading, setLoading] = useState(true)
  const [updatingClaim, setUpdatingClaim] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const fetchClaim = async () => {
    if (!id) {
      setError('Missing claim id.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await api.get<Claim>(`/claims/${id}`)
      setClaim(response.data)
      setEditStatus(response.data.status)
      setEditAmount(String(response.data.amount))
      setEditDescription(response.data.description)
      setEditNotes(toEditableNotes(response.data))
      setNewNoteText('')
      const incidentDate = new Date(response.data.incidentDate)
      setEditIncidentDate(Number.isNaN(incidentDate.getTime()) ? '' : incidentDate.toISOString().split('T')[0])
    } catch (requestError) {
      if (axios.isAxiosError<ApiErrorResponse>(requestError)) {
        setError(requestError.response?.data?.message ?? 'Failed to load claim details.')
      } else {
        setError('Failed to load claim details.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchClaim()
  }, [id])

  const policySummary = useMemo(() => {
    if (!claim) {
      return '—'
    }

    if (typeof claim.policy === 'string') {
      return formatPolicyNumber(claim.policy)
    }

    return `${formatPolicyNumber(claim.policy.policyNumber, claim.policy.type)} — ${claim.policy.holderName}`
  }, [claim])

  const handleStartEditing = () => {
    if (!claim) {
      return
    }

    setIsEditing(true)
    setEditError(null)
    setEditStatus(claim.status)
    setEditAmount(String(claim.amount))
    setEditDescription(claim.description)
    setEditNotes(toEditableNotes(claim))
    setNewNoteText('')

    const incidentDate = new Date(claim.incidentDate)
    setEditIncidentDate(Number.isNaN(incidentDate.getTime()) ? '' : incidentDate.toISOString().split('T')[0])
  }

  const handleCancelEditing = () => {
    setIsEditing(false)
    setEditError(null)
    if (!claim) {
      return
    }

    setEditStatus(claim.status)
    setEditAmount(String(claim.amount))
    setEditDescription(claim.description)
    setEditNotes(toEditableNotes(claim))
    setNewNoteText('')

    const incidentDate = new Date(claim.incidentDate)
    setEditIncidentDate(Number.isNaN(incidentDate.getTime()) ? '' : incidentDate.toISOString().split('T')[0])
  }

  const handleEditNoteChange = (index: number, text: string) => {
    setEditNotes((prev) => prev.map((note, idx) => (idx === index ? { ...note, text } : note)))
  }

  const handleAddNewNote = () => {
    const text = newNoteText.trim()
    if (!text) {
      return
    }

    const pendingNote: EditableNote = {
      authorId: '',
      authorName: 'You',
      text,
      createdAt: new Date().toISOString(),
      isNew: true,
    }

    setEditNotes((prev) => [...prev, pendingNote])
    setNewNoteText('')
  }

  const handleSaveClaim = async () => {
    if (!id || !claim) {
      return
    }

    setUpdatingClaim(true)
    setEditError(null)

    try {
      const existingNotes = editNotes
        .filter((note) => !note.isNew && note.text.trim())
        .map((note) => ({
          author: note.authorId,
          text: note.text.trim(),
          createdAt: note.createdAt,
        }))

      const newNotes = editNotes.filter((note) => note.isNew && note.text.trim())

      await api.put<Claim>(`/claims/${id}`, {
        status: editStatus,
        amount: Number(editAmount),
        incidentDate: editIncidentDate,
        description: editDescription,
        notes: existingNotes,
      })

      if (newNotes.length > 0) {
        await Promise.all(newNotes.map((note) => api.post(`/claims/${id}/notes`, { text: note.text.trim() })))
      }

      await fetchClaim()
      setIsEditing(false)
    } catch (requestError) {
      if (axios.isAxiosError<ApiErrorResponse>(requestError)) {
        setEditError(requestError.response?.data?.message ?? 'Failed to update claim.')
      } else {
        setEditError('Failed to update claim.')
      }
    } finally {
      setUpdatingClaim(false)
    }
  }

  const handleDeleteClaim = async () => {
    if (!id) {
      return
    }

    const confirmed = window.confirm('Are you sure you want to delete this claim?')
    if (!confirmed) {
      return
    }

    setDeleting(true)
    setError(null)

    try {
      await api.delete(`/claims/${id}`)
      navigate('/claims')
    } catch (requestError) {
      if (axios.isAxiosError<ApiErrorResponse>(requestError)) {
        setError(requestError.response?.data?.message ?? 'Failed to delete claim.')
      } else {
        setError('Failed to delete claim.')
      }
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <main className="claim-detail-page">
        <p>Loading claim details...</p>
      </main>
    )
  }

  if (error && !claim) {
    return (
      <main className="claim-detail-page">
        <p className="claims-error" role="alert">
          {error}
        </p>
        <Link to="/claims">Back to Claims</Link>
      </main>
    )
  }

  if (!claim) {
    return (
      <main className="claim-detail-page">
        <p className="claims-error" role="alert">
          Claim not found.
        </p>
        <Link to="/claims">Back to Claims</Link>
      </main>
    )
  }

  return (
    <main className="claim-detail-page">
      <header className="claim-detail-header">
        <div className="claim-detail-heading">
          <h1>Claim {claim.claimNumber}</h1>
          <p className="claim-detail-subtitle">Detailed claim information and activity</p>
        </div>
        <Link to="/claims">Back to Claims</Link>
      </header>

      {error && (
        <p className="claims-error" role="alert">
          {error}
        </p>
      )}

      <section className="claim-detail-card" aria-label="Claim information">
        <div className="claim-detail-card-header">
          <h2>Claim Information</h2>
          {!isEditing ? (
            <button type="button" className="claim-edit-button" onClick={handleStartEditing}>
              Edit Claim
            </button>
          ) : null}
        </div>
        <table className="claim-info-table">
          <tbody>
            <tr>
              <th>Claim Number</th>
              <td>{claim.claimNumber}</td>
            </tr>
            <tr>
              <th>Policy</th>
              <td>{policySummary}</td>
            </tr>
            <tr>
              <th>Status</th>
              <td>
                {isEditing ? (
                  <select
                    className="claim-edit-input"
                    value={editStatus}
                    onChange={(event) => setEditStatus(event.target.value as ClaimStatus)}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {formatClaimStatus(option)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`status-badge status-${claim.status}`}>
                    {formatClaimStatus(claim.status)}
                  </span>
                )}
              </td>
            </tr>
            <tr>
              <th>Amount</th>
              <td>
                {isEditing ? (
                  <input
                    className="claim-edit-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editAmount}
                    onChange={(event) => setEditAmount(event.target.value)}
                  />
                ) : (
                  formatCurrency(claim.amount)
                )}
              </td>
            </tr>
            <tr>
              <th>Incident Date</th>
              <td>
                {isEditing ? (
                  <input
                    className="claim-edit-input"
                    type="date"
                    value={editIncidentDate}
                    onChange={(event) => setEditIncidentDate(event.target.value)}
                  />
                ) : (
                  formatDateWithShortTime(claim.incidentDate)
                )}
              </td>
            </tr>
            <tr>
              <th>Assigned To</th>
              <td>
                {typeof claim.assignedTo === 'object' && claim.assignedTo
                  ? claim.assignedTo.name
                  : claim.assignedTo || 'Unassigned'}
              </td>
            </tr>
            <tr>
              <th>Created</th>
              <td>{formatDateWithShortTime(claim.createdAt)}</td>
            </tr>
            <tr>
              <th>Updated</th>
              <td>{formatDateWithShortTime(claim.updatedAt)}</td>
            </tr>
            <tr>
              <th>Description</th>
              <td>
                {isEditing ? (
                  <textarea
                    id="editDescription"
                    className="claim-edit-input"
                    rows={4}
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                  />
                ) : (
                  claim.description
                )}
              </td>
            </tr>
            <tr>
              <th>Notes</th>
              <td>
                {isEditing ? (
                  <div className="claim-notes-editor">
                    {editNotes.length === 0 ? <p>No notes yet.</p> : null}

                    {editNotes.map((note, index) => (
                      <div className="claim-edit-note-item" key={`${note.createdAt}-${index}`}>
                        <textarea
                          className="claim-edit-input"
                          rows={2}
                          value={note.text}
                          onChange={(event) => handleEditNoteChange(index, event.target.value)}
                        />
                        <small>
                          {note.authorName} • {formatDate(note.createdAt)}
                        </small>
                      </div>
                    ))}

                    <div className="claim-add-note-row">
                      <input
                        className="claim-edit-input"
                        type="text"
                        value={newNoteText}
                        onChange={(event) => setNewNoteText(event.target.value)}
                        placeholder="Add new note"
                      />
                      <button type="button" className="claim-edit-button" onClick={handleAddNewNote}>
                        Add Note
                      </button>
                    </div>
                  </div>
                ) : claim.notes.length === 0 ? (
                  'No notes yet.'
                ) : (
                  <ul className="claim-info-notes-list">
                    {claim.notes.map((note, index) => {
                      const authorName =
                        typeof note.author === 'object' && note.author
                          ? note.author.name
                          : String(note.author)

                      return (
                        <li key={`${note.createdAt}-${index}`}>
                          <p>{note.text}</p>
                          <small>
                            {authorName} • {formatDate(note.createdAt)}
                          </small>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {isEditing ? (
          <div className="claim-edit-description">
            {editError && (
              <p className="claims-error" role="alert">
                {editError}
              </p>
            )}

            <div className="claim-edit-actions">
              <button type="button" className="claim-edit-button" onClick={handleCancelEditing}>
                Cancel
              </button>
              <button type="button" className="claim-edit-button" onClick={handleSaveClaim} disabled={updatingClaim}>
                {updatingClaim ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="claim-detail-card" aria-label="Danger zone">
        <h2>Danger Zone</h2>
        <button type="button" className="claim-delete-button" onClick={handleDeleteClaim} disabled={deleting}>
          {deleting ? 'Deleting...' : 'Delete Claim'}
        </button>
      </section>
    </main>
  )
}

export default ClaimDetailPage