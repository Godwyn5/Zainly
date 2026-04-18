-- Migration: add final_test_status to review_items
-- Run this in the Supabase SQL editor before deploying the updated session code.

ALTER TABLE review_items
ADD COLUMN IF NOT EXISTS final_test_status text DEFAULT 'pending'
  CHECK (final_test_status IN ('pending', 'validated', 'reinforce'));

-- Existing rows get 'pending' automatically via DEFAULT.
