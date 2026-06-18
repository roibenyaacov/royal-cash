# Royal Cash - Product Requirements Document

## 1. Product Overview

Royal Cash is a product-grade, mobile-first web app for managing private cash-game nights among friend groups.

The app helps a group manage players, buy-ins, re-buys, side expenses, final cash-outs, player balances, and optimized settlements.

The first version is designed specifically for iPhone web usage, with the option to become a native mobile app later.

Royal Cash should feel like a premium iPhone app, not like a desktop website squeezed into a mobile screen.

The core problem Royal Cash solves is simple:

At the end of a cash-game night, players should not need paper notes, Excel sheets, WhatsApp calculations, or manual settlement math. The host should enter the final numbers and immediately get a clear list of who pays whom and how much.

The app should support Hebrew first, including right-to-left layout. English support should be added later. Internal code names, file names, variables, and database fields should remain in English.

---

## 2. Target Users

### 2.1 Primary User

The main user is the host or game manager.

The host is responsible for:

- Creating a private group
- Adding regular players
- Opening a new game night
- Selecting who is playing
- Managing buy-ins, re-buys, and expenses
- Closing the game
- Sharing the final settlement summary

### 2.2 Secondary Users

Registered group members (any role: owner, manager, or member) can:

- View and manage active games in their group
- Add players to the group and to an active game
- Add and remove buy-ins, expenses, and cash-outs
- Close games and finalize results
- Delete an active game/table (discard without saving to history)
- Generate group, player-claim, and game-access invite links
- View personal statistics when linked to a player profile
- Join a group through an invite link

Not every player at the table must have a registered account.

Any group member can create manual players who are not linked to a user account.

**Owner-only actions:**

- Archive (delete) the group
- Update group-level settings in the database

The `manager` role remains in the schema for invite links but has the same in-app game permissions as `member`.

---

## 3. Product Goals

Royal Cash should allow users to:

1. Sign in securely with Google.
2. Create private groups.
3. Add regular players to a group.
4. Open a new game night from a group.
5. Select which group players are playing tonight.
6. Set a default buy-in amount and currency.
7. Track buy-ins and re-buys as separate events.
8. Track side expenses such as food.
9. Present the food/expenses area in the Hebrew UI as: "היינו רעבים".
10. Support equal split, custom split, and personal expenses.
11. Enter final cash-out amounts.
12. Calculate each player’s final balance.
13. Generate optimized settlements.
14. Save closed games in history.
15. Prepare the data structure for future personal and group statistics.
16. Be optimized for iPhone web usage.
17. Be deployable on Vercel.
18. Use Supabase for database, authentication, realtime, and Row Level Security.
19. Support Hebrew first and English later.
20. Support RTL layout from the beginning.

---

## 4. Tech Stack

The planned tech stack is:

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Database
- Supabase Auth with Google login
- Supabase Realtime
- Supabase Row Level Security
- Vercel deployment
- PWA support later for iPhone Add to Home Screen

The app should first be built as a web app, but the architecture should keep business logic separate so that parts of the logic can later be reused in a mobile app.

---

## 5. Product Principles

### 5.1 Mobile-first, iPhone-first

The app must be designed for iPhone first.

This means:

- Card-based layouts instead of large desktop tables
- Large buttons
- Simple one-handed usage
- Bottom sheets for quick actions
- Sticky bottom action buttons when useful
- Support for iPhone safe areas
- Clear mobile spacing
- No hover-only interactions
- Money inputs should open numeric keyboards
- RTL layout should be supported from the start

### 5.2 Hebrew-first UX

The first user-facing version should be in Hebrew.

The UI should be written naturally for Israeli users.

Examples:

- "כניסה עם Google"
- "החבורות שלי"
- "משחק חדש"
- "הוסף שחקן"
- "הוסף כניסה"
- "היינו רעבים"
- "סגור משחק"
- "קיזוזים"
- "שתף סיכום"

English support should be added later through a structure that allows future localization.

Important:

