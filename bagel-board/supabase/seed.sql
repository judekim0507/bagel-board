-- Bagel Board Seed Data
-- Run this in Supabase SQL Editor to populate your database with sample data

-- Clear existing data (for fresh start)
TRUNCATE teachers, tables, seats, menu_items, system_config RESTART IDENTITY CASCADE;

-- Insert System Config (PINs)
INSERT INTO system_config (key, value) VALUES
  ('waiter_pin', '1234'),
  ('kds_pin', '1234'),
  ('admin_pin', '9999');

-- Insert Teachers (Sample school staff)
INSERT INTO teachers (name, dietary_notes) VALUES
  ('John Smith', NULL),
  ('Sarah Johnson', 'Vegetarian'),
  ('Michael Brown', 'Gluten-free'),
  ('Emily Davis', NULL),
  ('David Wilson', 'No dairy'),
  ('Jessica Miller', NULL),
  ('Christopher Moore', 'Vegan'),
  ('Ashley Taylor', NULL),
  ('Matthew Anderson', 'Nut allergy'),
  ('Amanda Thomas', NULL),
  ('Daniel Jackson', NULL),
  ('Melissa White', 'Low carb'),
  ('James Harris', NULL),
  ('Laura Martin', 'Pescatarian'),
  ('Robert Thompson', NULL),
  ('Jennifer Garcia', NULL),
  ('William Martinez', 'No pork'),
  ('Elizabeth Robinson', NULL),
  ('Richard Clark', NULL),
  ('Lisa Rodriguez', NULL),
  ('Joseph Lewis', NULL),
  ('Nancy Lee', 'Diabetic'),
  ('Thomas Walker', NULL),
  ('Karen Hall', NULL),
  ('Charles Allen', NULL),
  ('Betty Young', 'Lactose intolerant'),
  ('Paul Hernandez', NULL),
  ('Sandra King', NULL),
  ('Mark Wright', NULL),
  ('Donna Lopez', NULL);

-- Insert Tables (1-22)
INSERT INTO tables (id)
SELECT generate_series(1, 22);

-- Insert Seats (8 per table = 176 total)
INSERT INTO seats (table_id, position)
SELECT
  t.id,
  s.position
FROM tables t
CROSS JOIN generate_series(1, 8) AS s(position);

-- Insert Menu Items
INSERT INTO menu_items (name, category, available, toppings_config) VALUES
  -- MAIN (Complete breakfast meals)
  ('Pancakes', 'meal', true, '{
    "toppings": [],
    "customizable": true,
    "description": "Pancakes topped with butter",
    "options": ["Blueberry sauce", "Classic maple syrup", "Whipped cream"]
  }'::jsonb),
  ('Omelette', 'meal', true, '{
    "toppings": [],
    "customizable": true,
    "description": "Flat egg, pepper, onions, salt",
    "options": ["Ham", "Cheese", "Spinach", "All"]
  }'::jsonb),
  ('Valhalla Morning Feast', 'meal', true, '{
    "toppings": [],
    "customizable": true,
    "description": "Scrambled eggs, hashbrown",
    "options": ["Bacon", "Sausage", "Both", "White bread", "Whole wheat bread"]
  }'::jsonb),
  ('Croissant Casserole', 'meal', true, '{
    "toppings": ["Croissant", "Butter", "Egg", "Sausage", "Bacon", "Ham"],
    "customizable": false,
    "description": "Croissant, butter, egg, sausage, bacon, ham"
  }'::jsonb),

  -- DRINKS
  ('Sunrise Mimosa', 'drink', true, '{
    "toppings": ["Orange juice", "Sprite", "Grenadine"],
    "customizable": false,
    "description": "Orange juice, sprite, grenadine"
  }'::jsonb),
  ('Chai', 'drink', true, '{
    "toppings": ["Chai mix"],
    "customizable": false,
    "description": "Chai mix"
  }'::jsonb),
  ('Hot Cocoa', 'drink', true, '{
    "toppings": [],
    "customizable": true,
    "description": "Hot chocolate",
    "options": ["Mini marshmallows", "Chocolate drizzle", "Sprinkles", "Crushed candy cane", "Whipped cream"]
  }'::jsonb);

-- Success message
SELECT
  (SELECT COUNT(*) FROM teachers) as teachers_count,
  (SELECT COUNT(*) FROM tables) as tables_count,
  (SELECT COUNT(*) FROM seats) as seats_count,
  (SELECT COUNT(*) FROM menu_items) as menu_items_count,
  (SELECT COUNT(*) FROM system_config) as config_count;
