-- Add orientation fields to photos table
ALTER TABLE photos 
ADD COLUMN IF NOT EXISTS original_orientation INTEGER,
ADD COLUMN IF NOT EXISTS rotation_applied INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS orientation_corrected BOOLEAN DEFAULT FALSE;

-- Add index for photos that need orientation processing
CREATE INDEX IF NOT EXISTS idx_photos_orientation_needed 
ON photos(orientation_corrected) 
WHERE orientation_corrected = FALSE;