- User-facing text should be easy to replace later.
- Internal code should stay in English.
- UI direction should support RTL.
- Layout should not break when Hebrew text is used.

### 5.3 Product-grade architecture

This is not a throwaway MVP.

However, the app should still be built in clean phases.

The architecture should support the full product vision from day one, but implementation should happen step by step to avoid messy code.

### 5.4 Business logic separated from UI

All calculation logic must live outside React components.

React components should display data and trigger actions, but they should not contain settlement math.

Calculation modules should be pure, testable TypeScript functions.

### 5.5 Security first

The app handles private financial settlement data between friends.

Even if the app does not process real payments directly, it must still be built securely.

Supabase Row Level Security must be part of the production architecture.

### 5.6 Realtime-ready

Active games should eventually update live between users.

Realtime should be planned from the beginning, but it can be implemented after the core data model and local flow are stable.

---

## 6. Core Entities

### 6.1 User

A user is an authenticated person using the app.

Users authenticate with Google through Supabase Auth.

A user can:

- Create groups
- Belong to groups
- Manage games and players in any group they belong to (see §6.3 and §14)
- View games they are allowed to access

User fields:

- id
- email
- full_name
- avatar_url
- created_at
- updated_at

---

### 6.2 Group

A group represents a regular friend group.

Examples:

- Friday Poker
- Roi’s Cash Group
- Netanya Game

A group contains:

- Members
- Regular players
- Active games
- Closed games history

Group fields:

- id
- name
- owner_id
- created_at
- updated_at

---

### 6.3 Group Member

A group member is a registered user who belongs to a group.

Roles (stored in `group_members.role`):

- **owner** — created the group
- **manager** — invited with manager role (same game permissions as member)
- **member** — joined via invite or added on group creation

#### Permissions model (v2 — cooperative group)

All group members (owner, manager, member) may:

- Add and remove players in the group
- Create new games
- Manage active games: buy-ins, expenses, roster, activity log
- Enter cash-outs and close games
- Finalize closed games into group history
- Delete an **active** game (discard table; cascades buy-ins/expenses; does not affect finalized history)
- Generate invite links (group, player claim, game access)

**Owner only:**

- Archive the group (`archived_at`)
- Delete the group record (if implemented)

RLS enforces membership via `is_group_member()`. Game mutations require membership in the game's group. See migrations `016`–`018`.

Group member fields:

- id
- group_id
- user_id
- role
- created_at

---

### 6.4 Player

A player is a person who can participate in games.

Important: a player does not have to be a registered user.

A player can be:

- Linked to a registered user
- Manual/unlinked, created by the host

Player fields:

- id
- group_id
- display_name
- phone
- linked_user_id
- is_active
- created_at
- updated_at

---

### 6.5 Game

A game is one specific cash-game night inside a group.

A group can have many games.

Game fields:

- id
- group_id
- name
- date
- default_buy_in
- currency
- status: active / closed / archived
- management_mode: host_only / multiple_managers
- created_by
- created_at
- closed_at

---

### 6.6 Game Player

A game player is a player who participates in a specific game.

Not every group player plays every night, so game participation must be separate from the general group player list.

Game player fields:

- id
- game_id
- player_id
- is_manager
- joined_at

---

### 6.7 Buy-in

Buy-ins and re-buys must be tracked as separate events.

Do not store only a single “number of rebuys”.

Each buy-in event should be saved separately so the app can show history, support corrections, and calculate totals accurately.

Buy-in fields:

- id
- game_id
- player_id
- amount
- created_by
- created_at
- note

Example:

- Roi bought in for 100
- Roi rebought for 200
- Tamar bought in for 100

---

### 6.8 Expense

Expenses represent side costs such as food, drinks, or other shared costs.

In the Hebrew UI, this area should be branded as:

"היינו רעבים"

This name should appear in the app instead of a generic label like "Food" or "Expenses" when referring to food/side-expense management.

Expense types:

- equal_split
- custom_split
- personal

Expense fields:

