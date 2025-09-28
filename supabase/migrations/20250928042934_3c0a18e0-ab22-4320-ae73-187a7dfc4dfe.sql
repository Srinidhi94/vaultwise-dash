-- Fix function search path warnings
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.categories (user_id, name, icon, color) VALUES
    (NEW.id, 'Food & Dining', 'utensils', '#FF6B6B'),
    (NEW.id, 'Transportation', 'car', '#4ECDC4'),
    (NEW.id, 'Shopping', 'shopping-bag', '#45B7D1'),
    (NEW.id, 'Entertainment', 'tv', '#96CEB4'),
    (NEW.id, 'Bills & Utilities', 'file-text', '#FFEAA7'),
    (NEW.id, 'Healthcare', 'heart', '#DDA0DD'),
    (NEW.id, 'Education', 'book-open', '#98D8C8'),
    (NEW.id, 'Travel', 'plane', '#F7DC6F'),
    (NEW.id, 'Income', 'trending-up', '#82E0AA'),
    (NEW.id, 'Other', 'more-horizontal', '#BDC3C7');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Add missing trigger for user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.user_profiles (id, currency_symbol)
  VALUES (new.id, '$');
  RETURN new;
END;
$function$;

-- Create trigger to automatically create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();