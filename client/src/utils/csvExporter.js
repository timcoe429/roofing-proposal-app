/**
 * CSV Export utility for SumoQuote import
 * Formats proposal data into CSV format compatible with SumoQuote
 */

/**
 * Format proposal data for SumoQuote CSV import
 * SumoQuote typically expects: Item Name, Quantity, Unit, Unit Price, Total
 */
export const formatForSumoQuote = (proposalData) => {
  const rows = [];

  // Header row - SumoQuote compatible format
  rows.push(['Item Name', 'Quantity', 'Unit', 'Unit Price', 'Total', 'Category', 'Description']);

  // Add materials
  (proposalData.materials || []).forEach(item => {
    if (item.category !== 'labor') {
      rows.push([
        item.name || 'Unnamed Item',
        item.quantity || 0,
        item.unit || 'each',
        (item.unitPrice || 0).toFixed(2),
        (item.total || 0).toFixed(2),
        'Material',
        item.description || ''
      ]);
    }
  });

  // Add labor items
  (proposalData.materials || []).forEach(item => {
    if (item.category === 'labor') {
      rows.push([
        item.name || 'Labor',
        item.quantity || 0,
        item.unit || 'hours',
        (item.unitPrice || 0).toFixed(2),
        (item.total || 0).toFixed(2),
        'Labor',
        item.description || ''
      ]);
    }
  });

  // Add add-ons
  (proposalData.addOns || []).forEach(item => {
    rows.push([
      item.name || 'Add-on',
      1,
      'each',
      (item.price || 0).toFixed(2),
      (item.price || 0).toFixed(2),
      'Add-on',
      item.description || ''
    ]);
  });

  // Add overhead if not hidden
  if (proposalData.overheadPercent && proposalData.overheadPercent > 0) {
    const materialsTotal = (proposalData.materials || [])
      .filter(m => m.category !== 'labor')
      .reduce((sum, m) => sum + (m.total || 0), 0);
    const laborTotal = (proposalData.materials || [])
      .filter(m => m.category === 'labor')
      .reduce((sum, m) => sum + (m.total || 0), 0);
    const addOnsTotal = (proposalData.addOns || []).reduce((sum, a) => sum + (a.price || 0), 0);
    const subtotal = materialsTotal + laborTotal + addOnsTotal;
    const overheadAmount = subtotal * (proposalData.overheadPercent / 100);

    rows.push([
      'Overhead',
      1,
      'percent',
      proposalData.overheadPercent.toFixed(2) + '%',
      overheadAmount.toFixed(2),
      'Overhead',
      `${proposalData.overheadPercent}% overhead`
    ]);
  }

  // Add profit if not hidden
  if (proposalData.profitPercent && proposalData.profitPercent > 0) {
    const materialsTotal = (proposalData.materials || [])
      .filter(m => m.category !== 'labor')
      .reduce((sum, m) => sum + (m.total || 0), 0);
    const laborTotal = (proposalData.materials || [])
      .filter(m => m.category === 'labor')
      .reduce((sum, m) => sum + (m.total || 0), 0);
    const addOnsTotal = (proposalData.addOns || []).reduce((sum, a) => sum + (a.price || 0), 0);
    const subtotal = materialsTotal + laborTotal + addOnsTotal;
    const overheadAmount = subtotal * (proposalData.overheadPercent || 15 / 100);
    const profitAmount = (subtotal + overheadAmount) * (proposalData.profitPercent / 100);

    rows.push([
      'Profit',
      1,
      'percent',
      proposalData.profitPercent.toFixed(2) + '%',
      profitAmount.toFixed(2),
      'Profit',
      `${proposalData.profitPercent}% profit`
    ]);
  }

  // Add discount if applicable
  if (proposalData.discountAmount && proposalData.discountAmount > 0) {
    rows.push([
      'Discount',
      1,
      'amount',
      (proposalData.discountAmount || 0).toFixed(2),
      (-proposalData.discountAmount).toFixed(2),
      'Discount',
      'Applied discount'
    ]);
  }

  return rows;
};

/**
 * Generate CSV string from data rows
 * @param {Array} rows - Array of row arrays
 * @returns {String} - CSV string
 */
export const generateCSV = (rows) => {
  return rows.map(row => {
    // Escape fields that contain commas, quotes, or newlines
    return row.map(field => {
      const fieldStr = String(field || '');
      if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
        // Escape quotes by doubling them, then wrap in quotes
        return `"${fieldStr.replace(/"/g, '""')}"`;
      }
      return fieldStr;
    }).join(',');
  }).join('\n');
};

/**
 * Download CSV file
 * @param {String} csvString - CSV content
 * @param {String} filename - Filename for download
 */
export const downloadCSV = (csvString, filename = 'proposal-export.csv') => {
  // Create blob with CSV content
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up URL
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

/**
 * Export proposal to CSV for SumoQuote
 * @param {Object} proposalData - Complete proposal data
 * @returns {String} - CSV string ready for download
 */
export const exportProposalToCSV = (proposalData) => {
  const rows = formatForSumoQuote(proposalData);
  const csvString = generateCSV(rows);
  
  // Generate filename
  const clientName = (proposalData.clientName || 'client').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `sumoquote-${clientName}-${timestamp}.csv`;
  
  downloadCSV(csvString, filename);
  
  return csvString;
};

export default {
  formatForSumoQuote,
  generateCSV,
  downloadCSV,
  exportProposalToCSV
};

