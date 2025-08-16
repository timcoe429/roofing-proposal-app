import User from './User.js';
import Company from './Company.js';

// Define associations
User.hasOne(Company, { foreignKey: 'userId' });
Company.belongsTo(User, { foreignKey: 'userId' });

export { User, Company };
