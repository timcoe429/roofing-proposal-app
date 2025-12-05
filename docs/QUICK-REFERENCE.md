# ⚡ Quick Reference Guide

Fast lookup for common files, APIs, and commands in the roofing proposal app.

## 🔍 File Quick Finder

### Frontend Files

| What You Need | File Location |
|--------------|--------------|
| **Authentication/Login** | `client/src/pages/Login.jsx` |
| **Main Dashboard** | `client/src/pages/Dashboard.jsx` |
| **Proposal Editor** | `client/src/pages/ProposalEditor.jsx` |
| **AI Chat Interface** | `client/src/components/AI/AIAssistant.jsx` |
| **File Upload** | `client/src/components/Upload/FileUpload.jsx` |
| **Material List** | `client/src/components/Materials/MaterialsList.jsx` |
| **Measurements** | `client/src/components/Measurements/MeasurementsPanel.jsx` |
| **Client Info Form** | `client/src/components/ProjectDetails/ClientInfo.jsx` |
| **PDF Preview** | `client/src/components/Preview/ProposalPreview.jsx` |
| **API Client Config** | `client/src/services/api.js` |
| **Calculations** | `client/src/utils/calculations.js` |
| **Global Styles** | `client/src/styles/globals.css` |

### Backend Files

| What You Need | File Location |
|--------------|--------------|
| **Auth Logic** | `server/src/controllers/authController.js` |
| **Proposal CRUD** | `server/src/controllers/proposalController.js` |
| **GPT-4 Vision** | `server/src/controllers/visionController.js` |
| **Claude AI** | `server/src/controllers/aiController.js` |
| **PDF Generation** | `server/src/controllers/pdfController.js` |
| **Database Config** | `server/src/config/database.js` |
| **Auth Middleware** | `server/src/middleware/auth.js` |
| **User Model** | `server/src/models/User.js` |
| **Proposal Model** | `server/src/models/Proposal.js` |
| **Main Server** | `server/src/index.js` |

## 📡 API Endpoints

### Authentication
```javascript
POST /api/auth/register     // Create account
POST /api/auth/login        // Login
POST /api/auth/logout       // Logout
GET  /api/auth/verify       // Verify token
```

### Proposals
```javascript
GET    /api/proposals              // List all proposals
GET    /api/proposals/:id         // Get single proposal
POST   /api/proposals              // Create proposal
PUT    /api/proposals/:id         // Update proposal
DELETE /api/proposals/:id         // Delete proposal
GET    /api/proposals/:id/pdf     // Generate PDF
```

### AI Services
```javascript
POST /api/vision/analyze           // Analyze image with GPT-4
POST /api/ai/chat                 // Chat with Claude
POST /api/ai/quick-setup          // AI-powered quick setup
POST /api/ai/analyze-document     // Analyze uploaded document
```

### Materials & Pricing
```javascript
GET    /api/materials              // List materials
POST   /api/materials              // Add material
PUT    /api/materials/:id         // Update material
DELETE /api/materials/:id         // Delete material
GET    /api/company/pricing       // Get pricing settings
PUT    /api/company/pricing       // Update pricing
```

## 🛠️ Common Commands

### Development
```bash
# Start everything (client + server)
npm run dev

# Frontend only
cd client && npm start

# Backend only
cd server && npm run dev

# Install all dependencies
npm install && cd client && npm install && cd ../server && npm install
```

### Database
```bash
# Database tables are auto-created on server start
# Migrations run automatically via createTables.js

# Connect to Railway PostgreSQL (if needed)
railway connect postgres
```

### Deployment
```bash
# Deploy to Railway (auto-deploys on push)
git add .
git commit -m "your message"
git push origin main

# Check Railway deployment status
railway status

# View Railway logs
railway logs
```

## 🔧 Common Tasks

### Add a New Page
1. Create component in `client/src/pages/`
2. Add route in `client/src/App.jsx`
3. Add navigation link in `client/src/components/Layout/Navigation.jsx`

### Add a New API Endpoint
1. Create controller function in `server/src/controllers/`
2. Add route in `server/src/routes/`
3. Register route in `server/src/index.js`
4. Add API call in `client/src/services/api.js`

### Add a Database Table
1. Create migration SQL in `database/migrations/`
2. Update `server/src/utils/createTables.js` to include new table
3. Create model in `server/src/models/`
4. Tables auto-create on server restart

### Style a Component
1. Create CSS file: `ComponentName.css`
2. Import in component: `import './ComponentName.css'`
3. Use CSS variables from `client/src/styles/variables.css`

## 🐛 Debug Commands

### Check Railway Logs
```bash
# View all logs
railway logs

# Follow logs in real-time
railway logs --follow

# View logs for specific service
railway logs --service=web
```

