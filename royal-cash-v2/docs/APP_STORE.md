# Getting Royal Cash onto the App Store

Royal Cash is a Next.js app. The App Store does not accept web apps, so it
ships as a thin native shell (Capacitor) around the deployed site, with
real native behaviour wired into it.

This document is the whole route: what is already done in this repository,
what only a Mac or an Apple account can do, and the two review guidelines
most likely to get the first submission rejected.

---

## 1. Where it stands

### Done in this repository

| Area | What was done | Why it is required |
|---|---|---|
| Account deletion | `delete_my_account()` + Profile → "מחיקת החשבון שלי", behind a type-to-confirm | Guideline **5.1.1(v)**. An app that creates accounts must delete them in-app. Automatic rejection without it. |
| Sign in with Apple | Added next to Google on the login, claim and invite screens | Guideline **4.8**. Offering Google alone is an automatic rejection. |
| Privacy policy | `/legal/privacy`, Hebrew and English, public (no login) | App Store Connect will not accept a submission without a public policy URL. |
| Terms of use | `/legal/terms`, linked from sign-in and profile | Needed for the gambling-adjacent positioning in §4. |
| Native shell | `capacitor.config.ts`, plugins installed | The thing that makes it an app. |
| Native behaviour | Share sheet, haptics on buy-ins, status bar, OAuth through the system browser | Guideline **4.2**, see §4. |
| Universal links | `/.well-known/apple-app-site-association` (serves 404 until the Team ID is set) | Sign-in cannot return to the app without it. |
| App icon | `assets/icon.png`, 1024×1024, **no alpha channel** | The old PWA icon has alpha; App Store Connect rejects that on upload. |
| Offline screen | `native/www/index.html` | The shell loads over the network. Without this, no signal means a blank screen, which review treats as a crash. |
| CI | `.github/workflows/ios-testflight.yml` | Builds and uploads from a hosted Mac, so shipping does not require owning one. |

### Not done, and not doable from here

Everything below needs either macOS or an Apple Developer account. Neither
exists on this machine, so none of it has been run or tested.

- Apple Developer Program enrolment — **$99/year, and approval takes days
  to over a week**. Nothing else can start until this is finished.
- `npx cap add ios` — invokes CocoaPods, macOS only. The CI workflow runs
  it, so this does not have to happen on your own machine.
- Xcode capabilities: Associated Domains, Sign in with Apple.
- Signing certificate and provisioning profile.
- Screenshots on a real device or simulator.
- **The CI workflow has never run.** It was written blind. Expect the
  first run to need fixing.

---

## 2. Do these in order

### Step 1 — Apple Developer Program

