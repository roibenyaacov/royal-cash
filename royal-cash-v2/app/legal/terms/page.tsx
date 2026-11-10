import type { Metadata } from 'next'
import { LegalDocumentView } from '@/components/legal/legal-document'
import { termsHe, termsEn } from '@/lib/legal/content'

export const metadata: Metadata = {
  title: 'תנאי שימוש',
  description:
    'התנאים לשימוש ב-Royal Cash: מה האפליקציה עושה, מה באחריותך, וללא אחריות.',
}

export default function TermsPage() {
  return (
    <LegalDocumentView
      he={termsHe}
      en={termsEn}
      otherHref="/legal/privacy"
      otherLabelHe="מדיניות פרטיות"
      otherLabelEn="Privacy Policy"
    />
  )
}
