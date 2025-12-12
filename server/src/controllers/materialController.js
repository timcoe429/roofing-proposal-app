import Material from '../models/Material.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import { fetchGoogleSheetData } from '../services/googleSheetsService.js';

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

    let materialData = {
      ...req.body,
      companyId
    };
    
    // If it's a Google Sheets URL, fetch the actual data to get item count
    if (materialData.specifications?.type === 'url' && materialData.specifications?.files?.[0]?.name) {
      const sheetUrl = materialData.specifications.files[0].name;
      console.log('Processing Google Sheet URL:', sheetUrl);
      
      try {
        const sheetData = await fetchGoogleSheetData(sheetUrl);
        console.log(`✅ Google Sheet processed: ${sheetData.dataRowCount} items found`);
        
        // Update specifications with actual item count
        materialData.specifications = {
          ...materialData.specifications,
          itemCount: sheetData.dataRowCount,
          totalRows: sheetData.rowCount,
          processedAt: new Date().toISOString(),
          extractedData: sheetData.rows.slice(0, 10) // Store first 10 rows as preview
        };
      } catch (error) {
        console.error('Failed to process Google Sheet:', error);
        // Continue with creation but mark as failed to process
        materialData.specifications = {
          ...materialData.specifications,
          itemCount: 0,
          processingError: error.message,
          processedAt: new Date().toISOString()
        };
      }
    }
    
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

// Get active pricing sheets for AI to use
export const getActivePricingForAI = async (req, res) => {
  try {
    console.log('GET /api/materials/ai-pricing - Getting active pricing sheets for AI');
    
    // For development - get first company if no user
    let companyId;
    if (req.user?.companyId) {
      companyId = req.user.companyId;
    } else {
      console.log('No user/company in request, looking up first company...');
      const company = await Company.findOne();
      companyId = company?.id;
    }
    
    // Get active pricing sheets (materials with category 'pricing_sheet')
    const pricingSheets = await Material.findAll({
      where: { 
        companyId: companyId,
        category: 'pricing_sheet',
        isActive: true
      },
      order: [['updatedAt', 'DESC']]
    });
    
    console.log(`Found ${pricingSheets.length} active pricing sheets`);
    
    // Fetch actual pricing data from Google Sheets
    const pricingData = [];
    const errors = [];
    
    for (const sheet of pricingSheets) {
      try {
        if (sheet.specifications?.type === 'url' && sheet.specifications?.files?.[0]?.name) {
          const sheetUrl = sheet.specifications.files[0].name;
          console.log(`📊 Fetching pricing data from: ${sheet.name}`);
          
          const sheetData = await fetchGoogleSheetData(sheetUrl);
          
          // Parse the CSV data into structured pricing
          const rows = sheetData.csvData.split('\n').filter(row => row.trim());
          const headers = rows[0].split(',').map(h => h.trim());
          
          const materials = [];
          for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].split(',').map(c => c.trim());
            if (cells.length >= 6 && cells[1] && cells[3] && cells[4]) {
              materials.push({
                category: cells[0] || 'General',
                name: cells[1],
                unit: cells[2] || 'Per Square',
                materialCost: parseFloat(cells[3]) || 0,
                laborCost: parseFloat(cells[4]) || 0,
                totalPrice: parseFloat(cells[5]) || 0,
                minOrder: cells[6] || '',
                notes: cells[7] || ''
              });
            }
          }
          
          pricingData.push({
            sheetName: sheet.name,
            materials: materials,
            totalItems: materials.length
          });
          
          console.log(`✅ Processed ${materials.length} materials from ${sheet.name}`);
        }
      } catch (error) {
        errors.push({
          sheetName: sheet?.name || 'Unknown',
          message: error.message
        });
        console.error(`Error processing pricing sheet ${sheet.name}:`, error);
      }
    }
    
    res.json({
      success: true,
      companyId: companyId,
      pricingSheets: pricingData,
      totalSheets: pricingData.length,
      errors,
      message: `Found ${pricingData.length} active pricing sheets with real material costs`
    });
    
  } catch (error) {
    console.error('Error getting AI pricing data:', error);
    res.status(500).json({ error: 'Failed to get pricing data for AI' });
  }
};