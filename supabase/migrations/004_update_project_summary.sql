-- Update project_summary view to include created_at
CREATE OR REPLACE VIEW project_summary AS
SELECT
  p.id,
  p.name,
  p.location,
  p.status,
  p.start_date,
  p.end_date,
  p.created_at,
  COUNT(pi.id)                            AS item_count,
  COALESCE(SUM(pi.contract_amount), 0)    AS total_contract_amount,
  COALESCE(SUM(pi.executed_amount), 0)    AS total_executed_amount,
  CASE
    WHEN COALESCE(SUM(pi.contract_amount), 0) > 0
    THEN ROUND((SUM(pi.executed_amount) / SUM(pi.contract_amount)) * 100, 2)
    ELSE 0
  END                                      AS progress_percent
FROM projects p
LEFT JOIN project_items pi ON pi.project_id = p.id
GROUP BY p.id, p.name, p.location, p.status, p.start_date, p.end_date, p.created_at;