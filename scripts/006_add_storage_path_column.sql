-- Add storage_path column to file_uploads table for proper file management
ALTER TABLE file_uploads 
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Update existing records to have a storage_path (for migration)
UPDATE file_uploads 
SET storage_path = CONCAT(firebase_uid, '/', id, '-', filename)
WHERE storage_path IS NULL;
