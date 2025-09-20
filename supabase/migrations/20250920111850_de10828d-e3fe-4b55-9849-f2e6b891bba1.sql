-- Fix search path security warnings by setting proper search_path on functions

-- Fix the create_default_categories function
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;