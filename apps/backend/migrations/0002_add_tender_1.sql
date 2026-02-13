INSERT INTO tender (id, title, is_active, created_at, updated_at)
VALUES (
  'tender-1',
  'India''s largest tech mueseum',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id)
DO UPDATE SET
  title = EXCLUDED.title,
  is_active = true,
  updated_at = NOW();
