-- Initial schema
-- Pre-launch OSS baseline. Runtime bootstrap/demo rows stay in supabase/seed.sql.

-- Enums
CREATE TYPE public.user_role AS ENUM ('admin', 'agent');
CREATE TYPE public.ticket_kind AS ENUM ('task');
CREATE TYPE public.ticket_origin AS ENUM ('manual', 'api');
CREATE TYPE public.custom_field_group AS ENUM ('ticket', 'contact');
CREATE TYPE public.custom_field_type AS ENUM (
  'text', 'number', 'date', 'boolean', 'select', 'url', 'json', 'multiselect'
);
CREATE TYPE public.custom_field_entity_type AS ENUM ('ticket', 'contact');
CREATE TYPE public.comment_author_type AS ENUM ('agent', 'api_key');

-- Core app tables
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username text NOT NULL,
  email text NOT NULL,
  role public.user_role NOT NULL DEFAULT 'agent',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.status_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  position int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_visible boolean NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX status_types_position_unique ON public.status_types (position);

CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#64748b',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  kind public.ticket_kind NOT NULL DEFAULT 'task',
  body text,
  contact_id uuid REFERENCES public.contacts (id) ON DELETE RESTRICT,
  status_id uuid NOT NULL REFERENCES public.status_types (id) ON DELETE RESTRICT,
  assignee_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  origin public.ticket_origin NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tickets_contact_id_idx ON public.tickets (contact_id);
CREATE INDEX tickets_status_id_idx ON public.tickets (status_id);
CREATE INDEX tickets_assignee_id_idx ON public.tickets (assignee_id);
CREATE INDEX tickets_created_at_idx ON public.tickets (created_at);
CREATE INDEX tickets_updated_at_idx ON public.tickets (updated_at);

CREATE TABLE public.ticket_tags (
  ticket_id uuid NOT NULL REFERENCES public.tickets (id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags (id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, tag_id)
);

CREATE TABLE public.custom_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "group" public.custom_field_group NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  type public.custom_field_type NOT NULL,
  options jsonb,
  required boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  show_open_in_ticket boolean NOT NULL DEFAULT false,
  UNIQUE ("group", key)
);

CREATE TABLE public.custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id uuid NOT NULL REFERENCES public.custom_field_definitions (id) ON DELETE CASCADE,
  entity_type public.custom_field_entity_type NOT NULL,
  entity_id uuid NOT NULL,
  value_text text,
  value_number numeric,
  value_date date,
  value_boolean boolean,
  value_json jsonb,
  UNIQUE (field_id, entity_type, entity_id)
);

CREATE INDEX custom_field_values_field_text_idx
  ON public.custom_field_values (field_id, value_text)
  WHERE value_text IS NOT NULL;

CREATE TABLE public.global_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  visible_status_ids uuid[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  ticket_field_visibility jsonb NOT NULL DEFAULT '{}'::jsonb,
  copy_context jsonb NOT NULL DEFAULT '{
    "visible": true,
    "append_contact": true,
    "append_contact_custom_fields": true,
    "append_custom_fields": true,
    "prepend_text": ""
  }'::jsonb,
  comment_thread_order text NOT NULL DEFAULT 'oldest_first'
    CHECK (comment_thread_order IN ('oldest_first', 'newest_first'))
);

CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.board_lane_orders (
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  status_id uuid NOT NULL REFERENCES public.status_types (id) ON DELETE CASCADE,
  ticket_ids uuid[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, status_id)
);

CREATE INDEX board_lane_orders_user_id_idx ON public.board_lane_orders (user_id);

CREATE TABLE public.ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets (id) ON DELETE CASCADE,
  body text NOT NULL,
  author_type public.comment_author_type NOT NULL,
  author_id uuid REFERENCES public.users (id) ON DELETE RESTRICT,
  api_key_id uuid REFERENCES public.api_keys (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ticket_comments_author_shape_check CHECK (
    (author_type = 'agent' AND author_id IS NOT NULL AND api_key_id IS NULL)
    OR (author_type = 'api_key' AND author_id IS NULL AND api_key_id IS NOT NULL)
  )
);

CREATE INDEX ticket_comments_ticket_id_created_at_idx
  ON public.ticket_comments (ticket_id, created_at, id);

-- Functions and triggers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, username, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_app_meta_data ->> 'role')::public.user_role, 'agent')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER global_settings_updated_at
  BEFORE UPDATE ON public.global_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.reorder_status_types(ordered_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expected_count int;
BEGIN
  SELECT count(*)::int INTO expected_count FROM public.status_types;

  IF ordered_ids IS NULL OR array_length(ordered_ids, 1) IS DISTINCT FROM expected_count THEN
    RAISE EXCEPTION 'ids must include every status exactly once';
  END IF;

  IF (
    SELECT count(DISTINCT id)
    FROM unnest(ordered_ids) AS wanted(id)
  ) IS DISTINCT FROM expected_count THEN
    RAISE EXCEPTION 'ids must include every status exactly once';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(ordered_ids) AS wanted(id)
    LEFT JOIN public.status_types AS st ON st.id = wanted.id
    WHERE st.id IS NULL
  ) THEN
    RAISE EXCEPTION 'ids must include every status exactly once';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('reorder_status_types'));

  -- Shift every row out of the 0..n-1 range so final assignment cannot collide.
  UPDATE public.status_types AS st
  SET position = st.position + 1000000
  WHERE st.id IS NOT NULL;

  UPDATE public.status_types AS st
  SET position = ord.idx - 1
  FROM (
    SELECT id, ordinality AS idx
    FROM unnest(ordered_ids) WITH ORDINALITY AS t(id)
  ) AS ord
  WHERE st.id = ord.id;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_status_types(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_status_types(uuid[]) TO service_role;

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_lane_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_authenticated ON public.users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY contacts_select_authenticated ON public.contacts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY status_types_select_authenticated ON public.status_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY tags_select_authenticated ON public.tags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY tickets_select_authenticated ON public.tickets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY ticket_tags_select_authenticated ON public.ticket_tags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY custom_field_definitions_select_authenticated
  ON public.custom_field_definitions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY custom_field_values_select_authenticated ON public.custom_field_values
  FOR SELECT TO authenticated USING (true);

CREATE POLICY global_settings_select_authenticated ON public.global_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY board_lane_orders_select_authenticated ON public.board_lane_orders
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY board_lane_orders_insert_authenticated ON public.board_lane_orders
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY board_lane_orders_update_authenticated ON public.board_lane_orders
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY board_lane_orders_delete_authenticated ON public.board_lane_orders
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY ticket_comments_select_authenticated ON public.ticket_comments
  FOR SELECT TO authenticated USING (true);

-- Realtime publication for the admin board.
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.status_types;
