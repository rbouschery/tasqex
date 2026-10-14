-- Upgrade databases created before organization invites.
-- Fresh installs already have this shape in the initial schema; each step is idempotent.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum AS enum_value
    JOIN pg_type AS enum_type ON enum_type.oid = enum_value.enumtypid
    JOIN pg_namespace AS enum_namespace ON enum_namespace.oid = enum_type.typnamespace
    WHERE enum_namespace.nspname = 'public'
      AND enum_type.typname = 'user_role'
      AND enum_value.enumlabel = 'agent'
  ) THEN
    ALTER TYPE public.user_role RENAME VALUE 'agent' TO 'member';
  END IF;
END $$;

ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'member';

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

ALTER TABLE public.users ALTER COLUMN active SET DEFAULT false;

UPDATE public.users SET active = true WHERE active IS NULL;

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS organizations_singleton_idx
  ON public.organizations ((true));

CREATE TABLE IF NOT EXISTS public.organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.user_role NOT NULL DEFAULT 'member',
  token text NOT NULL UNIQUE,
  invited_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_invites_pending_email_idx
  ON public.organization_invites (email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS organization_invites_token_idx
  ON public.organization_invites (token);

INSERT INTO public.organizations (name)
SELECT 'Workspace'
WHERE NOT EXISTS (SELECT 1 FROM public.organizations);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organizations'
      AND policyname = 'organizations_select_authenticated'
  ) THEN
    CREATE POLICY organizations_select_authenticated ON public.organizations
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, username, email, role, active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_app_meta_data ->> 'role')::public.user_role, 'member'),
    COALESCE((NEW.raw_app_meta_data ->> 'role') = 'admin', false)
  );
  RETURN NEW;
END;
$$;