- id
- game_id
- paid_by_player_id
- amount
- description
- split_type
- created_by
- created_at

---

### 6.9 Expense Participant

Expense participants define who owes money for an expense.

For equal split, the app can generate equal amounts for all selected participants.

For custom split, the host can define a custom amount per player.

For personal expense, one player can owe the full amount, or the expense can represent someone paying on behalf of another player.

Expense participant fields:

- id
- expense_id
- player_id
- amount_owed

---

### 6.10 Cash-out

Cash-out is the final amount a player leaves the game with.

Cash-out fields:

- id
- game_id
- player_id
- amount
- created_by
- created_at
- updated_at

Each player should have one final cash-out per game.

---

### 6.11 Game Result

Game results can be calculated dynamically, but after a game is closed the app should support saving a snapshot for history and future statistics.

Game result fields:

- id
- game_id
- player_id
- total_buy_in
- cash_out
- game_net
- expense_credit
- expense_debt
- final_balance
- created_at

---

### 6.12 Settlement

Settlements show who pays whom and how much.

Settlements can be calculated dynamically, but after closing a game the app should support saving a snapshot.

Settlement fields:

- id
- game_id
- from_player_id
- to_player_id
- amount
- created_at

---

## 7. Calculation Rules

### 7.1 Total Buy-in

Total buy-in for a player is the sum of all buy-in events for that player in the game.

```text
totalBuyIn = sum(player buy-ins in game)

```

Example:

```text
Roi buy-ins:
100
200
100

totalBuyIn = 400
```

---

### 7.2 Game Net

Game net is the result before expenses.

```text
gameNet = cashOut - totalBuyIn
```

Example:

```text
Total buy-ins: 300
Cash-out: 450
Game net: +150
```

---

### 7.3 Expense Credit

If a player paid for an expense, they should receive credit for the part they paid on behalf of others.

In the Hebrew UI, this feature should be shown under the label:

```text
היינו רעבים
```

Example:

```text
Food expense: 300
Paid by Roi
Split between 6 players
Each player owes 50
```

In this case:

```text
Roi paid 300
Roi also owes his own 50
The other 5 players owe Roi 50 each
Roi's net expense credit is 250
```

The calculation should be clear and consistent.

---

### 7.4 Expense Debt

If a player participates in an expense, they owe their assigned share.

For equal split:

```text
expenseDebt = expense amount / number of participants
```

For custom split:

```text
expenseDebt = custom assigned amount
```

For personal expense:

```text
expenseDebt = amount assigned to the relevant player
```

---

### 7.5 Final Balance

Final balance is the player’s final result after game result and expenses.

```text
finalBalance = cashOut - totalBuyIn + expenseCredit - expenseDebt
```

Positive final balance means the player should receive money.

Negative final balance means the player should pay money.

Example:

```text
Roi:
cashOut = 450
totalBuyIn = 300
expenseCredit = 250
expenseDebt = 50

finalBalance = 450 - 300 + 250 - 50
finalBalance = +350
```

---

### 7.6 Settlement Optimization

The app should generate a clear settlement list with as few transfers as reasonably possible.

The settlement algorithm:

1. Create a list of creditors: players with positive final balance.
2. Create a list of debtors: players with negative final balance.
3. Match debtors to creditors.
4. Transfer the minimum amount needed between each pair.
5. Continue until all balances are settled.

Example:

```text
Roi: +150
Tamar: -100
Amit: -50
```

Settlement:

```text
Tamar pays Roi 100
Amit pays Roi 50
```

The algorithm must be implemented as a pure TypeScript function and must not depend on React or Supabase.

---

### 7.7 Validation Rules

Before closing a game, the app should validate the numbers.

The app should check:

- Every active game player has a cash-out value.
- Cash-out values are not negative.
- Buy-in amounts are positive.
- Expense amounts are positive.
- Expense splits match the total expense amount.
- Final balances approximately sum to zero.
- If there is a rounding difference, it should be handled clearly.

