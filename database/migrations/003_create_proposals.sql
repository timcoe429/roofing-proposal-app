-- Create proposals table
CREATE TABLE IF NOT EXISTS proposals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL,
    client_address TEXT,
    client_phone VARCHAR(20),
    client_email VARCHAR(255),
    project_title VARCHAR(255),
    project_description TEXT,
    measurements JSONB,
    materials JSONB,
    labor_costs JSONB,
    total_cost DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
