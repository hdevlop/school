-- Compare this output before and after an isolated academic-year migration.
-- It fingerprints existing financial identities and amounts, without columns
-- introduced by later migrations.
SELECT 'fees' AS entity, count(*) AS rows,
  md5(coalesce(string_agg(jsonb_build_array(
    id, student_id, fee_type_id, academic_year, base_amount, gross_amount,
    net_amount, paid_amount, discount_amount, status, effective_date
  )::text, E'\n' ORDER BY id), '')) AS fingerprint
FROM fees
UNION ALL
SELECT 'fee_installments', count(*),
  md5(coalesce(string_agg(jsonb_build_array(
    id, fee_id, number, due_date, amount, paid_amount, status
  )::text, E'\n' ORDER BY id), ''))
FROM fee_installments
UNION ALL
SELECT 'payments', count(*),
  md5(coalesce(string_agg(jsonb_build_array(
    id, student_id, amount, payment_date, payment_method, status, receipt_number
  )::text, E'\n' ORDER BY id), ''))
FROM payments
UNION ALL
SELECT 'payment_allocations', count(*),
  md5(coalesce(string_agg(jsonb_build_array(
    id, payment_id, fee_id, installment_id, amount, type
  )::text, E'\n' ORDER BY id), ''))
FROM payment_allocations
ORDER BY entity;
