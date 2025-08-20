// Calculation utilities for proposals
export const calculations = {
  // Calculate materials total from materials array (excluding labor items)
  calculateMaterialsTotal: (materials = []) => {
    return materials
      .filter(material => material.category !== 'labor')
      .reduce((sum, material) => sum + (material.total || 0), 0);
  },

  // Calculate labor total from hours and rate OR from labor line items
  calculateLaborTotal: (laborHours = 0, laborRate = 0, materials = []) => {
    // First try hours * rate
    const hourlyLabor = laborHours * laborRate;
    
    // Then add any labor line items
    const laborLineItems = materials.filter(item => item.category === 'labor');
    const lineItemLabor = laborLineItems.reduce((sum, item) => sum + (item.total || 0), 0);
    
    return hourlyLabor + lineItemLabor;
  },

  // Calculate add-ons total
  calculateAddOnsTotal: (addOns = []) => {
    return addOns.reduce((sum, addon) => sum + (addon.price || 0), 0);
  },

  // Calculate subtotal (materials + labor + addons)
  calculateSubtotal: (materials = [], laborHours = 0, laborRate = 0, addOns = []) => {
    const materialsTotal = calculations.calculateMaterialsTotal(materials);
    const laborTotal = calculations.calculateLaborTotal(laborHours, laborRate, materials);
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

  // Calculate final total with overhead and profit
  calculateTotal: (materials = [], laborHours = 0, laborRate = 0, addOns = [], overheadPercent = 15, profitPercent = 20, discountAmount = 0) => {
    const subtotal = calculations.calculateSubtotal(materials, laborHours, laborRate, addOns);
    const overheadAmount = calculations.calculateOverheadAmount(subtotal, overheadPercent);
    const subtotalWithOverhead = subtotal + overheadAmount;
    const profitAmount = calculations.calculateProfitAmount(subtotalWithOverhead, profitPercent);
    const totalBeforeDiscount = subtotalWithOverhead + profitAmount;
    return Math.max(0, totalBeforeDiscount - (discountAmount || 0));
  },

  // Get breakdown of all costs
  getCostBreakdown: (materials = [], laborHours = 0, laborRate = 0, addOns = [], overheadPercent = 15, profitPercent = 20, discountAmount = 0, hideMargins = false) => {
    const materialsTotal = calculations.calculateMaterialsTotal(materials);
    const laborTotal = calculations.calculateLaborTotal(laborHours, laborRate, materials);
    const addOnsTotal = calculations.calculateAddOnsTotal(addOns);
    const subtotal = materialsTotal + laborTotal + addOnsTotal;
    const overheadAmount = calculations.calculateOverheadAmount(subtotal, overheadPercent);
    const subtotalWithOverhead = subtotal + overheadAmount;
    const profitAmount = calculations.calculateProfitAmount(subtotalWithOverhead, profitPercent);
    const totalBeforeDiscount = subtotalWithOverhead + profitAmount;
    const finalTotal = Math.max(0, totalBeforeDiscount - (discountAmount || 0));

    if (hideMargins) {
      // Distribute overhead and profit into materials and labor proportionally
      const marginTotal = overheadAmount + profitAmount;
      const materialsRatio = materialsTotal / subtotal;
      const laborRatio = laborTotal / subtotal;
      const addOnsRatio = addOnsTotal / subtotal;
      
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
        profitPercent: 0,
        profitAmount: 0,
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
      profitPercent,
      profitAmount,
      discountAmount,
      finalTotal,
      isMarginHidden: false
    };
  }
};