For money calculations, the app should avoid floating point issues.

Preferred approach:

```text
Store money values in the smallest currency unit when needed.
For ILS, store agorot if precision is required.
For the first version, whole shekels are acceptable if the UI only allows whole numbers.
```

---

## 8. Main User Flows

### 8.1 Authentication Flow

```text
User opens app
↓
User clicks Continue with Google
↓
Supabase Auth handles login
↓
User enters Groups screen
```

---

### 8.2 Create Group Flow

```text
User logs in
↓
Clicks Create Group
↓
Enters group name
↓
Group is created
↓
User becomes group owner
```

---

### 8.3 Add Players Flow

```text
User enters group
↓
Clicks Add Player
↓
Adds player name and optional phone
↓
Player is added to the group
```

---

### 8.4 Create Game Flow

```text
User enters group
↓
Clicks New Game
↓
Enters game name
↓
Sets default buy-in
↓
Chooses currency
↓
Selects players from group
↓
Chooses management mode
↓
Game is created
```

---

### 8.5 Active Game Flow

```text
Host opens active game
↓
Host adds buy-ins and re-buys
↓
Host adds expenses if needed
↓
Players can view updates
↓
Data updates live later through Supabase Realtime
```

---

### 8.6 Add Expense Flow - "היינו רעבים"

```text
Host clicks "היינו רעבים"
↓
Host selects who paid
↓
Host enters amount
↓
Host enters description
↓
Host chooses split type:
  - equal split
  - custom split
  - personal
↓
App calculates expense debts
↓
Expense is saved
```

The Hebrew UI should make this feel casual and friendly, not like an accounting system.

Examples of labels:

```text
היינו רעבים
מי שילם?
כמה יצא?
מי משתתף?
חלק שווה
חלוקה מותאמת
הוצאה אישית
שמור הוצאה
```

---

### 8.7 Close Game Flow

```text
Host clicks Close Game
↓
Host enters cash-out amount for each player
↓
App validates data
↓
App calculates final balances
↓
App generates settlements
↓
Host reviews results
↓
Host closes game
↓
Game is saved in history
```

---

### 8.8 Share Summary Flow

```text
Game is closed
↓
User clicks Share Summary
↓
App generates clean text summary
↓
User copies text or shares to WhatsApp
```

Example summary in English:

```text
Royal Cash Summary
Game: Friday Night

Results:
Roi: +150
Tamar: -100
Amit: -50

Settlements:
Tamar → Roi: 100
Amit → Roi: 50
```

Example summary in Hebrew:

```text
סיכום Royal Cash
משחק: שישי בערב

תוצאות:
רועי: +150
תמר: -100
עמית: -50

קיזוזים:
תמר משלמת לרועי: 100
עמית משלם לרועי: 50
```

---

## 9. Main Screens

### 9.1 Login Screen

Purpose:
Let the user enter the app securely.

Requirements:

- Royal Cash branding
- Short product sentence
- Continue with Google button
- Premium mobile-first design
- Dark mode first
- Hebrew first
- RTL layout

Suggested Hebrew copy:

```text
Royal Cash
סוגרים את הערב בלי כאב ראש

[כניסה עם Google]
```

---

### 9.2 Groups Screen

Purpose:
Show the user’s groups.

Requirements:

- List of groups
- Create group button
- Indication of active games
- Empty state if no groups exist

Suggested Hebrew labels:

```text
החבורות שלי
צור חבורה חדשה
אין לך עדיין חבורות
```

---

### 9.3 Group Page

Purpose:
Manage a specific group.

Requirements:

- Group name
- List of regular players
- New game button
- Active games
- Closed games history
- Archive group button (owner only)

All members see: new game, add player, invite link, and full player/game management.

Suggested Hebrew labels:

```text
משחק חדש
שחקנים
משחקים פעילים
היסטוריית משחקים
הגדרות חבורה
```

---

### 9.4 Create Game Screen

Purpose:
Open a new game night.

Requirements:

