const CLAIM_NUMBER_WITH_PREFIX_PATTERN = /^CLM-(\d+)$/
const CLAIM_NUMBER_DIGITS_ONLY_PATTERN = /^\d+$/

export function formatClaimNumber(claimNumber: string): string {
  const normalizedClaimNumber = claimNumber.trim().toUpperCase()

  if (!normalizedClaimNumber) {
    return '—'
  }

  const withPrefixMatch = normalizedClaimNumber.match(CLAIM_NUMBER_WITH_PREFIX_PATTERN)
  if (withPrefixMatch) {
    return `CLM-${withPrefixMatch[1].padStart(4, '0')}`
  }

  if (CLAIM_NUMBER_DIGITS_ONLY_PATTERN.test(normalizedClaimNumber)) {
    return `CLM-${normalizedClaimNumber.padStart(4, '0')}`
  }

  return normalizedClaimNumber
}