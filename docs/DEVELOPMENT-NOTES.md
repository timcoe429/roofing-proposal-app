# 📝 Development Notes

Code patterns, testing procedures, and solutions to common issues in the roofing proposal app.

## 🎯 Code Patterns

### React Component Pattern
```javascript
// Standard functional component structure
import React, { useState, useEffect } from 'react';
import './ComponentName.css';

const ComponentName = ({ prop1, prop2 }) => {
  const [state, setState] = useState(initialValue);
  
  useEffect(() => {
    // Side effects
  }, [dependencies]);
  
  const handleAction = async () => {
    try {
      // Action logic
    } catch (error) {
      console.error('Error:', error);
    }
  };
  
  return (
    <div className="component-name">
      {/* JSX content */}
    </div>
  );
};

export default ComponentName;
```

### API Service Pattern
```javascript
// client/src/services/api.js pattern
export const apiMethod = async (params) => {
  try {
    const response = await api.post('/endpoint', params);
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};
```

### Express Controller Pattern
```javascript
// server/src/controllers pattern
exports.controllerMethod = async (req, res) => {
  try {
    const { param1, param2 } = req.body;
    
    // Validation
    if (!param1) {
      return res.status(400).json({
        success: false,
        error: 'Parameter required'
      });
    }
    
    // Business logic
    const result = await someOperation();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};
```

### Database Model Pattern (Sequelize)
```javascript
// server/src/models pattern
import sequelize from '../config/database.js';
import { DataTypes } from 'sequelize';

const ModelName = sequelize.define('ModelName', {
  field1: {
    type: DataTypes.STRING,
    allowNull: false
  },
  field2: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'table_name',
  timestamps: true
});

export default ModelName;
```

### Railway Database Connection Pattern
```javascript
// server/src/config/database.js
// Automatically uses Railway DATABASE_URL
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  },
  pool: {
    max: 10,
    min: 2,
    acquire: 60000,
    idle: 30000
  }
});
```

## ✅ Testing Checklist

### Before Pushing Code
- [ ] Test in **production on Railway** (deploy, then verify in the live app)
- [ ] Check console for errors
- [ ] Verify API endpoints work
- [ ] Test on different screen sizes
- [ ] Verify authentication flow
- [ ] Check PDF generation
- [ ] Test AI features with real data
- [ ] Verify Railway database connection
- [ ] Test environment variables are loaded

### Manual Testing Flow
1. **Authentication**
   - Register new account
   - Login/logout
   - Protected routes redirect
   - Token expiration handling

2. **Proposal Creation**
   - Create new proposal
   - Add client information
   - Upload images
   - Add measurements
   - Select materials
   - Set pricing
   - Generate PDF

3. **AI Features**
   - Upload and analyze image
   - Chat with AI assistant
   - Quick setup flow

4. **Data Persistence**
   - Save proposal
   - Reload page
   - Verify data persists in Railway PostgreSQL

5. **Railway Deployment**
   - Push to main branch
   - Verify auto-deployment
   - Check Railway logs
   - Test production endpoints

## 🐛 Common Issues & Solutions

### Issue: CORS Errors
**Symptom:** "Access to XMLHttpRequest blocked by CORS policy"

**Solution:**
```javascript
// server/src/index.js
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
```

### Issue: Railway Database Connection Failed
**Symptom:** "Connection terminated unexpectedly" or "Unable to connect to database"

**Solution:**
```javascript
// Verify DATABASE_URL is set in Railway
// Check Railway dashboard → Variables → DATABASE_URL

// Ensure SSL is configured for production
dialectOptions: {
  ssl: process.env.NODE_ENV === 'production' ? {
    require: true,
    rejectUnauthorized: false
  } : false
}
```

### Issue: JWT Token Expiration
**Symptom:** User gets logged out unexpectedly

**Solution:**
```javascript
// Check token expiration and refresh
const isTokenExpired = (token) => {
  const decoded = jwt.decode(token);
  return decoded.exp < Date.now() / 1000;
};

// Implement token refresh logic
```

### Issue: File Upload Size Limit
**Symptom:** "PayloadTooLargeError"

**Solution:**
```javascript
// server/src/middleware/upload.js
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Also increase Express body limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
```

### Issue: Railway Environment Variables Not Loading
**Symptom:** Variables undefined in production

**Solution:**
```bash
# Check variables in Railway dashboard
railway variables

# Verify variable names match exactly
# Railway auto-provides DATABASE_URL for PostgreSQL service
```

### Issue: PDF Generation Memory Issues
**Symptom:** Server crashes during PDF generation

**Solution:**
```javascript
// Stream the PDF instead of buffering
const stream = doc.pipe(res);
doc.end();
stream.on('finish', () => {
  console.log('PDF sent successfully');
});
```

### Issue: Sequelize Connection Pool Exhausted
**Symptom:** "Too many connections" error

**Solution:**
```javascript
// Adjust pool settings in database.js
pool: {
  max: 10,        // Maximum connections
  min: 2,         // Minimum connections
  acquire: 60000, // Timeout for getting connection
  idle: 30000     // Idle time before release
}
```

## 🔐 Security Best Practices

