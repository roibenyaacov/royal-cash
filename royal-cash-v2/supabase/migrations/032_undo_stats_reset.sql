-- ============================================
-- Undo a personal stats reset.
--
-- `reset_my_stats` was built so that nothing is destroyed: it stamps
-- `profiles.stats_reset_at` and every personal aggregate from then on
-- only counts games finalized after the stamp. `game_results`,
-- `settlements` and `games` are never touched, so the whole history is
-- still there — it is simply being filtered out.
--
-- That made the reset reversible in principle, but there was no way to
-- reverse it from inside the app: clearing the stamp needed SQL. A reset
-- is one tap behind a confirm sheet, and "I meant to and now I want it
-- back" is an entirely reasonable thing to happen, so the way back
-- belongs next to the way in.
--
-- This clears the stamp and rebuilds the caller's aggregates from their
-- full finalized history, through the same `recompute_player_group_stats`
-- helper the reset itself uses — so the two are exact mirrors and cannot
-- drift into disagreement.
--
-- Idempotent: running it with no stamp set simply recomputes, which is a
-- no-op against correct data.
-- ============================================

CREATE OR REPLACE FUNCTION public.undo_my_stats_reset()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid              UUID := auth.uid();
  v_group          RECORD;
  v_player_ids     UUID[];
  v_groups_rebuilt INTEGER := 0;
  v_had_reset      BOOLEAN;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT stats_reset_at IS NOT NULL
    INTO v_had_reset
    FROM public.profiles
   WHERE id = uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'profile_not_found');
  END IF;

  UPDATE public.profiles
     SET stats_reset_at = NULL
   WHERE id = uid;

  -- player_group_stats is keyed per group, so rebuild group by group.
  -- With the stamp gone, recompute_player_group_stats counts the caller's
  -- entire finalized history again.
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
      v_groups_rebuilt := v_groups_rebuilt + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success',        true,
    'had_reset',      v_had_reset,
    'groups_rebuilt', v_groups_rebuilt
  );
END;
$$;

REVOKE ALL ON FUNCTION public.undo_my_stats_reset() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.undo_my_stats_reset() TO authenticated;
