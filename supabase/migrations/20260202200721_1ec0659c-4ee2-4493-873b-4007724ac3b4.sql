-- Add status column to nutrition_interviews table
ALTER TABLE nutrition_interviews 
ADD COLUMN status text NOT NULL DEFAULT 'draft';

-- Add constraint to ensure valid status values
ALTER TABLE nutrition_interviews 
ADD CONSTRAINT nutrition_interviews_status_check 
CHECK (status IN ('draft', 'sent'));

-- Mark all existing interviews as 'sent' (they were already submitted)
UPDATE nutrition_interviews SET status = 'sent' WHERE status = 'draft';