// Calculation utilities for proposals
export const calculations = {
  // Helper function to round to 2 decimals (cents) for financial accuracy
  roundToCents: (amount) => {
    return Math.round((amount || 0) * 100) / 100;
  },

  // Calculate materials total from materials array (excluding labor items)
  calculateMaterialsTotal: (materials = []) => {
    const total = materials
      .filter(material => material.category !== 'labor')
      .reduce((sum, material) => sum + (material.total || 0), 0);
    return calculations.roundToCents(total);
  },

  // Calculate labor total from labor array (single source of truth)
  calculateLaborTotal: (labor = []) => {
    if (!Array.isArray(labor)) return 0;
    
    const total = labor.reduce((sum, item) => {
      // If total is already calculated, use it; otherwise calculate hours * rate
      if (item.total !== undefined) {
        return sum + (parseFloat(item.total) || 0);
      }
      const hours = parseFloat(item.hours) || 0;
      const rate = parseFloat(item.rate) || 0;
      return sum + (hours * rate);
    }, 0);
    
    return calculations.roundToCents(total);
  },

  // Calculate add-ons total
  calculateAddOnsTotal: (addOns = []) => {
    if (!Array.isArray(addOns)) return 0;
    const total = addOns.reduce((sum, addon) => sum + (addon.price || 0), 0);
    return calculations.roundToCents(total);
  },

  // Calculate subtotal (materials + labor + addons)
  calculateSubtotal: (materials = [], labor = [], addOns = []) => {
    const materialsTotal = calculations.calculateMaterialsTotal(materials);
    const laborTotal = calculations.calculateLaborTotal(labor);
    const addOnsTotal = calculations.calculateAddOnsTotal(addOns);
    return calculations.roundToCents(materialsTotal + laborTotal + addOnsTotal);
  },

  // Calculate overhead amount
  calculateOverheadAmount: (subtotal, overheadPercent = 15) => {
    return calculations.roundToCents(subtotal * (overheadPercent / 100));
  },

  // Calculate profit amount  
  calculateProfitAmount: (subtotalWithOverhead, profitPercent = 20) => {
    return calculations.roundToCents(subtotalWithOverhead * (profitPercent / 100));
  },

  // Calculate overhead costs (workers comp, insurance, office costs)
  calculateOverheadCosts: (subtotal, overheadCostPercent = 10) => {
    return calculations.roundToCents(subtotal * (overheadCostPercent / 100));
  },

  // Calculate NET margin percentage
  calculateNetMargin: (finalTotal, totalCost) => {
    if (finalTotal === 0) return 0;
    return ((finalTotal - totalCost) / finalTotal) * 100;
  },

  // Calculate final total with overhead and profit
  calculateTotal: (materials = [], labor = [], addOns = [], overheadPercent = 15, profitPercent = 20, discountAmount = 0) => {
    const subtotal = calculations.calculateSubtotal(materials, labor, addOns);
    const overheadAmount = calculations.calculateOverheadAmount(subtotal, overheadPercent);
    const subtotalWithOverhead = subtotal + overheadAmount;
    const profitAmount = calculations.calculateProfitAmount(subtotalWithOverhead, profitPercent);
    const totalBeforeDiscount = subtotalWithOverhead + profitAmount;
    return Math.max(0, totalBeforeDiscount - (discountAmount || 0));
  },

  // Get breakdown of all costs (SINGLE SOURCE OF TRUTH - always calculate from current data)
  getCostBreakdown: (materials = [], labor = [], addOns = [], overheadPercent = 15, profitPercent = 20, overheadCostPercent = 10, netMarginTarget = 20, discountAmount = 0, hideMargins = false) => {
    // Round all calculations to 2 decimals for financial accuracy
    const materialsTotal = calculations.calculateMaterialsTotal(materials);
    const laborTotal = calculations.calculateLaborTotal(labor);
    const addOnsTotal = calculations.calculateAddOnsTotal(addOns);
    const subtotal = calculations.roundToCents(materialsTotal + laborTotal + addOnsTotal);
    
    // Calculate overhead costs (workers comp, insurance, office costs)
    const overheadCosts = calculations.calculateOverheadCosts(subtotal, overheadCostPercent);
    
    // Calculate overhead amount (existing overhead percentage)
    const overheadAmount = calculations.calculateOverheadAmount(subtotal, overheadPercent);
    const subtotalWithOverhead = calculations.roundToCents(subtotal + overheadAmount);
    const profitAmount = calculations.calculateProfitAmount(subtotalWithOverhead, profitPercent);
    
    // Total cost = subtotal + overhead costs (workers comp, insurance, office)
    const totalCost = calculations.roundToCents(subtotal + overheadCosts);
    
    // Calculate final total ensuring NET margin
    const calculatedTotal = calculations.roundToCents(subtotalWithOverhead + profitAmount);
    // NET margin = (Final Total - Total Cost) / Final Total = target%
    // Solving: Final Total = Total Cost / (1 - target%/100)
    const targetTotal = calculations.roundToCents(totalCost / (1 - netMarginTarget / 100));
    const finalTotalBeforeDiscount = Math.max(calculatedTotal, targetTotal);
    const finalTotal = Math.max(0, calculations.roundToCents(finalTotalBeforeDiscount - (discountAmount || 0)));
    
    // Calculate actual NET margin
    const actualNetMargin = calculations.calculateNetMargin(finalTotal, totalCost);

    if (hideMargins) {
      // Distribute overhead and profit into materials and labor proportionally
      const marginTotal = calculations.roundToCents(overheadAmount + profitAmount);
      const materialsRatio = subtotal > 0 ? materialsTotal / subtotal : 0;
      const laborRatio = subtotal > 0 ? laborTotal / subtotal : 0;
      const addOnsRatio = subtotal > 0 ? addOnsTotal / subtotal : 0;
      
      const materialsWithMargins = calculations.roundToCents(materialsTotal + (marginTotal * materialsRatio));
      const laborWithMargins = calculations.roundToCents(laborTotal + (marginTotal * laborRatio));
      const addOnsWithMargins = calculations.roundToCents(addOnsTotal + (marginTotal * addOnsRatio));

      return {
        materialsTotal: materialsWithMargins,
        laborTotal: laborWithMargins,
        addOnsTotal: addOnsWithMargins,
        subtotal: finalTotal, // Hide the original subtotal
        overheadPercent: 0,
        overheadAmount: 0,
        overheadCostPercent: 0,
        overheadCosts: 0,
        profitPercent: 0,
        profitAmount: 0,
        netMarginTarget: 0,
        netMarginActual: 0,
        totalCost: 0,
        discountAmount,
        finalTotal,
        isMarginHidden: true
      };
    }

    return {
      materialsTotal,
      laborTotal,
      addOnsTotal,
      subtotal,
      overheadPercent,
      overheadAmount,
      overheadCostPercent,
      overheadCosts,
      subtotalWithOverhead,
      profitPercent,
      profitAmount,
      netMarginTarget,
      netMarginActual: actualNetMargin,
      netMarginAmount: calculations.roundToCents(finalTotal - totalCost), // Dollar amount of net margin
      totalCost,
      discountAmount,
      finalTotal,
      isMarginHidden: false
    };
  },

  // Calculate markup multiplier from overhead + profit
  calculateMarkupMultiplier: (subtotal, overheadAmount, profitAmount) => {
    if (subtotal === 0) return 1;
    return (subtotal + overheadAmount + profitAmount) / subtotal;
  },

  // Apply markup to individual line items
  applyMarkupToLineItems: (items, multiplier) => {
    return items.map(item => ({
      ...item,
      unitPrice: (item.unitPrice || 0) * multiplier,
      total: (item.total || 0) * multiplier
    }));
  }
};