import { CONTACT_EMAIL } from '@/lib/contact'

/**
 * The privacy policy and terms, as data rather than two pairs of pages.
 *
 * App Store Connect will not accept a submission without a privacy policy
 * at a public URL, and review checks that the same text is reachable from
 * inside the app. Keeping both languages in one structure is what stops
 * the Hebrew and the English drifting apart, which is its own kind of
 * broken promise.
 *
 * These describe what the app actually does today. Anything added later
 * that touches personal data — analytics, crash reporting, push, payments
 * — has to be written in here at the same time.
 */

export type LegalSection = {
  heading: string
  body: string[]
}

export type LegalDocument = {
  title: string
  updated: string
  intro: string
  sections: LegalSection[]
}

/** Shown as "last updated". Bump it whenever the text below changes. */
export const LEGAL_LAST_UPDATED = '2026-11-10'

export const privacyHe: LegalDocument = {
  title: 'מדיניות פרטיות',
  updated: 'עודכן לאחרונה',
  intro:
    'Royal Cash היא פנקס לערב פוקר ביתי. המדיניות הזו מתארת בדיוק איזה מידע נאסף, למה, מי רואה אותו וכיצד למחוק אותו.',
  sections: [
    {
      heading: 'מה נאסף',
      body: [
        'פרטי החשבון שלך: כתובת האימייל, השם ותמונת הפרופיל שמגיעים מחשבון Google שאיתו נכנסת.',
        'מה שאתה מזין בעצמך: שם תצוגה, מספר טלפון (אופציונלי, כדי שחברי החבורה יוכלו להעביר לך כסף) ותמונת פרופיל אם העלית כזו.',
        'נתוני המשחק: כניסות, יציאות, הוצאות, תוצאות וחלוקות בערבים שבהם השתתפת, יחד עם מי רשם כל פעולה ומתי.',
      ],
    },
    {
      heading: 'מה לא נאסף',
      body: [
        'אין באפליקציה כלי אנליטיקה, פרסום, פיקסלים או מעקב של צד שלישי מכל סוג.',
        'האפליקציה לא מבקשת גישה למיקום, לאנשי הקשר, למיקרופון או להיסטוריית הגלישה שלך.',
        'כסף אמיתי לא עובר דרך האפליקציה. היא רושמת סכומים, היא לא מחזיקה, מעבירה או מקבלת כסף.',
      ],
    },
    {
      heading: 'מי רואה את המידע',
      body: [
        'חברי החבורה שלך רואים את השם, התמונה ואת נתוני המשחקים המשותפים — זו כל מטרת האפליקציה.',
        'מספר הטלפון שלך גלוי רק לחברי החבורות שאתה חבר בהן.',
        'כתובת האימייל שלך לא מוצגת לאף משתמש אחר.',
        'המידע לא נמכר, לא מושכר ולא משותף עם מפרסמים או עם צדדים שלישיים לצורכי שיווק.',
      ],
    },
    {
      heading: 'איפה המידע נשמר',
      body: [
        'המידע נשמר אצל Supabase, שמספקת את מסד הנתונים והאימות, ומתארחת על תשתית ענן. האפליקציה עצמה מתארחת ב-Vercel.',
        'הגישה למידע מוגבלת ברמת מסד הנתונים (Row Level Security) כך שכל משתמש מגיע רק למה ששייך לו ולחבורות שלו.',
        'התקשורת עם השרת מוצפנת ב-HTTPS.',
      ],
    },
    {
      heading: 'מחיקת החשבון',
      body: [
        'אפשר למחוק את החשבון מתוך האפליקציה: פרופיל ← מחיקת החשבון שלי. הפעולה לצמיתות.',
        'המחיקה מסירה את זהות ההתחברות, את הפרופיל, את האימייל, את הטלפון ואת התמונה שלך, וכן את החברות שלך בחבורות.',
        'היסטוריית המשחקים של החבורה נשארת, בלי קישור לחשבון שלך — ערב פוקר הוא רשומה משותפת של כל השולחן, ומחיקתה הייתה משנה את המאזנים של אנשים אחרים.',
        'חבורות שאתה מנהל עוברות לחבר הוותיק הבא. חבורה שאתה החבר היחיד בה נמחקת יחד עם החשבון.',
      ],
    },
    {
      heading: 'גיל',
      body: [
        'האפליקציה מיועדת לבני 18 ומעלה ואינה מיועדת לילדים. אין איסוף מכוון של מידע מקטינים.',
      ],
    },
    {
      heading: 'יצירת קשר',
      body: [
        `לכל שאלה, בקשת מידע או בקשת מחיקה: ${CONTACT_EMAIL}`,
      ],
    },
  ],
}

