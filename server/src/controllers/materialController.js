import Material from '../models/Material.js';
import User from '../models/User.js';
import Company from '../models/Company.js';

// Get all materials for a company
export const getMaterials = async (req, res) => {
  try {
    console.log('GET /api/materials - User:', req.user);
    
    // For development - get first company if no user
    let companyId;
    if (req.user?.companyId) {
      companyId = req.user.companyId;
    } else {
      console.log('No user/company in request, looking up first company...');
      const company = await Company.findOne();
      companyId = company?.id;
      console.log('Found company:', company?.id, company?.name);
    }
    
    // For now, return materials from database (when Material model is properly set up)
    // Since Material model isn't fully implemented yet, return empty array
    console.log('Returning empty materials array (Material model needs implementation)');
    res.json([]);
  } catch (error) {
    console.error('Error getting materials:', error);
    res.status(500).json({ error: 'Failed to get materials' });
  }
};

// Create new material
export const createMaterial = async (req, res) => {
  try {
    console.log('POST /api/materials - Request body:', JSON.stringify(req.body, null, 2));
    console.log('User from request:', req.user);
    
    // For development - get first company if no user
    let companyId;
    if (req.user?.companyId) {
      companyId = req.user.companyId;
    } else {
      console.log('No user/company in request, looking up first company...');
      const company = await Company.findOne();
      companyId = company?.id;
      console.log('Found company:', company?.id, company?.name);
    }

    const materialData = {
      ...req.body,
      companyId
    };
    
    console.log('Final material data to create:', JSON.stringify(materialData, null, 2));
    
    // For now, just return success since Material model needs proper implementation
    console.log('Material creation simulated (Material model needs implementation)');
    res.status(201).json({ 
      id: Date.now(), 
      ...materialData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error creating material:', error);
    res.status(500).json({ error: 'Failed to create material' });
  }
};

// Update material
export const updateMaterial = async (req, res) => {
  try {
    console.log('PUT /api/materials/:id - Params:', req.params);
    console.log('PUT /api/materials/:id - Request body:', JSON.stringify(req.body, null, 2));
    
    // For now, just return success
    console.log('Material update simulated (Material model needs implementation)');
    res.json({ 
      id: req.params.id, 
      ...req.body,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({ error: 'Failed to update material' });
  }
};

// Delete material
export const deleteMaterial = async (req, res) => {
  try {
    console.log('DELETE /api/materials/:id - Params:', req.params);
    
    // For now, just return success
    console.log('Material deletion simulated (Material model needs implementation)');
    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  }
};
