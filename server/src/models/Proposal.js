import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/database.js';

const Proposal = sequelize.define('Proposal', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  companyId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'company_id'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'user_id'
  },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'viewed', 'accepted', 'rejected'),
    defaultValue: 'draft'
  },
  proposalNumber: {
    type: DataTypes.STRING,
    unique: true,
    field: 'proposal_number'
  },
  
  // Client Information
  clientName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'client_name'
  },
  clientEmail: {
    type: DataTypes.STRING,
    validate: {
      isEmail: function(value) {
        if (value && value.trim() !== '') {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        }
        return true; // Allow empty/null values
      }
    },
    allowNull: true,
    field: 'client_email'
  },
  clientPhone: {
    type: DataTypes.STRING,
    field: 'client_phone'
  },
  clientAddress: {
    type: DataTypes.TEXT,
    field: 'client_address'
  },
  
  // Property Information
  propertyAddress: {
    type: DataTypes.TEXT,
    field: 'property_address'
  },
  
  // Additional fields from ClientInfoTab
  propertyCity: {
    type: DataTypes.STRING,
    field: 'property_city'
  },
  propertyState: {
    type: DataTypes.STRING,
    field: 'property_state'
  },
  propertyZip: {
    type: DataTypes.STRING,
    field: 'property_zip'
  },
  projectType: {
    type: DataTypes.STRING,
    field: 'property_type'
  },
  materialType: {
    type: DataTypes.STRING,
    field: 'material_type'
  },
  specialRequirements: {
    type: DataTypes.TEXT,
    field: 'special_requirements'
  },
  urgency: {
    type: DataTypes.STRING
  },
  roofSize: {
    type: DataTypes.STRING,
    field: 'roof_size'
  },
  
  // Measurements
  measurements: {
    type: DataTypes.JSONB,
    defaultValue: {
      totalSquares: 0,
      ridgeLength: 0,
      valleyLength: 0,
      edgeLength: 0,
      pitch: '',
      layers: 1,
      penetrations: 0,
      skylights: 0
    }
  },
  
  // Materials
  materials: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  
  // Labor
  laborHours: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: true,
    field: 'labor_hours'
  },
  laborRate: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 75,
    allowNull: true,
    field: 'labor_rate'
  },
  
  // Pricing
  materialsCost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: true,
    field: 'materials_cost'
  },
  laborCost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: true,
    field: 'labor_cost'
  },
  overheadPercent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 15,
    allowNull: true,
    field: 'overhead_percent'
  },
  profitPercent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 20,
    allowNull: true,
    field: 'profit_percent'
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: true,
    field: 'discount_amount'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: true,
    field: 'total_amount'
  },
  
  // Add-ons
  addOns: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'addons'
  },
  
  // Damage Areas
  damageAreas: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'damage_areas'
  },
  
  // Project Details
  timeline: {
    type: DataTypes.STRING,
    defaultValue: '2-3 days, weather permitting'
  },
  warranty: {
    type: DataTypes.STRING,
    defaultValue: '50-Year Manufacturer Warranty, 10-Year Workmanship'
  },
  notes: {
    type: DataTypes.TEXT
  },
  termsConditions: {
    type: DataTypes.TEXT,
    field: 'terms_conditions'
  },
  
  // Files
  uploadedFiles: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'uploaded_files'
  },
  generatedPdfUrl: {
    type: DataTypes.STRING,
    field: 'generated_pdf_url'
  },
  
  // Dates
  validUntil: {
    type: DataTypes.DATE,
    defaultValue: () => {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date;
    },
    field: 'valid_until'
  },
  sentAt: {
    type: DataTypes.DATE,
    field: 'sent_at'
  },
  viewedAt: {
    type: DataTypes.DATE,
    field: 'viewed_at'
  },
  respondedAt: {
    type: DataTypes.DATE,
    field: 'responded_at'
  },
  
  // Timestamps (matching your database)
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'proposals',
  timestamps: true,
  hooks: {
    beforeCreate: async (proposal) => {
      // Generate proposal number
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const count = await Proposal.count({
        where: {
          createdAt: {
            [Op.gte]: new Date(year, date.getMonth(), 1),
            [Op.lt]: new Date(year, date.getMonth() + 1, 1)
          }
        }
      });
      proposal.proposalNumber = `${year}${month}-${String(count + 1).padStart(4, '0')}`;
    },
    beforeUpdate: (proposal) => {
      // Recalculate total
      const materials = proposal.materialsCost || 0;
      const labor = proposal.laborCost || 0;
      const addOnsTotal = (proposal.addOns || [])
        .filter(a => a.selected)
        .reduce((sum, a) => sum + a.price, 0);
      
      const subtotal = materials + labor + addOnsTotal;
      const overhead = subtotal * (proposal.overheadPercent / 100);
      const profit = subtotal * (proposal.profitPercent / 100);
      
      proposal.totalAmount = subtotal + overhead + profit;
    }
  }
});

export default Proposal;
