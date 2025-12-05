# 🏗️ System Architecture

Complete system design and data flow documentation for the roofing proposal app.

## 🎯 System Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Client (React)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Pages   │ │Components│ │ Services │ │  Utils   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP/HTTPS
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Server (Node.js/Express)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Routes  │ │Controller│ │ Services │ │Middleware│  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└────────┬──────────────────┬─────────────────┬───────────┘
         │                  │                  │
         ▼                  ▼                  ▼
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │Railway    │      │ OpenAI  │      │Anthropic │
   │PostgreSQL │      │   API   │      │   API    │
   └──────────┘      └──────────┘      └──────────┘
```

## 🔄 Data Flow

### 1. Authentication Flow
```
User Login → Login.jsx → api.js → POST /api/auth/login
→ authController → User.findByEmail → Verify Password
→ Generate JWT → Return Token → Store in localStorage
→ Redirect to Dashboard
```

### 2. Proposal Creation Flow
```
Dashboard → New Proposal → ProposalEditor
→ Client Info → Image Upload → AI Analysis
→ Measurements → Materials → Pricing
→ Save Proposal → Generate PDF → Send to Client
```

### 3. AI Image Analysis Flow
```
Upload Image → FileUpload.jsx → POST /api/vision/analyze
→ visionController → OpenAI GPT-4 Vision API
→ Extract Data (measurements, damage, materials)
→ Return Results → Update Proposal State
```

### 4. PDF Generation Flow
```
ProposalPreview → Generate PDF → POST /api/pdf/generate
→ pdfController → pdfService → PDFKit
→ Build PDF Document → Add Company Branding
→ Add Proposal Data → Stream to Client
```

### 5. Database Connection Flow (Railway)
```
Server Start → database.js → Read DATABASE_URL from Railway
→ Sequelize Connection → Railway PostgreSQL
→ SSL Connection (production) → Connection Pool
→ Auto-create Tables → Ready for Queries
```

## 💾 Database Schema

### Railway PostgreSQL Database

The application uses Railway's managed PostgreSQL database. Railway automatically provides connection details via environment variables.

### Database Tables

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### companies
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  license_number VARCHAR(100),
  website VARCHAR(255),
  logo_url VARCHAR(500),
  primary_color VARCHAR(7) DEFAULT '#2563eb',
  secondary_color VARCHAR(7) DEFAULT '#64748b',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### proposals
```sql
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  proposal_number VARCHAR(50) UNIQUE,
  status VARCHAR(50) DEFAULT 'draft',
  
  -- Client Information
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  client_phone VARCHAR(50),
  client_address TEXT,
  
  -- Property Information
  property_address TEXT,
  property_type VARCHAR(100),
  
  -- Measurements (JSONB for flexibility)
  measurements JSONB DEFAULT '{}',
  
  -- Materials (JSONB array)
  materials JSONB DEFAULT '[]',
  
  -- Labor
  labor_hours DECIMAL(10, 2) DEFAULT 0,
  labor_rate DECIMAL(10, 2) DEFAULT 75,
  
  -- Pricing
  materials_cost DECIMAL(10, 2) DEFAULT 0,
  labor_cost DECIMAL(10, 2) DEFAULT 0,
  overhead_percent DECIMAL(5, 2) DEFAULT 15,
  profit_percent DECIMAL(5, 2) DEFAULT 20,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) DEFAULT 0,
  
  -- Add-ons (JSONB array)
  addons JSONB DEFAULT '[]',
  
  -- Damage Areas (JSONB array)
  damage_areas JSONB DEFAULT '[]',
  
  -- Project Details
  timeline VARCHAR(255),
  warranty VARCHAR(255),
  notes TEXT,
  terms_conditions TEXT,
  
  -- Files (JSONB array)
  uploaded_files JSONB DEFAULT '[]',
  generated_pdf_url VARCHAR(500),
  
  -- Important Dates
  valid_until DATE,
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  responded_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### materials
```sql
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  subcategory VARCHAR(100),
  manufacturer VARCHAR(255),
  sku VARCHAR(100),
  unit VARCHAR(50) DEFAULT 'each',
  cost DECIMAL(10, 2),
  price DECIMAL(10, 2),
  description TEXT,
  specifications JSONB DEFAULT '{}',
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### migrations
```sql
CREATE TABLE migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Database Relationships

```
users (1) ──< (many) companies
companies (1) ──< (many) proposals
companies (1) ──< (many) materials
users (1) ──< (many) proposals
```

## 🔐 Security Architecture

