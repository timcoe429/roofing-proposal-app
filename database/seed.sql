-- Seed data for development and testing
-- Run this after migrations to populate sample data

-- Create demo user (password: demo123)
INSERT INTO users (email, password_hash, first_name, last_name, phone, role, is_active, email_verified)
VALUES 
    ('demo@roofingpro.com', '$2a$10$YourHashedPasswordHere', 'John', 'Demo', '(555) 123-4567', 'admin', true, true),
    ('user@roofingpro.com', '$2a$10$YourHashedPasswordHere', 'Jane', 'User', '(555) 987-6543', 'user', true, true);

-- Create demo company
INSERT INTO companies (owner_id, name, email, phone, address, city, state, zip, license_number, website, primary_color)
VALUES (
    (SELECT id FROM users WHERE email = 'demo@roofingpro.com'),
    'Premier Roofing Solutions',
    'info@premierroofing.com',
    '(555) 123-4567',
    '123 Main Street',
    'Atlanta',
    'GA',
    '30301',
    'RCE-123456',
    'https://premierroofing.com',
    '#2563eb'
);

-- Create sample materials
INSERT INTO materials (company_id, name, category, subcategory, manufacturer, unit, cost, price)
VALUES 
    ((SELECT id FROM companies LIMIT 1), 'GAF Timberline HDZ Shingles - Charcoal', 'shingles', 'architectural', 'GAF', 'square', 95.00, 125.00),
    ((SELECT id FROM companies LIMIT 1), 'GAF Timberline HDZ Shingles - Weathered Wood', 'shingles', 'architectural', 'GAF', 'square', 95.00, 125.00),
    ((SELECT id FROM companies LIMIT 1), 'Synthetic Underlayment', 'underlayment', 'synthetic', 'GAF', 'square', 25.00, 35.00),
    ((SELECT id FROM companies LIMIT 1), 'Ice & Water Shield', 'underlayment', 'ice-water', 'GAF', 'linear ft', 1.75, 2.50),
    ((SELECT id FROM companies LIMIT 1), 'Ridge Vent', 'ventilation', 'ridge', 'GAF', 'linear ft', 5.50, 8.00),
    ((SELECT id FROM companies LIMIT 1), 'Step Flashing', 'flashing', 'step', 'Generic', 'piece', 2.00, 3.50),
    ((SELECT id FROM companies LIMIT 1), 'Pipe Boot', 'accessories', 'penetration', 'Oatey', 'each', 15.00, 25.00),
    ((SELECT id FROM companies LIMIT 1), 'Drip Edge', 'flashing', 'edge', 'Generic', 'linear ft', 1.50, 2.50),
    ((SELECT id FROM companies LIMIT 1), 'Valley Flashing', 'flashing', 'valley', 'Generic', 'linear ft', 3.00, 5.00),
    ((SELECT id FROM companies LIMIT 1), 'Starter Strip', 'accessories', 'starter', 'GAF', 'linear ft', 0.75, 1.25);

-- Create sample proposal template
INSERT INTO templates (company_id, name, description, type, is_default, template_data)
VALUES (
    (SELECT id FROM companies LIMIT 1),
    'Standard Residential Roof Replacement',
    'Default template for residential roof replacement proposals',
    'proposal',
    true,
    '{
        "sections": ["measurements", "materials", "labor", "warranty"],
        "defaultWarranty": "50-Year Manufacturer Warranty, 10-Year Workmanship",
        "defaultTimeline": "2-3 days, weather permitting",
        "overheadPercent": 15,
        "profitPercent": 20,
        "laborRate": 75,
        "defaultNotes": "Includes complete tear-off of existing shingles, inspection and replacement of damaged decking (up to 2 sheets included), and full cleanup with magnetic nail sweep.",
        "termsConditions": "Payment due upon completion. Additional decking replacement at $65 per sheet if needed."
    }'
);

-- Create sample proposal
INSERT INTO proposals (
    company_id, 
    user_id, 
    proposal_number,
    status,
    client_name,
    client_email,
    client_phone,
    client_address,
    property_address,
    measurements,
    materials,
    labor_hours,
    labor_rate,
    materials_cost,
    labor_cost,
    total_amount,
    timeline,
    warranty,
    notes
)
VALUES (
    (SELECT id FROM companies LIMIT 1),
    (SELECT id FROM users WHERE email = 'demo@roofingpro.com'),
    '202401-0001',
    'draft',
    'Sarah Johnson',
    'sarah.johnson@email.com',
    '(555) 234-5678',
    '456 Oak Drive, Atlanta, GA 30302',
    '456 Oak Drive, Atlanta, GA 30302',
    '{"totalSquares": 28.5, "ridgeLength": 42, "valleyLength": 24, "edgeLength": 165, "pitch": "6/12", "layers": 1}',
    '[
        {"name": "GAF Timberline HDZ Shingles", "quantity": 29, "unit": "square", "price": 125, "total": 3625},
        {"name": "Synthetic Underlayment", "quantity": 29, "unit": "square", "price": 35, "total": 1015},
        {"name": "Ice & Water Shield", "quantity": 165, "unit": "linear ft", "price": 2.5, "total": 412.50}
    ]',
    20,
    75,
    5052.50,
    1500.00,
    8448.00,
    '2-3 days, weather permitting',
    '50-Year Manufacturer Warranty, 10-Year Workmanship',
    'Includes complete tear-off, inspection, and cleanup'
);

-- Add some activity logs
INSERT INTO activity_logs (user_id, company_id, proposal_id, action, details)
VALUES 
    (
        (SELECT id FROM users WHERE email = 'demo@roofingpro.com'),
        (SELECT id FROM companies LIMIT 1),
        (SELECT id FROM proposals LIMIT 1),
        'proposal_created',
        '{"proposal_number": "202401-0001", "client": "Sarah Johnson"}'
    );

-- Grant permissions (if needed for specific PostgreSQL setups)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;