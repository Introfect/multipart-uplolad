-- Seed default applicant role
INSERT INTO role (id, name, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'applicant',
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;
