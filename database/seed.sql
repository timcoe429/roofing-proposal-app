-- Seed data for development

-- Insert sample materials
INSERT INTO materials (name, category, unit, cost_per_unit, description, supplier) VALUES
('Asphalt Shingles - 3-Tab', 'Shingles', 'sq ft', 1.50, 'Standard 3-tab asphalt shingles', 'ABC Supply'),
('Asphalt Shingles - Architectural', 'Shingles', 'sq ft', 2.25, 'Architectural asphalt shingles', 'ABC Supply'),
('Metal Roofing - Steel', 'Metal', 'sq ft', 8.50, 'Galvanized steel roofing panels', 'Metal Depot'),
('Underlayment - Felt', 'Underlayment', 'sq ft', 0.35, '15lb felt underlayment', 'ABC Supply'),
('Underlayment - Synthetic', 'Underlayment', 'sq ft', 0.65, 'Synthetic underlayment', 'ABC Supply'),
('Ridge Cap Shingles', 'Accessories', 'linear ft', 3.50, 'Ridge cap shingles', 'ABC Supply'),
('Drip Edge', 'Accessories', 'linear ft', 2.25, 'Aluminum drip edge', 'ABC Supply'),
('Ice & Water Shield', 'Underlayment', 'sq ft', 1.25, 'Self-adhering ice and water shield', 'ABC Supply'),
('Flashing - Step', 'Flashing', 'linear ft', 4.50, 'Aluminum step flashing', 'ABC Supply'),
('Gutters - Aluminum', 'Gutters', 'linear ft', 8.75, '5" aluminum gutters with hangers', 'Gutter Supply Co');

-- Insert sample user (password is 'password123' hashed)
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
('demo@roofingapp.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo', 'User', 'admin');

-- Insert sample company
INSERT INTO companies (user_id, name, address, phone, email, license_number) VALUES
(1, 'Demo Roofing Company', '123 Main St, Anytown, ST 12345', '(555) 123-4567', 'info@demoroofing.com', 'RC-12345');
