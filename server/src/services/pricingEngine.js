import { FormulaEngine } from '../utils/formulaEngine.js';
import { ConditionEvaluator } from '../utils/conditionEvaluator.js';
import { calculations } from '../utils/calculations.js';
import logger from '../utils/logger.js';

/**
 * Pricing engine that calculates material quantities and costs from pricing sheet
 * Uses FormulaEngine for quantity calculations and ConditionEvaluator for filtering
 */
export class PricingEngine {
  constructor(pricingSheetData = []) {
    this.sheetData = Array.isArray(pricingSheetData) ? pricingSheetData : [];
  }

  /**
   * Calculate line items for a proposal based on project variables
   * @param {object} projectVariables - Project context (roof_sqft, roof_system, etc.)
   * @param {object} options - Options for calculation
   * @returns {array} - Array of calculated line items
   */
  calculateLineItems(projectVariables = {}, options = {}) {
    const {
      includeOptional = false,
      includeManualOnly = false,
      materialNames = null // If provided, only calculate these materials
    } = options;

    const formulaEngine = new FormulaEngine(projectVariables);
    const conditionEvaluator = new ConditionEvaluator(projectVariables);
    
    const lineItems = [];

    for (const item of this.sheetData) {
      // Skip if materialNames filter is provided and this item doesn't match
      if (materialNames && Array.isArray(materialNames) && materialNames.length > 0) {
        const itemName = item['Item Name'] || item.name || item['itemName'] || '';
        const matches = materialNames.some(name => 
          itemName.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(itemName.toLowerCase())
        );
        if (!matches) continue;
      }

      // Get condition from various possible column names
      const appliesWhen = item['Applies When'] || item.appliesWhen || item['appliesWhen'] || '';
      
      // Check if item applies
      if (!conditionEvaluator.evaluate(appliesWhen)) {
        continue; // Skip items that don't apply
      }

      // Get logic tier from various possible column names
      const logicTier = (item['Logic Tier'] || item.logicTier || item['logicTier'] || 'optional').toLowerCase();
      
      // Check logic tier
      if (logicTier === 'manual_only' && !includeManualOnly) {
        continue; // Skip manual-only items unless explicitly requested
      }
      if (logicTier === 'optional' && !includeOptional) {
        continue; // Skip optional items unless requested
      }

      // Calculate quantity using formula
      const qtyFormula = item['Qty Formula'] || item.qtyFormula || item['qtyFormula'] || '0';
      let quantity = formulaEngine.evaluate(qtyFormula);

      // Skip if quantity is 0 or negative (before waste/rounding)
      if (quantity <= 0) continue;

      // Apply waste percentage
      const wastePercentStr = item['Waste %'] || item.wastePercent || item['wastePercent'] || '0';
      const wastePercent = this.parsePercentage(wastePercentStr);
      quantity = quantity * (1 + wastePercent);

      // Apply rounding
      const rounding = (item['Rounding'] || item.rounding || item['rounding'] || 'none').toLowerCase();
      switch (rounding) {
        case 'ceil':
          quantity = Math.ceil(quantity);
          break;
        case 'floor':
          quantity = Math.floor(quantity);
          break;
        case 'round':
          quantity = Math.round(quantity);
          break;
        // 'none' or default: no rounding
      }

      // Skip if quantity is still 0 after calculations
      if (quantity <= 0) continue;

      // Get price
      const price = this.parsePrice(item['Price'] || item.price || 0);
      const unit = item['Unit'] || item.unit || item['unit'] || 'each';
      const baseUOM = item['Base UOM'] || item.baseUOM || item['baseUOM'] || unit;
      const category = item['Category'] || item.category || item['category'] || 'MISC';
      const itemName = item['Item Name'] || item.name || item['itemName'] || 'Unknown';
      const coverage = item['Coverage'] || item.coverage || item['coverage'] || '';
      const description = item['Description'] || item.description || item['description'] || '';
      const color = item['Color'] || item.color || item['color'] || '';

      // Calculate total
      const total = calculations.roundToCents(quantity * price);

      // Build line item
      lineItems.push({
        category: category,
        name: itemName,
        unit: unit,
        baseUOM: baseUOM,
        quantity: calculations.roundToCents(quantity),
        unitPrice: price,
        total: total,
        coverage: coverage,
        description: description,
        color: color,
        logicTier: logicTier,
        appliesWhen: appliesWhen,
        qtyFormula: qtyFormula,
        wastePercent: wastePercent * 100 // Store as percentage for display
      });
    }

    logger.info(`PricingEngine calculated ${lineItems.length} line items from ${this.sheetData.length} items in pricing sheet`);
    
    return lineItems;
  }

  /**
   * Parse price string to number
   */
  parsePrice(price) {
    if (typeof price === 'number') {
      return price >= 0 ? price : 0;
    }
    if (typeof price === 'string') {
      // Remove $ and commas, then parse
      const cleaned = price.replace(/[$,]/g, '').trim();
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) || parsed < 0 ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Parse percentage string to decimal
   */
  parsePercentage(percentStr) {
    if (typeof percentStr === 'number') {
      return percentStr / 100;
    }
    if (typeof percentStr === 'string') {
      // Remove % sign and parse
      const cleaned = percentStr.replace(/%/g, '').trim();
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed / 100;
    }
    return 0;
  }

  /**
   * Get items by category
   */
  getItemsByCategory(category) {
    return this.sheetData.filter(item => {
      const itemCategory = (item['Category'] || item.category || item['category'] || '').toUpperCase();
      return itemCategory === category.toUpperCase();
    });
  }

  /**
   * Get items by name (fuzzy match)
   */
  findItemsByName(searchName) {
    const search = searchName.toLowerCase().trim();
    if (!search) return [];
    
    return this.sheetData.filter(item => {
      const name = (item['Item Name'] || item.name || item['itemName'] || '').toLowerCase();
      return name.includes(search) || search.includes(name);
    });
  }

  /**
   * Get all unique categories
   */
  getCategories() {
    const categories = new Set();
    this.sheetData.forEach(item => {
      const category = item['Category'] || item.category || item['category'];
      if (category) {
        categories.add(category);
      }
    });
    return Array.from(categories);
  }

  /**
   * Set pricing sheet data
   */
  setSheetData(sheetData) {
    this.sheetData = Array.isArray(sheetData) ? sheetData : [];
  }
}

export default PricingEngine;

