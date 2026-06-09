import { createClient } from '@/lib/supabase/server'
import { getGroups } from '@/lib/db/groups'
import GroupsClient from './groups-client'

export default async function GroupsPage() {
  const supabase = await createClient()
  const groups = await getGroups(supabase).catch(() => [])
  return <GroupsClient initialGroups={groups} />
}
