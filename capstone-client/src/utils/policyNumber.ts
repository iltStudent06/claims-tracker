import type { PolicyType } from '../types'

const POLICY_NUMBER_WITH_TYPE_PATTERN = /^POL-[A-Z]+-(\d+)$/
const POLICY_NUMBER_BASE_PATTERN = /^POL-(\d+)$/

export function formatPolicyNumber(policyNumber: string, type?: PolicyType): string {
  const normalizedPolicyNumber = policyNumber.trim().toUpperCase()
  if (!normalizedPolicyNumber) {
    return '—'
  }

  if (!type) {
    return normalizedPolicyNumber
  }

  const typeSegment = type.toUpperCase()
  const withTypeMatch = normalizedPolicyNumber.match(POLICY_NUMBER_WITH_TYPE_PATTERN)
  if (withTypeMatch) {
    return `POL-${typeSegment}-${withTypeMatch[1]}`
  }

  const baseMatch = normalizedPolicyNumber.match(POLICY_NUMBER_BASE_PATTERN)
  if (baseMatch) {
    return `POL-${typeSegment}-${baseMatch[1]}`
  }

  return `POL-${typeSegment}-${normalizedPolicyNumber.replace(/^POL-/, '')}`
}