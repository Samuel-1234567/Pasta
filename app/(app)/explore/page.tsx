import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/app/lib/supabase/server'
import { ExploreContent } from './explore-content'

export const dynamic = 'force-dynamic'

export default async function ExplorePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/explore')
  }

  return <ExploreContent />
}