- Game name
- Default buy-in
- Currency
- Select players from group
- Add new player if needed
- Choose management mode
- Start game button

Suggested Hebrew labels:

```text
משחק חדש
שם המשחק
גובה כניסה
מטבע
מי משחק היום?
הוסף שחקן חדש
התחל משחק
```

---

### 9.5 Active Game Screen

Purpose:
Manage the live game.

Requirements:

- Game summary
- Total buy-ins
- Number of players
- Expenses total
- Player cards
- Add buy-in action
- "היינו רעבים" action
- Close game action
- Delete table action (active games only, with confirmation)
- Mobile-first card layout

Player card should show:

- Player name
- Total buy-in
- Cash-out status
- Current expense balance if relevant
- Quick action buttons

Suggested Hebrew labels:

```text
סה״כ כניסות
שחקנים
הוצאות
הוסף כניסה
היינו רעבים
סגור משחק
מחק שולחן
```

---

### 9.6 Add Buy-in Bottom Sheet

Purpose:
Quickly add a buy-in or re-buy during an active game.

Requirements:

- Open as a bottom sheet on mobile.
- Select the relevant player.
- Enter amount.
- Optional note.
- Save button.
- Numeric keyboard on iPhone.
- Fast one-handed usage.

Suggested Hebrew labels:

```text
הוסף כניסה
שחקן
סכום
הערה
שמור
ביטול
```

---

### 9.7 "היינו רעבים" Screen / Bottom Sheet

Purpose:
Manage food and side expenses during the game.

This feature should be presented in Hebrew as:

```text
היינו רעבים
```

The tone should feel casual, friendly, and suitable for a group of friends, not like a formal accounting system.

Requirements:

- Add a new expense.
- Select who paid.
- Enter amount.
- Enter description.
- Choose split type:
  - equal split
  - custom split
  - personal expense
- Select participants.
- Show calculated debt per player.
- Save expense.
- Show expense history for the game.

Suggested Hebrew labels:

```text
היינו רעבים
מי שילם?
כמה יצא?
על מה שילמתם?
מי משתתף?
חלק שווה
חלוקה מותאמת
הוצאה אישית
שמור הוצאה
היסטוריית הוצאות
```

Expense examples:

```text
פיצה
בירות
סושי
שתייה
נשנושים
משלוח
```

---

### 9.8 Close Game Screen

Purpose:
Enter final cash-out values for every player and prepare the game for settlement.

Requirements:

- Show all active game players.
- Input cash-out amount for each player.
- Numeric keyboard on iPhone.
- Show total buy-ins.
- Show total cash-outs.
- Warn if numbers do not balance.
- Allow the host to calculate results.
- Do not close the game permanently before final confirmation.

Suggested Hebrew labels:

```text
סגירת משחק
כמה כל אחד יצא?
סה״כ כניסות
סה״כ יציאות
חשב תוצאות
חזור למשחק
```

---

### 9.9 Results Screen

Purpose:
Show the final balances and settlement instructions.

Requirements:

- Show each player’s final balance.
- Positive balances should be visually clear.
- Negative balances should be visually clear.
- Show optimized settlement list.
- Allow sharing a summary.
- Allow saving and closing the game.
- Allow returning to edit before final close.

Suggested Hebrew labels:

```text
תוצאות
קיזוזים
מי משלם למי
שתף סיכום
סגור ושמור משחק
ערוך נתונים
```

Example:

```text
תוצאות:
רועי: +150
תמר: -100
עמית: -50

קיזוזים:
תמר משלמת לרועי: 100
עמית משלם לרועי: 50
```

---

### 9.10 Game History Screen

Purpose:
Show previous closed games for a group.

Requirements:

- List closed games.
- Show date.
- Show number of players.
- Show total buy-ins.
- Show final results summary.
- Allow opening a closed game in read-only mode.
- Later support stats and filters.

Suggested Hebrew labels:

```text
היסטוריית משחקים
משחקים קודמים
צפה בסיכום
אין עדיין משחקים קודמים
```

