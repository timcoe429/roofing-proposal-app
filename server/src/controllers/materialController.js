import Material from '../models/Material.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import { fetchGoogleSheetData } from '../services/googleSheetsService.js';

const parseMoney = (value) => {
  if (value === null || value === undefined) return 0;
  const cleaned = String(value).replace(/[$,\s]/g, '').trim();
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
};

// Detect column structure from headers
const detectColumnStructure = (headerRow) => {
  const headers = headerRow.map(h => String(h || '').toLowerCase().trim());
  
  // Find column indices
  const categoryIdx = headers.findIndex(h => h.includes('category'));
  const itemNameIdx = headers.findIndex(h => (h.includes('item') && h.includes('name')) || (h.includes('item') && !h.includes('category')));
  const unitIdx = headers.findIndex(h => h === 'unit' || h.includes('unit'));
  const descriptionIdx = headers.findIndex(h => h.includes('description') || h.includes('desc'));
  const priceIdx = headers.findIndex(h => h.includes('price') || (h.includes('cost') && !h.includes('material') && !h.includes('labor')));
  const materialCostIdx = headers.findIndex(h => h.includes('material') && h.includes('cost'));
  const laborCostIdx = headers.findIndex(h => h.includes('labor') && h.includes('cost'));
  const totalPriceIdx = headers.findIndex(h => h.includes('total') && (h.includes('price') || h.includes('cost')));
  
  // Detect format type
  if (itemNameIdx >= 0 && priceIdx >= 0 && categoryIdx >= 0) {
    // New format: Category, Item Name, Unit, Description, Price
    return {
      type: 'simple',
      category: categoryIdx,
      name: itemNameIdx,
      unit: unitIdx >= 0 ? unitIdx : null,
      description: descriptionIdx >= 0 ? descriptionIdx : null,
      price: priceIdx,
      materialCost: null,
      laborCost: null,
      totalPrice: priceIdx
    };
  } else if (materialCostIdx >= 0 && laborCostIdx >= 0) {
    // Original format: Category, Name, Unit, Material Cost, Labor Cost, Total Price
    return {
      type: 'detailed',
      category: categoryIdx >= 0 ? categoryIdx : 0,
      name: itemNameIdx >= 0 ? itemNameIdx : 1,
      unit: unitIdx >= 0 ? unitIdx : 2,
      description: descriptionIdx >= 0 ? descriptionIdx : null,
      price: null,
      materialCost: materialCostIdx,
      laborCost: laborCostIdx,
      totalPrice: totalPriceIdx >= 0 ? totalPriceIdx : 5
    };
  }
  
  // Fallback: assume original format based on position
  return {
    type: 'fallback',
    category: 0,
    name: 1,
    unit: 2,
    description: null,
    price: null,
    materialCost: 3,
    laborCost: 4,
    totalPrice: 5
  };
};

export const buildPricingSnapshotFromSheet = (sheetData, sheetUrl) => {
  const rows = Array.isArray(sheetData?.rows) ? sheetData.rows : [];
  if (rows.length === 0) {
    return {
      sourceUrl: sheetUrl,
      header: [],
      totalRows: 0,
      totalItems: 0,
      lastSyncedAt: new Date().toISOString(),
      materials: []
    };
  }
  
  const header = rows[0] || [];
  const structure = detectColumnStructure(header);
  const materials = [];
  
  // Track current category for rows without category
  let currentCategory = 'General';
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    
    // Get category - use current category if cell is empty
    const categoryCell = structure.category !== null ? (row[structure.category] || '').toString().trim() : '';
    if (categoryCell) {
      currentCategory = categoryCell;
    }
    
    // Get item name
    const name = structure.name !== null ? (row[structure.name] || '').toString().trim() : '';
    
    // Skip rows without item name
    if (!name) continue;
    
    // Get unit
    const unit = structure.unit !== null ? (row[structure.unit] || '').toString().trim() : 'each';
    
    // Get description if available
    const description = structure.description !== null ? (row[structure.description] || '').toString().trim() : '';
    
    let materialCost = 0;
    let laborCost = 0;
    let totalPrice = 0;
    
    if (structure.type === 'simple') {
      // Simple format: Price is the total price
      totalPrice = parseMoney(row[structure.price]);
      materialCost = totalPrice; // Assume all cost is material cost
      laborCost = 0;
    } else {
      // Detailed format: Separate material and labor costs
      materialCost = structure.materialCost !== null ? parseMoney(row[structure.materialCost]) : 0;
      laborCost = structure.laborCost !== null ? parseMoney(row[structure.laborCost]) : 0;
      totalPrice = structure.totalPrice !== null ? parseMoney(row[structure.totalPrice]) : (materialCost + laborCost);
    }
    
    // Skip rows with no pricing
    if (materialCost === 0 && laborCost === 0 && totalPrice === 0) continue;
    
    materials.push({
      category: currentCategory || 'General',
      name,
      unit: unit || 'each',
      description: description || '',
      materialCost,
      laborCost,
      totalPrice,
      minOrder: '',
      notes: description || ''
    });
  }
  
  const lastSyncedAt = new Date().toISOString();
  
  // Store raw CSV data for AI (includes ALL columns)
  const rawCsvData = sheetData?.csvData || rows.map(row => 
    row.map(cell => 
      cell && (cell.includes(',') || cell.includes('"')) 
        ? `"${cell.replace(/"/g, '""')}"` 
        : cell || ''
    ).join(',')
  ).join('\n');
  
  return {
    sourceUrl: sheetUrl,
    header,
    structure: structure.type,
    totalRows: rows.length,
    totalItems: materials.length,
    lastSyncedAt,
    materials,
    rawCsvData // Store raw CSV with ALL columns for AI
  };
};

