-- ============================================
-- Owner's-eye view of the activity: who played, which tables opened,
-- how far each one got, and what was actually done at it.
--
-- Read-only reporting. Creates no table, changes no row, touches nothing
-- the app reads or writes. Idempotent: safe to re-run.
--
-- ============================================
-- WHY A SEPARATE `ops` SCHEMA, AND WHY IT MUST STAY UNEXPOSED
-- ============================================
-- These views deliberately see across every group, which is exactly what
-- an owner's report needs and exactly what no app user may have.
--
-- A view in `public` is published by PostgREST as an endpoint. A view is
-- also not a table: it does not carry row-level security of its own, and
-- unless it is declared `security_invoker` it reads its base tables as the
-- view's owner, so the RLS that protects `games`, `buy_ins` and the rest
-- does not apply. Put together, one such view in `public` would hand any
-- signed-in user every group's full ledger over the REST API.
--
-- So they live in `ops`, which is not in Supabase's exposed-schemas list
-- (`public, storage, graphql_public`), and `anon`/`authenticated` are
-- revoked from it explicitly below as a second line of defence.
--
-- Read them from the Supabase SQL editor, which runs as `postgres`.
--
-- >>> Do NOT add `ops` to Settings -> API -> Exposed schemas. <<<
-- Doing that publishes all of this to every logged-in user.
-- ============================================

CREATE SCHEMA IF NOT EXISTS ops;

COMMENT ON SCHEMA ops IS
  'Owner-only reporting views. NOT an exposed schema - must never be added to the PostgREST exposed-schemas list.';

REVOKE ALL ON SCHEMA ops FROM PUBLIC;
REVOKE ALL ON SCHEMA ops FROM anon, authenticated;

-- Dropped rather than CREATE OR REPLACE'd: replacing a view fails as soon
-- as a column is added or renamed, which would make re-running this file
-- error out instead of updating it.
DROP VIEW IF EXISTS ops.groups_recent;
DROP VIEW IF EXISTS ops.games_recent;
DROP VIEW IF EXISTS ops.game_actions;
DROP VIEW IF EXISTS ops.player_results;

-- ============================================
-- ops.groups_recent — which crews are alive, newest first.
--
-- `games_closed_unsaved` is the interesting column: a table that was
-- closed but never finalized is not in anyone's stats or records, so a
-- crew with a pile of those has people walking away without their
-- history being counted.
-- ============================================
CREATE VIEW ops.groups_recent AS
SELECT
  gr.name                                   AS group_name,
  COALESCE(ow.full_name, ow.email)          AS owner,
  m.members,
  pls.players_total,
  pls.players_active,
  gms.games_total,
  gms.games_open,
  gms.games_closed_unsaved,
  gms.games_saved,
  gms.last_game_date,
  CURRENT_DATE - gms.last_game_date         AS days_since_last_game,
  gms.last_activity_at,
  gms.lifetime_pot,
  gr.created_at                             AS group_created_at,
  gr.id                                     AS group_id
FROM public.groups gr
LEFT JOIN public.profiles ow ON ow.id = gr.owner_id
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS members
    FROM public.group_members x
   WHERE x.group_id = gr.id
) m ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int                                AS players_total,
         COUNT(*) FILTER (WHERE x.is_active)::int     AS players_active
    FROM public.players x
   WHERE x.group_id = gr.id
) pls ON TRUE
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int                                                        AS games_total,
    COUNT(*) FILTER (WHERE x.status = 'active')::int                     AS games_open,
    COUNT(*) FILTER (
      WHERE x.status <> 'active' AND x.finalized_at IS NULL
    )::int                                                               AS games_closed_unsaved,
    COUNT(*) FILTER (WHERE x.finalized_at IS NOT NULL)::int              AS games_saved,
    MAX(x.date)                                                          AS last_game_date,
    MAX(GREATEST(
      x.created_at,
      COALESCE(x.closed_at,    x.created_at),
      COALESCE(x.finalized_at, x.created_at)
    ))                                                                   AS last_activity_at,
    COALESCE(SUM(pot.amount), 0)::bigint                                 AS lifetime_pot
  FROM public.games x
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(b.amount), 0)::bigint AS amount
      FROM public.buy_ins b
     WHERE b.game_id = x.id
  ) pot ON TRUE
  WHERE x.group_id = gr.id
) gms ON TRUE
ORDER BY gms.last_activity_at DESC NULLS LAST;

