// Server-side formatter utilities for proposals
export const formatters = {
  // Format currency with commas and dollar sign
  formatCurrency: (amount, includeCents = true) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '$0.00';
    }
    
    const num = parseFloat(amount);
    const formatted = num.toLocaleString('en-US', {
      minimumFractionDigits: includeCents ? 2 : 0,
      maximumFractionDigits: includeCents ? 2 : 0
    });
    
    return `$${formatted}`;
  },

  // Format number with commas (no dollar sign)
  formatNumber: (num, decimals = 0) => {
    if (num === null || num === undefined || isNaN(num)) {
      return '0';
    }
    
    return parseFloat(num).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  },

  // Format percentage
  formatPercentage: (percent) => {
    if (percent === null || percent === undefined || isNaN(percent)) {
      return '0%';
    }
    
    return `${parseFloat(percent).toFixed(1)}%`;
  }
};
