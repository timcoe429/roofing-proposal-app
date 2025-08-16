import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/database.js';

const Proposal = sequelize.define('Proposal', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Companies',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
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
    allowNull: false
  },
  clientEmail: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true
    }
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
  propertyType: {
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
    defaultValue: 0
  },
  laborRate: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 75
  },
  
  // Pricing
  materialsCost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  laborCost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  overheadPercent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 15
  },
  profitPercent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 20
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
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
  }
}, {
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
