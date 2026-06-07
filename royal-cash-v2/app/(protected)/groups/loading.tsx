import { Loading } from '@/components/ui/loading'
import { getTranslations } from '@/lib/i18n/get-translations'

export default async function GroupsLoading() {
  const t = await getTranslations()

  return (
    <div className="flex-1">
      <Loading message={t.common.loading} />
    </div>
  )
}