COMMENT ON VIEW ops.groups_recent IS
  'One row per group: size, how many tables it ran, how far they got, when it last played.';

-- ============================================
-- ops.games_recent — every table, and where it got to.
--
-- `stage` is the lifecycle in one column:
--   open            - still being played (status = 'active')
--   closed_unsaved  - cashed out and settled, but never finalized, so it
--                     is absent from the group's stats and records
--   saved           - finalized and counted
--
-- `pot_gap` is cash-outs minus buy-ins. On a table that balanced it is 0;
-- anything else means the chips on the screen never matched the money,
-- which is the first thing to look at when a settlement looks wrong.
-- ============================================
CREATE VIEW ops.games_recent AS
SELECT
  gr.name    AS group_name,
  g.name     AS game_name,
  g.date     AS game_date,
  CASE
    WHEN g.status = 'active'          THEN 'open'
    WHEN g.finalized_at IS NOT NULL   THEN 'saved'
    ELSE                                   'closed_unsaved'
  END::text  AS stage,
  CASE
    WHEN g.status = 'active'          THEN 'פתוח — עוד משחקים'
    WHEN g.finalized_at IS NOT NULL   THEN 'נסגר ונשמר להיסטוריה'
    ELSE                                   'נסגר — לא נשמר להיסטוריה'
  END::text  AS stage_he,
  seats.seated,
  seats.with_buy_ins,
  bi.buy_in_count,
  bi.pot,
  co.cash_out_players,
  co.cash_out_total,
  co.cash_out_total - bi.pot            AS pot_gap,
  ex.expense_count,
  ex.expense_total,
  res.result_rows,
  st.settlement_count,
  ev.event_count,
  g.currency,
  g.default_buy_in,
  g.management_mode,
  COALESCE(op.full_name, op.email)      AS opened_by,
  g.created_at                          AS opened_at,
  g.closed_at,
  g.finalized_at,
  g.closed_at - g.created_at            AS open_for,
  act.last_action_at,
  g.id                                  AS game_id
FROM public.games g
JOIN public.groups gr   ON gr.id = g.group_id
LEFT JOIN public.profiles op ON op.id = g.created_by
LEFT JOIN LATERAL (
  -- `seated` is everyone added to the table; `with_buy_ins` is everyone
  -- who actually put money in, which is the roster the app settles on.
  SELECT
    COUNT(*)::int AS seated,
    COUNT(*) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM public.buy_ins b
         WHERE b.game_id = g.id AND b.player_id = gp.player_id
      )
    )::int        AS with_buy_ins
  FROM public.game_players gp
  WHERE gp.game_id = g.id
) seats ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int                      AS buy_in_count,
         COALESCE(SUM(b.amount), 0)::bigint  AS pot
    FROM public.buy_ins b
   WHERE b.game_id = g.id
) bi ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int                      AS cash_out_players,
         COALESCE(SUM(c.amount), 0)::bigint  AS cash_out_total
    FROM public.cash_outs c
   WHERE c.game_id = g.id
) co ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int                      AS expense_count,
         COALESCE(SUM(e.amount), 0)::bigint  AS expense_total
    FROM public.expenses e
   WHERE e.game_id = g.id
) ex ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS result_rows
    FROM public.game_results r
   WHERE r.game_id = g.id
) res ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS settlement_count
    FROM public.settlements s
   WHERE s.game_id = g.id
) st ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS event_count
    FROM public.game_events x
   WHERE x.game_id = g.id
) ev ON TRUE
LEFT JOIN LATERAL (
  SELECT MAX(at) AS last_action_at
    FROM (
      SELECT MAX(b.created_at)  AS at FROM public.buy_ins b     WHERE b.game_id  = g.id
      UNION ALL
      SELECT MAX(c.updated_at)        FROM public.cash_outs c   WHERE c.game_id  = g.id
      UNION ALL
      SELECT MAX(e.created_at)        FROM public.expenses e    WHERE e.game_id  = g.id
      UNION ALL
      SELECT MAX(x.created_at)        FROM public.game_events x WHERE x.game_id  = g.id
      UNION ALL
      SELECT g.created_at
    ) s
) act ON TRUE
ORDER BY COALESCE(act.last_action_at, g.created_at) DESC;

