-- ============================================================
-- Additional Seed Data for ConstructionPro
-- Run AFTER 002_seed.sql
-- This file demonstrates seeding categories, subcategories, work items,
-- creating a sample project, and linking work items to the project
-- ============================================================

-- ============================================================
-- ADDITIONAL WORK CATEGORIES (if needed)
-- ============================================================
-- Note: Using predefined UUIDs for consistency
INSERT INTO work_categories (id, name, description, color) VALUES
  ('00000000-0000-0000-0001-000000000007', 'Mechanical Works', 'HVAC, ventilation, and mechanical systems', '#FF6B6B'),
  ('00000000-0000-0000-0001-000000000008', 'Landscaping', 'External works and landscaping', '#51CF66')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ADDITIONAL WORK SUBCATEGORIES
-- ============================================================
INSERT INTO work_subcategories (id, category_id, name, description) VALUES
  -- Mechanical Works subcategories
  ('00000000-0000-0000-0002-000000000016', '00000000-0000-0000-0001-000000000007', 'HVAC Systems', 'Heating, ventilation, and air conditioning'),
  ('00000000-0000-0000-0002-000000000017', '00000000-0000-0000-0001-000000000007', 'Fire Protection', 'Fire suppression and protection systems'),
  -- Landscaping subcategories
  ('00000000-0000-0000-0002-000000000018', '00000000-0000-0000-0001-000000000008', 'Hard Landscaping', 'Paving, paths, and hard surfaces'),
  ('00000000-0000-0000-0002-000000000019', '00000000-0000-0000-0001-000000000008', 'Soft Landscaping', 'Plants, trees, and soft landscaping')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ADDITIONAL WORK ITEMS
-- ============================================================
INSERT INTO work_items (subcategory_id, description, unit_id, rate) VALUES
  -- Mechanical Works
  ('00000000-0000-0000-0002-000000000016', 'Split air conditioning unit 1.5HP wall mounted', (SELECT id FROM units WHERE abbreviation='pcs'), 850.00),
  ('00000000-0000-0000-0002-000000000016', 'Ducted air conditioning system 5HP', (SELECT id FROM units WHERE abbreviation='pcs'), 2500.00),
  ('00000000-0000-0000-0002-000000000016', 'Flexible ducting 200mm diameter', (SELECT id FROM units WHERE abbreviation='lm'), 12.00),
  ('00000000-0000-0000-0002-000000000017', 'Fire extinguisher 5kg ABC type', (SELECT id FROM units WHERE abbreviation='pcs'), 120.00),
  ('00000000-0000-0000-0002-000000000017', 'Smoke detector with battery backup', (SELECT id FROM units WHERE abbreviation='pcs'), 45.00),
  -- Landscaping
  ('00000000-0000-0000-0002-000000000018', 'Concrete paving blocks 200x100x60mm', (SELECT id FROM units WHERE abbreviation='m²'), 35.00),
  ('00000000-0000-0000-0002-000000000018', 'Kerb stones 150x250mm', (SELECT id FROM units WHERE abbreviation='lm'), 18.00),
  ('00000000-0000-0000-0002-000000000019', 'Palm tree 2-3m height planting complete', (SELECT id FROM units WHERE abbreviation='pcs'), 150.00),
  ('00000000-0000-0000-0002-000000000019', 'Shrubs 1m height mixed varieties', (SELECT id FROM units WHERE abbreviation='pcs'), 25.00)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SAMPLE PROJECT
-- ============================================================
INSERT INTO projects (id, name, description, location, start_date, end_date, status) VALUES
  ('00000000-0000-0000-0003-000000000001', 'Sample Residential Project', 'A sample 3-bedroom residential building project for demonstration', 'Downtown Area', '2024-01-15', '2024-07-15', 'In Progress')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- LINK WORK ITEMS TO PROJECT (PROJECT ITEMS)
