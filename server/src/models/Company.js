import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Company = sequelize.define('Company', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true
  },
  license: {
    type: DataTypes.STRING,
    allowNull: true
  },
  insurance: {
    type: DataTypes.STRING,
    allowNull: true
  },
  logo: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  primaryColor: {
    type: DataTypes.STRING,
    defaultValue: '#2563eb'
  },
  secondaryColor: {
    type: DataTypes.STRING,
    defaultValue: '#1e40af'
  },
  termsConditions: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'companies',
  timestamps: true
});

export { Company };
