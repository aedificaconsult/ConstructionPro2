-- ============================================================
-- ConstructPro Seed Data
-- Run AFTER 001_schema.sql
-- ============================================================

-- ============================================================
-- UNITS (commonly used in construction)
-- ============================================================
INSERT INTO units (name, abbreviation) VALUES
  ('Square Meter',   'm²'),
  ('Cubic Meter',    'm³'),
  ('Linear Meter',   'lm'),
  ('Kilogram',       'kg'),
  ('Metric Ton',     'ton'),
  ('Number / Each',  'pcs'),
  ('Lump Sum',       'ls'),
  ('Hour',           'hr'),
  ('Day',            'day')
ON CONFLICT (abbreviation) DO NOTHING;

-- ============================================================
-- WORK CATEGORIES
-- ============================================================
INSERT INTO work_categories (id, name, color) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Substructure Works',        '#E05656'),
  ('00000000-0000-0000-0001-000000000002', 'Superstructure Works',      '#5B8DEF'),
  ('00000000-0000-0000-0001-000000000003', 'Electrical Works',          '#F5A623'),
  ('00000000-0000-0000-0001-000000000004', 'Plumbing & Sanitary Works', '#4CAF82'),
  ('00000000-0000-0000-0001-000000000005', 'Finishing Works',           '#C8A96E'),
  ('00000000-0000-0000-0001-000000000006', 'Roofing Works',             '#A87EDB');

-- ============================================================
-- WORK SUBCATEGORIES
-- ============================================================
INSERT INTO work_subcategories (id, category_id, name) VALUES
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000001', 'Excavation & Earthworks'),
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000001', 'Foundation Concrete'),
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000001', 'Reinforcement Steel'),
  ('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0001-000000000002', 'Columns & Beams'),
  ('00000000-0000-0000-0002-000000000005', '00000000-0000-0000-0001-000000000002', 'Slabs & Floors'),
  ('00000000-0000-0000-0002-000000000006', '00000000-0000-0000-0001-000000000002', 'Walls & Partitions'),
  ('00000000-0000-0000-0002-000000000007', '00000000-0000-0000-0001-000000000003', 'Conduit & Wiring'),
  ('00000000-0000-0000-0002-000000000008', '00000000-0000-0000-0001-000000000003', 'Lighting & Power'),
  ('00000000-0000-0000-0002-000000000009', '00000000-0000-0000-0001-000000000004', 'Water Supply'),
  ('00000000-0000-0000-0002-000000000010', '00000000-0000-0000-0001-000000000004', 'Drainage & Sewerage'),
  ('00000000-0000-0000-0002-000000000011', '00000000-0000-0000-0001-000000000005', 'Plastering & Rendering'),
  ('00000000-0000-0000-0002-000000000012', '00000000-0000-0000-0001-000000000005', 'Tiling & Flooring'),
  ('00000000-0000-0000-0002-000000000013', '00000000-0000-0000-0001-000000000005', 'Painting & Decoration'),
  ('00000000-0000-0000-0002-000000000014', '00000000-0000-0000-0001-000000000006', 'Roof Structure'),
  ('00000000-0000-0000-0002-000000000015', '00000000-0000-0000-0001-000000000006', 'Roof Covering');

