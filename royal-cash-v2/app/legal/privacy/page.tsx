import type { Metadata } from 'next'
import { LegalDocumentView } from '@/components/legal/legal-document'
import { privacyHe, privacyEn } from '@/lib/legal/content'

export const metadata: Metadata = {
  title: 'מדיניות פרטיות',
  description:
    'איזה מידע Royal Cash אוספת, מי רואה אותו, איפה הוא נשמר וכיצד למחוק את החשבון.',
}

export default function PrivacyPage() {
  return (
    <LegalDocumentView
      he={privacyHe}
      en={privacyEn}
      otherHref="/legal/terms"
      otherLabelHe="תנאי שימוש"
      otherLabelEn="Terms of Use"
    />
  )
}
