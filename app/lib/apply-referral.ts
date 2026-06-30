import 'server-only'

import { randomInt } from 'crypto'
import {
  isValidReferralCodeFormat,
  normalizeReferralCode,
  REFERRAL_CODE_LENGTH,
} from '@/app/lib/referral'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'

const REFERRAL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export type ApplyReferralResult =
  | { ok: true; referredByEmail: string }
  | { ok: false; reason: 'invalid_code' | 'referrer_not_found' | 'self_referral' | 'already_referred' | 'db_error' }

export function generateReferralCode(): string {
  let code = ''
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += REFERRAL_CHARS[randomInt(REFERRAL_CHARS.length)]!
  }
  return code
}

async function generateUniqueReferralCode(): Promise<string | null> {
  const supabase = createSupabaseAdminClient()

  for (let attempt = 0; attempt < 100; attempt++) {
    const candidate = generateReferralCode()
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', candidate)
      .maybeSingle()

    if (error && !/referral_code|column .* does not exist/i.test(error.message)) {
      return null
    }

    if (!data) {
      return candidate
    }
  }

  return null
}

type ProfileReferralRow = {
  id: string
  email: string | null
  referral_code: string | null
  referred_by_email: string | null
}

export async function ensureUserProfile(
  userId: string,
  userEmail?: string | null,
): Promise<ProfileReferralRow | null> {
  const supabase = createSupabaseAdminClient()

  const { data: existing, error: loadError } = await supabase
    .from('profiles')
    .select('id, email, referral_code, referred_by_email')
    .eq('id', userId)
    .maybeSingle()

  if (loadError && !/referral_code|referred_by_email|column .* does not exist/i.test(loadError.message)) {
    return null
  }

  if (existing) {
    return existing as ProfileReferralRow
  }

  const referralCode = await generateUniqueReferralCode()
  if (!referralCode) return null

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email: userEmail?.trim() ?? null,
      referral_code: referralCode,
    })
    .select('id, email, referral_code, referred_by_email')
    .maybeSingle()

  if (!insertError && created) {
    return created as ProfileReferralRow
  }

  const { data: retry, error: retryError } = await supabase
    .from('profiles')
    .select('id, email, referral_code, referred_by_email')
    .eq('id', userId)
    .maybeSingle()

  if (retryError || !retry) {
    return null
  }

  return retry as ProfileReferralRow
}

export async function applyReferralCode(
  userId: string,
  userEmail: string | null | undefined,
  code: string,
): Promise<ApplyReferralResult> {
  const normalizedCode = normalizeReferralCode(code)
  if (!isValidReferralCodeFormat(normalizedCode)) {
    return { ok: false, reason: 'invalid_code' }
  }

  const existing = await ensureUserProfile(userId, userEmail)
  if (!existing) {
    return { ok: false, reason: 'db_error' }
  }

  if (existing.referred_by_email) {
    return { ok: false, reason: 'already_referred' }
  }

  const existingReferralCode = existing.referral_code
    ? normalizeReferralCode(existing.referral_code)
    : null
  if (existingReferralCode === normalizedCode) {
    return { ok: false, reason: 'self_referral' }
  }

  const supabase = createSupabaseAdminClient()

  const { data: referrer, error: referrerError } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('referral_code', normalizedCode)
    .maybeSingle()

  if (referrerError) {
    return { ok: false, reason: 'db_error' }
  }

  const referrerEmail = referrer?.email?.trim().toLowerCase() ?? null
  if (!referrer || !referrerEmail) {
    return { ok: false, reason: 'referrer_not_found' }
  }

  if (referrer.id === userId) {
    return { ok: false, reason: 'self_referral' }
  }

  const normalizedUserEmail = userEmail?.trim().toLowerCase() ?? null
  if (normalizedUserEmail && referrerEmail === normalizedUserEmail) {
    return { ok: false, reason: 'self_referral' }
  }

  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ referred_by_email: referrerEmail, email: referrerEmail })
    .eq('id', userId)
    .is('referred_by_email', null)
    .select('id')
    .maybeSingle()

  if (updateError || !updated) {
    return { ok: false, reason: 'db_error' }
  }

  return { ok: true, referredByEmail: referrerEmail }
}

export async function ensureProfileReferralCode(
  userId: string,
  userEmail?: string | null,
): Promise<string | null> {
  const profile = await ensureUserProfile(userId, userEmail)
  if (!profile) return null

  const currentCode = profile.referral_code ?? null
  if (currentCode && isValidReferralCodeFormat(currentCode)) {
    return normalizeReferralCode(currentCode)
  }

  const code = await generateUniqueReferralCode()
  if (!code) return null

  const supabase = createSupabaseAdminClient()
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ referral_code: code })
    .eq('id', userId)

  if (updateError && !/referral_code|column .* does not exist/i.test(updateError.message)) {
    return null
  }

  return code
}
