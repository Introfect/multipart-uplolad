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

-- Seed admin role
INSERT INTO role (id, name, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Seed active tender
INSERT INTO tender (id, title, is_active, created_at, updated_at)
VALUES (
  'MIST-2025-0847',
  'MIST Phase II Tender',
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;
