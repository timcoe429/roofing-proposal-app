import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'firstName'
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'lastName'
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'contractor',
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'isActive'
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'companyId',
    references: {
      model: 'companies',
      key: 'id'
    }
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

export default User;
