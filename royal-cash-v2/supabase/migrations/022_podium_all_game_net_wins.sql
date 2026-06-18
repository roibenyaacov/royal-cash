-- Podium: store every positive game_net (poker win, before food), not only record breakers.

-- Backfill missing rows from finalized games.
INSERT INTO public.group_win_records (group_id, player_id, game_id, amount, achieved_at)
SELECT g.group_id, gr.player_id, gr.game_id, gr.game_net, g.finalized_at
FROM public.game_results gr
JOIN public.games g ON g.id = gr.game_id
WHERE gr.game_net > 0
  AND g.finalized_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.group_win_records wr
    WHERE wr.game_id = gr.game_id
      AND wr.player_id = gr.player_id
  );

CREATE OR REPLACE FUNCTION public.finalize_game_with_stats(
  p_game_id  UUID,
  p_group_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  game_row RECORD;
  win_row RECORD;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  IF NOT public.is_group_member(p_group_id) THEN
    RETURN jsonb_build_object('error', 'not_group_member');
  END IF;

  SELECT * INTO game_row FROM public.games WHERE id = p_game_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'game_not_found');
  END IF;
  IF game_row.group_id <> p_group_id THEN
    RETURN jsonb_build_object('error', 'invalid_group');
  END IF;
  IF game_row.status <> 'closed' THEN
    RETURN jsonb_build_object('error', 'game_not_closed');
  END IF;
  IF game_row.finalized_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already_finalized', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.game_results WHERE game_id = p_game_id) THEN
    RETURN jsonb_build_object('error', 'no_results');
  END IF;

  UPDATE public.games
    SET finalized_at = now()
    WHERE id = p_game_id;

  WITH new_stats AS (
    SELECT
      gr.player_id,
      p_group_id AS group_id,
      COALESCE(s.games_played, 0) + 1 AS games_played,
      COALESCE(s.total_balance, 0) + gr.final_balance AS total_balance,
      GREATEST(
        COALESCE(s.biggest_win, 0),
        CASE WHEN gr.final_balance > 0 THEN gr.final_balance ELSE 0 END
      ) AS biggest_win,
      LEAST(
        COALESCE(s.biggest_loss, 0),
        CASE WHEN gr.final_balance < 0 THEN gr.final_balance ELSE 0 END
      ) AS biggest_loss
    FROM public.game_results gr
    LEFT JOIN public.player_group_stats s
      ON s.player_id = gr.player_id
     AND s.group_id  = p_group_id
    WHERE gr.game_id = p_game_id
  )
  INSERT INTO public.player_group_stats (
    player_id, group_id, games_played, total_balance,
    biggest_win, biggest_loss
  )
  SELECT player_id, group_id, games_played, total_balance,
         biggest_win, biggest_loss
  FROM new_stats
  ON CONFLICT (player_id, group_id) DO UPDATE SET
    games_played  = EXCLUDED.games_played,
    total_balance = EXCLUDED.total_balance,
    biggest_win   = EXCLUDED.biggest_win,
    biggest_loss  = EXCLUDED.biggest_loss,
    updated_at    = now();

  FOR win_row IN
    SELECT player_id, game_net
      FROM public.game_results
      WHERE game_id = p_game_id AND game_net > 0
  LOOP
    IF EXISTS (
      SELECT 1
      FROM public.group_win_records
      WHERE game_id = p_game_id
        AND player_id = win_row.player_id
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.group_win_records (group_id, player_id, game_id, amount)
      VALUES (p_group_id, win_row.player_id, p_game_id, win_row.game_net);
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_game_with_stats(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_game_with_stats(UUID, UUID) TO authenticated;
