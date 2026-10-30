-- ============================================
-- A photo of your own, on the table.
--
-- Seats showed a generated character derived from the player id. That is
-- a good default, but people want their own face at their own seat.
--
-- ============================================
-- WHY THE PHOTO IS COPIED ONTO `players`
-- ============================================
-- The obvious place is `profiles.avatar_url`, but `profiles` is readable
-- only by its owner (`profiles_select_own`), and deliberately so: it
-- holds email and phone. Reading a seat's photo from there would mean
-- widening that policy to everyone sharing a group, which leaks far more
-- than a picture.
--
-- `players` is already readable by the group's members and holds nothing
-- private, so the URL is copied there. A photo is the one thing about a
-- profile that is meant to be seen by the people at the table.
--
-- ============================================
-- WHY A SEPARATE `custom_avatar_url`
-- ============================================
-- `profiles.avatar_url` already holds whatever Google handed over at
-- sign-in. Reusing it would make "has a photo" ambiguous — nobody who
-- signed in with Google ever opted into showing that picture to their
-- poker group. So an uploaded photo gets its own column, and the rule
-- stays simple: uploaded a photo, it is shown everywhere; did not, a
-- sheep. Existing Google avatars are left exactly where they are and are
-- never copied onto `players`.
--
-- Idempotent: safe to re-run.
-- ============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_avatar_url TEXT;

COMMENT ON COLUMN public.profiles.custom_avatar_url IS
  'Photo the user uploaded themselves. Distinct from avatar_url, which is whatever the OAuth provider supplied.';

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.players.avatar_url IS
  'Copy of the linked profile''s custom_avatar_url, so group members can see a seat photo without reading profiles.';

-- ============================================
-- is_own_avatar_url — only our own storage bucket counts.
--
-- Without this, a user could point their avatar at any URL on the
-- internet, and every other member of their group would have their
-- browser fetch it on sight: an IP-and-user-agent beacon aimed at the
-- rest of the table, and a way to put arbitrary remote content inside
-- other people's app. Restricting the value to this project's public
-- `avatars` bucket means a photo can only ever be a file the uploader
-- actually put there.
-- ============================================
CREATE OR REPLACE FUNCTION public.is_own_avatar_url(p_url TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_url IS NOT NULL
     AND p_url ~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/avatars/[^[:space:]]+$';
$$;

-- ============================================
-- set_my_avatar — point the caller's photo at an uploaded file, or clear
-- it with NULL.
--
-- Writes the profile and fans the URL out to every player row the caller
-- is linked to, in one transaction, so a photo never shows at one table
-- and not another.
-- ============================================
CREATE OR REPLACE FUNCTION public.set_my_avatar(p_url TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid       UUID := auth.uid();
  v_url     TEXT;
  v_players INTEGER;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  v_url := NULLIF(btrim(COALESCE(p_url, '')), '');

  IF v_url IS NOT NULL AND NOT public.is_own_avatar_url(v_url) THEN
    RETURN jsonb_build_object('error', 'invalid_avatar_url');
  END IF;

  UPDATE public.profiles
     SET custom_avatar_url = v_url
   WHERE id = uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'profile_not_found');
  END IF;

  UPDATE public.players
     SET avatar_url = v_url
   WHERE linked_user_id = uid;

  GET DIAGNOSTICS v_players = ROW_COUNT;

  RETURN jsonb_build_object(
    'success',         true,
    'cleared',         v_url IS NULL,
    'players_updated', v_players
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_my_avatar(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_my_avatar(TEXT) TO authenticated;

-- ============================================
-- Keep a newly linked player in step.
--
-- Claiming a seat happens long after a photo is set — someone uploads a
-- picture today and joins another group next month. Without this, that
-- new player row would sit at NULL and show a sheep forever, with no
-- obvious way for the user to notice or fix it.
-- ============================================
CREATE OR REPLACE FUNCTION public.sync_player_avatar_from_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.linked_user_id IS NULL THEN
    NEW.avatar_url := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT'
     OR NEW.linked_user_id IS DISTINCT FROM OLD.linked_user_id THEN
    SELECT custom_avatar_url
      INTO NEW.avatar_url
      FROM public.profiles
     WHERE id = NEW.linked_user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS players_sync_avatar ON public.players;
CREATE TRIGGER players_sync_avatar
  BEFORE INSERT OR UPDATE OF linked_user_id ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_player_avatar_from_profile();

-- ============================================
-- Storage: the `avatars` bucket.
--
-- Public read, because every member of a group has to load the photo and
-- signing a URL per seat per render buys nothing — the file is a profile
-- picture the uploader chose to show at the table.
--
-- Writes are confined to a folder named after the uploader's own user id,
-- which is what stops one user replacing another's photo.
--
-- If your Supabase project refuses the policy statements below (some
-- plans restrict DDL on storage.objects), create the bucket named
-- `avatars` from Storage in the dashboard, mark it Public, and add the
-- same four policies there.
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,                                            -- 2 MB ceiling
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "avatars_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own"   ON storage.objects;

CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