COMMENT ON VIEW ops.games_recent IS
  'One row per table: stage, roster, pot, cash-outs, expenses, and whether the money balanced.';

-- ============================================
-- ops.game_actions — what they actually did, newest first.
--
-- Built from the rows themselves rather than from `game_events`, because
-- the log only covers buy-ins and expenses: cash-outs and the table's own
-- lifecycle are not in it. `game_events` is still read for the three
-- things that leave no row behind — a removed buy-in, and an edited or
-- deleted expense — so a correction shows up here instead of the ledger
-- just quietly changing.
-- ============================================
CREATE VIEW ops.game_actions AS
WITH acts AS (
  SELECT g.id          AS game_id,
         g.created_at   AS at,
         'game_opened'::text AS action,
         NULL::uuid     AS player_id,
         NULL::int      AS amount,
         NULL::text     AS note,
         g.created_by   AS by_user
    FROM public.games g

  UNION ALL
  SELECT b.game_id, b.created_at, 'buy_in',
         b.player_id, b.amount, b.note, b.created_by
    FROM public.buy_ins b

  UNION ALL
  -- A cash-out is one row per player that gets overwritten, so this is
  -- the latest value, not every correction along the way.
  SELECT c.game_id, c.updated_at, 'cash_out',
         c.player_id, c.amount, NULL, c.created_by
    FROM public.cash_outs c

  UNION ALL
  SELECT e.game_id, e.created_at, 'expense',
         e.paid_by_player_id, e.amount, e.description, e.created_by
    FROM public.expenses e

  UNION ALL
  SELECT ge.game_id, ge.created_at, ge.event_type,
         ge.player_id, ge.amount, ge.description, ge.created_by
    FROM public.game_events ge
   WHERE ge.event_type IN ('buy_in_removed', 'expense_updated', 'expense_removed')

  UNION ALL
  SELECT g.id, g.closed_at, 'game_closed', NULL, NULL, NULL, g.created_by
    FROM public.games g
   WHERE g.closed_at IS NOT NULL

  UNION ALL
  SELECT g.id, g.finalized_at, 'game_saved', NULL, NULL, NULL, g.created_by
    FROM public.games g
   WHERE g.finalized_at IS NOT NULL
)
SELECT
  gr.name  AS group_name,
  gm.name  AS game_name,
  gm.date  AS game_date,
  a.at     AS happened_at,
  a.action,
  CASE a.action
    WHEN 'game_opened'     THEN 'שולחן נפתח'
    WHEN 'buy_in'          THEN 'כניסה'
    WHEN 'buy_in_removed'  THEN 'ביטול כניסה'
    WHEN 'cash_out'        THEN 'יציאה עם כסף'
    WHEN 'expense'         THEN 'הוצאה'
    WHEN 'expense_updated' THEN 'עדכון הוצאה'
    WHEN 'expense_removed' THEN 'מחיקת הוצאה'
    WHEN 'game_closed'     THEN 'השולחן נסגר'
    WHEN 'game_saved'      THEN 'נשמר להיסטוריה'
    ELSE a.action
  END::text AS action_he,
  pl.display_name                   AS player_name,
  a.amount,
  a.note,
  COALESCE(pr.full_name, pr.email)  AS done_by,
  gm.id                             AS game_id
FROM acts a
JOIN public.games  gm ON gm.id = a.game_id
JOIN public.groups gr ON gr.id = gm.group_id
LEFT JOIN public.players  pl ON pl.id = a.player_id
LEFT JOIN public.profiles pr ON pr.id = a.by_user
ORDER BY a.at DESC;

COMMENT ON VIEW ops.game_actions IS
  'Flat timeline of every action at every table: opened, buy-ins, cash-outs, expenses, corrections, closed, saved.';

