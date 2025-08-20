// Server-side calculation utilities for proposals
export const calculations = {
  // Calculate materials total from materials array
  calculateMaterialsTotal: (materials = []) => {
    return materials.reduce((sum, material) => sum + (material.total || 0), 0);
  },

  // Calculate labor total from hours and rate
  calculateLaborTotal: (laborHours = 0, laborRate = 0) => {
    return laborHours * laborRate;
  },

  // Calculate add-ons total
  calculateAddOnsTotal: (addOns = []) => {
    return addOns.reduce((sum, addon) => sum + (addon.price || 0), 0);
  },

  // Calculate subtotal (materials + labor + addons)
  calculateSubtotal: (materials = [], laborHours = 0, laborRate = 0, addOns = []) => {
    const materialsTotal = calculations.calculateMaterialsTotal(materials);
    const laborTotal = calculations.calculateLaborTotal(laborHours, laborRate);
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
  getCostBreakdown: (materials = [], laborHours = 0, laborRate = 0, addOns = [], overheadPercent = 15, profitPercent = 20, discountAmount = 0) => {
    const materialsTotal = calculations.calculateMaterialsTotal(materials);
    const laborTotal = calculations.calculateLaborTotal(laborHours, laborRate);
    const addOnsTotal = calculations.calculateAddOnsTotal(addOns);
    const subtotal = materialsTotal + laborTotal + addOnsTotal;
    const overheadAmount = calculations.calculateOverheadAmount(subtotal, overheadPercent);
    const subtotalWithOverhead = subtotal + overheadAmount;
    const profitAmount = calculations.calculateProfitAmount(subtotalWithOverhead, profitPercent);
    const totalBeforeDiscount = subtotalWithOverhead + profitAmount;
    const finalTotal = Math.max(0, totalBeforeDiscount - (discountAmount || 0));

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
      finalTotal
    };
  }
};