---

### 9.11 Stats Screen

This screen is not required in the first implementation phase, but the database should support it from day one.

Future stats:

- Total profit/loss per player.
- Average result per game.
- Number of games played.
- Biggest win.
- Biggest loss.
- Win rate.
- Recent games.
- Group-level history.

Important:
Stats should be calculated from final balances, not from settlement transfers.

Settlement transfers only show how players paid each other. Final balances represent the actual result of the game.

Suggested Hebrew labels for future version:

```text
סטטיסטיקות
מאזן כולל
ממוצע למשחק
מספר משחקים
ניצחון הכי גדול
הפסד הכי גדול
אחוז ניצחונות
משחקים אחרונים
```

---

## 10. iPhone-first UX Requirements

The app should be designed mainly for iPhone Safari and Chrome.

Requirements:

- Dark mode first.
- Premium visual identity.
- Black or deep charcoal background.
- Royal gold accents.
- Clean cards.
- Rounded corners.
- Large touch targets.
- Sticky bottom actions.
- Bottom sheets.
- Safe-area support.
- No desktop tables.
- No hover-only behavior.
- Fast money entry.
- Numeric keyboards for amount inputs.
- Clear loading states.
- Clear empty states.
- Clear error states.
- One-handed usability.
- PWA support later.

The app should feel like a native mobile app even though it is first built as a web app.

---

## 11. Hebrew and RTL Requirements

The first user-facing version should be in Hebrew.

The interface must support right-to-left layout from the beginning.

Requirements:

- HTML direction should support RTL.
- Main layout should be comfortable in Hebrew.
- Buttons, cards, and forms should not break with Hebrew text.
- Money values should be clear in Hebrew.
- Dates should be shown in a format that feels natural to Israeli users.
- Internal code naming should remain in English.
- User-facing text should be organized in a way that can later support English.

Recommended approach:

- Keep code, file names, components, functions, variables, and database fields in English.
- Keep user-facing labels centralized where possible.
- Prepare for future localization, but do not over-engineer a full translation system on day one.

Examples of Hebrew-first UI copy:

```text
כניסה עם Google
החבורות שלי
צור חבורה חדשה
משחק חדש
מי משחק היום?
הוסף שחקן
הוסף כניסה
היינו רעבים
סגור משחק
תוצאות
קיזוזים
שתף סיכום
```

---

## 12. Design Direction

The design should be premium, clean, and mobile-first.

Suggested style:

- Dark background.
- Gold accents.
- Card-based UI.
- Soft shadows.
- Rounded corners.
- Bottom navigation.
- Minimal but polished.
- Clear money amounts.
- Strong visual separation between game state, players, expenses, and results.

The visual identity should feel connected to the name Royal Cash:

- Premium
- Sharp
- Clean
- Dark
- Gold
- Confident
- Not childish
- Not casino-heavy

Avoid making the app look like a gambling website.

The design should feel more like a premium finance utility for a private group.

---

## 13. Stitch Design Integration

Stitch can be used as a design reference tool.

Use Stitch for:

- Layout inspiration.
- Visual direction.
- Spacing.
- Card structure.
- Login screen ideas.
- Active game screen ideas.
- Results screen ideas.
- Bottom sheet ideas.
- Mobile interaction patterns.

Do not blindly copy large generated code from Stitch.

Cursor should implement the actual code cleanly inside the Next.js project.

Do not copy from Stitch without review:

- State management.
- Database logic.
- Authentication logic.
- Routing logic.
- Calculation logic.
- Large components that mix too many concerns.

Recommended workflow:

```text
Stitch creates visual direction
↓
We review the screens
↓
We extract design decisions
↓
Cursor implements clean components
↓
Business logic remains separate
```

---

## 14. Security Requirements

The app must use Supabase Row Level Security before production.

### 14.1 Access boundaries

Core rules:

- Users can only access groups they belong to.
- Users can only access games that belong to their groups.
- Users can only view players in their groups.
- Private game data must not be exposed publicly.
- No service role key should ever be exposed in client-side code.
- Environment variables must be handled safely.