export const privacyEn: LegalDocument = {
  title: 'Privacy Policy',
  updated: 'Last updated',
  intro:
    'Royal Cash is a ledger for a home poker night. This policy sets out exactly what is collected, why, who can see it, and how to delete it.',
  sections: [
    {
      heading: 'What is collected',
      body: [
        'Your account details: the email address, name and profile picture that come from the Google account you signed in with.',
        'What you enter yourself: a display name, an optional phone number (so people in your group can pay you back) and a profile photo if you upload one.',
        'Game data: buy-ins, cash-outs, expenses, results and settlements for the evenings you took part in, along with who recorded each action and when.',
      ],
    },
    {
      heading: 'What is not collected',
      body: [
        'The app contains no analytics, advertising, tracking pixels or third-party trackers of any kind.',
        'It does not ask for your location, contacts, microphone or browsing history.',
        'No real money moves through the app. It records amounts; it never holds, transfers or receives funds.',
      ],
    },
    {
      heading: 'Who can see it',
      body: [
        'The people in your group see your name, your photo and the shared game data. That is the whole point of the app.',
        'Your phone number is visible only to members of groups you belong to.',
        'Your email address is never shown to other users.',
        'Nothing is sold, rented, or shared with advertisers or third parties for marketing.',
      ],
    },
    {
      heading: 'Where it is stored',
      body: [
        'Data is stored with Supabase, which provides the database and authentication on cloud infrastructure. The app itself is hosted on Vercel.',
        'Access is restricted at the database level with row-level security, so each user reaches only their own data and their own groups.',
        'Traffic to the server is encrypted with HTTPS.',
      ],
    },
    {
      heading: 'Deleting your account',
      body: [
        'You can delete your account from inside the app: Profile → Delete my account. It is permanent.',
        'Deletion removes your sign-in identity, your profile, your email, phone and photo, and your group memberships.',
        'The groups keep their game history, with nothing linking it to your account. A poker night is a shared record of the whole table, and deleting it would change other people’s balances.',
        'Groups you run pass to the next longest-standing member. A group where you are the only member is deleted with the account.',
      ],
    },
    {
      heading: 'Age',
      body: [
        'The app is intended for people aged 18 and over and is not directed at children. No information is knowingly collected from minors.',
      ],
    },
    {
      heading: 'Contact',
      body: [
        `For any question, data request or deletion request: ${CONTACT_EMAIL}`,
      ],
    },
  ],
}

export const termsHe: LegalDocument = {
  title: 'תנאי שימוש',
  updated: 'עודכן לאחרונה',
  intro:
    'השימוש ב-Royal Cash מהווה הסכמה לתנאים האלה. הם קצרים בכוונה.',
  sections: [
    {
      heading: 'מה האפליקציה עושה',
      body: [
        'Royal Cash רושמת כניסות, יציאות והוצאות בערב פוקר ביתי, ומחשבת מי חייב למי בסוף הערב.',
        'האפליקציה היא כלי חישוב ורישום בלבד. היא אינה מארגנת משחקים, אינה מקבלת הימורים, אינה מחזיקה כסף, אינה מעבירה כסף ואינה גובה עמלה משום משחק.',
        'כל התשלומים בפועל מתבצעים בין השחקנים עצמם, מחוץ לאפליקציה ובאחריותם.',
      ],
    },
    {
      heading: 'האחריות שלך',
      body: [
        'השימוש באפליקציה מותר לבני 18 ומעלה בלבד.',
        'באחריותך לוודא שהמשחק שאתה משתתף בו חוקי במקום מגוריך. באזורים מסוימים, ישראל ביניהם, משחקי מזל בכסף מוסדרים או אסורים בחוק. האפליקציה אינה מהווה ייעוץ משפטי ואינה מתירה דבר שהחוק אוסר.',
        'באחריותך לדייק בנתונים שאתה מזין. הסכומים שהאפליקציה מציגה נגזרים ממה שנרשם בה.',
      ],
    },
    {
      heading: 'הנתונים שלך',
      body: [
        'החשבון שלך הוא שלך, וניתן למחוק אותו בכל רגע מתוך האפליקציה.',
        'הטיפול במידע מתואר במדיניות הפרטיות.',
      ],
    },
    {
      heading: 'ללא אחריות',
      body: [
        'האפליקציה ניתנת כמות שהיא. אנו עושים מאמץ שהחישובים יהיו נכונים, אך איננו אחראים לנזק, להפסד כספי או למחלוקת בין שחקנים שנובעים משימוש בה.',
        'חישוב החלוקות הוא הצעה לנוחות. ההסדר הסופי בין השחקנים הוא עניינם.',
      ],
    },
    {
      heading: 'שינויים',
      body: [
        'תנאים אלה עשויים להתעדכן. המשך שימוש לאחר עדכון מהווה הסכמה לנוסח המעודכן.',
      ],
    },
    {
      heading: 'יצירת קשר',
      body: [CONTACT_EMAIL],
    },
  ],
}

export const termsEn: LegalDocument = {
  title: 'Terms of Use',
  updated: 'Last updated',
  intro:
    'Using Royal Cash means agreeing to these terms. They are deliberately short.',
  sections: [
    {
      heading: 'What the app does',
      body: [
        'Royal Cash records buy-ins, cash-outs and expenses at a home poker night, and works out who owes whom at the end.',
        'It is a record-keeping and calculation tool only. It does not organise games, accept wagers, hold money, transfer money, or take a cut of any game.',
        'All actual payments happen between the players themselves, outside the app and at their own responsibility.',
      ],
    },
    {
      heading: 'Your responsibilities',
      body: [
        'The app is for people aged 18 and over only.',
        'It is your responsibility to make sure the game you take part in is lawful where you live. In some places, Israel among them, games of chance played for money are regulated or prohibited. This app is not legal advice and permits nothing the law forbids.',
        'It is your responsibility to enter accurate figures. What the app shows follows from what was recorded in it.',
      ],
    },
    {
      heading: 'Your data',
      body: [
        'Your account is yours, and you can delete it from inside the app at any time.',
        'How data is handled is set out in the Privacy Policy.',
      ],
    },
    {
      heading: 'No warranty',
      body: [
        'The app is provided as is. We work to keep the arithmetic correct, but we are not liable for damages, financial loss, or disputes between players arising from its use.',
        'The settlement calculation is a convenience suggestion. The final arrangement between players is theirs.',
      ],
    },
    {
      heading: 'Changes',
      body: [
        'These terms may be updated. Continuing to use the app after an update means accepting the updated text.',
      ],
    },
    {
      heading: 'Contact',
      body: [CONTACT_EMAIL],
    },
  ],
}
