'use client'

import { t } from '@/lib/i18n/dictionary'
import { PageHeader } from '@/components/layout/page-header'
import { OddsCalculator } from '@/components/tools/odds-calculator'

export default function OddsToolsPage() {
  return (
    <>
      <PageHeader title={t.tools.oddsCalc} />
      <main className="flex-1 px-4 py-4 overflow-y-auto">
        <OddsCalculator />
      </main>
    </>
  )
}
