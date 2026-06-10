-- Self-link: group member connects their Google account to an existing unlinked player.
-- Replaces an auto-created linked player in the same group when that player has no finalized games.

CREATE OR REPLACE FUNCTION public.link_player_to_self(p_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target public.players%ROWTYPE;
  uid UUID := auth.uid();
  existing_linked_id UUID;
  existing_has_games BOOLEAN;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT * INTO target
    FROM public.players
    WHERE id = p_player_id
      AND is_active = true
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'player_not_found');
  END IF;

  IF NOT public.is_group_member(target.group_id) THEN
    RETURN jsonb_build_object('error', 'not_group_member');
  END IF;

  IF target.linked_user_id IS NOT NULL THEN
    IF target.linked_user_id = uid THEN
      RETURN jsonb_build_object(
        'success', true,
        'group_id', target.group_id,
        'already_linked', true
      );
    END IF;
    RETURN jsonb_build_object('error', 'player_already_linked');
  END IF;

  SELECT id INTO existing_linked_id
    FROM public.players
    WHERE group_id = target.group_id
      AND linked_user_id = uid
      AND id != p_player_id
      AND is_active = true
    LIMIT 1;

  IF existing_linked_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
        FROM public.game_results gr
        JOIN public.games g ON g.id = gr.game_id
        WHERE gr.player_id = existing_linked_id
          AND g.finalized_at IS NOT NULL
    ) INTO existing_has_games;

    IF existing_has_games THEN
      RETURN jsonb_build_object('error', 'user_already_linked_in_group');
    END IF;

    UPDATE public.players
      SET linked_user_id = NULL,
          is_active = false,
          removed_at = now()
      WHERE id = existing_linked_id;
  END IF;

  UPDATE public.players
    SET linked_user_id = uid
    WHERE id = p_player_id;

  RETURN jsonb_build_object('success', true, 'group_id', target.group_id);
END;
$$;

REVOKE ALL ON FUNCTION public.link_player_to_self(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_player_to_self(UUID) TO authenticated;
