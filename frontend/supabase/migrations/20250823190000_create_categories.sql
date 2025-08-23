-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default categories
INSERT INTO categories (name, description, icon) VALUES
  ('Technology', 'Programming, web development, AI, and tech skills', '💻'),
  ('Business', 'Entrepreneurship, marketing, finance, and business skills', '💼'),
  ('Creative Arts', 'Design, photography, music, and creative skills', '🎨'),
  ('Health & Fitness', 'Wellness, nutrition, exercise, and health topics', '💪'),
  ('Language Learning', 'Foreign languages, communication, and linguistics', '🗣️'),
  ('Personal Development', 'Self-improvement, productivity, and life skills', '🌱'),
  ('Cooking & Food', 'Culinary arts, baking, and food preparation', '👨‍🍳'),
  ('Education', 'Teaching, tutoring, and educational content', '📚')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read categories
CREATE POLICY "Categories are publicly readable"
  ON categories
  FOR SELECT
  TO public
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_created_at ON categories(created_at);
