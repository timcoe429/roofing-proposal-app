import Company from '../models/Company.js';
import User from '../models/User.js';

// Get company settings
export const getCompanySettings = async (req, res) => {
  try {
    console.log('GET /api/company/settings - User:', req.user);
    
    // For development - get first company if no user
    let userId = req.user?.id;
    if (!userId) {
      console.log('No user in request, looking up first user...');
      const user = await User.findOne();
      userId = user?.id;
      console.log('Found user:', user?.id, user?.email);
    }
    
    const company = await Company.findOne({ where: { userId } });
    
    if (!company) {
      console.log('No company found, returning defaults');
      return res.json({
        name: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        license: '',
        insurance: '',
        logo: null,
        primaryColor: '#2563eb',
        secondaryColor: '#1e40af',
        termsConditions: null
      });
    }
    
    console.log('Found company:', company.name);
    res.json(company.dataValues || company);
  } catch (error) {
    console.error('Error getting company settings:', error);
    res.status(500).json({ error: 'Failed to get company settings' });
  }
};

// Update company settings
export const updateCompanySettings = async (req, res) => {
  try {
    console.log('PUT /api/company/settings - Request body:', JSON.stringify(req.body, null, 2));
    console.log('PUT /api/company/settings - User:', req.user);
    
    // For development - get first user if no user
    let userId = req.user?.id;
    if (!userId) {
      console.log('No user in request, looking up first user...');
      const user = await User.findOne();
      userId = user?.id;
      console.log('Found user:', user?.id, user?.email);
    }
    
    const [company, created] = await Company.findOrCreate({
      where: { userId },
      defaults: {
        userId,
        ...req.body
      }
    });
    
    if (!created) {
      await company.update(req.body);
    }
    
    console.log('Company settings saved successfully');
    res.json(company.dataValues || company);
  } catch (error) {
    console.error('Error updating company settings:', error);
    res.status(500).json({ error: 'Failed to update company settings' });
  }
};
