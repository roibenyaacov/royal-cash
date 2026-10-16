-- ============================================
-- "Start my count over" — a personal stats reset.
--
-- The ask: let a user zero their own running balance without touching the
-- group's history or anybody else's numbers. So nothing is deleted. A single
-- timestamp on the profile marks where that user's counting begins, and every
-- personal aggregate reads only games finalized after it. Clearing the
-- timestamp restores the full history, which makes this reversible.
--
-- Two different surfaces show these numbers and they read from different
-- places, so both have to respect the mark:
--   * the profile screen aggregates public.game_results directly (filtered in
--     TypeScript, in lib/db/profile.ts)
--   * the group podium and player sheet read the materialized
--     public.player_group_stats rows (handled here)
--
-- Also replaces reopen_game_atomic from 027 so its recompute shares one
-- implementation with the reset, and therefore honours the reset mark too —
-- otherwise reopening an old game would resurrect pre-reset totals.
--
-- Idempotent: safe to re-run.
-- ============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stats_reset_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.stats_reset_at IS
  'Personal stats only count games finalized after this. NULL = full history.';

-- ============================================
-- recompute_player_group_stats
--
-- Rebuilds the materialized totals for the given players in one group, from
-- whatever finalized games are currently visible to them. Used wherever the
-- incremental arithmetic in finalize_game_with_stats cannot simply be undone:
-- biggest_win / biggest_loss are GREATEST / LEAST and have no inverse.
--
-- A player linked to a profile with stats_reset_at set only counts games
-- finalized after that mark. Manual players have no profile and so always
-- count their full history.
--
-- Internal helper: it writes across players, so it is never granted directly.
-- Callers are SECURITY DEFINER functions that have already authorized.
-- ============================================
CREATE OR REPLACE FUNCTION public.recompute_player_group_stats(
  p_player_ids UUID[],
  p_group_id   UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.player_group_stats s
    SET games_played  = agg.games_played,
        total_balance = agg.total_balance,
        biggest_win   = agg.biggest_win,
        biggest_loss  = agg.biggest_loss,
        updated_at    = now()
    FROM (
      SELECT
        a.player_id,
        COALESCE(st.games_played,  0) AS games_played,
        COALESCE(st.total_balance, 0) AS total_balance,
        COALESCE(st.biggest_win,   0) AS biggest_win,
        COALESCE(st.biggest_loss,  0) AS biggest_loss
      FROM unnest(p_player_ids) AS a(player_id)
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)                                                  AS games_played,
          SUM(gr.final_balance)                                     AS total_balance,
          MAX(gr.final_balance) FILTER (WHERE gr.final_balance > 0) AS biggest_win,
          MIN(gr.final_balance) FILTER (WHERE gr.final_balance < 0) AS biggest_loss
        FROM public.game_results gr
        JOIN public.games    g ON g.id = gr.game_id
        JOIN public.players  pl ON pl.id = gr.player_id
        LEFT JOIN public.profiles pr ON pr.id = pl.linked_user_id
        WHERE gr.player_id   = a.player_id
          AND g.group_id     = p_group_id
          AND g.finalized_at IS NOT NULL
          AND (pr.stats_reset_at IS NULL OR g.finalized_at > pr.stats_reset_at)
      ) st ON TRUE
    ) agg
    WHERE s.player_id = agg.player_id
      AND s.group_id  = p_group_id;
$$;

REVOKE ALL ON FUNCTION public.recompute_player_group_stats(UUID[], UUID) FROM PUBLIC;

-- ============================================
-- reset_my_stats — zero the caller's own counters.
--
-- Stamps the profile and rebuilds the caller's player_group_stats rows in
-- every group they play in. Right after the stamp no finalized game is newer
-- than it, so those rows land on zero; they start filling again from the next
-- game that is closed and saved.
--
-- Nothing in game_results, settlements or games is touched, so the group
-- history and every other player's numbers are unchanged.
-- ============================================
CREATE OR REPLACE FUNCTION public.reset_my_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  v_group RECORD;
  v_player_ids UUID[];
  v_groups_reset INTEGER := 0;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  UPDATE public.profiles
    SET stats_reset_at = now()
    WHERE id = uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'profile_not_found');
  END IF;

  -- player_group_stats is keyed per group, so rebuild group by group.
  FOR v_group IN
    SELECT DISTINCT group_id
      FROM public.players
      WHERE linked_user_id = uid
  LOOP
    SELECT array_agg(id)
      INTO v_player_ids
      FROM public.players
      WHERE linked_user_id = uid
        AND group_id = v_group.group_id;

    IF v_player_ids IS NOT NULL THEN
      PERFORM public.recompute_player_group_stats(
        v_player_ids,
        v_group.group_id
      );
      v_groups_reset := v_groups_reset + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'groups_reset', v_groups_reset);
END;
$$;

REVOKE ALL ON FUNCTION public.reset_my_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_my_stats() TO authenticated;

-- ============================================
-- reopen_game_atomic — same contract as 027, now sharing the recompute so a
-- reopened game cannot resurrect totals from before a reset.
-- ============================================
CREATE OR REPLACE FUNCTION public.reopen_game_atomic(p_game_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  game_row RECORD;
  v_group_id UUID;
  v_was_finalized BOOLEAN;
  v_player_ids UUID[];
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT * INTO game_row FROM public.games WHERE id = p_game_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'game_not_found');
  END IF;

  IF NOT public.is_group_member(game_row.group_id) THEN
    RETURN jsonb_build_object('error', 'not_group_member');
  END IF;

  IF game_row.status = 'active' THEN
    RETURN jsonb_build_object('success', true, 'already_active', true);
  END IF;

  IF game_row.status <> 'closed' THEN
    RETURN jsonb_build_object('error', 'game_not_closed');
  END IF;

  v_group_id      := game_row.group_id;
  v_was_finalized := game_row.finalized_at IS NOT NULL;

  -- Capture before the delete: once game_results is gone there is no record
  -- of which players this game's stats were folded into.
  SELECT array_agg(DISTINCT player_id)
    INTO v_player_ids
    FROM public.game_results
    WHERE game_id = p_game_id;

  DELETE FROM public.group_win_records WHERE game_id = p_game_id;
  DELETE FROM public.settlements       WHERE game_id = p_game_id;
  DELETE FROM public.game_results      WHERE game_id = p_game_id;

  UPDATE public.games
    SET status       = 'active',
        closed_at    = NULL,
        finalized_at = NULL
    WHERE id = p_game_id;

  -- Only a finalized game ever reached player_group_stats.
  IF v_was_finalized AND v_player_ids IS NOT NULL THEN
    PERFORM public.recompute_player_group_stats(v_player_ids, v_group_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'was_finalized', v_was_finalized
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reopen_game_atomic(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reopen_game_atomic(UUID) TO authenticated;
