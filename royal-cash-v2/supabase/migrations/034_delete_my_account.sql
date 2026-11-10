-- ============================================
-- Deleting your own account, for real.
--
-- Apple's App Store review guideline 5.1.1(v) requires that an app which
-- lets you create an account also lets you delete it from inside the app.
-- Hiding the option behind an email to support is an automatic rejection.
--
-- ============================================
-- WHAT GETS DELETED, AND WHAT DELIBERATELY DOES NOT
-- ============================================
-- Deleted: the auth identity, the profile row, and everything personal on
-- it — email, name, phone, uploaded photo — plus every group membership.
-- After this the account is gone; signing in with the same Google account
-- produces a brand new, empty one.
--
-- Kept: the groups' shared ledger. A game, its buy-ins and its settlements
-- are not one player's record, they are the evening the whole table played.
-- Erasing them because one person left would silently rewrite everyone
-- else's history and break balances that other people settled against.
-- The departing user's seats are unlinked instead, so the name stays on
-- past games and nothing points back at a person any more.
--
-- Guideline 5.1.1(v) asks for the account and its personal data, not for
-- other people's records, so this is both correct and compliant.
--
-- ============================================
-- WHY THE FOREIGN KEYS HAVE TO CHANGE FIRST
-- ============================================
-- Every ledger table carries `created_by NOT NULL REFERENCES profiles(id)`
-- with no delete rule, which is NO ACTION. That means deleting a profile
-- fails outright as soon as that person has opened a single game — the
-- account deletion would error instead of running.
--
-- So the authorship columns become nullable and ON DELETE SET NULL. No row
-- is removed by this change and no value is overwritten; the only thing
-- that happens, and only at deletion time, is that a row stops naming a
-- person who no longer exists. `players.linked_user_id` gets the same
-- treatment, which is exactly the unlinking described above.
--
-- Idempotent: safe to re-run.
-- ============================================

-- ============================================
-- Rewrite the authorship foreign keys.
--
-- The constraint names are discovered rather than guessed: a guessed name
-- that does not match leaves the old blocking rule quietly in place, and
-- the account deletion then fails in production instead of here.
-- ============================================
DO $$
DECLARE
  target RECORD;
  v_conname TEXT;
BEGIN
  FOR target IN
    SELECT * FROM (VALUES
      ('games',                'created_by'),
      ('buy_ins',              'created_by'),
      ('expenses',             'created_by'),
      ('cash_outs',            'created_by'),
      ('game_events',          'created_by'),
      ('player_claim_invites', 'created_by'),
      ('player_claim_invites', 'claimed_by'),
      ('group_invites',        'created_by'),
      ('game_access_links',    'created_by'),
      ('players',              'linked_user_id')
    ) AS t(tbl, col)
  LOOP
    -- Skip anything this database does not have, so the file still runs
    -- on a project that is a migration or two behind.
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name   = target.tbl
         AND column_name  = target.col
    );

    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN %I DROP NOT NULL',
      target.tbl, target.col
    );

    SELECT con.conname INTO v_conname
      FROM pg_constraint con
      JOIN pg_class      rel ON rel.oid = con.conrelid
      JOIN pg_namespace  nsp ON nsp.oid = rel.relnamespace
     WHERE nsp.nspname = 'public'
       AND rel.relname = target.tbl
       AND con.contype = 'f'
       AND con.conkey = ARRAY[(
             SELECT attnum FROM pg_attribute
              WHERE attrelid = rel.oid AND attname = target.col
           )]::smallint[]
     LIMIT 1;

    IF v_conname IS NULL THEN
      CONTINUE;
    END IF;

    -- Already SET NULL from an earlier run of this file.
    CONTINUE WHEN (
      SELECT con.confdeltype FROM pg_constraint con WHERE con.conname = v_conname
    ) = 'n';

    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT %I', target.tbl, v_conname
    );
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I
         FOREIGN KEY (%I) REFERENCES public.profiles(id) ON DELETE SET NULL',
      target.tbl, v_conname, target.col
    );
  END LOOP;
END $$;

-- ============================================
-- delete_my_account — the caller erases themselves.
--
-- Returns a summary rather than raising, so the app can tell the user what
-- happened to the groups they owned instead of just succeeding silently.
-- ============================================
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid              UUID := auth.uid();
  g                RECORD;
  v_heir           UUID;
  v_transferred    INTEGER := 0;
  v_groups_deleted INTEGER := 0;
  v_unlinked       INTEGER := 0;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  -- ------------------------------------------------
  -- Groups the caller owns.
  --
  -- `groups.owner_id` stays NOT NULL on purpose: a group with nobody in
  -- charge can never be renamed, archived or have a player removed again.
  -- So ownership moves to the longest-standing remaining member. Only a
  -- group with no other member at all is deleted, and that one is the
  -- caller's own and nobody else's history.
  -- ------------------------------------------------
  FOR g IN SELECT id FROM public.groups WHERE owner_id = uid
  LOOP
    SELECT gm.user_id INTO v_heir
      FROM public.group_members gm
     WHERE gm.group_id = g.id
       AND gm.user_id <> uid
     ORDER BY gm.created_at ASC
     LIMIT 1;

    IF v_heir IS NULL THEN
      DELETE FROM public.groups WHERE id = g.id;
      v_groups_deleted := v_groups_deleted + 1;
    ELSE
      UPDATE public.groups SET owner_id = v_heir, updated_at = now()
       WHERE id = g.id;

      UPDATE public.group_members SET role = 'owner'
       WHERE group_id = g.id AND user_id = v_heir;

      v_transferred := v_transferred + 1;
    END IF;
  END LOOP;

  -- ------------------------------------------------
  -- Unlink the seats. The display name and every past result stay with
  -- the group; the pointer back to a person does not.
  -- ------------------------------------------------
  UPDATE public.players
     SET linked_user_id = NULL,
         avatar_url     = NULL,
         phone          = NULL,
         updated_at     = now()
   WHERE linked_user_id = uid;

  GET DIAGNOSTICS v_unlinked = ROW_COUNT;

  DELETE FROM public.group_members WHERE user_id = uid;

  -- ------------------------------------------------
  -- The identity itself. The cascade from auth.users removes the profile
  -- row with its email, name, phone and photo, and the SET NULL rules
  -- added above let the ledger keep its rows without naming anyone.
  -- ------------------------------------------------
  DELETE FROM auth.users WHERE id = uid;

  RETURN jsonb_build_object(
    'success',          true,
    'groups_transferred', v_transferred,
    'groups_deleted',     v_groups_deleted,
    'players_unlinked',   v_unlinked
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

COMMENT ON FUNCTION public.delete_my_account() IS
  'Erases the calling user: auth identity, profile and memberships. Hands owned groups to the next member, keeps the shared ledger, unlinks the seats.';

-- ============================================
-- Before deleting your own account, this shows what it would do.
--
--   SELECT
--     (SELECT COUNT(*) FROM public.groups
--       WHERE owner_id = auth.uid())                    AS groups_owned,
--     (SELECT COUNT(*) FROM public.players
--       WHERE linked_user_id = auth.uid())              AS seats_linked;
-- ============================================