The service role key must not be used in the browser.

Client-side code may use only the safe public anon key together with RLS policies.

Server actions use the service role only after verifying the caller is a group member (`assertGroupMember`).

### 14.2 Group permissions (all members)

Any authenticated **group member** may (RLS: `is_group_member`):

| Action | Allowed |
|--------|---------|
| Add/remove group players | Yes |
| Create game | Yes |
| Add/remove buy-ins on active game | Yes |
| Add/remove expenses | Yes |
| Add/remove players on active game | Yes |
| Cash-out + close game | Yes |
| Finalize closed game to history | Yes |
| Delete active game (discard table) | Yes |
| Create invite / claim / game-access links | Yes |

**Owner only:** archive group, update `groups` row as owner.

**Not allowed:** access another group's data; delete finalized closed games via UI (only active discard).

Migrations: `010` (member active-game mutations), `016` (member create game), `017` (full member permissions), `018` (member delete active game).

### 14.3 Contact

Login and profile screens expose a contact email (`royalcash.pokerapp@gmail.com`) for user support.

---

## 15. Authentication Requirements

Users should authenticate with Google through Supabase Auth.

Initial auth requirements:

- Continue with Google.
- Create or load user profile after login.
- Redirect logged-in users to Groups screen.
- Redirect logged-out users to Login screen.
- Store user profile data safely.

User profile should include:

- user id
- email
- full name
- avatar url
- created at
- updated at

Do not build complex email/password auth in the first build unless needed.

Google login is the preferred initial auth method.

---

## 16. Supabase Database Requirements

The database should support:

- Users
- Groups
- Group members
- Players
- Games
- Game players
- Buy-ins
- Expenses
- Expense participants
- Cash-outs
- Game results
- Settlements

The database should be designed to support future stats from day one.

Important database principles:

- Keep raw events where possible.
- Buy-ins should be event-based.
- Expenses should be event-based.
- Cash-outs should be one final value per player per game.
- Game results can be saved as snapshots when the game closes.
- Settlements can be saved as snapshots when the game closes.
- Final balances are the source for stats, not settlements.

---

## 17. Realtime Requirements

Active games should eventually update live when:

- Players are added to the game.
- Buy-ins are added.
- Expenses are added.
- Cash-outs are entered.
- Game is closed.

Supabase Realtime should be planned, but it does not need to be implemented before the core local flow and database model are stable.

Realtime should not be added before the core data flow is clear.

Initial implementation can work with local state or standard database fetches.

Realtime can be added later in a controlled phase.

---

## 18. Future Stats Support

The database should support player and group statistics from day one, even if the advanced stats UI is implemented later.

Closed games should store enough data to calculate:

- Total profit/loss per player.
- Average result per game.
- Number of games played.
- Biggest win.
- Biggest loss.
- Win rate.
- Recent games.
- Group-level history.

Stats should be calculated from closed game results and final balances, not from settlement transfers.

Settlements are only the payment method.

Final balances are the real performance data.

Example:

```text
If Roi ends a game with finalBalance = +150,
that +150 counts toward Roi's stats.

It does not matter whether Tamar paid Roi directly
or whether several players paid Roi through settlements.
```

---

## 19. What Is In Scope For The First Build

The app should be planned for the full product, but implementation should start with the core product flow.

In scope for the first build:

1. Clean project structure.
2. Hebrew-first mobile UI foundation.
3. RTL support from the beginning.
4. Domain TypeScript types.
5. Pure calculation modules.
6. Example data for testing calculations.
7. Local state flow for the core game experience.
8. Create group flow.
9. Add group players.
10. Create game flow.
11. Select players for a game.
12. Add buy-ins and re-buys.
13. Add expenses under the Hebrew feature name "היינו רעבים".
14. Support equal split, custom split, and personal expense.
15. Enter cash-outs.
16. Calculate final balances.
17. Generate optimized settlements.
18. Share summary text.
19. Prepare Supabase schema.
20. Prepare Google Auth integration.
21. Prepare database structure for future stats.

