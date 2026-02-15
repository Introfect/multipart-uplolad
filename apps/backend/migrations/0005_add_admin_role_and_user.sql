-- Migration: Add admin role and admin user
-- This migration creates an admin role (if not exists) and an admin user with email admin@admin.in

-- Insert admin role (will be skipped if already exists from seed)
INSERT INTO "role" ("id", "name", "is_active", "created_at", "updated_at")
VALUES (
  'role_admin_001',
  'admin',
  true,
  now(),
  now()
)
ON CONFLICT ("name") WHERE "is_active" = true DO NOTHING;

-- Insert admin user with bcrypt hashed password for "password"
-- Bcrypt hash for "password" with cost 10
INSERT INTO "user" ("id", "email", "password_hash", "firm_name", "name", "phone_number", "is_active", "created_at", "updated_at")
VALUES (
  'user_admin_001',
  'admin@admin.in',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- bcrypt hash for "password"
  'System Admin',
  'Administrator',
  NULL,
  true,
  now(),
  now()
)
ON CONFLICT ("email") WHERE "is_active" = true DO NOTHING;

-- Assign admin role to admin user
-- Use a subquery to get the admin role ID (handles both seed-created and migration-created roles)
INSERT INTO "user_role" ("id", "user_id", "role_id", "is_active", "created_at", "updated_at")
SELECT
  'user_role_admin_001',
  'user_admin_001',
  "id",
  true,
  now(),
  now()
FROM "role"
WHERE "name" = 'admin' AND "is_active" = true
LIMIT 1
ON CONFLICT ("user_id", "role_id") WHERE "is_active" = true DO NOTHING;
