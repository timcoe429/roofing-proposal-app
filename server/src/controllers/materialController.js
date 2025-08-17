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
    
    // Get materials from database
    const materials = await Material.findAll({
      where: companyId ? { companyId } : {},
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`Found ${materials.length} materials`);
    res.json(materials);
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
    
    // Create material in database
    const material = await Material.create(materialData);
    console.log('Material created successfully:', material.id);
    res.status(201).json(material.dataValues || material);
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
    
    // Update material in database
    const material = await Material.findByPk(req.params.id);
    
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    await material.update(req.body);
    console.log('Material updated successfully');
    res.json(material.dataValues || material);
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({ error: 'Failed to update material' });
  }
};

// Delete material
export const deleteMaterial = async (req, res) => {
  try {
    console.log('DELETE /api/materials/:id - Params:', req.params);
    
    // Delete material from database
    const material = await Material.findByPk(req.params.id);
    
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    await material.destroy();
    console.log('Material deleted successfully');
    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  }
};
