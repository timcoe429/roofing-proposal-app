// Server-side calculation utilities for proposals
export const calculations = {
  // Helper function to round to 2 decimals (cents) for financial accuracy
  roundToCents: (amount) => {
    return Math.round((amount || 0) * 100) / 100;
  },

  // Calculate materials total from materials array (excluding labor items)
  calculateMaterialsTotal: (materials = []) => {
    return materials
      .filter(material => material.category !== 'labor')
      .reduce((sum, material) => sum + (material.total || 0), 0);
  },

  // Calculate labor total from labor array (single source of truth)
  calculateLaborTotal: (labor = []) => {
    if (!Array.isArray(labor)) return 0;
    
    return labor.reduce((sum, item) => {
      // If total is already calculated, use it; otherwise calculate hours * rate
      if (item.total !== undefined) {
        return sum + (parseFloat(item.total) || 0);
      }
      const hours = parseFloat(item.hours) || 0;
      const rate = parseFloat(item.rate) || 0;
      return sum + (hours * rate);
    }, 0);
  },

  // Calculate add-ons total
  calculateAddOnsTotal: (addOns = []) => {
    if (!Array.isArray(addOns)) return 0;
    return addOns.reduce((sum, addon) => sum + (addon.price || 0), 0);
  },

  // Calculate subtotal (materials + labor + addons)
  calculateSubtotal: (materials = [], labor = [], addOns = []) => {
    const materialsTotal = calculations.calculateMaterialsTotal(materials);
    const laborTotal = calculations.calculateLaborTotal(labor);
    const addOnsTotal = calculations.calculateAddOnsTotal(addOns);
    return materialsTotal + laborTotal + addOnsTotal;
  },

  // Calculate overhead amount
  calculateOverheadAmount: (subtotal, overheadPercent = 15) => {
    return subtotal * (overheadPercent / 100);
  },

  // Calculate profit amount  
  calculateProfitAmount: (subtotalWithOverhead, profitPercent = 20) => {
    return subtotalWithOverhead * (profitPercent / 100);
  },

  // Calculate overhead costs (workers comp, insurance, office costs)
  calculateOverheadCosts: (subtotal, overheadCostPercent = 10) => {
    return subtotal * (overheadCostPercent / 100);
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
    const materialsTotal = calculations.calculateMaterialsTotal(materials);
    const laborTotal = calculations.calculateLaborTotal(labor);
    const addOnsTotal = calculations.calculateAddOnsTotal(addOns);
    const subtotal = materialsTotal + laborTotal + addOnsTotal;
    
    // Calculate overhead costs (workers comp, insurance, office costs)
    const overheadCosts = calculations.calculateOverheadCosts(subtotal, overheadCostPercent);
    
    // Calculate overhead amount (existing overhead percentage)
    const overheadAmount = calculations.calculateOverheadAmount(subtotal, overheadPercent);
    const subtotalWithOverhead = subtotal + overheadAmount;
    const profitAmount = calculations.calculateProfitAmount(subtotalWithOverhead, profitPercent);
    
    // Total cost = subtotal + overhead costs (workers comp, insurance, office)
    const totalCost = subtotal + overheadCosts;
    
    // Calculate final total ensuring NET margin
    const calculatedTotal = subtotalWithOverhead + profitAmount;
    // NET margin = (Final Total - Total Cost) / Final Total = target%
    // Solving: Final Total = Total Cost / (1 - target%/100)
    const targetTotal = totalCost / (1 - netMarginTarget / 100);
    const finalTotalBeforeDiscount = Math.max(calculatedTotal, targetTotal);
    const finalTotal = Math.max(0, finalTotalBeforeDiscount - (discountAmount || 0));
    
    // Calculate actual NET margin
    const actualNetMargin = calculations.calculateNetMargin(finalTotal, totalCost);

    if (hideMargins) {
      // Distribute overhead and profit into materials and labor proportionally
      const marginTotal = overheadAmount + profitAmount;
      const materialsRatio = subtotal > 0 ? materialsTotal / subtotal : 0;
      const laborRatio = subtotal > 0 ? laborTotal / subtotal : 0;
      const addOnsRatio = subtotal > 0 ? addOnsTotal / subtotal : 0;
      
      const materialsWithMargins = materialsTotal + (marginTotal * materialsRatio);
      const laborWithMargins = laborTotal + (marginTotal * laborRatio);
      const addOnsWithMargins = addOnsTotal + (marginTotal * addOnsRatio);

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
      totalCost,
      discountAmount,
      finalTotal,
      isMarginHidden: false
    };
  }
};
