-- 1. Trigger function: cascade-delete transactions + clean aa_link_refs when an account is deleted
CREATE OR REPLACE FUNCTION cascade_account_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM transactions WHERE account_id = OLD.id;
  UPDATE aa_link_refs SET local_account_id = NULL WHERE local_account_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach triggers to both account tables
CREATE TRIGGER trg_savings_account_cascade_delete
  BEFORE DELETE ON savings_accounts
  FOR EACH ROW EXECUTE FUNCTION cascade_account_delete();

CREATE TRIGGER trg_credit_card_cascade_delete
  BEFORE DELETE ON credit_cards
  FOR EACH ROW EXECUTE FUNCTION cascade_account_delete();

-- 3. Index for aa_link_refs cleanup lookups
CREATE INDEX IF NOT EXISTS idx_aa_link_refs_local_account
  ON aa_link_refs (local_account_id)
  WHERE local_account_id IS NOT NULL;

-- 4. Update handle_new_user to seed the new comprehensive category list
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, currency_symbol, number_format, subscription_tier)
  VALUES (NEW.id, '$', 'indian', 'free');

  INSERT INTO public.categories (user_id, name, icon, color, type, is_default) VALUES
    -- Expense
    (NEW.id, 'Transportation',     'car',             '#3b82f6', 'expense', TRUE),
    (NEW.id, 'Groceries',          'shopping-cart',   '#22c55e', 'expense', TRUE),
    (NEW.id, 'Food',               'utensils',        '#ef4444', 'expense', TRUE),
    (NEW.id, 'Medical',            'heart',           '#ec4899', 'expense', TRUE),
    (NEW.id, 'Self-Transfer',      'arrow-right-left','#6b7280', 'expense', TRUE),
    (NEW.id, 'Subscriptions',      'repeat',          '#8b5cf6', 'expense', TRUE),
    (NEW.id, 'Personal',           'user',            '#06b6d4', 'expense', TRUE),
    (NEW.id, 'Family',             'users',           '#f97316', 'expense', TRUE),
    (NEW.id, 'Shopping',           'shopping-bag',    '#f59e0b', 'expense', TRUE),
    (NEW.id, 'Pets',               'paw-print',       '#a855f7', 'expense', TRUE),
    (NEW.id, 'Travel',             'plane',           '#0ea5e9', 'expense', TRUE),
    (NEW.id, 'Rent',               'home',            '#64748b', 'expense', TRUE),
    (NEW.id, 'Credit Card Payment','credit-card',     '#dc2626', 'expense', TRUE),
    (NEW.id, 'Entertainment',      'film',            '#8b5cf6', 'expense', TRUE),
    (NEW.id, 'Gifts',              'gift',            '#f43f5e', 'expense', TRUE),
    (NEW.id, 'Miscellaneous',      'package',         '#78716c', 'expense', TRUE),
    (NEW.id, 'Utilities',          'zap',             '#eab308', 'expense', TRUE),
    (NEW.id, 'Insurance',          'shield',          '#14b8a6', 'expense', TRUE),
    (NEW.id, 'EMI/Loan',           'landmark',        '#b91c1c', 'expense', TRUE),
    (NEW.id, 'Education',          'book-open',       '#2563eb', 'expense', TRUE),
    (NEW.id, 'Fuel',               'fuel',            '#ca8a04', 'expense', TRUE),
    (NEW.id, 'Charity/Donations',  'hand-heart',      '#e11d48', 'expense', TRUE),
    (NEW.id, 'Maintenance',        'wrench',          '#57534e', 'expense', TRUE),
    (NEW.id, 'Taxes',              'receipt',         '#7c3aed', 'expense', TRUE),
    -- Income
    (NEW.id, 'Salary',             'banknote',        '#22c55e', 'income',  TRUE),
    (NEW.id, 'Interest',           'percent',         '#0d9488', 'income',  TRUE),
    (NEW.id, 'Capital Gains',      'trending-up',     '#16a34a', 'income',  TRUE),
    (NEW.id, 'Bonus',              'sparkles',        '#eab308', 'income',  TRUE),
    (NEW.id, 'Rent',               'building',        '#64748b', 'income',  TRUE),
    (NEW.id, 'Refund',             'rotate-ccw',      '#6366f1', 'income',  TRUE),
    (NEW.id, 'Freelance/Consulting','briefcase',      '#06b6d4', 'income',  TRUE),
    (NEW.id, 'Dividends',          'coins',           '#15803d', 'income',  TRUE),
    (NEW.id, 'Cashback/Rewards',   'tag',             '#f59e0b', 'income',  TRUE),
    (NEW.id, 'Reimbursement',      'undo',            '#8b5cf6', 'income',  TRUE),
    -- Both
    (NEW.id, 'Other',              'more-horizontal', '#6b7280', 'both',    TRUE);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
