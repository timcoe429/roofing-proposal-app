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

const buildPricingSnapshotFromSheet = (sheetData, sheetUrl) => {
  const rows = Array.isArray(sheetData?.rows) ? sheetData.rows : [];
  const header = rows[0] || [];
  const materials = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const category = (row[0] || '').toString().trim();
    const name = (row[1] || '').toString().trim();
    const unit = (row[2] || '').toString().trim();

    // Skip category/header rows that don't have an item/service name
    if (!name) continue;

    const materialCost = parseMoney(row[3]);
    const laborCost = parseMoney(row[4]);
    const totalPrice = parseMoney(row[5]);
    const minOrder = (row[6] || '').toString().trim();
    const notes = (row[7] || '').toString().trim();

    // Skip rows that have no pricing numbers at all
    if (materialCost === 0 && laborCost === 0 && totalPrice === 0) continue;

    materials.push({
      category: category || 'General',
      name,
      unit: unit || 'Per Square',
      materialCost,
      laborCost,
      totalPrice,
      minOrder,
      notes
    });
  }

  const lastSyncedAt = new Date().toISOString();

  return {
    sourceUrl: sheetUrl,
    header,
    totalRows: rows.length,
    totalItems: materials.length,
    lastSyncedAt,
    materials
  };
};

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