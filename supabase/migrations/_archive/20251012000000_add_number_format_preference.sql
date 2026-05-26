-- Add number_format column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN number_format VARCHAR(20) DEFAULT 'indian' CHECK (number_format IN ('indian', 'international'));

-- Update existing users to have the default format
UPDATE public.user_profiles
SET number_format = 'indian'
WHERE number_format IS NULL;