### Authentication & Authorization
```
JWT Token Structure:
{
  "userId": "uuid",
  "email": "user@example.com",
  "companyId": "uuid",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Middleware Stack
```javascript
app.use(helmet());           // Security headers
app.use(cors());            // CORS configuration
app.use(express.json());    // JSON parsing
app.use(authenticate);      // JWT verification
app.use(authorize);         // Role-based access
app.use(errorHandler);      // Global error handling
```

### Railway Security Features
- SSL/TLS for database connections
- Environment variable encryption
- Automatic secret rotation
- Network isolation
- DDoS protection

## 🎨 Frontend Architecture

### Component Hierarchy
```
App.jsx
├── Login.jsx
├── Dashboard.jsx
│   └── ProposalList
└── ProposalEditor.jsx
    ├── ClientInfoTab.jsx
    │   ├── ClientInfo.jsx
    │   └── ProjectInfo.jsx
    ├── Upload.jsx
    │   ├── FileUpload.jsx
    │   └── FileList.jsx
    ├── AIAssistant.jsx
    ├── MeasurementsPanel.jsx
    │   ├── MeasurementCalculator.jsx
    │   └── DamageAreas.jsx
    ├── MaterialsList.jsx
    │   ├── QuoteSummary.jsx
    │   └── LaborCosts.jsx
    └── ProposalPreview.jsx
```

### State Management
```javascript
// Proposal Editor State Structure
{
  proposal: {
    id: null,
    clientInfo: {
      name: '',
      email: '',
      phone: '',
      address: ''
    },
    projectDetails: {
      type: '',
      urgency: '',
      timeline: ''
    },
    measurements: {
      totalArea: 0,
      pitch: '',
      sections: []
    },
    materials: [],
    pricing: {
      subtotal: 0,
      tax: 0,
      total: 0,
      profitMargin: 20
    },
    images: [],
    notes: ''
  },
  ui: {
    loading: false,
    error: null,
    activeTab: 'client'
  }
}
```

## 🔌 API Architecture

### RESTful Endpoints
```
Authentication:
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/verify

Proposals:
GET    /api/proposals          (list)
GET    /api/proposals/:id      (detail)
POST   /api/proposals          (create)
PUT    /api/proposals/:id      (update)
DELETE /api/proposals/:id      (delete)

AI Services:
POST   /api/vision/analyze     (image analysis)
POST   /api/ai/chat           (chat assistance)
POST   /api/ai/quick-setup    (quick proposal)

Company:
GET    /api/company/settings
PUT    /api/company/settings
GET    /api/company/branding
PUT    /api/company/branding
```

### Response Format
```javascript
// Success Response
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation successful"
}

// Error Response
{
  "success": false,
  "error": "Error message",
  "details": {
    // Additional error details
  }
}
```

## 🤖 AI Integration Architecture

### GPT-4 Vision Pipeline
```
1. Image Upload → Multer Processing
2. Image Optimization → Resize/Compress
3. Base64 Encoding → Prepare for API
4. OpenAI API Call → GPT-4 Vision
5. Response Parsing → Extract structured data
6. Data Validation → Ensure accuracy
7. Database Storage → Save to Railway PostgreSQL
8. Return to Client → Update UI
```

### Claude AI Integration
```
1. User Query → Chat Interface
2. Context Building → Include proposal data
3. Anthropic API Call → Claude AI
4. Response Processing → Format response
5. Action Extraction → Identify commands
6. Execute Actions → Update proposal
7. Return Response → Display in chat
```

## 🚀 Deployment Architecture

### Railway Deployment
```
GitHub Repository
    │
    ▼
Railway Platform
    ├── Web Service (Node.js)
    │   ├── Build: Nixpacks
    │   ├── Start: npm start
    │   └── Port: Auto-assigned
    ├── PostgreSQL Database
    │   ├── Auto-provisioned
    │   ├── DATABASE_URL auto-provided
    │   └── SSL enabled
    ├── Environment Variables
    │   ├── Service Variables (manual)
    │   └── Database Variables (auto)
    └── Custom Domain (optional)
