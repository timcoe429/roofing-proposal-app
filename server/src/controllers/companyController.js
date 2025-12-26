import Company from '../models/Company.js';
import User from '../models/User.js';

// Get company settings
export const getCompanySettings = async (req, res) => {
  try {
    console.log('GET /api/company/settings - User:', req.user);
    
    // Get companyId from user's companyId field
    let companyId = req.user?.companyId;
    
    if (!companyId) {
      // Fallback: get user's companyId from database
      const user = await User.findByPk(req.user?.userId);
      companyId = user?.companyId;
    }
    
    if (!companyId) {
      console.log('No companyId found, looking up first company...');
      const company = await Company.findOne();
      companyId = company?.id;
    }
    
    const company = await Company.findByPk(companyId);
    
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
        termsConditions: null,
        aiInstructions: {}
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
    
    // Get companyId from user's companyId field
    let companyId = req.user?.companyId;
    
    if (!companyId) {
      // Fallback: get user's companyId from database
      const user = await User.findByPk(req.user?.userId);
      companyId = user?.companyId;
    }
    
    if (!companyId) {
      console.log('No companyId found, looking up first company...');
      const company = await Company.findOne();
      companyId = company?.id;
    }
    
    // Validate aiInstructions structure if provided
    if (req.body.aiInstructions) {
      if (typeof req.body.aiInstructions !== 'object') {
        return res.status(400).json({ error: 'aiInstructions must be an object' });
      }
      // Ensure it has the expected structure
      if (!req.body.aiInstructions.additionalInstructions) {
        req.body.aiInstructions.additionalInstructions = req.body.aiInstructions.additionalInstructions || '';
      }
      if (!req.body.aiInstructions.locationKnowledge) {
        req.body.aiInstructions.locationKnowledge = req.body.aiInstructions.locationKnowledge || {};
      }
    }
    
    const [company, created] = await Company.findOrCreate({
      where: { id: companyId },
      defaults: {
        userId: req.user?.userId,
        ...req.body
      }
    });
    
    // If company exists, update it
    if (!created && companyId) {
      await company.update(req.body);
    }
    
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