// Get all materials for a company
export const getMaterials = async (req, res) => {
  try {
    console.log('GET /api/materials - User:', req.user);
    
    // Get companyId from user's companyId field
    let companyId = req.user?.companyId;
    
    if (!companyId) {
      // Fallback: get user's companyId from database
      const user = await User.findByPk(req.user?.userId);
      companyId = user?.companyId;
    }
    
    if (!companyId) {
      console.log('No companyId found for user, looking up first company...');
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
    
    // Get companyId from user's companyId field
    let companyId = req.user?.companyId;
    
    if (!companyId) {
      // Fallback: get user's companyId from database
      const user = await User.findByPk(req.user?.userId);
      companyId = user?.companyId;
    }
    
    if (!companyId) {
      console.log('No companyId found for user, looking up first company...');
      const company = await Company.findOne();
      companyId = company?.id;
      console.log('Found company:', company?.id, company?.name);
    }

    let materialData = {
      ...req.body,
      companyId
    };
    
    // If it's a Google Sheets URL, fetch and snapshot pricing data
    if (materialData.specifications?.type === 'url' && materialData.specifications?.files?.[0]?.name) {
      const sheetUrl = materialData.specifications.files[0].name;
      console.log('Processing Google Sheet URL:', sheetUrl);
      
      try {
        const sheetData = await fetchGoogleSheetData(sheetUrl);
        const snapshot = buildPricingSnapshotFromSheet(sheetData, sheetUrl);
        console.log(`✅ Google Sheet processed: ${snapshot.totalItems} priced items found`);
        
        // Update specifications with snapshot + metadata
        materialData.specifications = {
          ...materialData.specifications,
          itemCount: snapshot.totalItems,
          totalRows: snapshot.totalRows,
          processedAt: snapshot.lastSyncedAt,
          extractedData: sheetData.rows.slice(0, 10), // Store first 10 rows as preview
          pricingSnapshot: snapshot,
          syncStatus: 'ok',
          syncError: null,
          lastSyncedAt: snapshot.lastSyncedAt
        };
      } catch (error) {
        console.error('Failed to process Google Sheet:', error);
        // Continue with creation but mark as failed to process
        materialData.specifications = {
          ...materialData.specifications,
          itemCount: 0,
          processingError: error.message,
          processedAt: new Date().toISOString(),
          pricingSnapshot: null,
          syncStatus: 'error',
          syncError: error.message,
          lastSyncedAt: null
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

// Resync a pricing sheet (Google Sheets URL) and store a snapshot for stable AI usage
export const resyncPricingSheet = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('POST /api/materials/:id/resync - Params:', req.params);

    const material = await Material.findByPk(id);
    if (!material) {
      return res.status(404).json({ error: 'Pricing sheet not found' });
    }

    const sheetUrl = material.specifications?.files?.[0]?.name;
    const isUrlSheet = material.category === 'pricing_sheet' && material.specifications?.type === 'url' && sheetUrl;

    if (!isUrlSheet) {
      return res.status(400).json({ error: 'Resync is only available for Google Sheets pricing sheets' });
    }

    const sheetData = await fetchGoogleSheetData(sheetUrl);
    const snapshot = buildPricingSnapshotFromSheet(sheetData, sheetUrl);

    const nextSpecs = {
      ...(material.specifications || {}),
      itemCount: snapshot.totalItems,
      totalRows: snapshot.totalRows,
      processedAt: snapshot.lastSyncedAt,
      pricingSnapshot: snapshot,
      syncStatus: 'ok',
      syncError: null,
      lastSyncedAt: snapshot.lastSyncedAt
    };

    await material.update({ specifications: nextSpecs });

    return res.json({
      success: true,
      id: material.id,
      name: material.name,
      totalItems: snapshot.totalItems,
      lastSyncedAt: snapshot.lastSyncedAt
    });
  } catch (error) {
    console.error('Error resyncing pricing sheet:', error);
    return res.status(500).json({ error: 'Failed to resync pricing sheet', details: error.message });
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
    
    // Prefer stored snapshot (stable). If missing, attempt one-time fetch and store snapshot.
    const pricingData = [];
    const errors = [];
    
    for (const sheet of pricingSheets) {
      try {
        if (sheet.specifications?.type === 'url' && sheet.specifications?.files?.[0]?.name) {
          const sheetUrl = sheet.specifications.files[0].name;

          const existingSnapshot = sheet.specifications?.pricingSnapshot;
          if (existingSnapshot?.materials?.length) {
            pricingData.push({
              sheetName: sheet.name,
              materials: existingSnapshot.materials,
              totalItems: existingSnapshot.materials.length,
              lastSyncedAt: existingSnapshot.lastSyncedAt || sheet.specifications?.lastSyncedAt || null
            });
            continue;
          }

          console.log(`📊 No snapshot yet. Fetching pricing data from: ${sheet.name}`);
          const sheetData = await fetchGoogleSheetData(sheetUrl);
          const snapshot = buildPricingSnapshotFromSheet(sheetData, sheetUrl);

          const nextSpecs = {
            ...(sheet.specifications || {}),
            itemCount: snapshot.totalItems,
            totalRows: snapshot.totalRows,
            processedAt: snapshot.lastSyncedAt,
            pricingSnapshot: snapshot,
            syncStatus: 'ok',
            syncError: null,
            lastSyncedAt: snapshot.lastSyncedAt
          };
          await sheet.update({ specifications: nextSpecs });

          pricingData.push({
            sheetName: sheet.name,
            materials: snapshot.materials,
            totalItems: snapshot.totalItems,
            lastSyncedAt: snapshot.lastSyncedAt
          });

          console.log(`✅ Snapshot stored for ${sheet.name}: ${snapshot.totalItems} items`);
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