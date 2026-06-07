'use client'

import { t } from '@/lib/i18n/dictionary'
import { PageHeader } from '@/components/layout/page-header'
import { PreflopCharts } from '@/components/tools/preflop-charts'

export default function PreflopToolsPage() {
  return (
    <>
      <PageHeader title={t.tools.preflop} />
      <main className="flex-1 px-4 py-4 overflow-y-auto">
        <PreflopCharts />
      </main>
    </>
  )
}
