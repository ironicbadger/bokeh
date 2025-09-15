-- Add is_favorite field to photos table
ALTER TABLE photos 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Add index for quick favorite queries
CREATE INDEX IF NOT EXISTS idx_photos_is_favorite ON photos(is_favorite) WHERE is_favorite = TRUE;

-- Add index for year + favorite queries
CREATE INDEX IF NOT EXISTS idx_photos_year_favorite ON photos(
  EXTRACT(YEAR FROM COALESCE(date_taken, created_at)),
  is_favorite
) WHERE is_favorite = TRUE;