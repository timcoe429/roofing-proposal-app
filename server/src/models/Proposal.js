import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/database.js';

const Proposal = sequelize.define('Proposal', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'viewed', 'accepted', 'rejected'),
    defaultValue: 'draft'
  },
  proposalNumber: {
    type: DataTypes.STRING,
    unique: true
  },
  
  // Client Information
  clientName: {
    type: DataTypes.STRING,
    allowNull: true
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
    allowNull: true
  },
  clientPhone: {
    type: DataTypes.STRING
  },
  clientAddress: {
    type: DataTypes.TEXT
  },
  
  // Property Information
  propertyAddress: {
    type: DataTypes.TEXT
  },
  
  // Additional fields from ClientInfoTab
  propertyCity: {
    type: DataTypes.STRING
  },
  propertyState: {
    type: DataTypes.STRING
  },
  propertyZip: {
    type: DataTypes.STRING
  },
  projectType: {
    type: DataTypes.STRING
  },
  materialType: {
    type: DataTypes.STRING
  },
  specialRequirements: {
    type: DataTypes.TEXT
  },
  urgency: {
    type: DataTypes.STRING
  },
  roofSize: {
    type: DataTypes.STRING
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
    allowNull: true
  },
  laborRate: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 75,
    allowNull: true
  },
  
  // Pricing
  materialsCost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: true
  },
  laborCost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: true
  },
  overheadPercent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 15,
    allowNull: true
  },
  profitPercent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 20,
    allowNull: true
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: true
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: true
  },
  
  // Add-ons
  addOns: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  
  // Damage Areas
  damageAreas: {
    type: DataTypes.JSONB,
    defaultValue: []
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
    type: DataTypes.TEXT
  },
  
  // Files
  uploadedFiles: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  generatedPdfUrl: {
    type: DataTypes.STRING
  },
  
  // Dates
  validUntil: {
    type: DataTypes.DATE,
    defaultValue: () => {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date;
    }
  },
  sentAt: {
    type: DataTypes.DATE
  },
  viewedAt: {
    type: DataTypes.DATE
  },
  respondedAt: {
    type: DataTypes.DATE
  },
  
  // Timestamps (matching your database)
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
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
