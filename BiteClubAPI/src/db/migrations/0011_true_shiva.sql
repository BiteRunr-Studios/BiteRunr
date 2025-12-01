-- Create the enum type first
CREATE TYPE "order_users_payment_settlement_enum" AS ENUM ('unpaid', 'claimed', 'confirmed');

ALTER TABLE "order_users" ADD COLUMN "settlement_status" "order_users_payment_settlement_enum" DEFAULT 'unpaid' NOT NULL;

-- Drop existing views
DROP VIEW IF EXISTS user_total_debts;
DROP VIEW IF EXISTS creditor_pending_claims;
DROP VIEW IF EXISTS user_order_debts;

-- Create user total debts view
CREATE VIEW user_total_debts WITH (security_invoker = on) AS
SELECT 
  ou.user_id as debtor_id,
  o.creator_id as creditor_id,
  up.first_name || ' ' || up.last_name as creditor_name,
  SUM(ou.amount_owed) as total_owed,
  COUNT(*) as unsettled_orders_count
FROM order_users ou
JOIN orders o ON ou.order_id = o.id
JOIN user_profiles up ON o.creator_id = up.id
WHERE ou.settlement_status IN ('unpaid', 'claimed')
  AND ou.amount_owed > 0
GROUP BY ou.user_id, o.creator_id, up.first_name, up.last_name;

-- Create creditor pending claims view
CREATE VIEW creditor_pending_claims WITH (security_invoker = on) AS
SELECT 
  o.creator_id as creditor_id,
  ou.user_id as debtor_id,
  up.first_name || ' ' || up.last_name as debtor_name,
  o.id as order_id,
  ou.amount_owed
FROM order_users ou
JOIN orders o ON ou.order_id = o.id
JOIN user_profiles up ON ou.user_id = up.id
WHERE ou.settlement_status = 'claimed';

-- Create user order debts view
CREATE VIEW user_order_debts WITH (security_invoker = on) AS
SELECT 
  ou.user_id as debtor_id,
  o.creator_id as creditor_id,
  o.id as order_id,
  up.first_name || ' ' || up.last_name as creditor_name,
  ou.amount_owed,
  ou.settlement_status,
  o.created_at as order_date,
  o.comments as order_notes
FROM order_users ou
JOIN orders o ON ou.order_id = o.id
JOIN user_profiles up ON o.creator_id = up.id
WHERE ou.amount_owed > 0
ORDER BY o.created_at DESC;