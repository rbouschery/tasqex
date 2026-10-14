-- Required app defaults (statuses + global_settings). Safe to re-run.
-- Admin user: scripts/seed.ts via `pnpm db:seed-admin` (optional).

INSERT INTO public.status_types (name, color, position)
SELECT v.name, v.color, v.position
FROM (
  VALUES
    ('Open', '#3b82f6', 0),
    ('In Process', '#f59e0b', 1),
    ('Human Review', '#8b5cf6', 2),
    ('Closed', '#22c55e', 3)
) AS v(name, color, position)
WHERE NOT EXISTS (SELECT 1 FROM public.status_types);

INSERT INTO public.global_settings (
  id,
  visible_status_ids
)
SELECT
  1,
  COALESCE(
    (SELECT array_agg(id ORDER BY position) FROM public.status_types),
    '{}'::uuid[]
  )
WHERE NOT EXISTS (SELECT 1 FROM public.global_settings WHERE id = 1);

INSERT INTO public.organizations (name)
SELECT 'Workspace'
WHERE NOT EXISTS (SELECT 1 FROM public.organizations);
