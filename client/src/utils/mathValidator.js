import { calculations } from './calculations';

// Tolerance for floating point comparisons (in dollars)
const TOLERANCE = 0.01;

/**
 * Validate a single line item
 * @param {Object} item - Line item with quantity, unitPrice, total
 * @returns {Object} - Validation result with isValid and errors
 */
export const validateLineItem = (item) => {
  const errors = [];
  
  if (!item) {
    return { isValid: false, errors: ['Line item is missing'] };
  }

  const quantity = parseFloat(item.quantity) || 0;
  const unitPrice = parseFloat(item.unitPrice) || 0;
  const total = parseFloat(item.total) || 0;
  const expectedTotal = quantity * unitPrice;
  const difference = Math.abs(total - expectedTotal);

  if (difference > TOLERANCE) {
    errors.push({
      type: 'calculation_error',
      message: `${item.name || 'Item'}: Expected total ${expectedTotal.toFixed(2)}, got ${total.toFixed(2)} (difference: ${difference.toFixed(2)})`,
      expected: expectedTotal,
      actual: total,
      difference: difference
    });
  }

  if (quantity <= 0 && item.quantity !== undefined) {
    errors.push({
      type: 'invalid_quantity',
      message: `${item.name || 'Item'}: Quantity must be greater than 0`,
      value: quantity
    });
  }

  if (unitPrice < 0) {
    errors.push({
      type: 'invalid_price',
      message: `${item.name || 'Item'}: Unit price cannot be negative`,
      value: unitPrice
    });
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

/**
 * Validate all line items in a proposal
 * @param {Array} items - Array of line items
 * @returns {Object} - Validation result with isValid, errors, and summary
 */
export const validateLineItems = (items = []) => {
  const allErrors = [];
  let validCount = 0;
  let invalidCount = 0;

  items.forEach((item, index) => {
    const validation = validateLineItem(item);
    if (!validation.isValid) {
      invalidCount++;
      allErrors.push({
        itemIndex: index,
        itemName: item.name || `Item ${index + 1}`,
        errors: validation.errors
      });
    } else {
      validCount++;
    }
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    summary: {
      total: items.length,
      valid: validCount,
      invalid: invalidCount
    }
  };
};

/**
 * Validate proposal totals using calculation utilities
 * @param {Object} proposalData - Complete proposal data
 * @returns {Object} - Validation result
 */
export const validateProposalTotals = (proposalData) => {
  const errors = [];
  const warnings = [];

  // Calculate expected totals using calculation utilities
  const expectedBreakdown = calculations.getCostBreakdown(
    proposalData.materials || [],
    proposalData.laborHours || 0,
    proposalData.laborRate || 75,
    proposalData.addOns || [],
    proposalData.overheadPercent || 15,
    proposalData.profitPercent || 20,
    proposalData.discountAmount || 0
  );

  // Compare with proposal data if it has a stored total
  if (proposalData.totalAmount !== undefined) {
    const storedTotal = parseFloat(proposalData.totalAmount) || 0;
    const calculatedTotal = expectedBreakdown.finalTotal;
    const difference = Math.abs(storedTotal - calculatedTotal);

    if (difference > TOLERANCE) {
      errors.push({
        type: 'total_mismatch',
        message: `Total amount mismatch: Stored total is ${storedTotal.toFixed(2)}, but calculated total is ${calculatedTotal.toFixed(2)} (difference: ${difference.toFixed(2)})`,
        stored: storedTotal,
        calculated: calculatedTotal,
        difference: difference
      });
    }
  }

  // Validate line items
  const lineItemsValidation = validateLineItems([
    ...(proposalData.materials || []),
    ...(proposalData.addOns || [])
  ]);

  if (!lineItemsValidation.isValid) {
    errors.push({
      type: 'line_items_validation',
      message: `${lineItemsValidation.summary.invalid} line item(s) have calculation errors`,
      details: lineItemsValidation.errors
    });
  }

  // Check for negative values
  if (expectedBreakdown.materialsTotal < 0) {
    warnings.push({
      type: 'negative_materials',
      message: 'Materials total is negative',
      value: expectedBreakdown.materialsTotal
    });
  }

  if (expectedBreakdown.laborTotal < 0) {
    warnings.push({
      type: 'negative_labor',
      message: 'Labor total is negative',
      value: expectedBreakdown.laborTotal
    });
  }

  if (expectedBreakdown.finalTotal < 0) {
    errors.push({
      type: 'negative_total',
      message: 'Final total is negative',
      value: expectedBreakdown.finalTotal
    });
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    warnings: warnings,
    breakdown: expectedBreakdown,
    lineItemsValidation: lineItemsValidation
  };
};

/**
 * Compare AI-calculated total with system-calculated total
 * @param {Number} aiTotal - Total from AI response
 * @param {Object} proposalData - Proposal data for system calculation
 * @returns {Object} - Comparison result
 */
export const compareAICalculation = (aiTotal, proposalData) => {
  const systemBreakdown = calculations.getCostBreakdown(
    proposalData.materials || [],
    proposalData.laborHours || 0,
    proposalData.laborRate || 75,
    proposalData.addOns || [],
    proposalData.overheadPercent || 15,
    proposalData.profitPercent || 20,
    proposalData.discountAmount || 0
  );

  const systemTotal = systemBreakdown.finalTotal;
  const aiTotalNum = parseFloat(aiTotal) || 0;
  const difference = Math.abs(aiTotalNum - systemTotal);
  const percentDifference = systemTotal > 0 ? (difference / systemTotal) * 100 : 0;

  return {
    aiTotal: aiTotalNum,
    systemTotal: systemTotal,
    difference: difference,
    percentDifference: percentDifference,
    matches: difference <= TOLERANCE,
    isSignificant: difference > 1.00 || percentDifference > 1, // Flag if difference > $1 or > 1%
    breakdown: systemBreakdown
  };
};

/**
 * Get comprehensive validation report for a proposal
 * @param {Object} proposalData - Complete proposal data
 * @returns {Object} - Full validation report
 */
export const getValidationReport = (proposalData) => {
  const totalsValidation = validateProposalTotals(proposalData);
  
  return {
    isValid: totalsValidation.isValid,
    hasWarnings: totalsValidation.warnings.length > 0,
    errors: totalsValidation.errors,
    warnings: totalsValidation.warnings,
    breakdown: totalsValidation.breakdown,
    lineItems: totalsValidation.lineItemsValidation,
    summary: {
      totalErrors: totalsValidation.errors.length,
      totalWarnings: totalsValidation.warnings.length,
      lineItemErrors: totalsValidation.lineItemsValidation.summary.invalid,
      isValid: totalsValidation.isValid
    }
  };
};

export default {
  validateLineItem,
  validateLineItems,
  validateProposalTotals,
  compareAICalculation,
  getValidationReport
};

