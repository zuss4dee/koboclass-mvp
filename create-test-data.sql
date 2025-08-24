-- Create test user and host application to verify admin dashboard integration

-- Insert a test user
INSERT INTO users (id, email, name, role, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'testhost@koboclass.com',
  'Test Host User',
  'user',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Get the user ID for the host application
WITH test_user AS (
  SELECT id FROM users WHERE email = 'testhost@koboclass.com' LIMIT 1
)
INSERT INTO host_applications (
  id,
  user_id,
  bio,
  social_links,
  status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  test_user.id,
  'I am passionate about teaching web development and sharing my knowledge with aspiring developers. I have 5+ years of experience in React, Node.js, TypeScript, and modern web technologies. I love helping others learn to code and build amazing projects.',
  '{"instagram": "@testhost", "twitter": "@testhost_dev", "linkedin": "linkedin.com/in/testhost"}'::jsonb,
  'pending',
  NOW(),
  NOW()
FROM test_user
ON CONFLICT DO NOTHING;

-- Verify the data was created
SELECT 
  ha.id,
  ha.bio,
  ha.status,
  ha.created_at,
  u.email,
  u.name
FROM host_applications ha
JOIN users u ON ha.user_id = u.id
WHERE u.email = 'testhost@koboclass.com';
