import User from './User.js';
import Company from './Company.js';

// Define associations
User.hasOne(Company, { foreignKey: 'owner_id', sourceKey: 'id', as: 'company' });
Company.belongsTo(User, { foreignKey: 'owner_id', targetKey: 'id', as: 'owner' });

export { User, Company };