The first build should feel like a real product, but implementation should still happen in controlled phases.

---

## 20. What Is Out Of Scope For The First Build

Do not implement these in the first build:

- Real money payment processing
- Bit payment integration
- Internal wallet
- Public club marketplace
- Public leaderboard
- Chat
- Poker odds calculator
- Poker hand calculator
- Live decision assistance
- Preflop chart tool
- Native mobile app
- Complex multi-role permissions UI
- Advanced analytics dashboard

These may be considered later only after the core app is stable.

The core app must remain focused on:

```text
Groups
Players
Games
Buy-ins
Expenses
Cash-outs
Final balances
Settlements
History
```

---

## 21. Future Tools Area

Royal Cash may later include a separate tools area for educational poker-related utilities such as preflop reference charts or hand review tools.

These tools are not part of the core settlement flow.

They should not affect the architecture of:

- Groups
- Games
- Buy-ins
- Expenses
- Cash-outs
- Settlements

Do not implement poker hand calculators, odds calculators, live decision tools, or preflop charts in the first build.

Prepare only a future navigation area if needed, but do not build these tools now.

---

## 22. Development Principles

Cursor should follow these rules:

- Do not create huge files.
- Do not mix UI, database, and calculation logic.
- Do not place settlement logic inside React components.
- Do not add features that are not requested.
- Do not over-engineer.
- Keep types clear.
- Keep files small.
- Prefer simple readable code.
- Use English for code, file names, and internal naming.
- Use Hebrew for the first user-facing UI.
- Support RTL layout.
- Keep business logic reusable.
- Implement in phases.
- Explain major architectural decisions before coding.
- Do not modify unrelated files.
- When generating code, clearly state which files are being created or changed.

---

## 23. Recommended Build Order

The recommended build order is:

1. Create clean folder structure.
2. Configure RTL and Hebrew-first UI foundation.
3. Create domain types.
4. Create calculation modules.
5. Create calculation examples/tests.
6. Create mobile-first UI shell.
7. Build local game flow:
   - create group
   - add players
   - create game
   - select players
   - add buy-ins
   - add expenses through "היינו רעבים"
   - enter cash-outs
   - calculate results
   - generate settlements
   - share summary
8. Add Supabase schema.
9. Add Supabase Auth with Google.
10. Add database integration for groups, players, and games.
11. Add Row Level Security.
12. Add Realtime.
13. Add Vercel deployment.
14. Add PWA polish.
15. Add statistics screens.
16. Consider future tools area only after the core app is stable.

---

## 24. Cursor Planning Request

Before writing code, Cursor should read this PRD and produce a technical implementation plan.

Cursor should return:

1. Recommended folder structure.
2. Core TypeScript domain models.
3. Calculation modules.
4. Supabase database schema plan.
5. Authentication plan with Google login.
6. RLS/security plan.
7. iPhone-first screen flow.
8. Hebrew-first and RTL implementation plan.
9. How to integrate design references from Stitch.
10. Development phases.
11. First exact files to create.
12. Risks that could make the codebase messy.
13. How to avoid those risks.

Cursor must not write code until the plan is approved.

## Player Account Linking and Invites

Players and authenticated users are separate entities.

A player can exist without a registered user account. This allows the host to add manual players during a game.

A player may later be linked to an authenticated user account through a secure claim invite flow.

Manual players should have:

- display_name
- optional phone
- linked_user_id = null

When the player connects their Google account through a valid invite link, the app sets:

- linked_user_id = authenticated user id

The app must prevent users from claiming the wrong player.

Player claim links should:

- be token-based
- be unique
- expire after a defined period
- be usable only once
- record who used them and when

The app should support invite links and QR codes for:

1. Joining a group.
2. Linking a manual player to a user account.
3. Opening an active game when the user has permission.

QR codes should encode secure invite URLs.