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
    allowNull: true,
    field: 'companyId'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'userId'
  },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'viewed', 'accepted', 'rejected'),
    defaultValue: 'draft'
  },
  proposalNumber: {
    type: DataTypes.STRING,
    unique: true,
    field: 'proposalNumber'
  },
  
  // Client Information
  clientName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'clientName'
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
    field: 'clientEmail'
  },
  clientPhone: {
    type: DataTypes.STRING,
    field: 'clientPhone'
  },
  clientAddress: {
    type: DataTypes.TEXT,
    field: 'clientAddress'
  },
  
  // Property Information
  propertyAddress: {
    type: DataTypes.TEXT,
    field: 'propertyAddress'
  },
  propertyCity: {
    type: DataTypes.STRING,
    field: 'propertyCity'
  },
  propertyState: {
    type: DataTypes.STRING,
    field: 'propertyState'
  },
  propertyZip: {
    type: DataTypes.STRING,
    field: 'propertyZip'
  },
  projectType: {
    type: DataTypes.STRING,
    field: 'projectType'
  },
  materialType: {
    type: DataTypes.STRING,
    field: 'materialType'
  },
  roofSize: {
    type: DataTypes.STRING,
    field: 'roofSize'
  },
  specialRequirements: {
    type: DataTypes.TEXT,
    field: 'specialRequirements'
  },
  urgency: {
    type: DataTypes.STRING,
    field: 'urgency'
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
    field: 'laborHours'
  },
  laborRate: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 75,
    allowNull: true,
    field: 'laborRate'
  },
  
  // Pricing
  materialsCost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: true,
    field: 'materialsCost'
  },
  laborCost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: true,
    field: 'laborCost'
  },
  overheadPercent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 15,
    allowNull: true,
    field: 'overheadPercent'
  },
  profitPercent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 20,
    allowNull: true,
    field: 'profitPercent'
  },
  overheadCostPercent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 10,
    allowNull: true,
    field: 'overheadCostPercent'
  },
  netMarginTarget: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 20,
    allowNull: true,
    field: 'netMarginTarget'
  },
  netMarginActual: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    field: 'netMarginActual'
  },
  overheadCosts: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: true,
    field: 'overheadCosts'
  },
  totalCost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: true,
    field: 'totalCost'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: true,
    field: 'totalAmount'
  },
  
  // Add-ons
  addOns: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'addOns'
  },
  
  // Damage Areas
  damageAreas: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'damageAreas'
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
  
  // Files
  uploadedFiles: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'uploadedFiles'
  },
  generatedPdfUrl: {
    type: DataTypes.STRING,
    field: 'generatedPdfUrl'
  },
  
  // Dates
  validUntil: {
    type: DataTypes.DATE,
    defaultValue: () => {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date;
    },
    field: 'validUntil'
  },
  sentAt: {
    type: DataTypes.DATE,
    field: 'sentAt'
  },
  viewedAt: {
    type: DataTypes.DATE,
    field: 'viewedAt'
  },
  respondedAt: {
    type: DataTypes.DATE,
    field: 'respondedAt'
  },

  // AI Chat History (text-only). Client caps to last 150 messages.
  aiChatHistory: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'aiChatHistory'
  },
  
  // Timestamps
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'createdAt'
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updatedAt'
  }
}, {
  tableName: 'proposals',
  timestamps: true,
  hooks: {
    beforeCreate: async (proposal) => {
      if (!proposal.proposalNumber) {
        const count = await Proposal.count();
        const year = new Date().getFullYear().toString().slice(-2);
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        proposal.proposalNumber = `${year}${month}${String(count + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      }
    }
  }
});

// Define associations
Proposal.associate = (models) => {
  if (models.User) {
    Proposal.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  }
  
  if (models.Company) {
    Proposal.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company'
    });
  }
};

export default Proposal;