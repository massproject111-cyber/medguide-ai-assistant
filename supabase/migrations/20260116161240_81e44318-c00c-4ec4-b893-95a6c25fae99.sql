-- Add new fields to profiles table for enhanced health data
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS past_illnesses text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS lifestyle_factors text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ongoing_medications text[] DEFAULT '{}';