-- ============================================================
-- ConstructPro Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- UNITS OF MEASUREMENT
-- ============================================================
CREATE TABLE units (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  abbreviation TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WORK CATEGORIES
-- ============================================================
CREATE TABLE work_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT DEFAULT '#C8A96E',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WORK SUBCATEGORIES
-- ============================================================
CREATE TABLE work_subcategories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES work_categories(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WORK ITEMS (Global Library)
-- ============================================================
CREATE TABLE work_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subcategory_id  UUID NOT NULL REFERENCES work_subcategories(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  unit_id         UUID NOT NULL REFERENCES units(id),
  rate            NUMERIC(15, 2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  location    TEXT,
  start_date  DATE,
  end_date    DATE,
  status      TEXT NOT NULL DEFAULT 'Not Started'
                CHECK (status IN ('Not Started','In Progress','Completed','On Hold')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- PROJECT ITEMS (BOQ lines)
-- ============================================================
CREATE TABLE project_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  work_item_id        UUID NOT NULL REFERENCES work_items(id),
  contract_quantity   NUMERIC(15, 3) DEFAULT 0,
  contract_amount     NUMERIC(15, 2) NOT NULL DEFAULT 0,
  executed_quantity   NUMERIC(15, 3) DEFAULT 0,
  executed_amount     NUMERIC(15, 2) NOT NULL DEFAULT 0,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, work_item_id)
);

CREATE TRIGGER project_items_updated_at
  BEFORE UPDATE ON project_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- PROGRESS SNAPSHOTS (audit trail)
-- ============================================================
CREATE TABLE progress_snapshots (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_item_id   UUID NOT NULL REFERENCES project_items(id) ON DELETE CASCADE,
  executed_amount   NUMERIC(15, 2) NOT NULL,
  executed_quantity NUMERIC(15, 3),
  note              TEXT,
  recorded_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- Project summary view
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

-- Project BOQ view (full joined)
CREATE OR REPLACE VIEW project_boq AS
SELECT
  pi.id             AS project_item_id,
  pi.project_id,
  p.name            AS project_name,
  pi.work_item_id,
  wi.description    AS item_description,
  u.abbreviation    AS unit,
  wi.rate,
  pi.contract_quantity,
  pi.contract_amount,
  pi.executed_quantity,
  pi.executed_amount,
  CASE
    WHEN pi.contract_amount > 0
    THEN ROUND((pi.executed_amount / pi.contract_amount) * 100, 2)
    ELSE 0
  END               AS progress_percent,
  wsc.name          AS subcategory_name,
  wc.name           AS category_name,
  wc.color          AS category_color,
  pi.notes,
  pi.created_at,
  pi.updated_at
FROM project_items pi
JOIN projects        p   ON p.id   = pi.project_id
JOIN work_items      wi  ON wi.id  = pi.work_item_id
JOIN units           u   ON u.id   = wi.unit_id
JOIN work_subcategories wsc ON wsc.id = wi.subcategory_id
JOIN work_categories    wc  ON wc.id  = wsc.category_id;

-- ============================================================
-- ROW LEVEL SECURITY (open for single-user / demo)
-- Uncomment and adapt if you add Supabase Auth
-- ============================================================
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "allow_all" ON projects FOR ALL USING (true);
-- (repeat for each table)

-- For now, allow public access (development mode):
ALTER TABLE units               ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_subcategories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_snapshots  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON units               FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON work_categories     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON work_subcategories  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON work_items          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON projects            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON project_items       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON progress_snapshots  FOR ALL USING (true) WITH CHECK (true);