```

### Build Process
```
1. Git Push → GitHub
2. Railway Webhook → Triggered
3. Nixpacks Build → Dependencies
4. Build Commands → npm install & build
5. Start Command → npm start
6. Health Check → Verify deployment
7. Traffic Switch → Route to new version
```

### Railway Environment Variables

#### Service Variables (Configured in Railway Dashboard)
- `NODE_ENV` - Environment (production)
- `JWT_SECRET` - Authentication secret
- `OPENAI_API_KEY` - GPT-4 Vision API key
- `ANTHROPIC_API_KEY` - Claude AI API key
- `GOOGLE_SHEETS_API_KEY` - Google Sheets integration
- `DATABASE_URL` - Primary database connection (auto-provided)

#### Database Variables (Auto-Provided by Railway)
Railway automatically provides these for the PostgreSQL service:
- `DATABASE_URL` - Primary connection string
- `DATABASE_PUBLIC_URL` - Public-facing connection URL
- `PGDATA` - PostgreSQL data directory
- `PGDATABASE` - Database name
- `PGHOST` - Database host
- `PGPASSWORD` - Database password
- `PGPORT` - Database port (usually 5432)
- `PGUSER` - Database user
- `POSTGRES_DB` - PostgreSQL database name
- `POSTGRES_PASSWORD` - PostgreSQL password
- `POSTGRES_USER` - PostgreSQL username
- `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` - Deployment configuration
- `SSL_CERT_DAYS` - SSL certificate validity

## 📊 Performance Considerations

### Caching Strategy
- Browser caching for static assets
- API response caching (future: Redis)
- Image CDN for uploaded files
- Memoization for expensive calculations

### Optimization Points
1. **Database Queries**
   - Index frequently queried columns
   - Use connection pooling (configured for Railway)
   - Implement query result caching
   - Use Sequelize eager loading

2. **File Uploads**
   - Client-side image compression
   - Progressive upload with chunks
   - Background processing for large files

3. **Frontend Performance**
   - Code splitting with React.lazy
   - Virtual scrolling for long lists
   - Debounced API calls
   - Optimistic UI updates

4. **Railway Optimization**
   - Connection pooling configured
   - SSL connection reuse
   - Automatic scaling (Railway handles)
   - Health checks for reliability

## 🔄 Scaling Considerations

### Horizontal Scaling
```
Railway Load Balancer
    ├── Server Instance 1
    ├── Server Instance 2
    └── Server Instance 3
         │
         ▼
    Railway PostgreSQL
    (Shared Database)
    (Auto-scaling)
```

### Future Enhancements
1. **Microservices Architecture**
   - Separate AI service
   - Independent PDF service
   - Dedicated file service

2. **Message Queue**
   - Async PDF generation
   - Email notifications
   - Background processing

3. **Real-time Features**
   - WebSocket for live updates
   - Collaborative editing
   - Push notifications

4. **Railway Features**
   - Multiple environments (staging/production)
   - Database replicas
   - CDN integration

## 🔍 Monitoring & Observability

### Logging Strategy
```javascript
// Structured logging
logger.info({
  action: 'proposal_created',
  userId: req.user.id,
  proposalId: proposal.id,
  timestamp: new Date()
});
```

### Metrics to Track
- API response times
- Error rates
- User activity
- AI API usage
- PDF generation time
- Database query performance
- Railway resource usage

### Health Checks
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: checkDatabase(),
    services: {
      openai: checkOpenAI(),
      anthropic: checkAnthropic()
    }
  });
});
```

### Railway Monitoring
- Railway dashboard provides:
  - Deployment logs
  - Resource usage (CPU, Memory)
  - Database metrics
  - Request/response times
  - Error tracking

## 🗄️ Database Architecture

### Railway PostgreSQL Connection
```javascript
// Automatic connection via DATABASE_URL
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false  // Railway SSL certificate
    }
  },
  pool: {
    max: 10,      // Maximum connections
    min: 2,       // Minimum connections
    acquire: 60000,
    idle: 30000
  }
});
```

### Connection Flow
1. Server starts
2. Reads `DATABASE_URL` from Railway environment
3. Establishes SSL connection to Railway PostgreSQL
4. Creates connection pool
5. Auto-creates tables if needed
6. Ready for queries

### Database Features
- **UUID Primary Keys** - Better for distributed systems
- **JSONB Fields** - Flexible schema for complex data
- **Indexes** - Optimized for common queries
- **Foreign Keys** - Data integrity
- **Triggers** - Auto-update timestamps
- **SSL** - Encrypted connections

## 🔒 Security Architecture

### Railway Security
- **SSL/TLS** - All database connections encrypted
- **Environment Variables** - Encrypted at rest
- **Network Isolation** - Services isolated
- **DDoS Protection** - Railway provides
- **Automatic Backups** - Railway manages

### Application Security
- **JWT Authentication** - Stateless auth
- **Password Hashing** - bcrypt with salt
- **Input Validation** - Server-side validation
- **SQL Injection Prevention** - Sequelize ORM
- **CORS Configuration** - Restricted origins
- **Rate Limiting** - (Future enhancement)