-- ============================================================
-- This creates the Bill of Quantities (BOQ) for the sample project
INSERT INTO project_items (project_id, work_item_id, contract_quantity, contract_amount, executed_quantity, executed_amount, notes) VALUES
  -- Excavation items
  ('00000000-0000-0000-0003-000000000001', (SELECT id FROM work_items WHERE description = 'Bulk excavation in ordinary soil'), 150.00, 1275.00, 120.00, 1020.00, 'Foundation excavation completed'),
  -- Concrete items
  ('00000000-0000-0000-0003-000000000001', (SELECT id FROM work_items WHERE description = 'Reinforced concrete C30/37 strip foundations'), 25.00, 6125.00, 25.00, 6125.00, 'Foundations completed'),
  ('00000000-0000-0000-0003-000000000001', (SELECT id FROM work_items WHERE description = 'Reinforced concrete C30 suspended slab t=150mm'), 180.00, 12240.00, 90.00, 6120.00, 'Ground floor slab completed, first floor in progress'),
  -- Masonry items
  ('00000000-0000-0000-0003-000000000001', (SELECT id FROM work_items WHERE description = '150mm solid concrete block masonry wall'), 320.00, 8960.00, 200.00, 5600.00, 'External walls completed, internal walls ongoing'),
  -- Electrical items
  ('00000000-0000-0000-0003-000000000001', (SELECT id FROM work_items WHERE description = '13A switched socket outlet double'), 24.00, 672.00, 12.00, 336.00, 'Sockets installed in completed rooms'),
  ('00000000-0000-0000-0003-000000000001', (SELECT id FROM work_items WHERE description = 'LED recessed downlight 12W complete'), 18.00, 810.00, 9.00, 405.00, 'Lighting installed in completed areas'),
  -- Plumbing items
  ('00000000-0000-0000-0003-000000000001', (SELECT id FROM work_items WHERE description = 'Close-coupled WC suite complete'), 3.00, 555.00, 2.00, 370.00, 'Bathrooms 1 and 2 completed'),
  ('00000000-0000-0000-0003-000000000001', (SELECT id FROM work_items WHERE description = 'Pedestal wash-hand basin complete'), 4.00, 660.00, 3.00, 495.00, 'Basins installed in bathrooms and kitchen'),
  -- Finishing items
  ('00000000-0000-0000-0003-000000000001', (SELECT id FROM work_items WHERE description = '600x600 porcelain floor tiles in cement mortar'), 120.00, 5040.00, 60.00, 2520.00, 'Ground floor tiling completed'),
  ('00000000-0000-0000-0003-000000000001', (SELECT id FROM work_items WHERE description = 'Two-coat emulsion paint to walls'), 450.00, 2700.00, 180.00, 1080.00, 'Internal painting in progress'),
  -- Mechanical items (new categories)
  ('00000000-0000-0000-0003-000000000001', (SELECT id FROM work_items WHERE description = 'Split air conditioning unit 1.5HP wall mounted'), 4.00, 3400.00, 2.00, 1700.00, 'AC units for bedrooms'),
  -- Landscaping items
  ('00000000-0000-0000-0003-000000000001', (SELECT id FROM work_items WHERE description = 'Concrete paving blocks 200x100x60mm'), 85.00, 2975.00, 0.00, 0.00, 'Driveway and paths - pending')
ON CONFLICT (project_id, work_item_id) DO NOTHING;

-- ============================================================
-- SAMPLE PROGRESS SNAPSHOTS (for demonstration)
-- ============================================================
-- These show historical progress tracking
INSERT INTO progress_snapshots (project_item_id, executed_amount, executed_quantity, note) VALUES
  ((SELECT pi.id FROM project_items pi JOIN work_items wi ON pi.work_item_id = wi.id WHERE wi.description = 'Bulk excavation in ordinary soil' AND pi.project_id = '00000000-0000-0000-0003-000000000001'), 765.00, 90.00, 'Initial excavation phase'),
  ((SELECT pi.id FROM project_items pi JOIN work_items wi ON pi.work_item_id = wi.id WHERE wi.description = 'Bulk excavation in ordinary soil' AND pi.project_id = '00000000-0000-0000-0003-000000000001'), 1020.00, 120.00, 'Excavation completed'),
  ((SELECT pi.id FROM project_items pi JOIN work_items wi ON pi.work_item_id = wi.id WHERE wi.description = 'Reinforced concrete C30 suspended slab t=150mm' AND pi.project_id = '00000000-0000-0000-0003-000000000001'), 3400.00, 50.00, 'Ground floor slab poured'),
  ((SELECT pi.id FROM project_items pi JOIN work_items wi ON pi.work_item_id = wi.id WHERE wi.description = 'Reinforced concrete C30 suspended slab t=150mm' AND pi.project_id = '00000000-0000-0000-0003-000000000001'), 6120.00, 90.00, 'Ground floor completed');

-- ============================================================
-- NOTES:
-- 1. This seed file demonstrates the complete workflow:
--    - Creating categories and subcategories
--    - Adding work items to the library
--    - Creating a project
--    - Linking work items to projects with quantities and amounts
--    - Recording progress snapshots
--
-- 2. All IDs use predefined UUIDs for consistency
-- 3. ON CONFLICT clauses prevent duplicate insertions
-- 4. Contract amounts are calculated as quantity * rate
-- 5. Executed amounts show partial completion
-- ============================================================