import PDFDocument from 'pdfkit';

console.log('PDFKit imported:', !!PDFDocument);

const pdfService = {
  async generateProposalPDF(proposalData, companyData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });
        
        const buffers = [];
        
        // Properly handle data events
        doc.on('data', (chunk) => {
          buffers.push(chunk);
        });
        
        doc.on('end', () => {
          try {
            const pdfData = Buffer.concat(buffers);
            console.log(`PDF generated successfully, size: ${pdfData.length} bytes`);
            resolve(pdfData);
          } catch (concatError) {
            console.error('Buffer concatenation error:', concatError);
            reject(concatError);
          }
        });
        
        doc.on('error', (error) => {
          console.error('PDFDocument error:', error);
          reject(error);
        });

        // Generate PDF content
        this.buildPDF(doc, proposalData, companyData);
        
        // Important: End the document
        doc.end();
        
      } catch (error) {
        console.error('PDF generation error:', error);
        reject(new Error(`Failed to generate PDF: ${error.message}`));
      }
    });
  },

  buildPDF(doc, proposalData, companyData) {
    const company = companyData || {
      name: 'Your Company Name',
      address: 'Company Address',
      phone: 'Company Phone',
      email: 'Company Email',
      website: 'Company Website',
      license: 'License Number',
      insurance: 'Insurance Policy'
    };

    const calculateTotal = () => {
      if (proposalData.totalAmount) return parseFloat(proposalData.totalAmount);
      
      const materialsTotal = proposalData.materials?.reduce((sum, material) => sum + (material.total || 0), 0) || 0;
      const laborTotal = (proposalData.laborHours || 0) * (proposalData.laborRate || 0);
      const addOnsTotal = proposalData.addOns?.reduce((sum, addon) => sum + (addon.price || 0), 0) || 0;
      const additionalTotal = proposalData.structuredPricing?.additionalCosts?.reduce((sum, cost) => sum + (cost.cost || 0), 0) || 0;
      
      return materialsTotal + laborTotal + addOnsTotal + additionalTotal;
    };

    const getStructuredPricing = () => {
      if (proposalData.structuredPricing) return proposalData.structuredPricing;
      
      const materials = proposalData.materials?.filter(item => item.category !== 'labor') || [];
      const labor = proposalData.materials?.filter(item => item.category === 'labor') || [];
      
      return { materials, labor, additionalCosts: [] };
    };

    const pricing = getStructuredPricing();
    const total = calculateTotal();
    const primaryColor = '#2563eb';
    const grayColor = '#6b7280';

    // Header
    doc.fontSize(28).fillColor(primaryColor).text(company.name, 50, 50);
    doc.fontSize(16).fillColor(grayColor).text('Professional Roofing Services', 50, 85);
    
    // Contact info with safe text handling
    const contactText = `${company.phone || 'Phone'} • ${company.email || 'Email'}`;
    const licenseText = `License: ${company.license || 'N/A'} • Insured: ${company.insurance || 'N/A'}`;
    
    doc.fontSize(12).fillColor(grayColor)
       .text(contactText, 50, 110)
       .text(licenseText, 50, 125)
       .text(company.address || 'Address', 50, 140);

    // Header line
    doc.strokeColor(primaryColor).lineWidth(3).moveTo(50, 180).lineTo(545, 180).stroke();

    // Proposal title
    doc.fontSize(24).fillColor(primaryColor).text('ROOFING PROPOSAL', 50, 200);
    
    const proposalNumber = Date.now().toString().slice(-6);
    const currentDate = new Date().toLocaleDateString();
    doc.fontSize(12).fillColor(grayColor)
       .text(`Proposal #: ${proposalNumber}`, 50, 235)
       .text(`Date: ${currentDate}`, 400, 235);

    let y = 270;

    // Client Information
    doc.fontSize(18).fillColor(primaryColor).text('Client Information', 50, y);
    y += 30;
    
    const clientInfo = [
      ['Name:', proposalData.clientName || 'Not specified'],
      ['Email:', proposalData.clientEmail || 'Not specified'],
      ['Phone:', proposalData.clientPhone || 'Not specified'],
      ['Property:', proposalData.propertyAddress || proposalData.clientAddress || 'Not specified']
    ];

    clientInfo.forEach(([label, value]) => {
      doc.fontSize(12).fillColor('#374151').text(label, 50, y);
      doc.fillColor(grayColor).text(value, 150, y);
      y += 20;
    });

    y += 20;

    // Project Details
    doc.fontSize(18).fillColor(primaryColor).text('Project Details', 50, y);
    y += 30;

    const projectInfo = [
      ['Scope:', 'Complete Roof Replacement'],
      ['Roof Area:', `${proposalData.measurements?.totalSquares || 0} squares`],
      ['Timeline:', proposalData.timeline || 'Not specified'],
      ['Warranty:', proposalData.warranty || 'Not specified']
    ];

    projectInfo.forEach(([label, value]) => {
      doc.fontSize(12).fillColor('#374151').text(label, 50, y);
      doc.fillColor(grayColor).text(value, 150, y);
      y += 20;
    });

    y += 30;

    // Materials & Labor
    if (y > 650) {
      doc.addPage();
      y = 50;
    }

    doc.fontSize(18).fillColor(primaryColor).text('Materials & Labor Breakdown', 50, y);
    y += 30;

    // Simple pricing display
    if (pricing.materials.length > 0) {
      const materialsTotal = pricing.materials.reduce((sum, item) => sum + (item.total || 0), 0);
      doc.fontSize(14).fillColor('#374151').text('Materials:', 50, y);
      doc.text(`$${materialsTotal.toFixed(2)}`, 400, y);
      y += 25;
    }

    if (pricing.labor.length > 0) {
      const laborTotal = pricing.labor.reduce((sum, item) => sum + (item.total || 0), 0);
      doc.fontSize(14).fillColor('#374151').text('Labor:', 50, y);
      doc.text(`$${laborTotal.toFixed(2)}`, 400, y);
      y += 25;
    }

    if (pricing.additionalCosts.length > 0) {
      const additionalTotal = pricing.additionalCosts.reduce((sum, item) => sum + (item.cost || 0), 0);
      doc.fontSize(14).fillColor('#374151').text('Additional Costs:', 50, y);
      doc.text(`$${additionalTotal.toFixed(2)}`, 400, y);
      y += 25;
    }

    y += 20;

    // Total
    doc.rect(50, y, 495, 40).fillAndStroke('#f9fafb', '#e5e7eb');
    doc.fontSize(20).fillColor(primaryColor)
       .text(`TOTAL: $${total.toFixed(2)}`, 0, y + 12, { align: 'center', width: 595 });

    y += 60;

    // Notes
    if (proposalData.notes) {
      if (y > 650) {
        doc.addPage();
        y = 50;
      }
      doc.fontSize(16).fillColor(primaryColor).text('Additional Notes', 50, y);
      y += 25;
      doc.fontSize(12).fillColor('#374151').text(proposalData.notes, 50, y, { width: 495 });
      y += 60;
    }

    // Terms
    if (y > 700) {
      doc.addPage();
      y = 50;
    }
    doc.fontSize(10).fillColor(grayColor)
       .text('This proposal is valid for 30 days. All work guaranteed according to warranty terms.', 50, y);
  }
};

export default pdfService;
