import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/app/lib/supabase/admin'
import { requireUser } from '@/app/lib/supabase/require-user'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; commentId: string }> },
) {
  const auth = await requireUser()
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const { id: deckId, commentId } = await ctx.params
  if (!isUuid(deckId) || !isUuid(commentId)) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const { data: comment, error: commentError } = await supabase
    .from('deck_comments')
    .select('id, deck_id, profile_id')
    .eq('id', commentId)
    .eq('deck_id', deckId)
    .maybeSingle()

  if (commentError) {
    return NextResponse.json({ error: commentError.message }, { status: 500 })
  }
  if (!comment) {
    return NextResponse.json({ error: 'Comment not found.' }, { status: 404 })
  }
  if (String(comment.profile_id) !== auth.user.id) {
    return NextResponse.json({ error: 'You can only delete your own comments.' }, { status: 403 })
  }

  const { error: deleteError } = await supabase.from('deck_comments').delete().eq('id', commentId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
