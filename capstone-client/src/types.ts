export type UserRole = 'admin' | 'adjuster'

export type PolicyType = 'auto' | 'home' | 'life'
export type PolicyStatus = 'active' | 'expired' | 'canceled' | 'cancelled'

export type ClaimStatus =
  | 'submitted'
  | 'under-review'
  | 'approved'
  | 'denied'
  | 'closed'

export interface ApiErrorResponse {
  message: string
  errors?: Record<string, string> | Array<Record<string, unknown>>
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface User {
  id: string
  _id?: string
  name: string
  email: string
  role: UserRole
  createdAt?: string
}

export interface Policy {
  id: string
  _id?: string
  policyNumber: string
  holderName: string
  type: PolicyType
  premium: number
  status: PolicyStatus
  effectiveDate: string
  expirationDate: string
  owner: string | User
  createdAt?: string
}

export interface ClaimNote {
  author: string | User
  text: string
  createdAt: string
}

export interface Claim {
  id: string
  _id?: string
  claimNumber: string
  policy: string | Policy
  description: string
  incidentDate: string
  amount: number
  status: ClaimStatus
  assignedTo?: string | User
  notes: ClaimNote[]
  createdAt?: string
  updatedAt?: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface MeResponse {
  user: User
}

export interface UsersListResponse extends Array<User> {}

export interface PolicyListResponse {
  data: Policy[]
  pagination: PaginationMeta
}

export interface ClaimListResponse {
  data: Claim[]
  pagination: PaginationMeta
}

export interface ClaimStatsResponse {
  countByStatus: Record<ClaimStatus, number>
  totalClaimAmount: number
  totalClaims: number
}

export interface DashboardStats {
  totalClaims: number
  claimsByStatus: Record<string, number>
  totalPolicies: number
  policiesByType: Record<string, number>
  totalUsers: number
  recentClaims: Claim[]
  totalClaimAmount: number
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  role?: UserRole
}

export interface LoginPayload {
  email: string
  password: string
}

export interface CreatePolicyPayload {
  policyNumber: string
  holderName: string
  type: PolicyType
  premium: number
  status?: PolicyStatus
  effectiveDate: string
  expirationDate: string
}

export interface UpdatePolicyPayload extends Partial<CreatePolicyPayload> {}

export interface CreateClaimPayload {
  policy: string
  description: string
  incidentDate: string
  amount: number
  status?: ClaimStatus
}

export interface UpdateClaimPayload {
  policy?: string
  description?: string
  incidentDate?: string
  amount?: number
  status?: ClaimStatus
  assignedTo?: string
}

export interface AddClaimNotePayload {
  text: string
}

export interface PolicyQueryParams {
  type?: PolicyType
  status?: PolicyStatus
  search?: string
  page?: number
  limit?: number
}

export interface ClaimQueryParams {
  status?: ClaimStatus
  policy?: string
  assignedTo?: string
  search?: string
  page?: number
  limit?: number
}
