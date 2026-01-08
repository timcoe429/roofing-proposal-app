import { calculations } from '../utils/calculations.js';
import logger from '../utils/logger.js';

/**
 * Simple pricing engine that looks up material prices from pricing sheet
 * The AI handles quantity calculations conversationally
 */
export class PricingEngine {
  constructor(pricingSheetData = []) {
    this.sheetData = Array.isArray(pricingSheetData) ? pricingSheetData : [];
  }

  /**
   * Calculate line items for materials with quantities
   * @param {object} projectVariables - Project context (measurements, etc.)
   * @param {object} options - Options including materialNames
   * @returns {array} - Array of calculated line items
   */
  calculateLineItems(projectVariables = {}, options = {}) {
    const { materialNames = [] } = options;
    
    if (!materialNames || materialNames.length === 0) {
      return [];
    }

    const lineItems = [];

    for (const requestedName of materialNames) {
      // Find matching item in pricing sheet
      const item = this.findItem(requestedName);
      
      if (!item) {
        logger.warn(`Material not found in pricing sheet: ${requestedName}`);
        continue;
      }

      const category = item.category || item['Category'] || 'MISC';
      const name = item.name || item['Item Name'] || requestedName;
      const unit = item.unit || item['Unit'] || 'each';
      const coverage = item.coverage || item['Coverage'] || '';
      const price = this.parsePrice(item.price || item['Price'] || 0);
      const notes = item.notes || item['Notes'] || '';

      // Calculate quantity based on coverage and measurements
      let quantity = this.calculateQuantity(coverage, projectVariables);
      
      // Add 10% waste for roofing materials
      if (category.toLowerCase().includes('roofing') || category.toLowerCase().includes('underlayment')) {
        quantity = Math.ceil(quantity * 1.1);
      } else {
        quantity = Math.ceil(quantity);
      }

      // Skip if no quantity
      if (quantity <= 0) {
        quantity = 1; // Default to 1 if we can't calculate
      }

      const total = calculations.roundToCents(quantity * price);

      lineItems.push({
        category,
        name,
        unit,
        quantity,
        unitPrice: price,
        total,
        coverage,
        notes
      });
    }

    logger.info(`PricingEngine calculated ${lineItems.length} line items`);
    return lineItems;
  }

  /**
   * Find item by name (case-insensitive)
   */
  findItem(searchName) {
    const search = (searchName || '').toLowerCase().trim();
    if (!search) return null;
    
    // Try exact match first
    let found = this.sheetData.find(item => {
      const name = (item.name || item['Item Name'] || '').toLowerCase().trim();
      return name === search;
    });
    
    if (found) return found;
    
    // Try partial match
    found = this.sheetData.find(item => {
      const name = (item.name || item['Item Name'] || '').toLowerCase().trim();
      return name.includes(search) || search.includes(name);
    });
    
    return found;
  }

  /**
   * Calculate quantity based on coverage and measurements
   */
  calculateQuantity(coverage, projectVars) {
    if (!coverage) return 1;
    
    const coverageStr = coverage.toLowerCase();
    const roofSqft = projectVars.roof_sqft || (projectVars.squares * 100) || 0;
    const roofSq = projectVars.roof_sq || projectVars.squares || (roofSqft / 100) || 0;
    
    // Parse coverage like "14.3 sq ft per bundle" or "2 sq per roll"
    const sqftMatch = coverageStr.match(/(\d+\.?\d*)\s*(?:sq\.?\s*ft|sqft|square\s*feet?)/i);
    const sqMatch = coverageStr.match(/(\d+\.?\d*)\s*(?:sq|squares?)\s*(?:per|\/)/i);
    const lfMatch = coverageStr.match(/(\d+\.?\d*)\s*(?:lf|linear\s*feet?|ft|feet?)\s*(?:per|\/)/i);
    
    if (sqftMatch) {
      const coveragePerUnit = parseFloat(sqftMatch[1]) || 1;
      return roofSqft / coveragePerUnit;
    }
    
    if (sqMatch) {
      const coveragePerUnit = parseFloat(sqMatch[1]) || 1;
      return roofSq / coveragePerUnit;
    }
    
    if (lfMatch) {
      // For linear measurements, check various lengths
      const totalLF = (projectVars.ridge_lf || 0) + 
                     (projectVars.valley_lf || 0) + 
                     (projectVars.eave_lf || 0) + 
                     (projectVars.rake_lf || 0);
      const coveragePerUnit = parseFloat(lfMatch[1]) || 1;
      if (totalLF > 0) {
        return totalLF / coveragePerUnit;
      }
    }
    
    // Default to 1 if we can't figure out the coverage
    return 1;
  }

  /**
   * Parse price string to number
   */
  parsePrice(price) {
    if (typeof price === 'number') return price >= 0 ? price : 0;
    if (typeof price === 'string') {
      const cleaned = price.replace(/[$,]/g, '').trim();
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) || parsed < 0 ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Get all unique categories
   */
  getCategories() {
    const categories = new Set();
    this.sheetData.forEach(item => {
      const category = item.category || item['Category'];
      if (category) categories.add(category);
    });
    return Array.from(categories);
  }

  /**
   * Get items by category
   */
  getItemsByCategory(category) {
    return this.sheetData.filter(item => {
      const itemCategory = (item.category || item['Category'] || '').toUpperCase();
      return itemCategory === category.toUpperCase();
    });
  }
}

export default PricingEngine;