### Test API Endpoints
```bash
# Test auth (local)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password"}'

# Test with token
curl http://localhost:3001/api/proposals \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test Railway endpoint
curl https://your-app.railway.app/api/health
```

### Database Queries (Railway)
```bash
# Connect to Railway PostgreSQL
railway connect postgres

# Then run SQL queries
SELECT * FROM users;
SELECT * FROM proposals WHERE "userId" = 1;
SELECT * FROM materials;
```

## 📝 Environment Variables

### Railway Service Variables
These are configured in Railway dashboard under "Variables":

```env
# Application
NODE_ENV=production
JWT_SECRET=your-secret-key-change-this
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_SHEETS_API_KEY=...

# Database (auto-provided by Railway)
DATABASE_URL=postgresql://user:pass@host:port/db
```

### Railway Database Variables (Auto-Provided)
Railway automatically provides these for PostgreSQL service:
- `DATABASE_URL` - Primary connection string
- `DATABASE_PUBLIC_URL` - Public connection URL
- `PGDATA` - PostgreSQL data directory
- `PGDATABASE` - Database name
- `PGHOST` - Database host
- `PGPASSWORD` - Database password
- `PGPORT` - Database port (usually 5432)
- `PGUSER` - Database user
- `POSTGRES_DB` - PostgreSQL database name
- `POSTGRES_PASSWORD` - PostgreSQL password
- `POSTGRES_USER` - PostgreSQL username
- `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` - Deployment config
- `SSL_CERT_DAYS` - SSL certificate validity

### Local Development Variables
```env
# Server
NODE_ENV=development
PORT=3001
JWT_SECRET=dev-secret-key

# Database (local PostgreSQL)
DATABASE_URL=postgresql://postgres:password@localhost:5432/roofing_proposals
# OR use individual variables:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=roofing_proposals
DB_USER=postgres
DB_PASSWORD=password

# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Client
CLIENT_URL=http://localhost:3000
```

## 🎨 CSS Classes & Variables

### Common CSS Variables
```css
/* From client/src/styles/variables.css */
--primary-color: #2563eb;
--secondary-color: #10b981;
--danger-color: #ef4444;
--background: #f9fafb;
--text-primary: #111827;
--border-radius: 8px;
```

### Common Component Classes
```css
.container      /* Main container */
.card          /* Card component */
.btn           /* Button */
.btn-primary   /* Primary button */
.form-group    /* Form field wrapper */
.input         /* Input field */
```

## 🔄 State Management

### Local Storage Keys
```javascript
'token'        // JWT token
'user'         // User object
'companyInfo'  // Company settings
```

### API Response Format
```javascript
// Success
{
  success: true,
  data: { /* response data */ }
}

// Error
{
  success: false,
  error: "Error message"
}
```

## 📦 Key Dependencies

### Frontend
- react: ^18.2.0
- react-router-dom: ^6.x
- axios: ^1.x
- react-icons: ^4.x

### Backend
- express: ^4.18.x
- jsonwebtoken: ^9.x
- bcryptjs: ^2.x
- multer: ^1.x
- pdfkit: ^0.13.x
- sequelize: ^6.x (PostgreSQL ORM)
- openai: ^4.x
- @anthropic-ai/sdk: ^0.x

## 🚀 Railway Specific

### Auto-deployed Branches
- `main` → Production (auto-deploys)

### Railway CLI Commands
```bash
# Login to Railway
railway login

# Link to project
railway link

# View logs
railway logs

# Run command in Railway environment
railway run npm run dev

# Connect to database
railway connect postgres

# View environment variables
railway variables
```

### Check Deployment Status
- Visit Railway dashboard: https://railway.app
- Check deployment logs in dashboard
- Monitor database metrics
- View service health status

### Railway Database Connection
The app automatically connects to Railway PostgreSQL using:
- `DATABASE_URL` environment variable (auto-provided)
- SSL connection in production
- Connection pooling configured for Railway
- Automatic retry on connection failures

## 🗄️ Database Tables Quick Reference

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | id, email, password_hash, first_name, last_name |
| `companies` | Company info | id, owner_id, name, logo_url, settings |
| `proposals` | Proposal data | id, company_id, user_id, client_name, materials, pricing |
| `materials` | Material catalog | id, company_id, name, category, price, cost |
| `migrations` | Migration tracking | id, name, applied_at |

## 🔍 Troubleshooting Quick Fixes

### Database Connection Issues
```bash
# Check Railway database is running
railway status

# Verify DATABASE_URL is set
railway variables | grep DATABASE_URL

# Test connection
railway connect postgres
```

### API Not Responding
```bash
# Check server logs
railway logs --service=web

# Verify environment variables
railway variables

# Check deployment status
railway status
```

### Frontend Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules client/node_modules
npm install && cd client && npm install

# Check for TypeScript errors
cd client && npm run build
```