### Input Validation
```javascript
// Always validate and sanitize input
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// SQL injection prevention (Sequelize handles this)
const user = await User.findOne({
  where: { email: sanitizedEmail }
});
```

### Authentication Checks
```javascript
// Middleware for protected routes
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }
  
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
};
```

### Railway Security
- Never commit `.env` files
- Use Railway Variables for secrets
- Enable SSL for database connections
- Use strong JWT secrets
- Regularly rotate API keys

## 🎨 UI/UX Guidelines

### Component Styling
- Use CSS modules for component-specific styles
- Follow BEM naming convention for classes
- Use CSS variables for consistent theming
- Mobile-first responsive design

### Form Design
```css
/* Consistent form styling */
.form-group {
  margin-bottom: 1.5rem;
}

.input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
}

.input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
```

### Loading States
```javascript
// Always show loading state during async operations
const [loading, setLoading] = useState(false);

const handleSubmit = async () => {
  setLoading(true);
  try {
    await someAsyncOperation();
  } finally {
    setLoading(false);
  }
};

return loading ? <LoadingSpinner /> : <Content />;
```

## 🔄 State Management Tips

### Local State vs Global State
- Use local state for component-specific data
- Use context or props for shared data
- Store auth token in localStorage
- Clear sensitive data on logout

### Optimistic Updates
```javascript
// Update UI before API call for better UX
const handleUpdate = async (newData) => {
  // Optimistic update
  setLocalData(newData);
  
  try {
    await api.updateData(newData);
  } catch (error) {
    // Revert on error
    setLocalData(previousData);
    showError('Update failed');
  }
};
```

## 🚀 Performance Optimization

### Image Optimization
- Compress images before upload
- Use lazy loading for images
- Implement image caching

### Code Splitting
```javascript
// Lazy load heavy components
const ProposalEditor = lazy(() => import('./pages/ProposalEditor'));

// Use Suspense
<Suspense fallback={<LoadingSpinner />}>
  <ProposalEditor />
</Suspense>
```

### API Call Optimization
- Debounce search inputs
- Cache frequently accessed data
- Implement pagination for lists
- Use React Query for data fetching (future enhancement)

### Database Optimization
- Index frequently queried columns
- Use connection pooling (already configured)
- Implement query result caching
- Use Sequelize eager loading for relationships

## 📊 Monitoring & Debugging

### Console Logging Strategy
```javascript
// Development logging
if (process.env.NODE_ENV === 'development') {
  console.log('Debug:', data);
}

// Error logging
console.error('Error:', error.message, error.stack);
```

### Railway Logs
```bash
# View real-time logs
railway logs

# Follow logs
railway logs --follow

# View specific service
railway logs --service=web
```

### Performance Monitoring
- Check React DevTools Profiler
- Monitor Network tab for API calls
- Use Lighthouse for performance audits
- Monitor Railway metrics dashboard

### Database Monitoring
```bash
# Connect to Railway PostgreSQL
railway connect postgres

# Check table sizes
SELECT pg_size_pretty(pg_total_relation_size('proposals'));

# Check active connections
SELECT count(*) FROM pg_stat_activity;
```

## 🔨 Build & Deploy

### Pre-deployment Checklist
- [ ] Update environment variables in Railway
- [ ] Run build locally to check for errors
- [ ] Test production build
- [ ] Check for console errors
- [ ] Verify all features work
- [ ] Test Railway database connection
- [ ] Verify API keys are set

### Build Commands
```bash
# Build frontend
cd client && npm run build

# Test production build locally
npm run start
```

### Railway Deployment Process
1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "your changes"
   git push origin main
   ```

2. **Railway Auto-Deploys**
   - Railway detects push to `main`
   - Runs build process (Nixpacks)
   - Installs dependencies
   - Runs start command
   - Health check verifies deployment

3. **Verify Deployment**
   - Check Railway dashboard
   - View deployment logs
   - Test production endpoints
   - Verify database connection

### Railway Environment Setup
1. Go to Railway dashboard
2. Select your project
3. Go to "Variables" tab
4. Add required variables:
   - `NODE_ENV=production`
   - `JWT_SECRET` (strong random string)
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `GOOGLE_SHEETS_API_KEY` (if used)
5. Railway auto-provides `DATABASE_URL` for PostgreSQL service

## 🗄️ Database Management

### Railway PostgreSQL Access
```bash
# Connect via Railway CLI
railway connect postgres

# Or use connection string from Railway dashboard
# DATABASE_URL is auto-provided
```

### Running Migrations
- Migrations run automatically via `createTables.js` on server start
- Tables are created if they don't exist
- No manual migration needed for Railway

### Database Backup
- Railway provides automatic backups
- Check Railway dashboard → Database → Backups
- Can restore from Railway dashboard

## 📚 Learning Resources

### Key Technologies
- [React Documentation](https://react.dev)
- [Express.js Guide](https://expressjs.com)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Sequelize Documentation](https://sequelize.org)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Anthropic Claude API](https://docs.anthropic.com)

### Railway Deployment
- [Railway Docs](https://docs.railway.app)
- [Railway PostgreSQL Guide](https://docs.railway.app/postgres)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [Railway CLI Reference](https://docs.railway.app/develop/cli)

