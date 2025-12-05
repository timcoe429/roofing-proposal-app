# 📁 Project Structure

Complete breakdown of the roofing proposal app file organization and component responsibilities.

## Directory Overview

```
roofing-proposal-app/
├── client/                     # React frontend application
├── server/                     # Node.js/Express backend
├── database/                   # PostgreSQL migrations
├── docs/                       # Documentation
└── Configuration files         # Root config files
```

## Frontend Structure (client/)

### Components (`client/src/components/`)

#### AI Components
- **AIAssistant.jsx** - Claude AI chat interface
- **QuickSetup.jsx** - AI-powered quick proposal setup

#### Branding
- **CompanySettings.jsx** - Company branding configuration

#### Common
- **EditableField.jsx** - Reusable editable field component
- **LoadingSpinner.jsx** - Loading indicator

#### Layout
- **Header.jsx** - App header with navigation
- **Navigation.jsx** - Main navigation component

#### Materials
- **MaterialsList.jsx** - Material selection and management
- **LaborCosts.jsx** - Labor cost calculations
- **QuoteSummary.jsx** - Proposal summary display

#### Measurements
- **MeasurementCalculator.jsx** - Roof measurement calculations
- **DamageAreas.jsx** - Damage area tracking
- **MeasurementsPanel.jsx** - Main measurements interface

#### Preview
- **ProposalPreview.jsx** - PDF preview component

#### Pricing
- **PricingManager.jsx** - Pricing configuration
- **CompanyPricing.jsx** - Company-specific pricing settings

#### ProjectDetails
- **ClientInfo.jsx** - Client information form
- **ProjectInfo.jsx** - Project details form
- **ClientInfoTab.jsx** - Combined client/project tab

#### Upload
- **FileUpload.jsx** - File upload interface
- **FileList.jsx** - Uploaded files display

### Pages (`client/src/pages/`)
- **Dashboard.jsx** - Main dashboard with proposal list
- **Login.jsx** - Authentication page
- **ProposalEditor.jsx** - Main proposal editing interface
- **ProposalAcceptance.jsx** - Client proposal acceptance page

### Services (`client/src/services/`)
- **api.js** - Main API client configuration
- **visionAI.js** - GPT-4 Vision integration
- **pdfGenerator.js** - PDF generation service
- **locationService.js** - Geolocation services

### Utils (`client/src/utils/`)
- **calculations.js** - Roofing calculations
- **formatters.js** - Data formatting helpers
- **validators.js** - Input validation functions

## Backend Structure (server/)

### Controllers (`server/src/controllers/`)
- **authController.js** - Authentication handlers
- **proposalController.js** - Proposal CRUD operations
- **materialController.js** - Material management
- **companyController.js** - Company settings
- **aiController.js** - Claude AI integration
- **visionController.js** - GPT-4 Vision handlers
- **pdfController.js** - PDF generation

### Models (`server/src/models/`)
- **User.js** - User model and authentication
- **Proposal.js** - Proposal data model
- **Material.js** - Material definitions
- **Company.js** - Company settings model
- **Template.js** - Proposal templates

### Routes (`server/src/routes/`)
- **authRoutes.js** - `/api/auth/*` endpoints
- **proposalRoutes.js** - `/api/proposals/*` endpoints
- **materialRoutes.js** - `/api/materials/*` endpoints
- **companyRoutes.js** - `/api/company/*` endpoints
- **aiRoutes.js** - `/api/ai/*` endpoints
- **visionRoutes.js** - `/api/vision/*` endpoints
- **pdfRoutes.js** - `/api/pdf/*` endpoints
- **testRoutes.js** - Development test endpoints

### Services (`server/src/services/`)
- **openaiService.js** - OpenAI API integration
- **pdfService.js** - PDF generation logic
- **storageService.js** - File storage handling
- **googleSheetsService.js** - Google Sheets integration

### Config (`server/src/config/`)
- **database.js** - PostgreSQL configuration (Railway-aware)
- **openai.js** - OpenAI configuration

### Middleware (`server/src/middleware/`)
- **auth.js** - JWT authentication middleware
- **errorHandler.js** - Global error handling
- **upload.js** - File upload configuration

### Utils (`server/src/utils/`)
- **createTables.js** - Database table creation
- **runMigrations.js** - Migration runner
- **calculations.js** - Server-side calculations
- **formatters.js** - Data formatting
- **logger.js** - Logging utilities

## Database Structure (`database/`)

