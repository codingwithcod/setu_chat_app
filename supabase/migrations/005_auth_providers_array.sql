-- ============================================
-- Migration: auth_provider TEXT → auth_providers TEXT[]
-- ============================================

-- 1. Add new array column
ALTER TABLE public.profiles
  ADD COLUMN auth_providers TEXT[] NOT NULL DEFAULT ARRAY['email'];

-- 2. Migrate existing data from old column
UPDATE public.profiles SET auth_providers = ARRAY[auth_provider];

-- 3. Drop old singular column
ALTER TABLE public.profiles DROP COLUMN auth_provider;

-- 4. Update the handle_new_user trigger to use auth_providers array
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, avatar_url, auth_providers, is_email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    CASE
      WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN ARRAY['google']
      ELSE ARRAY['email']
    END,
    CASE
      WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN true
      ELSE false
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
