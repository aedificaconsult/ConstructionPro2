-- ============================================================
-- TAKE OFF ROWS (Detailed measurements for project items)
-- ============================================================

-- Ensure the update_updated_at function exists (defined in 001_schema.sql)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TABLE take_off_rows (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_item_id     UUID NOT NULL REFERENCES project_items(id) ON DELETE CASCADE,
  description         TEXT NOT NULL,
  number_of_items     INTEGER NOT NULL DEFAULT 1,
  length              NUMERIC(15, 3), -- in meters
  width               NUMERIC(15, 3), -- in meters (for area/volume)
  height              NUMERIC(15, 3), -- in meters (for volume)
  unit_mass_per_meter NUMERIC(15, 3), -- kg per meter (for mass calculations)
  calculated_quantity NUMERIC(15, 3) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER take_off_rows_updated_at
  BEFORE UPDATE ON take_off_rows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to recalculate executed quantity from take off rows
CREATE OR REPLACE FUNCTION update_executed_quantity_from_takeoff()
RETURNS TRIGGER AS $$
DECLARE
  total_quantity NUMERIC(15, 3);
  work_item_rate NUMERIC(15, 2);
BEGIN
  -- Calculate total quantity from all take off rows for this project item
  SELECT COALESCE(SUM(calculated_quantity), 0)
  INTO total_quantity
  FROM take_off_rows
  WHERE project_item_id = COALESCE(NEW.project_item_id, OLD.project_item_id);

  -- Get the work item rate
  SELECT wi.rate
  INTO work_item_rate
  FROM work_items wi
  JOIN project_items pi ON pi.work_item_id = wi.id
  WHERE pi.id = COALESCE(NEW.project_item_id, OLD.project_item_id);

  -- Update the project item's executed quantity and amount
  UPDATE project_items
  SET
    executed_quantity = total_quantity,
    executed_amount = total_quantity * work_item_rate,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.project_item_id, OLD.project_item_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update executed quantity when take off rows change
CREATE TRIGGER take_off_rows_update_executed_quantity
  AFTER INSERT OR UPDATE OR DELETE ON take_off_rows
  FOR EACH ROW EXECUTE FUNCTION update_executed_quantity_from_takeoff();

-- Enable Row Level Security
ALTER TABLE take_off_rows ENABLE ROW LEVEL SECURITY;

-- Create policy for take_off_rows (same as other tables)
CREATE POLICY "public_all" ON take_off_rows FOR ALL USING (true) WITH CHECK (true);