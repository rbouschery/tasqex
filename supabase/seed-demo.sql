-- Optional demo tickets/contacts/tags (included in `pnpm db:reset`).

INSERT INTO public.contacts (username)
VALUES ('demo@example.com');

INSERT INTO public.tags (name, color)
VALUES ('bug', '#ef4444'), ('feature request', '#8b5cf6');

INSERT INTO public.tickets (
  title,
  kind,
  body,
  contact_id,
  status_id,
  origin
)
SELECT
  'Welcome to ticqex',
  'task',
  'This is a sample task on the board. Edit the description to make it yours.',
  c.id,
  s.id,
  'manual'
FROM public.contacts c
CROSS JOIN public.status_types s
WHERE c.username = 'demo@example.com'
  AND s.name = 'Open'
LIMIT 1;

INSERT INTO public.ticket_tags (ticket_id, tag_id)
SELECT t.id, tag.id
FROM public.tickets t
CROSS JOIN public.tags tag
WHERE t.title = 'Welcome to ticqex'
  AND tag.name = 'feature request'
LIMIT 1;
