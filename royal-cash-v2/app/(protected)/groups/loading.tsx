import { Loading } from '@/components/ui/loading'
import { t } from '@/lib/i18n/dictionary'

export default function GroupsLoading() {
  return (
    <div className="flex-1">
      <Loading message={t.common.loading} />
    </div>
  )
}
