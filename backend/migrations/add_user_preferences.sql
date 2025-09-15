-- Add user preferences table for view settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  default_view_mode VARCHAR(20) DEFAULT 'grid',
  files_view_split_position INTEGER DEFAULT 250,
  year_view_collapsed_years JSONB DEFAULT '[]',
  files_view_expanded_paths JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for year/month queries
CREATE INDEX IF NOT EXISTS idx_photos_year ON photos(EXTRACT(YEAR FROM COALESCE(date_taken, created_at)));
CREATE INDEX IF NOT EXISTS idx_photos_year_month ON photos(
  EXTRACT(YEAR FROM COALESCE(date_taken, created_at)),
  EXTRACT(MONTH FROM COALESCE(date_taken, created_at))
);

-- Add index on user_preferences user_id
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);