### Migrations
1. **001_create_users.sql** - User accounts table
2. **002_create_companies.sql** - Company settings
3. **003_create_proposals.sql** - Proposals table
4. **004_create_materials.sql** - Materials catalog
5. **005_create_templates.sql** - Proposal templates
6. **006_create_activity_logs.sql** - Activity tracking
7. **007_add_project_details_fields.sql** - Extended fields

### Seed Data
- **seed.sql** - Initial data for development

### Database Tables (PostgreSQL on Railway)

#### users
- User accounts and authentication
- Email, password hash, profile information
- Role-based access control

#### companies
- Company information and branding
- Owner relationship to users
- Settings and configuration

#### proposals
- Complete proposal data
- Client information
- Measurements, materials, pricing
- Status tracking and timestamps

#### materials
- Material catalog per company
- Pricing and specifications
- Categories and subcategories

#### migrations
- Tracks applied database migrations
- Ensures migration order and consistency

## Configuration Files

### Root Level
- **package.json** - Root package configuration
- **docker-compose.yml** - Docker development setup
- **railway.json** - Railway deployment config
- **nixpacks.toml** - Build configuration
- **.cursorrules** - AI assistant rules

### Client Configuration
- **client/package.json** - Frontend dependencies
- **client/public/index.html** - React entry point

### Server Configuration
- **server/package.json** - Backend dependencies
- **server/src/index.js** - Express server entry point
- **server/public/reset-password.html** - Password reset page

## Railway Configuration

### Railway Environment Variables

#### Service Variables (Application)
- `NODE_ENV` - Environment (development/production)
- `JWT_SECRET` - Authentication secret key
- `OPENAI_API_KEY` - GPT-4 Vision API key
- `ANTHROPIC_API_KEY` - Claude AI API key
- `GOOGLE_SHEETS_API_KEY` - Google Sheets integration
- `DATABASE_URL` - Primary database connection string

#### Database Variables (Railway PostgreSQL)
Railway automatically provides these for the PostgreSQL service:
- `DATABASE_URL` - Primary connection string
- `DATABASE_PUBLIC_URL` - Public-facing connection URL
- `PGDATA` - PostgreSQL data directory
- `PGDATABASE` - Database name
- `PGHOST` - Database host
- `PGPASSWORD` - Database password
- `PGPORT` - Database port
- `PGUSER` - Database user
- `POSTGRES_DB` - PostgreSQL database name
- `POSTGRES_PASSWORD` - PostgreSQL password
- `POSTGRES_USER` - PostgreSQL username
- `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` - Deployment configuration
- `SSL_CERT_DAYS` - SSL certificate validity

### Railway Deployment

The application is configured for Railway deployment:
- **Build**: Uses Nixpacks for automatic detection
- **Start Command**: `npm start` (runs server)
- **Database**: Railway PostgreSQL service automatically linked
- **Environment**: Variables configured in Railway dashboard
- **Auto-Deploy**: Git push to `main` triggers deployment

## Key File Relationships

### Proposal Creation Flow
1. `Login.jsx` → Authentication
2. `Dashboard.jsx` → Proposal list
3. `ProposalEditor.jsx` → Main editing interface
   - `ClientInfoTab.jsx` → Client details
   - `FileUpload.jsx` → Image uploads
   - `AIAssistant.jsx` → AI assistance
   - `MeasurementsPanel.jsx` → Measurements
   - `MaterialsList.jsx` → Materials
   - `PricingManager.jsx` → Pricing
4. `ProposalPreview.jsx` → PDF preview
5. `pdfController.js` → PDF generation

### AI Integration Flow
- Images → `visionController.js` → `openaiService.js` → GPT-4 Vision
- Chat → `aiController.js` → Claude AI
- Results → `ProposalEditor.jsx` → Updates proposal data

### Database Connection Flow
- Server starts → `database.js` → Reads `DATABASE_URL` from Railway
- Connection pool → Sequelize → PostgreSQL on Railway
- Migrations → `createTables.js` → Creates tables if needed

## Environment Variables

### Required for Development
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3001)
- `DATABASE_URL` - Database connection string (or individual DB_* vars)
- `JWT_SECRET` - Authentication secret key
- `OPENAI_API_KEY` - GPT-4 Vision access
- `ANTHROPIC_API_KEY` - Claude AI access

### Production (Railway)
- All development variables plus:
- `CLIENT_URL` - Frontend URL for CORS
- Railway auto-configures all PostgreSQL variables
- Railway manages `DATABASE_URL` automatically

## Database Connection

The application uses Railway's managed PostgreSQL database. The connection is configured in `server/src/config/database.js`:

- Automatically detects `DATABASE_URL` from Railway
- Configures SSL for production connections
- Sets up connection pooling for Railway
- Handles connection retries and timeouts
- Creates tables automatically on first connection

