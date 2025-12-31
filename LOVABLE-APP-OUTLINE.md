# 🏠 Roofing Proposal App - Complete Functional Outline

## 📋 Table of Contents
1. [App Overview](#app-overview)
2. [Core Purpose & Goals](#core-purpose--goals)
3. [System Architecture](#system-architecture)
4. [User Roles & Authentication](#user-roles--authentication)
5. [Complete Feature Breakdown](#complete-feature-breakdown)
6. [Data Models & Database Schema](#data-models--database-schema)
7. [AI Integration Details](#ai-integration-details)
8. [User Workflows & Processes](#user-workflows--processes)
9. [Technical Implementation Details](#technical-implementation-details)
10. [UI/UX Specifications](#uiux-specifications)
11. [API Endpoints & Data Flow](#api-endpoints--data-flow)
12. [Deployment & Infrastructure](#deployment--infrastructure)

---

## 🎯 App Overview

### What This App Does
The **Roofing Proposal App** is an AI-powered web application designed specifically for roofing contractors to create, manage, and deliver professional roofing proposals to clients. It combines artificial intelligence (GPT-4 Vision and Claude AI) with traditional proposal management to streamline the entire proposal creation process from initial client contact to final PDF delivery.

### Primary Use Case
A roofing contractor needs to:
1. Meet with a client about a roofing project
2. Take photos of the roof
3. Upload those photos to the app
4. Use AI to analyze the photos and extract measurements, damage areas, and material requirements
5. Chat with an AI assistant to refine the proposal
6. Generate a professional PDF proposal with company branding
7. Send it to the client

### Target Users
- **Primary**: Roofing contractors and roofing companies
- **Secondary**: Sales teams, estimators, project managers in roofing companies
- **Tertiary**: Clients (view-only access to proposals)

---

## 🎯 Core Purpose & Goals

### Business Goals
1. **Speed**: Reduce proposal creation time from hours to minutes
2. **Accuracy**: Use AI to extract precise measurements and identify damage
3. **Professionalism**: Generate polished, branded PDF proposals automatically
4. **Efficiency**: Eliminate manual calculations and repetitive data entry
5. **Scalability**: Handle multiple proposals simultaneously

### User Goals
1. Create professional proposals quickly
2. Get accurate measurements from photos
3. Calculate material costs automatically
4. Generate branded PDFs ready for clients
5. Track proposal status and history
6. Manage company branding and pricing

### Technical Goals
1. Real-time AI-powered analysis
2. Seamless file upload and processing
3. Auto-save functionality
4. Responsive web interface
5. Secure authentication and data storage
6. Production-ready deployment on Railway

---

## 🏗️ System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────┐
│                  React Frontend (Client)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Pages   │ │Components│ │ Services │ │  Utils   │  │
│  │          │ │          │ │          │ │          │  │
│  │Dashboard │ │AIAssistant│ │   API    │ │Calculations│ │
│  │Editor    │ │Materials │ │  Client  │ │Formatters │ │
│  │Login     │ │Preview   │ │          │ │Validators │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP/HTTPS (REST API)
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Node.js/Express Backend (Server)            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Routes  │ │Controller│ │ Services │ │Middleware│  │
│  │          │ │          │ │          │ │          │  │
│  │  Auth    │ │ Proposal │ │ OpenAI   │ │   Auth   │  │
│  │ Proposal │ │   AI     │ │ Claude   │ │  Error   │  │
│  │ Material │ │   PDF    │ │  Sheets  │ │  Upload  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└────────┬──────────────────┬─────────────────┬───────────┘
         │                  │                  │
         ▼                  ▼                  ▼
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │Railway    │      │ OpenAI  │      │Anthropic │
   │PostgreSQL │      │   API   │      │   API    │
   └──────────┘      └──────────┘      └──────────┘
```

### Technology Stack

#### Frontend
- **React 18** - UI framework
- **React Router** - Client-side routing
- **React Query (@tanstack/react-query)** - Data fetching and caching
- **Axios** - HTTP client
- **CSS Modules** - Component styling
- **React Hot Toast** - Notifications
- **Lucide React** - Icons

#### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Sequelize** - PostgreSQL ORM
- **JWT (jsonwebtoken)** - Authentication
- **Bcrypt** - Password hashing
- **Multer** - File upload handling
- **PDFKit** - PDF generation
- **Node-fetch** - HTTP requests

#### Database
- **PostgreSQL** - Relational database (hosted on Railway)
- **UUID** - Primary keys
- **JSONB** - Flexible data storage for complex fields

#### AI Services
- **OpenAI GPT-4 Vision** - Image analysis
- **Anthropic Claude** - Chat assistance and document processing

#### Deployment
- **Railway** - Hosting platform
- **Railway PostgreSQL** - Managed database
- **Nixpacks** - Build system

---

## 👥 User Roles & Authentication

### User Roles
1. **User** (default)
   - Create and manage own proposals
   - Access own company settings
   - View own materials catalog

2. **Admin**
   - All user permissions
   - Access to user management
   - System-wide settings
   - API testing tools

### Authentication Flow
```
1. User visits app → Redirected to Login page if not authenticated
2. User enters email/password → POST /api/auth/login
3. Server validates credentials → Checks database
4. Server generates JWT token → Includes userId, email, companyId
5. Token returned to client → Stored in localStorage
6. Token included in all API requests → Authorization header
7. Protected routes check token → Middleware validates JWT
8. Token expires → User redirected to login
```

### Authentication Features
- **Registration**: Create new account with email/password
- **Login**: Email/password authentication
- **Logout**: Clear token and redirect
- **Token Verification**: Check if token is valid
- **Protected Routes**: Require authentication
- **Auto-logout**: On token expiration

### Security Features
- Passwords hashed with bcrypt
- JWT tokens with expiration
- CORS configuration
- Input validation
- SQL injection prevention (Sequelize ORM)
- Environment variable protection

---

## 🎨 Complete Feature Breakdown

### 1. Authentication System

#### Login Page (`Login.jsx`)
- **Purpose**: User authentication entry point
- **Features**:
  - Email/password login form
  - "Create Account" option
  - Error handling and display
  - Redirect to dashboard on success
  - Remember user session (localStorage)

#### Registration
- **Fields**: First name, last name, email, password, company name (optional)
- **Validation**: Email format, password strength
- **Process**: Creates user account and company record
- **Auto-login**: After successful registration

### 2. Dashboard (`Dashboard.jsx`)

#### Main Dashboard View
- **Purpose**: Central hub for all proposals
- **Features**:
  - List of all proposals (table/card view)
  - Proposal statistics (total count, total value)
  - Quick actions (create new proposal)
  - Search/filter proposals
  - Proposal status indicators
  - Date sorting

#### Proposal List Display
- **Columns/Fields**:
  - Proposal number
  - Client name
  - Property address
  - Total amount
  - Status (draft, sent, accepted, rejected)
  - Created date
  - Last updated
  - Actions (view, edit, delete, generate PDF)

#### Dashboard Actions
- **Create New Proposal**: Navigate to ProposalEditor
- **View Proposal**: Open in read-only or edit mode
- **Delete Proposal**: Remove with confirmation
- **Generate PDF**: Download proposal as PDF
- **Settings**: Access company settings
- **Logout**: End session

#### Admin Features (if admin role)
- **User Management**: View/manage users
- **API Tester**: Test API endpoints
- **System Settings**: Global configuration

### 3. Proposal Editor (`ProposalEditor.jsx`)

#### Main Editor Interface
- **Purpose**: Create and edit roofing proposals
- **Layout**: Split-pane design
  - **Left Panel (60%)**: AI Assistant chat interface
  - **Right Panel (40%)**: Live preview of proposal

#### Proposal Data Structure
```javascript
{
  // Client Information
  clientName: string,
  clientEmail: string,
  clientPhone: string,
  clientAddress: string,
  
  // Property Information
  propertyAddress: string,
  propertyCity: string,
  propertyState: string,
  propertyZip: string,
  projectType: string, // 'repair', 'replacement', 'new_construction'
  materialType: string,
  roofSize: string,
  specialRequirements: string,
  urgency: 'standard' | 'urgent' | 'emergency',
  
  // Measurements
  measurements: {
    totalSquares: number,      // Roofing squares (1 square = 100 sq ft)
    ridgeLength: number,       // Linear feet
    valleyLength: number,      // Linear feet
    edgeLength: number,         // Linear feet
    pitch: string,             // e.g., "6/12"
    layers: number,            // Existing roof layers
    penetrations: number,      // Vents, chimneys, etc.
    skylights: number
  },
  
  // Materials Array
  materials: [
    {
      id: string,
      name: string,
      category: string,
      quantity: number,
      unit: string,
      unitPrice: number,
      totalPrice: number,
      notes: string
    }
  ],
  
  // Labor
  laborHours: number,
  laborRate: number,          // Per hour
  
  // Add-ons
  addOns: [
    {
      id: string,
      name: string,
      description: string,
      quantity: number,
      unitPrice: number,
      totalPrice: number
    }
  ],
  
  // Damage Areas
  damageAreas: [
    {
      id: string,
      location: string,
      description: string,
      severity: 'minor' | 'moderate' | 'severe',
      estimatedCost: number
    }
  ],
  
  // Project Details
  timeline: string,
  warranty: string,
  notes: string,
  
  // Files
  uploadedFiles: [
    {
      id: string,
      name: string,
      url: string,
      type: string,
      size: number,
      uploadedAt: timestamp
    }
  ],
  
  // AI Chat History (persisted)
  aiChatHistory: [
    {
      type: 'user' | 'assistant',
      content: string,
      timestamp: ISO string
    }
  ]
}
```

#### Auto-Save Functionality
- **Trigger**: Changes detected in proposal data
- **Debounce**: 10 seconds after last change
- **Silent**: No popup notification
- **Manual Save**: User can click save button
- **Before Unload**: Warns if unsaved changes

#### Proposal Status
- **Draft**: In progress, not sent
- **Sent**: Emailed to client
- **Viewed**: Client opened proposal
- **Accepted**: Client approved
- **Rejected**: Client declined
- **Expired**: Past valid date

### 4. AI Assistant (`AIAssistant.jsx`)

#### Chat Interface
- **Purpose**: Natural language interaction for proposal management
- **Features**:
  - Text input for messages
  - Image paste/upload support
  - Conversation history display
  - Quick action buttons
  - Location-aware suggestions
  - Real-time typing indicators

#### AI Capabilities

##### 1. Image Analysis (GPT-4 Vision)
- **Input**: Roof photos (uploaded or pasted)
- **Output**: 
  - Measurements (area, pitch, dimensions)
  - Damage identification and severity
  - Material recommendations
  - Structural observations
- **Process**:
  1. User uploads/pastes image
  2. Image converted to base64
  3. Sent to GPT-4 Vision API
  4. AI analyzes image
  5. Results parsed and extracted
  6. Proposal data updated automatically

##### 2. Chat Assistance (Claude AI)
- **Input**: User messages + proposal context
- **Output**: 
  - Answers to roofing questions
  - Proposal recommendations
  - Material calculations
  - Pricing suggestions
  - Project timeline estimates
- **Context Awareness**:
  - Current proposal data
  - Company pricing sheets
  - Location-specific knowledge
  - Conversation history
  - Material catalog

##### 3. Proposal Generation
- **Quick Setup**: AI creates proposal from minimal input
- **Auto-population**: Fills in measurements, materials, pricing
- **Validation**: Checks for missing required fields
- **Suggestions**: Recommends materials based on project type

#### Quick Actions
Pre-defined buttons for common tasks:
- **Add Item**: Add materials, labor, or costs
- **Adjust Margins**: Change overhead/profit percentages
- **Apply Discount**: Add discount or price adjustment
- **Duplicate Item**: Copy existing item with modifications
- **Bulk Adjust**: Adjust multiple items at once
- **Compare Options**: Show different material/pricing options
- **Timeline & Costs**: Adjust timeline and labor costs

#### AI Response Processing
- **Action Extraction**: Detects commands in AI responses
- **Proposal Updates**: Automatically updates proposal data
- **Math Validation**: Verifies calculations
- **Formatting**: Formats responses with HTML
- **Error Handling**: Graceful fallbacks

### 5. File Upload System (`FileUpload.jsx`)

#### Upload Features
- **Drag & Drop**: Drag files into upload area
- **Click to Browse**: Traditional file picker
- **Image Paste**: Paste images from clipboard
- **Multiple Files**: Upload multiple files at once
- **File Types**: Images (JPG, PNG), PDFs, documents
- **File Size Limit**: 10MB per file

#### File Processing
- **Image Optimization**: Compress before upload
- **Base64 Conversion**: For AI analysis
- **Storage**: Files stored on server
- **Metadata**: Track file name, size, type, upload date

#### File List Display (`FileList.jsx`)
- **Thumbnails**: Image previews
- **File Info**: Name, size, type
- **Actions**: View, delete, analyze with AI
- **Organization**: Group by type or date

### 6. Materials Management (`MaterialsList.jsx`)

#### Material Catalog
- **Purpose**: Manage company's material inventory
- **Features**:
  - Add/edit/delete materials
  - Categorize materials
  - Set pricing (cost and selling price)
  - Track specifications
  - Upload material images

#### Material Structure
```javascript
{
  id: UUID,
  companyId: UUID,
  name: string,              // e.g., "GAF Timberline HD Shingles"
  category: string,          // e.g., "Shingles", "Underlayment"
  subcategory: string,       // e.g., "Architectural", "3-Tab"
  manufacturer: string,
  sku: string,
  unit: string,              // "each", "square", "linear_ft"
  cost: number,              // Company cost
  price: number,             // Selling price
  description: string,
  specifications: JSONB,     // Flexible specs
  imageUrl: string,
  isActive: boolean
}
```

#### Material Selection in Proposals
- **Search**: Find materials by name, category, SKU
- **Filter**: By category, manufacturer, active status
- **Add to Proposal**: Click to add material
- **Quantity Entry**: Set quantity and unit
- **Auto-calculation**: Total price calculated automatically
- **Pricing**: Uses company pricing sheet or market rates

### 7. Pricing System

#### Pricing Components
1. **Materials Cost**: Sum of all material line items
2. **Labor Cost**: Hours × Rate
3. **Add-ons**: Additional services/products
4. **Subtotal**: Materials + Labor + Add-ons
5. **Overhead**: Percentage of subtotal (default 15%)
6. **Profit**: Percentage of subtotal (default 20%)
7. **Discount**: Optional fixed amount or percentage
8. **Total**: Final amount after all calculations

#### Pricing Sources
- **Company Pricing Sheets**: Uploaded Google Sheets
- **Material Catalog**: Database prices
- **Market Rates**: AI-suggested prices
- **Historical Data**: Previous proposal prices

#### Pricing Management (`CompanyPricing.jsx`)
- **Upload Pricing Sheet**: Google Sheets integration
- **Sync Materials**: Auto-update material prices
- **Set Defaults**: Overhead/profit percentages
- **Price Overrides**: Manual price adjustments

### 8. Measurements Panel (`MeasurementsPanel.jsx`)

#### Measurement Calculator (`MeasurementCalculator.jsx`)
- **Purpose**: Calculate roofing measurements
- **Inputs**:
  - Total squares (or square footage)
  - Ridge length
  - Valley length
  - Edge length
  - Roof pitch
  - Number of layers
  - Penetrations count
  - Skylights count

#### Calculations
- **Square Footage**: Total area in square feet
- **Squares**: Convert sq ft to roofing squares (÷100)
- **Waste Factor**: Add percentage for waste (typically 10-15%)
- **Material Quantities**: Calculate based on measurements
- **Linear Materials**: Ridge cap, valley metal, drip edge

#### Damage Areas (`DamageAreas.jsx`)
- **Track Damage**: Record damaged roof sections
- **Severity Levels**: Minor, moderate, severe
- **Location**: Describe where damage is
- **Cost Estimation**: Estimate repair costs
- **Visual Notes**: Add photos of damage

### 9. PDF Generation (`pdfService.js`)

#### PDF Structure
1. **Header**
   - Company logo (if available)
   - Company name and tagline
   - Contact information
   - License and insurance info

2. **Proposal Title**
   - "ROOFING PROPOSAL"
   - Proposal number
   - Date
   - Valid until date

3. **Client Information**
   - Client name
   - Address
   - Contact details

4. **Property Information**
   - Property address
   - Project type
   - Special requirements

5. **Scope of Work**
   - Detailed description
   - Materials list
   - Labor description
   - Timeline

6. **Pricing Breakdown**
   - Materials: $X,XXX
   - Labor: $X,XXX
   - Add-ons: $XXX
   - Subtotal: $X,XXX
   - Overhead (15%): $XXX
   - Profit (20%): $X,XXX
   - Discount: -$XXX
   - **TOTAL: $XX,XXX**

7. **Terms & Conditions**
   - Payment terms
   - Warranty information
   - Project timeline
   - Company policies

8. **Footer**
   - Company contact info
   - QR code (optional)
   - Page numbers

#### PDF Features
- **Company Branding**: Logo, colors, fonts
- **Professional Layout**: Clean, organized design
- **Multi-page Support**: Auto-pagination
- **QR Code**: Link to online proposal (optional)
- **Download**: Direct download from browser
- **Email**: Send PDF via email (future feature)

### 10. Company Settings (`CompanySettings.jsx`)

#### Company Information
- **Basic Info**:
  - Company name
  - Address (street, city, state, zip)
  - Phone number
  - Email address
  - Website URL
  - License number
  - Insurance information

#### Branding
- **Logo Upload**: Company logo image
- **Colors**: Primary and secondary brand colors
- **Fonts**: Custom font selection (future)

#### Settings
- **Default Pricing**: Overhead/profit percentages
- **Proposal Terms**: Default terms and conditions
- **Email Templates**: Proposal email templates
- **Notifications**: Email notification preferences

### 11. Live Preview Panel (`LivePreviewPanel.jsx`)

#### Preview Features
- **Real-time Updates**: Updates as proposal changes
- **PDF-like Display**: Shows how PDF will look
- **Export Options**: CSV export, PDF generation
- **Edit Capabilities**: Direct editing in preview
- **Responsive**: Adapts to screen size

#### Preview Sections
1. **Header**: Company info and logo
2. **Client Info**: Client details
3. **Property Info**: Property address and details
4. **Measurements**: Roof measurements summary
5. **Materials List**: All materials with quantities
6. **Pricing Breakdown**: Complete cost breakdown
7. **Terms**: Project terms and warranty

---

## 💾 Data Models & Database Schema

### Database: PostgreSQL (Railway)

#### Table: `users`
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

#### Table: `companies`
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

#### Table: `proposals`
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

#### Table: `materials`
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

#### Table: `migrations`
```sql
CREATE TABLE migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Relationships
- **users** (1) ──< (many) **companies** (owner relationship)
- **companies** (1) ──< (many) **proposals**
- **companies** (1) ──< (many) **materials**
- **users** (1) ──< (many) **proposals** (creator relationship)

---

## 🤖 AI Integration Details

### GPT-4 Vision Integration

#### Purpose
Analyze roof photos to extract measurements, identify damage, and recommend materials.

#### Process Flow
```
1. User uploads/pastes image → FileUpload component
2. Image converted to base64 → Client-side processing
3. POST /api/vision/analyze → Backend endpoint
4. visionController.analyzeRoofImages() → Controller
5. processImageWithVision() → OpenAI service
6. OpenAI GPT-4 Vision API call → External API
7. Response parsing → Extract structured data
8. Return to client → Update proposal state
```

#### Prompt Engineering
The system uses specialized prompts based on document type:
- **Roof Photos**: "Analyze this roof photo and extract measurements..."
- **Measurement Reports**: "Extract all measurements from this document..."
- **Damage Assessment**: "Identify and assess damage areas..."

#### Response Format
```json
{
  "measurements": {
    "totalSquares": 25.5,
    "roofArea": 2550,
    "pitch": "6/12",
    "ridgeLength": 45,
    "valleyLength": 30,
    "edgeLength": 120
  },
  "damage": [
    {
      "location": "North side",
      "severity": "moderate",
      "description": "Missing shingles, visible water damage"
    }
  ],
  "materials": [
    {
      "name": "Architectural Shingles",
      "quantity": 28,
      "unit": "squares"
    }
  ]
}
```

### Claude AI Integration

#### Purpose
Provide intelligent chat assistance, process documents, and generate recommendations.

#### Process Flow
```
1. User sends message → AIAssistant component
2. Build context (proposal data, pricing, location) → Context builder
3. POST /api/ai/chat → Backend endpoint
4. aiController.chatWithAI() → Controller
5. chatWithClaude() → Claude service
6. Fetch pricing data → Database query
7. Build system prompt → Include pricing, location, instructions
8. Anthropic Claude API call → External API
9. Parse response → Extract actions if any
10. Return to client → Display response, update proposal
```

#### System Prompt Structure
```
You are a MASTER roofing contractor with 20+ years of experience.

EXPERT BEHAVIOR:
- NEVER ask permission, AUTOMATICALLY calculate ALL components
- Provide DEFINITIVE expert recommendations
- Include permits, disposal, labor, materials - EVERYTHING

ROOFING EXPERTISE:
- Labor calculations based on complexity
- Permit costs ($150-500)
- Disposal fees ($300-800)
- All materials: shingles, underlayment, flashing, vents
- Professional timeline estimates
- Warranty details

PRICING AUTHORITY:
- USE EXACT PRICES from company pricing sheets
- Calculate with overhead (15%) and profit (20%)
- Format as complete customer-ready proposal

[Company Pricing Data]
[Location-Specific Knowledge]
[Additional Company Instructions]
```

#### Context Building
The system includes:
1. **Proposal Context**: Current proposal data (JSON)
2. **Pricing Context**: Company pricing sheets from database
3. **Location Context**: City/state-specific knowledge
4. **Conversation History**: Previous messages
5. **Company Instructions**: Custom AI behavior settings

#### Action Extraction
The AI can return actions that automatically update the proposal:
```json
{
  "response": "I've added the materials to your proposal.",
  "actions": [
    {
      "type": "update_materials",
      "data": {
        "materials": [...]
      }
    }
  ]
}
```

---

## 🔄 User Workflows & Processes

### Workflow 1: Creating a New Proposal

#### Step-by-Step Process
1. **Login** → User authenticates
2. **Dashboard** → Click "New Proposal"
3. **Proposal Editor Opens** → Empty proposal state
4. **AI Assistant** → User can chat or upload photos
5. **Upload Photos** → Drag/drop or paste roof images
6. **AI Analysis** → GPT-4 Vision analyzes photos
7. **Measurements Extracted** → Auto-populated in proposal
8. **Chat with AI** → Refine proposal details
9. **Add Materials** → Select from catalog or AI suggests
10. **Review Pricing** → AI calculates costs
11. **Adjust as Needed** → Manual edits
12. **Save Proposal** → Auto-saved periodically
13. **Generate PDF** → Create branded PDF
14. **Send to Client** → Email or download

### Workflow 2: Quick Proposal Setup (AI-Powered)

#### Step-by-Step Process
1. **New Proposal** → Click create
2. **Chat with AI** → "Create a proposal for [client name]"
3. **AI Asks Questions** → Missing information
4. **User Provides Info** → Via chat
5. **AI Generates Proposal** → Complete proposal created
6. **User Reviews** → Check all details
7. **User Edits** → Make adjustments
8. **Save & Generate PDF** → Finalize

### Workflow 3: Analyzing Roof Photos

#### Step-by-Step Process
1. **Upload Tab** → Navigate to upload section
2. **Upload/Paste Images** → Add roof photos
3. **Click "Analyze"** → Or auto-analyze on upload
4. **GPT-4 Vision Processing** → AI analyzes images
5. **Results Displayed** → Measurements, damage, materials
6. **Review Results** → Check accuracy
7. **Accept/Edit** → Confirm or modify
8. **Auto-populate Proposal** → Data added to proposal

### Workflow 4: Material Management

#### Step-by-Step Process
1. **Settings** → Navigate to company settings
2. **Materials Tab** → View material catalog
3. **Add Material** → Click "Add New"
4. **Fill Details** → Name, category, price, etc.
5. **Upload Image** → Material photo (optional)
6. **Save** → Material added to catalog
7. **Use in Proposal** → Select from catalog when creating proposal

### Workflow 5: PDF Generation & Delivery

#### Step-by-Step Process
1. **Complete Proposal** → All fields filled
2. **Preview** → Review in live preview panel
3. **Generate PDF** → Click "Generate PDF" button
4. **PDF Created** → Server generates PDF with branding
5. **Download** → PDF downloads to computer
6. **Email Client** → (Future feature) Send via email
7. **Track Status** → Mark as "sent" in dashboard

---

## 🔧 Technical Implementation Details

### Frontend Architecture

#### Component Structure
```
App.jsx
├── Routes
│   ├── /login → Login.jsx
│   ├── /dashboard → Dashboard.jsx
│   ├── /proposal/:id → ProposalEditor.jsx
│   └── /proposal/new → ProposalEditor.jsx
│
ProposalEditor.jsx
├── Header.jsx (save button, navigation)
├── Split Pane Layout
│   ├── AIAssistant.jsx (60% width)
│   │   ├── Chat Messages
│   │   ├── Input Area
│   │   ├── Quick Actions
│   │   └── Image Upload
│   └── LivePreviewPanel.jsx (40% width)
│       ├── Proposal Preview
│       ├── Export Buttons
│       └── Edit Controls
```

#### State Management
- **React Query**: Server state (proposals, materials, user)
- **useState**: Local component state
- **localStorage**: Persist user, token, company data
- **Proposal State**: Managed in ProposalEditor, passed to children

#### API Client (`api.js`)
```javascript
// Configured Axios instance
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: Add JWT token
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle errors
apiClient.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Backend Architecture

#### Server Structure
```
server/
├── src/
│   ├── index.js (Express app setup)
│   ├── config/
│   │   ├── database.js (Sequelize config)
│   │   └── openai.js (AI config)
│   ├── models/
│   │   ├── User.js
│   │   ├── Proposal.js
│   │   ├── Material.js
│   │   └── Company.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── proposalController.js
│   │   ├── visionController.js
│   │   ├── aiController.js
│   │   └── pdfController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── proposalRoutes.js
│   │   ├── visionRoutes.js
│   │   ├── aiRoutes.js
│   │   └── pdfRoutes.js
│   ├── services/
│   │   ├── openaiService.js
│   │   └── pdfService.js
│   ├── middleware/
│   │   ├── auth.js (JWT verification)
│   │   └── errorHandler.js
│   └── utils/
│       ├── calculations.js
│       └── logger.js
```

#### Express App Setup
```javascript
// server/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/proposals', authenticate, proposalRoutes);
app.use('/api/vision', authenticate, visionRoutes);
app.use('/api/ai', authenticate, aiRoutes);
app.use('/api/pdf', authenticate, pdfRoutes);

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### Authentication Middleware
```javascript
// server/src/middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
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

### Database Connection (Railway)

#### Sequelize Configuration
```javascript
// server/src/config/database.js
const { Sequelize } = require('sequelize');

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
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});

// Test connection
sequelize.authenticate()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Database connection error:', err));

module.exports = sequelize;
```

---

## 🎨 UI/UX Specifications

### Design Principles
1. **Professional**: Clean, business-appropriate design
2. **Efficient**: Minimize clicks, maximize productivity
3. **Intuitive**: Clear navigation and actions
4. **Responsive**: Works on desktop, tablet, mobile
5. **Accessible**: WCAG compliance

### Color Scheme
- **Primary**: #2563eb (Blue)
- **Secondary**: #64748b (Gray)
- **Success**: #10b981 (Green)
- **Danger**: #ef4444 (Red)
- **Background**: #f9fafb (Light Gray)
- **Text**: #111827 (Dark Gray)

### Typography
- **Headings**: Bold, clear hierarchy
- **Body**: Readable, appropriate size
- **Code/Data**: Monospace font

### Layout Patterns

#### Dashboard
- **Header**: Navigation, user info, logout
- **Stats Cards**: Total proposals, total value
- **Proposal Table**: Sortable, filterable
- **Actions**: Create, edit, delete buttons

#### Proposal Editor
- **Split Pane**: 60/40 ratio
- **Left**: AI Chat (scrollable)
- **Right**: Live Preview (scrollable)
- **Header**: Save button, proposal info

#### Forms
- **Labels**: Clear, left-aligned
- **Inputs**: Full width, proper spacing
- **Validation**: Inline error messages
- **Submit**: Primary button, disabled when invalid

### Responsive Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

---

## 📡 API Endpoints & Data Flow

### Authentication Endpoints

#### POST `/api/auth/register`
**Purpose**: Create new user account
**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "companyName": "ABC Roofing"
}
```
**Response**:
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### POST `/api/auth/login`
**Purpose**: Authenticate user
**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```
**Response**: Same as register

#### GET `/api/auth/verify`
**Purpose**: Verify token validity
**Headers**: `Authorization: Bearer <token>`
**Response**:
```json
{
  "success": true,
  "user": { ... }
}
```

### Proposal Endpoints

#### GET `/api/proposals`
**Purpose**: List all proposals for user's company
**Headers**: `Authorization: Bearer <token>`
**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "proposalNumber": "P001",
      "clientName": "Jane Smith",
      "totalAmount": 15000,
      "status": "draft",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### GET `/api/proposals/:id`
**Purpose**: Get single proposal details
**Response**: Full proposal object

#### POST `/api/proposals`
**Purpose**: Create new proposal
**Request Body**: Full proposal data object
**Response**: Created proposal with ID

#### PUT `/api/proposals/:id`
**Purpose**: Update existing proposal
**Request Body**: Partial proposal data
**Response**: Updated proposal

#### DELETE `/api/proposals/:id`
**Purpose**: Delete proposal
**Response**: Success confirmation

### AI Endpoints

#### POST `/api/vision/analyze`
**Purpose**: Analyze roof images with GPT-4 Vision
**Request Body**:
```json
{
  "images": ["base64_image_string", ...],
  "documentType": "roofing_analysis"
}
```
**Response**:
```json
{
  "success": true,
  "analysis": {
    "measurements": { ... },
    "damage": [ ... ],
    "materials": [ ... ]
  }
}
```

#### POST `/api/ai/chat`
**Purpose**: Chat with Claude AI
**Request Body**:
```json
{
  "message": "User message here",
  "conversationHistory": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "proposalContext": { ... }
}
```
**Response**:
```json
{
  "success": true,
  "response": "AI response text",
  "actions": [ ... ],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### PDF Endpoints

#### POST `/api/pdf/generate/:id`
**Purpose**: Generate PDF for proposal
**Request Body**:
```json
{
  "companyData": { ... },
  "pdfOptions": {
    "isDetailed": true
  }
}
```
**Response**: PDF file (binary)

### Material Endpoints

#### GET `/api/materials`
**Purpose**: List materials for company
**Response**: Array of material objects

#### POST `/api/materials`
**Purpose**: Create new material
**Request Body**: Material object
**Response**: Created material

#### PUT `/api/materials/:id`
**Purpose**: Update material
**Response**: Updated material

#### DELETE `/api/materials/:id`
**Purpose**: Delete material
**Response**: Success confirmation

---

## 🚀 Deployment & Infrastructure

### Railway Deployment

#### Setup Process
1. **Create Railway Account** → Sign up at railway.app
2. **Create New Project** → Link GitHub repository
3. **Add PostgreSQL Service** → Railway auto-provisions database
4. **Add Web Service** → Configure Node.js app
5. **Set Environment Variables** → Add required secrets
6. **Deploy** → Railway auto-deploys on git push

#### Environment Variables (Railway)

**Application Service Variables**:
```
NODE_ENV=production
JWT_SECRET=your-secret-key-here
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_SHEETS_API_KEY=...
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

**Database Variables** (Auto-provided by Railway):
- `DATABASE_URL` - Primary connection string
- `DATABASE_PUBLIC_URL` - Public connection URL
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` - Individual connection params

#### Build Process
1. **Git Push** → Push to `main` branch
2. **Railway Webhook** → Detects push
3. **Nixpacks Build** → Auto-detects Node.js
4. **Install Dependencies** → `npm install`
5. **Build Frontend** → `cd client && npm run build`
6. **Start Server** → `npm start`
7. **Health Check** → Verify deployment
8. **Traffic Switch** → Route to new version

#### Railway Features Used
- **Auto-deployment**: Git push triggers deploy
- **Managed PostgreSQL**: Auto-provisioned database
- **Environment Variables**: Secure secret management
- **SSL/TLS**: Automatic HTTPS
- **Logs**: Real-time log viewing
- **Metrics**: CPU, memory, request monitoring

### Database Migrations

#### Migration System
- **Location**: `database/migrations/`
- **Format**: SQL files numbered sequentially
- **Execution**: Auto-runs on server start via `createTables.js`
- **Tracking**: `migrations` table tracks applied migrations

#### Migration Files
1. `001_create_users.sql` - Users table
2. `002_create_companies.sql` - Companies table
3. `003_create_proposals.sql` - Proposals table
4. `004_create_materials.sql` - Materials table
5. `005_create_templates.sql` - Templates table (if used)
6. `006_create_activity_logs.sql` - Activity tracking (if used)
7. `007_add_project_details_fields.sql` - Extended fields

---

## 📊 Key Features Summary

### Core Features
✅ User authentication (login/register)
✅ Proposal creation and editing
✅ AI-powered image analysis (GPT-4 Vision)
✅ AI chat assistant (Claude)
✅ Material catalog management
✅ Pricing calculations
✅ PDF generation with branding
✅ Auto-save functionality
✅ Company settings and branding
✅ Dashboard with proposal list

### Advanced Features
✅ Multi-image analysis
✅ Location-aware AI suggestions
✅ Quick action buttons
✅ Real-time proposal preview
✅ CSV export
✅ Damage area tracking
✅ Measurement calculations
✅ Google Sheets pricing integration
✅ Conversation history persistence

### Future Features (Not Yet Implemented)
⏳ Email proposal delivery
⏳ Client proposal acceptance page
⏳ Proposal status tracking (viewed, responded)
⏳ Multi-user collaboration
⏳ Proposal templates
⏳ Recurring proposals
⏳ Invoice generation
⏳ Payment processing

---

## 🎯 Success Metrics

### User Experience Metrics
- **Time to Create Proposal**: Target < 10 minutes
- **AI Accuracy**: Measurement accuracy within 5%
- **User Satisfaction**: Positive feedback on AI assistance
- **PDF Quality**: Professional, branded output

### Technical Metrics
- **API Response Time**: < 2 seconds for most endpoints
- **AI Processing Time**: < 30 seconds for image analysis
- **PDF Generation Time**: < 5 seconds
- **Uptime**: 99.9% availability

### Business Metrics
- **Proposals Created**: Track total proposals
- **Total Proposal Value**: Sum of all proposal amounts
- **Conversion Rate**: Proposals accepted vs. sent
- **User Retention**: Active users over time

---

## 🔍 Testing Considerations

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Create new proposal
- [ ] Upload and analyze images
- [ ] Chat with AI assistant
- [ ] Add materials to proposal
- [ ] Calculate pricing
- [ ] Generate PDF
- [ ] Edit existing proposal
- [ ] Delete proposal
- [ ] Company settings update
- [ ] Material catalog management

### Edge Cases to Test
- Large image files (>10MB)
- Multiple images at once
- Invalid proposal data
- Network failures during save
- Token expiration during use
- Concurrent proposal edits
- Missing required fields
- Invalid pricing data

---

## 📝 Notes for Lovable

### Critical Requirements
1. **AI Integration**: Must support OpenAI GPT-4 Vision and Anthropic Claude APIs
2. **File Upload**: Handle image uploads and base64 conversion
3. **PDF Generation**: Server-side PDF creation with branding
4. **Auto-save**: Debounced auto-save functionality
5. **Real-time Preview**: Live preview that updates as user types
6. **Database**: PostgreSQL with JSONB fields for flexible data
7. **Authentication**: JWT-based auth with protected routes
8. **Railway Deployment**: Configure for Railway hosting

### Key User Flows to Implement
1. **Login → Dashboard → New Proposal → AI Chat → Generate PDF**
2. **Upload Image → AI Analysis → Auto-populate Proposal**
3. **Chat with AI → AI Updates Proposal → Review → Save**

### Important Data Structures
- **Proposal Object**: Complex nested structure with measurements, materials, pricing
- **Material Object**: Catalog item with pricing and specifications
- **Company Object**: Branding and settings
- **AI Chat History**: Array of message objects

### UI/UX Priorities
1. **Split-pane Layout**: Chat on left, preview on right
2. **Quick Actions**: Pre-defined buttons for common tasks
3. **Real-time Updates**: Preview updates as user makes changes
4. **Professional Design**: Clean, business-appropriate styling
5. **Mobile Responsive**: Works on all screen sizes

---

## 🎓 Conclusion

This Roofing Proposal App is a comprehensive solution for roofing contractors to create professional proposals efficiently using AI assistance. The app combines traditional proposal management with cutting-edge AI technology to streamline the entire process from photo analysis to PDF delivery.

**Key Strengths**:
- AI-powered automation reduces manual work
- Professional PDF output with branding
- Intuitive chat interface for natural interaction
- Flexible material and pricing management
- Production-ready deployment on Railway

**Technical Highlights**:
- Modern React frontend with React Query
- Express.js backend with Sequelize ORM
- PostgreSQL database with JSONB flexibility
- Integration with OpenAI and Anthropic APIs
- Railway deployment with managed database

This outline provides a complete picture of the app's functionality, architecture, and implementation details for rebuilding or understanding the system.

