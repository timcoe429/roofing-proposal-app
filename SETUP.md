# Roofing Proposal App Setup Guide (Railway Deployment)

## 🚀 Quick Start for Railway

### 1. Required Environment Variables

**Location:** Railway Dashboard → Your Application Service → Variables Tab

Add these environment variables to your **Application Service** (not the Postgres service):

| Variable | Required | Description | Where to Get It |
|----------|----------|-------------|-----------------|
| `NODE_ENV` | ✅ | Environment mode | Set to `production` |
| `JWT_SECRET` | ✅ | Authentication secret | Generate a strong random string |
| `ANTHROPIC_API_KEY` | ✅ | Claude AI API key | [Anthropic Console](https://console.anthropic.com/) |
| `OPENAI_API_KEY` | ✅ | GPT-4 Vision API key | [OpenAI Platform](https://platform.openai.com/) |
| `GOOGLE_SHEETS_API_KEY` | ✅ | Google Sheets integration | [Google Cloud Console](https://console.cloud.google.com/) |
| `DATABASE_URL` | ✅ | Database connection | Reference from Postgres service (see below) |

**Quick Copy-Paste Format:**
```bash
# Required Environment Variables (Application Service)
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_SHEETS_API_KEY=...
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

**Note:** For `DATABASE_URL`, use Railway's variable reference: `${{Postgres.DATABASE_URL}}` to automatically link to your Postgres service.

### 2. Get API Keys

#### OpenAI API Key (for GPT-4 Vision)
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy the key to Railway environment variables

#### Anthropic API Key (for Claude AI)
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy the key to Railway environment variables

### 3. Database Setup

Railway should automatically provision a PostgreSQL database. The connection details will be available in your Railway dashboard.

### 4. Deploy

Railway will automatically deploy when you push to your connected Git repository.

## 👤 Creating Your Account

### Option 1: Through the App
1. Go to your Railway app URL
2. Click "Create Account" or "Sign Up"
3. Fill in your information:
   - First Name
   - Last Name
   - Email
   - Password
   - Company Name (optional)
4. Click "Create Account"

### Option 2: Direct API Call
```bash
curl -X POST https://your-app-domain.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe", 
    "email": "john@yourcompany.com",
    "password": "your_password",
    "companyName": "Your Roofing Company"
  }'
```

## 🔧 Troubleshooting

### Account Creation Failed
- Check that Railway deployment is successful
- Verify database connection in Railway logs
- Check Railway logs for errors
- Ensure all required environment variables are set

### AI Services Not Working
- Verify API keys are correct in Railway environment variables
- Check that API keys have sufficient credits
- Ensure Railway can reach OpenAI/Anthropic APIs
- Check Railway logs for API errors

### Database Issues
- Verify PostgreSQL is running in Railway
- Check database credentials in Railway environment variables
- Check Railway logs for database errors

## 🌟 Features

### GPT-4 Vision (Image Analysis)
- Analyze roof photos for measurements
- Identify damage areas and severity
- Extract material information
- Process measurement reports

### Claude AI (Data Analysis & Chat)
- Intelligent roofing assistance
- Document analysis (Excel, Word, PDF)
- Pricing sheet processing
- Project recommendations
- Natural language chat

### Complete Proposal System
- Client information management
- Material calculations
- Pricing integration
- Professional PDF generation
- Company branding

## 📱 Usage

1. **Upload Photos**: Use the Upload tab to add roof images
2. **AI Analysis**: Let GPT-4 Vision analyze your photos
3. **Get Help**: Chat with Claude AI for assistance
4. **Build Proposal**: Fill in client and project details
5. **Generate PDF**: Create professional proposals
6. **Customize**: Set your company branding and pricing

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- Protected API routes
- CORS configuration
- Environment variable protection

## 🚀 Railway Deployment Tips

1. Set `NODE_ENV=production`
2. Use strong JWT secret
3. Railway automatically handles HTTPS
4. Configure proper CORS origins for your domain
5. Use Railway environment variables for sensitive data
6. Monitor Railway logs for any issues
