export const REFERRAL_CODE_LENGTH = 6
export const REFERRAL_COOKIE = 'referral_code'
export const REFERRAL_QUERY_PARAM = 'ref'

const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{6}$/

export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase()
}

export function isValidReferralCodeFormat(code: string): boolean {
  return REFERRAL_CODE_PATTERN.test(normalizeReferralCode(code))
}

export function referralSignupPath(code: string): string {
  return `/signup?${REFERRAL_QUERY_PARAM}=${encodeURIComponent(normalizeReferralCode(code))}`
}

export function referralSignupUrl(code: string, appUrl: string): string {
  const base = appUrl.replace(/\/$/, '')
  return `${base}${referralSignupPath(code)}`
}
