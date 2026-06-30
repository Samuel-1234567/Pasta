import { NextResponse } from 'next/server'
import { applyReferralCode } from '@/app/lib/apply-referral'
import { requireUser } from '@/app/lib/supabase/require-user'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const auth = await requireUser()
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  let body: { code?: string } | null = null
  try {
    body = (await req.json()) as { code?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const code = body?.code?.trim()
  if (!code) {
    return NextResponse.json({ error: 'Referral code is required.' }, { status: 400 })
  }

  const result = await applyReferralCode(auth.user.id, auth.user.email, code)

  if (!result.ok) {
    const messages: Record<typeof result.reason, string> = {
      invalid_code: 'That referral code is not valid.',
      referrer_not_found: 'We could not find the referrer for that code.',
      self_referral: 'You cannot use your own referral code.',
      already_referred: 'Your account is already linked to a referrer.',
      db_error: 'Could not apply referral code. Please try again.',
    }

    const status =
      result.reason === 'already_referred' || result.reason === 'self_referral' ? 409 : 400

    return NextResponse.json({ error: messages[result.reason] }, { status })
  }

  return NextResponse.json({ referredByEmail: result.referredByEmail })
}
