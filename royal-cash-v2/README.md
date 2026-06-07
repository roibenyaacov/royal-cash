# Royal Cash v2

A Hebrew-first, iPhone-optimized web app for managing private cash-game nights among friend groups.

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript**
- **Tailwind CSS v4**
- **Supabase** (Database, Auth, Realtime, RLS)
- **Vercel** (deployment)

## Getting Started

### Prerequisites

- Node.js 20.9+
- A Supabase project with Google Auth enabled

### Setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Create `.env.local` from the template:

```bash
cp .env.example .env.local
```

3. Fill in your Supabase credentials in `.env.local`.

4. Run the database migrations in your Supabase SQL Editor:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`

5. Enable Google provider in Supabase Dashboard > Auth > Providers.

6. Start the dev server:

```bash
npm run dev
```

### Running Tests

```bash
npx vitest run
```

## Project Structure

```
app/              Next.js pages and layouts
components/       React UI components
  ui/             Reusable primitives (Button, Card, Input, etc.)
  games/          Game-specific components
  expenses/       Expense flow components
  layout/         Navigation and page layout
lib/
  domain/         TypeScript types
  calculations/   Pure business logic (no framework deps)
  db/             Supabase query layer
  supabase/       Supabase client factories
  i18n/           Hebrew string dictionary
hooks/            React hooks
supabase/
  migrations/     SQL migration files
proxy.ts          Auth guard (Next.js 16 proxy)
```

## Architecture Principles

- **Business logic is separated from UI.** All calculations are pure functions in `lib/calculations/`.
- **Database logic is not mixed into components.** All queries go through `lib/db/`.
- **Hebrew-first with English internals.** User-facing text lives in `lib/i18n/he.ts`. Code stays in English.
- **RTL from day one.** Layout uses Tailwind logical properties.
- **Integer money.** All amounts stored as whole shekels to avoid floating-point bugs.

## Deployment

Deploy to Vercel by connecting the repository. Set the environment variables in Vercel's dashboard.
