import User from './User.js';
import Company from './Company.js';
import Proposal from './Proposal.js';

// Define associations
User.hasOne(Company, { foreignKey: 'userId' });
Company.belongsTo(User, { foreignKey: 'userId' });

// Call association methods if they exist
if (Proposal.associate) {
  Proposal.associate({ User, Company });
}

export { User, Company, Proposal };