-- ============================================
-- ops.player_results — the money, per player per table.
--
-- `final_balance` is only there once a table has been closed: it comes
-- from the `game_results` snapshot, not recomputed here, so what this
-- shows is exactly what the app settled on.
-- ============================================
CREATE VIEW ops.player_results AS
SELECT
  gr.name            AS group_name,
  g.name             AS game_name,
  g.date             AS game_date,
  CASE
    WHEN g.status = 'active'        THEN 'open'
    WHEN g.finalized_at IS NOT NULL THEN 'saved'
    ELSE                                 'closed_unsaved'
  END::text          AS stage,
  pl.display_name    AS player,
  pl.is_active       AS on_group_roster,
  pl.linked_user_id IS NOT NULL AS has_app_account,
  bi.buy_in_count,
  bi.buy_in_total,
  c.amount           AS cash_out,
  r.game_net,
  r.expense_credit,
  r.expense_debt,
  r.final_balance,
  g.id               AS game_id
FROM public.game_players gp
JOIN public.games   g  ON g.id  = gp.game_id
JOIN public.groups  gr ON gr.id = g.group_id
JOIN public.players pl ON pl.id = gp.player_id
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int                     AS buy_in_count,
         COALESCE(SUM(b.amount), 0)::bigint AS buy_in_total
    FROM public.buy_ins b
   WHERE b.game_id = g.id AND b.player_id = pl.id
) bi ON TRUE
LEFT JOIN public.cash_outs    c ON c.game_id = g.id AND c.player_id = pl.id
LEFT JOIN public.game_results r ON r.game_id = g.id AND r.player_id = pl.id
ORDER BY g.date DESC, gr.name, pl.display_name;

COMMENT ON VIEW ops.player_results IS
  'One row per player per table: buy-ins, cash-out, and the stored final balance.';

-- ============================================
-- Belt and braces: the views are owned by the role that created them
-- (postgres in the SQL editor), so make sure the API roles cannot read
-- them even if `ops` were ever exposed by mistake.
-- ============================================
REVOKE ALL ON ALL TABLES IN SCHEMA ops FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA ops FROM anon, authenticated;


-- ============================================
-- Ready-made queries. Run any of these after this file.
-- ============================================
--
-- Crews that played in the last 60 days:
--   SELECT * FROM ops.groups_recent WHERE days_since_last_game <= 60;
--
-- Every table of the last 30 days and where it got to:
--   SELECT group_name, game_name, game_date, stage_he, with_buy_ins,
--          pot, cash_out_total, pot_gap, expense_total, opened_by
--     FROM ops.games_recent
--    WHERE game_date >= CURRENT_DATE - 30;
--
-- Tables still open right now:
--   SELECT group_name, game_name, game_date, with_buy_ins, pot,
--          last_action_at
--     FROM ops.games_recent WHERE stage = 'open';
--
-- Closed but never saved to history (missing from everyone's stats):
--   SELECT group_name, game_name, game_date, closed_at
--     FROM ops.games_recent WHERE stage = 'closed_unsaved';
--
-- Tables where the money did not balance:
--   SELECT group_name, game_name, game_date, pot, cash_out_total, pot_gap
--     FROM ops.games_recent
--    WHERE stage <> 'open' AND pot_gap <> 0;
--
-- Everything that happened in the last week:
--   SELECT happened_at, group_name, game_name, action_he, player_name,
--          amount, note, done_by
--     FROM ops.game_actions
--    WHERE happened_at >= now() - INTERVAL '7 days';
--
-- The full story of one table:
--   SELECT happened_at, action_he, player_name, amount, note, done_by
--     FROM ops.game_actions
--    WHERE game_id = '<game_id>'
--    ORDER BY happened_at;
--
-- Who won and lost at the recent tables:
--   SELECT game_date, group_name, game_name, player, buy_in_total,
--          cash_out, final_balance
--     FROM ops.player_results
--    WHERE stage <> 'open' AND game_date >= CURRENT_DATE - 30
--    ORDER BY game_date DESC, final_balance DESC;
--
-- ============================================
