-- Profile phone column + reliable self-service profile upsert

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE OR REPLACE FUNCTION public.upsert_my_profile(
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  meta JSONB;
  auth_email TEXT;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT email, raw_user_meta_data INTO auth_email, meta
    FROM auth.users
    WHERE id = uid;

  INSERT INTO public.profiles (id, email, full_name, avatar_url, phone)
  VALUES (
    uid,
    auth_email,
    NULLIF(trim(COALESCE(p_full_name, meta->>'full_name', auth_email)), ''),
    meta->>'avatar_url',
    NULLIF(trim(COALESCE(p_phone, '')), '')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(
      NULLIF(trim(COALESCE(p_full_name, '')), ''),
      profiles.full_name
    ),
    phone = CASE
      WHEN p_phone IS NOT NULL THEN NULLIF(trim(p_phone), '')
      ELSE profiles.phone
    END,
    email = COALESCE(profiles.email, EXCLUDED.email),
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_my_profile(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_my_profile(TEXT, TEXT) TO authenticated;