Enrol at [developer.apple.com](https://developer.apple.com/programs/).
Start here, today: the wait is the long pole in the whole project. Note
the ten-character **Team ID** from Membership when it comes through.

### Step 2 — Sign in with Apple, end to end

1. **Apple Developer portal**
   - Identifiers → new App ID, bundle `app.royalcash`. Enable **Sign in
     with Apple** and **Associated Domains**.
   - Identifiers → new **Services ID** (e.g. `app.royalcash.web`). Enable
     Sign in with Apple, configure it with:
     - Domain: `royalcash.app`
     - Return URL: `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - Keys → new key with Sign in with Apple. Download the `.p8` **once**;
     it cannot be downloaded again.
2. **Supabase** → Authentication → Providers → Apple. Enable it and fill
   in the Services ID, Team ID, Key ID and the `.p8` contents.
3. Test in a browser at royalcash.app before touching Xcode. If the Apple
   button does not work on the web it will not work in the app, and
   debugging it inside a shell is far harder.

### Step 3 — Universal links

Set `APPLE_APP_ID_PREFIX` to the Team ID in the Vercel project's
environment variables and redeploy. Then check:

```bash
curl -s https://royalcash.app/.well-known/apple-app-site-association
```

It must return JSON with `"appIDs": ["<TEAMID>.app.royalcash"]` and a
`Content-Type` of `application/json`. While the variable is unset the
route deliberately returns 404 — a malformed association file is cached
hard by Apple's CDN and is worse than an absent one.

### Step 4 — Run the migrations

In the Supabase SQL editor, in order: **031**, **032**, **033**, **034**.

`034_delete_my_account.sql` is the one that matters for submission. It
also loosens the `created_by` foreign keys so that deleting an account no
longer fails — read the comment block at the top before running it.

### Step 5 — First build

Push to `main`, then run the **iOS TestFlight** workflow manually from the
Actions tab with a build number of `1`. See the secrets listed at the top
of the workflow file.

If you do get access to a Mac, the same thing locally is:

```bash
npm ci && npx cap add ios && npx cap sync ios && npm run ios:assets && npm run ios:open
```

Then in Xcode: Signing & Capabilities → add **Associated Domains**
(`applinks:royalcash.app`) and **Sign in with Apple**.

### Step 6 — App Store Connect

Create the app record, fill in the listing from §3, upload screenshots,
and submit.

---

## 3. The listing

**Name:** Royal Cash
**Subtitle:** פנקס לערב פוקר ביתי
**Bundle ID:** `app.royalcash`
**Category:** Finance (primary). *Not* Games — this is a ledger, and a
Games listing invites the reviewer to look for a game that is not there.
**Age rating:** 17+. Answer **"Frequent/Intense Simulated Gambling: No"**
but **"Contests: Yes"** is wrong too — see §4 before answering the
questionnaire.
**Privacy policy URL:** `https://royalcash.app/legal/privacy`
**Support URL:** `https://royalcash.app/legal/terms`

### App Privacy ("nutrition label")

Declare honestly. The app collects:

| Data | Linked to user | Used for tracking | Purpose |
|---|---|---|---|
| Email address | Yes | No | App functionality |
| Name | Yes | No | App functionality |
| Phone number | Yes | No | App functionality |
| Photos | Yes | No | App functionality |
| Other user content (game records) | Yes | No | App functionality |

There is no analytics SDK, no advertising and no tracking in the app, so
"Used for tracking" is No across the board. Keep this table in step with
`lib/legal/content.ts`; if one changes and the other does not, the listing
becomes a false statement.

### Review notes — write this in the box

> Royal Cash is a record-keeping tool for a private home card game among
> friends. It records who put in what and calculates who owes whom at the
> end of the evening.
>
> The app does not accept wagers, does not hold or transfer money, does not
> process payments, and takes no commission. All amounts are numbers the
> users type in themselves, and all settling up happens between the players
> directly, outside the app.
>
> Demo account: <create one and put it here, with a group containing a
> finished game so the reviewer sees the app with data in it>

A reviewer handed an empty app rejects it as incomplete. Seed the demo
account with a real-looking finished game.

---

## 4. The two rejections to expect

### Guideline 4.2 — Minimum Functionality

The shell loads `royalcash.app`. Apple rejects apps that are a website in
a window, and this is the most likely reason for a first rejection.

What is already in the app to answer it: the native share sheet for
settlements, haptics when a buy-in is recorded, native status bar
handling, sign-in through the system browser, universal links that open
invites in the app, and an offline screen. These are in `lib/native/` and
`components/layout/native-shell.tsx`.

**If it is rejected anyway**, the strongest additions in order of effort:

1. **Push notifications** — "your group opened a table". A real native
   capability a website cannot have, and genuinely useful here.
2. **Face ID lock** on open. One plugin, and it fits an app holding
   people's money records.
3. **A home screen widget** showing the running pot. The most convincing
   and the most work.

Do not argue with the reviewer about whether a wrapper counts. Add
capability and resubmit.

### Guideline 5.3 — Gaming, gambling and lotteries

This is the sharper risk, and it is worth being clear-eyed about it.

In Royal Cash's favour: it takes no wagers, holds no money, moves no
money, charges no rake. It is an accounting tool, in the same category as
a shared expenses app. Several comparable poker-ledger apps are live on
the App Store today, so the precedent exists.

Against: it is unmistakably about money changing hands over poker, and a
reviewer who reads it as facilitating gambling can reject on 5.3 without
much to argue against. Israel is also a jurisdiction where games of chance
played for money are prohibited under the Penal Law, which an App Store
reviewer may or may not weigh.

What reduces the risk:

- Finance category, not Games.
- 17+ rating.
- The review note in §3, which states plainly what the app does not do.
- `/legal/terms` says in writing that the app takes no wagers and holds no
  money, and puts the legality of any given game on the user.

What would raise it sharply, and should not be added: taking a rake,
holding balances, moving money in-app, linking to gambling sites, or
language describing the app as a way to play or bet rather than a way to
keep score.

---

## 5. Known gaps

- **The CI workflow is untested.** Written without access to macOS.
- **The native code paths are untested on a device.** The OAuth bridge,
  share sheet, haptics and status bar are all written against the plugin
  APIs but have never run on an iPhone. The OAuth bridge is the one to
  watch: if universal links are not configured exactly right, sign-in
  completes in the system browser and never returns to the app.
- **The icon is the wordmark on a dark square.** It is legible at 1024px
  and poor at 60px on a home screen, where two lines of text become a
  grey smudge. A mark rather than words would serve better.
- **`npm audit` reports 7 vulnerabilities** (1 moderate, 4 high, 2
  critical) in the dependency tree. These were not touched: `npm audit fix
  --force` would bump major versions unasked. Worth a deliberate pass
  before shipping a binary.
- **No push notifications.** The most likely thing to need adding if 4.2
  comes back.
