# 🏠 Roofing Proposal App

An AI-powered roofing proposal generator that streamlines the creation of professional roofing estimates using GPT-4 Vision for image analysis and Claude AI for intelligent assistance.

## 🚀 Quick Start

```bash
# Install dependencies
npm install
cd client && npm install
cd ../server && npm install

# Run in development
npm run dev

# Deploy to Railway
git push origin main
```

## 📚 Documentation

- **[Project Structure](./docs/PROJECT-STRUCTURE.md)** - Complete file organization and component breakdown
- **[Quick Reference](./docs/QUICK-REFERENCE.md)** - Fast lookup for files, APIs, and commands
- **[Development Notes](./docs/DEVELOPMENT-NOTES.md)** - Code patterns, testing, and common issues
- **[Architecture](./docs/ARCHITECTURE.md)** - System design and data flow
- **[Setup Guide](./SETUP.md)** - Detailed deployment and configuration

## ✨ Features

### AI-Powered Analysis
- **GPT-4 Vision**: Analyzes roof photos for measurements, damage areas, and materials
- **Claude AI Assistant**: Provides intelligent roofing assistance and document processing

### Complete Proposal System
- Client information management
- Automated material calculations
- Dynamic pricing integration
- Professional PDF generation
- Company branding customization

## 🛠️ Tech Stack

### Frontend (Client)
- **React 18** - UI framework
- **React Router** - Navigation
- **CSS Modules** - Styling
- **Axios** - API communication

### Backend (Server)
- **Node.js/Express** - Server framework
- **PostgreSQL** - Database (hosted on Railway)
- **JWT** - Authentication
- **Multer** - File uploads
- **PDFKit** - PDF generation

### AI Integration
- **OpenAI GPT-4 Vision** - Image analysis
- **Anthropic Claude** - Chat assistance

### Deployment & Infrastructure
- **Railway** - Production hosting and deployment platform
- **Railway PostgreSQL** - Managed PostgreSQL database
- **Railway Environment Variables** - Secure configuration management

## 🏗️ Project Structure

```
roofing-proposal-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   └── utils/        # Helper functions
├── server/                # Node.js backend
│   ├── src/
│   │   ├── controllers/  # Route handlers
│   │   ├── models/       # Database models
│   │   ├── routes/       # API routes
│   │   └── services/     # Business logic
├── database/             # SQL migrations
└── docs/                 # Documentation
```

## 🔧 Development

```bash
# Start development servers
npm run dev

# Run client only
npm run client:dev

# Run server only
npm run server:dev
```

## 📦 API Endpoints

| Endpoint | Method | Description |
|----------|---------|------------|
| `/api/auth/login` | POST | User authentication |
| `/api/auth/register` | POST | Create new account |
| `/api/proposals` | GET | List proposals |
| `/api/proposals/:id` | GET | Get specific proposal |
| `/api/vision/analyze` | POST | Analyze images with GPT-4 |
| `/api/ai/chat` | POST | Chat with Claude AI |

## 🗄️ Database

This project uses **PostgreSQL hosted on Railway**. The database is automatically provisioned when you deploy to Railway.

### Database Tables
- `users` - User accounts and authentication
- `companies` - Company information and settings
- `proposals` - Proposal data and calculations
- `materials` - Material catalog and pricing
- `migrations` - Database migration tracking

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for complete database schema.

## 🔒 Security

- JWT-based authentication
- Bcrypt password hashing
- Protected API routes
- CORS configuration
- Environment variable protection
- Railway-managed secrets

## 🚀 Deployment

This app is fully built and deployed on **Railway**:

1. **Database**: Railway automatically provisions PostgreSQL
2. **Environment Variables**: Configured in Railway dashboard
3. **Auto-Deploy**: Pushes to `main` branch trigger automatic deployments
4. **Build**: Railway uses Nixpacks for automatic build detection

### Railway Configuration

The project uses Railway's managed PostgreSQL database. All database connection details are automatically provided via Railway environment variables:

- `DATABASE_URL` - Primary database connection string
- `DATABASE_PUBLIC_URL` - Public-facing database URL
- Railway also provides standard PostgreSQL variables (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, etc.)

See [SETUP.md](./SETUP.md) for detailed deployment instructions.

## 📝 License

Private and Proprietary

## 🤝 Support

For issues or questions about this roofing proposal app, please contact the development team.
