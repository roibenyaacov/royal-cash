-- ============================================
-- High priority: Realtime + spectator game view RPC
-- ============================================

-- Enable Realtime on game activity tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.buy_ins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_events;

-- Allow anonymous token validation (if not already granted)
GRANT EXECUTE ON FUNCTION public.validate_game_access(TEXT) TO anon, authenticated;

-- Full read-only game snapshot for access-token viewers
CREATE OR REPLACE FUNCTION public.get_game_view_by_access_token(access_token TEXT)
RETURNS JSONB AS $$
DECLARE
  link RECORD;
  target_game RECORD;
  players_json JSONB;
  expenses_json JSONB;
  events_json JSONB;
  results_json JSONB;
  settlements_json JSONB;
BEGIN
  SELECT * INTO link FROM public.game_access_links
    WHERE token = access_token AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_or_revoked_token');
  END IF;

  IF link.expires_at IS NOT NULL AND link.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'token_expired');
  END IF;

  SELECT * INTO target_game FROM public.games WHERE id = link.game_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_or_revoked_token');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'display_name', p.display_name,
      'total_buy_ins', COALESCE(bi.total, 0)
    ) ORDER BY p.display_name
  ), '[]'::jsonb)
  INTO players_json
  FROM public.game_players gp
  JOIN public.players p ON p.id = gp.player_id
  LEFT JOIN (
    SELECT player_id, SUM(amount)::integer AS total
    FROM public.buy_ins
    WHERE game_id = link.game_id
    GROUP BY player_id
  ) bi ON bi.player_id = p.id
  WHERE gp.game_id = link.game_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', e.id,
      'description', e.description,
      'amount', e.amount,
      'split_type', e.split_type,
      'paid_by_name', payer.display_name,
      'participants', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'player_name', part_p.display_name,
            'amount_owed', ep.amount_owed
          ) ORDER BY part_p.display_name
        )
        FROM public.expense_participants ep
        JOIN public.players part_p ON part_p.id = ep.player_id
        WHERE ep.expense_id = e.id
      ), '[]'::jsonb)
    ) ORDER BY e.created_at
  ), '[]'::jsonb)
  INTO expenses_json
  FROM public.expenses e
  JOIN public.players payer ON payer.id = e.paid_by_player_id
  WHERE e.game_id = link.game_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ge.id,
      'event_type', ge.event_type,
      'player_id', ge.player_id,
      'amount', ge.amount,
      'description', ge.description,
      'created_at', ge.created_at
    ) ORDER BY ge.created_at DESC
  ), '[]'::jsonb)
  INTO events_json
  FROM public.game_events ge
  WHERE ge.game_id = link.game_id;

  IF target_game.finalized_at IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'player_id', gr.player_id,
        'player_name', p.display_name,
        'final_balance', gr.final_balance,
        'total_buy_in', gr.total_buy_in,
        'cash_out', gr.cash_out
      ) ORDER BY gr.final_balance DESC
    ), '[]'::jsonb)
    INTO results_json
    FROM public.game_results gr
    JOIN public.players p ON p.id = gr.player_id
    WHERE gr.game_id = link.game_id;

    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'from_player_name', fp.display_name,
        'to_player_name', tp.display_name,
        'amount', s.amount
      ) ORDER BY s.amount DESC
    ), '[]'::jsonb)
    INTO settlements_json
    FROM public.settlements s
    JOIN public.players fp ON fp.id = s.from_player_id
    JOIN public.players tp ON tp.id = s.to_player_id
    WHERE s.game_id = link.game_id;
  ELSE
    results_json := '[]'::jsonb;
    settlements_json := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'game_id', target_game.id,
    'group_id', target_game.group_id,
    'game', jsonb_build_object(
      'id', target_game.id,
      'name', target_game.name,
      'date', target_game.date,
      'status', target_game.status,
      'currency', target_game.currency,
      'default_buy_in', target_game.default_buy_in,
      'finalized_at', target_game.finalized_at
    ),
    'players', players_json,
    'expenses', expenses_json,
    'events', events_json,
    'results', results_json,
    'settlements', settlements_json
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_game_view_by_access_token(TEXT) TO anon, authenticated;