-- ============================================================
-- WORK ITEMS (using subqueries to resolve unit IDs)
-- ============================================================
INSERT INTO work_items (subcategory_id, description, unit_id, rate) VALUES
  -- Excavation
  ('00000000-0000-0000-0002-000000000001', 'Bulk excavation in ordinary soil', (SELECT id FROM units WHERE abbreviation='m³'), 8.50),
  ('00000000-0000-0000-0002-000000000001', 'Bulk excavation in hard rock', (SELECT id FROM units WHERE abbreviation='m³'), 28.00),
  ('00000000-0000-0000-0002-000000000001', 'Backfilling with selected material compacted in 150mm layers', (SELECT id FROM units WHERE abbreviation='m³'), 12.00),
  ('00000000-0000-0000-0002-000000000001', 'Disposal of surplus excavated material off site', (SELECT id FROM units WHERE abbreviation='m³'), 6.50),
  -- Foundation Concrete
  ('00000000-0000-0000-0002-000000000002', 'Plain concrete C15/20 blinding 75mm thick', (SELECT id FROM units WHERE abbreviation='m²'), 14.00),
  ('00000000-0000-0000-0002-000000000002', 'Reinforced concrete C25/30 strip foundations', (SELECT id FROM units WHERE abbreviation='m³'), 245.00),
  ('00000000-0000-0000-0002-000000000002', 'Reinforced concrete C30/37 pad footing', (SELECT id FROM units WHERE abbreviation='m³'), 265.00),
  ('00000000-0000-0000-0002-000000000002', 'Formwork to sides of foundations', (SELECT id FROM units WHERE abbreviation='m²'), 18.00),
  -- Reinforcement
  ('00000000-0000-0000-0002-000000000003', 'High yield steel bars Y8 supply and fix', (SELECT id FROM units WHERE abbreviation='kg'), 990.00),
  ('00000000-0000-0000-0002-000000000003', 'High yield steel bars Y12 supply and fix', (SELECT id FROM units WHERE abbreviation='kg'), 985.00),
  ('00000000-0000-0000-0002-000000000003', 'High yield steel bars Y16 supply and fix', (SELECT id FROM units WHERE abbreviation='kg'), 980.00),
  ('00000000-0000-0000-0002-000000000003', 'High yield steel bars Y20 supply and fix', (SELECT id FROM units WHERE abbreviation='kg'), 975.00),
  -- Columns & Beams
  ('00000000-0000-0000-0002-000000000004', 'Reinforced concrete C30/37 columns', (SELECT id FROM units WHERE abbreviation='m³'), 320.00),
  ('00000000-0000-0000-0002-000000000004', 'Reinforced concrete C30/37 beams', (SELECT id FROM units WHERE abbreviation='m³'), 310.00),
  ('00000000-0000-0000-0002-000000000004', 'Formwork to columns', (SELECT id FROM units WHERE abbreviation='m²'), 32.00),
  ('00000000-0000-0000-0002-000000000004', 'Formwork to beam sides and soffits', (SELECT id FROM units WHERE abbreviation='m²'), 28.00),
  -- Slabs
  ('00000000-0000-0000-0002-000000000005', 'Reinforced concrete C30 suspended slab t=150mm', (SELECT id FROM units WHERE abbreviation='m²'), 68.00),
  ('00000000-0000-0000-0002-000000000005', 'Reinforced concrete C30 suspended slab t=200mm', (SELECT id FROM units WHERE abbreviation='m²'), 82.00),
  ('00000000-0000-0000-0002-000000000005', 'Formwork to suspended slabs', (SELECT id FROM units WHERE abbreviation='m²'), 22.00),
  -- Walls
  ('00000000-0000-0000-0002-000000000006', '150mm solid concrete block masonry wall', (SELECT id FROM units WHERE abbreviation='m²'), 28.00),
  ('00000000-0000-0000-0002-000000000006', '200mm solid concrete block masonry wall', (SELECT id FROM units WHERE abbreviation='m²'), 35.00),
  ('00000000-0000-0000-0002-000000000006', '100mm lightweight partition block wall', (SELECT id FROM units WHERE abbreviation='m²'), 22.00),
  -- Electrical
  ('00000000-0000-0000-0002-000000000007', '20mm PVC conduit concealed in wall', (SELECT id FROM units WHERE abbreviation='lm'), 4.50),
  ('00000000-0000-0000-0002-000000000007', '32mm PVC conduit surface mounted', (SELECT id FROM units WHERE abbreviation='lm'), 6.00),
  ('00000000-0000-0000-0002-000000000007', '2.5mm² single-core PVC cable draw in', (SELECT id FROM units WHERE abbreviation='lm'), 2.20),
  ('00000000-0000-0000-0002-000000000007', '4mm² single-core PVC cable draw in', (SELECT id FROM units WHERE abbreviation='lm'), 2.80),
  ('00000000-0000-0000-0002-000000000008', 'LED recessed downlight 12W complete', (SELECT id FROM units WHERE abbreviation='pcs'), 45.00),
  ('00000000-0000-0000-0002-000000000008', 'LED surface mounted light fitting 2x18W', (SELECT id FROM units WHERE abbreviation='pcs'), 65.00),
  ('00000000-0000-0000-0002-000000000008', '13A switched socket outlet double', (SELECT id FROM units WHERE abbreviation='pcs'), 28.00),
  ('00000000-0000-0000-0002-000000000008', 'Consumer unit 12-way with MCBs', (SELECT id FROM units WHERE abbreviation='pcs'), 380.00),
  -- Plumbing
  ('00000000-0000-0000-0002-000000000009', '15mm CPVC hot & cold water pipe', (SELECT id FROM units WHERE abbreviation='lm'), 5.50),
  ('00000000-0000-0000-0002-000000000009', '22mm CPVC hot & cold water pipe', (SELECT id FROM units WHERE abbreviation='lm'), 7.00),
  ('00000000-0000-0000-0002-000000000009', '32mm CPVC pressure pipe', (SELECT id FROM units WHERE abbreviation='lm'), 8.00),
  ('00000000-0000-0000-0002-000000000009', 'Close-coupled WC suite complete', (SELECT id FROM units WHERE abbreviation='pcs'), 185.00),
  ('00000000-0000-0000-0002-000000000009', 'Pedestal wash-hand basin complete', (SELECT id FROM units WHERE abbreviation='pcs'), 165.00),
  ('00000000-0000-0000-0002-000000000010', '110mm uPVC soil & waste pipe', (SELECT id FROM units WHERE abbreviation='lm'), 15.00),
  ('00000000-0000-0000-0002-000000000010', '160mm uPVC underground drain pipe', (SELECT id FROM units WHERE abbreviation='lm'), 22.00),
  ('00000000-0000-0000-0002-000000000010', 'Manhole 600x600mm precast concrete', (SELECT id FROM units WHERE abbreviation='pcs'), 480.00),
  -- Finishing
  ('00000000-0000-0000-0002-000000000011', '12mm cement sand plaster to walls', (SELECT id FROM units WHERE abbreviation='m²'), 9.50),
  ('00000000-0000-0000-0002-000000000011', '6mm skim coat plaster to walls', (SELECT id FROM units WHERE abbreviation='m²'), 7.00),
  ('00000000-0000-0000-0002-000000000012', '600x600 porcelain floor tiles in cement mortar', (SELECT id FROM units WHERE abbreviation='m²'), 42.00),
  ('00000000-0000-0000-0002-000000000012', '300x600 ceramic wall tiles in adhesive', (SELECT id FROM units WHERE abbreviation='m²'), 36.00),
  ('00000000-0000-0000-0002-000000000013', 'Two-coat emulsion paint to walls', (SELECT id FROM units WHERE abbreviation='m²'), 6.00),
  ('00000000-0000-0000-0002-000000000013', 'Gloss oil paint to timber surfaces', (SELECT id FROM units WHERE abbreviation='m²'), 8.50),
  -- Roofing
  ('00000000-0000-0000-0002-000000000014', 'Timber roof truss 6m span supply and erect', (SELECT id FROM units WHERE abbreviation='pcs'), 320.00),
  ('00000000-0000-0000-0002-000000000014', '50x100mm purlins treated timber', (SELECT id FROM units WHERE abbreviation='lm'), 12.00),
  ('00000000-0000-0000-0002-000000000015', 'Box profile steel roofing sheet 0.5mm', (SELECT id FROM units WHERE abbreviation='m²'), 18.00),
  ('00000000-0000-0000-0002-000000000015', 'Ridge cap flashing', (SELECT id FROM units WHERE abbreviation='lm'), 14.00),
  ('00000000-0000-0000-0002-000000000015', 'PVC box gutters and downpipes', (SELECT id FROM units WHERE abbreviation='lm'), 22.00);
