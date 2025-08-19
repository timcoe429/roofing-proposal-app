import PDFDocument from 'pdfkit';

console.log('PDFKit imported:', !!PDFDocument);

const pdfService = {
  async generateProposalPDF(proposalData, companyData, pdfOptions = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          size: 'A4',
          margins: { top: 60, bottom: 80, left: 50, right: 50 }
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
        this.buildPDF(doc, proposalData, companyData, pdfOptions);
        
        // Important: End the document
        doc.end();
        
      } catch (error) {
        console.error('PDF generation error:', error);
        reject(new Error(`Failed to generate PDF: ${error.message}`));
      }
    });
  },

  buildPDF(doc, proposalData, companyData, pdfOptions = {}) {
    const company = companyData || {
      name: 'Professional Roofing Co.',
      address: '123 Business Ave, City, State 12345',
      phone: '(555) 123-4567',
      email: 'info@roofingcompany.com',
      website: 'www.roofingcompany.com',
      license: 'License #123456',
      insurance: 'Insured & Bonded'
    };

    const isDetailed = pdfOptions.isDetailed !== false; // Default to detailed

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
    
    // Professional color scheme
    const darkText = '#2d3748';
    const mediumText = '#4a5568';
    const lightText = '#718096';
    const borderColor = '#e2e8f0';
    const headerBg = '#f7fafc';

    // HEADER SECTION
    doc.fontSize(26).fillColor(darkText).text(company.name, 50, 60);
    doc.fontSize(12).fillColor(mediumText).text('Licensed & Insured Roofing Contractor', 50, 90);
    
    // Logo placeholder (if logo URL is provided)
    if (company.logo) {
      // TODO: Add logo support - would need to download and embed image
      doc.fontSize(10).fillColor(lightText).text('[LOGO]', 450, 60);
    }

    // Separator line
    doc.strokeColor(borderColor).lineWidth(1).moveTo(50, 120).lineTo(545, 120).stroke();

    // PROPOSAL TITLE & INFO
    doc.fontSize(18).fillColor(darkText).text('ROOFING PROPOSAL', 50, 140);
    
    // Proposal meta info - right aligned
    const proposalNumber = proposalData.proposalNumber || `P${Date.now().toString().slice(-6)}`;
    const currentDate = new Date().toLocaleDateString();
    const validUntil = new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString();
    
    doc.fontSize(10).fillColor(lightText)
       .text(`Proposal #: ${proposalNumber}`, 400, 140)
       .text(`Date: ${currentDate}`, 400, 155)
       .text(`Valid Until: ${validUntil}`, 400, 170);

    let y = 200;

    // CLIENT & PROJECT INFO - Clean two-column layout
    doc.rect(50, y, 495, 25).fillAndStroke(headerBg, borderColor);
    doc.fontSize(12).fillColor(darkText)
       .text('CLIENT INFORMATION', 60, y + 8)
       .text('PROJECT DETAILS', 310, y + 8);
    
    y += 35;
    
    // Client info (left column)
    const clientInfo = [
      ['Client:', proposalData.clientName || 'Not specified'],
      ['Email:', proposalData.clientEmail || 'Not specified'],
      ['Phone:', proposalData.clientPhone || 'Not specified'],
      ['Property:', proposalData.propertyAddress || proposalData.clientAddress || 'Not specified']
    ];

    // Project info (right column)
    const projectInfo = [
      ['Scope:', 'Complete Roof Replacement'],
      ['Area:', `${proposalData.measurements?.totalSquares || 0} squares`],
      ['Material:', proposalData.materialType || 'Standard'],
      ['Timeline:', proposalData.timeline || '5-7 business days']
    ];

    // Draw info in columns
    clientInfo.forEach(([label, value], index) => {
      const lineY = y + (index * 16);
      doc.fontSize(9).fillColor(mediumText).text(label, 60, lineY);
      doc.fillColor(darkText).text(value, 130, lineY, { width: 150 });
    });

    projectInfo.forEach(([label, value], index) => {
      const lineY = y + (index * 16);
      doc.fontSize(9).fillColor(mediumText).text(label, 310, lineY);
      doc.fillColor(darkText).text(value, 380, lineY, { width: 150 });
    });

    y += 80;

    // COST BREAKDOWN SECTION
    doc.rect(50, y, 495, 25).fillAndStroke(headerBg, borderColor);
    doc.fontSize(12).fillColor(darkText).text('COST BREAKDOWN', 60, y + 8);
    y += 35;

    if (isDetailed) {
      // DETAILED VIEW - Proper tables
      if (pricing.materials.length > 0) {
        // Materials table header
        doc.fontSize(11).fillColor(mediumText).text('MATERIALS', 60, y);
        y += 20;
        
        // Table header
        doc.rect(50, y, 495, 20).fillAndStroke('#f8f9fa', borderColor);
        doc.fontSize(9).fillColor(darkText)
           .text('Description', 60, y + 6)
           .text('Qty', 250, y + 6)
           .text('Unit Price', 320, y + 6)
           .text('Total', 450, y + 6);
        y += 20;

        // Materials rows
        pricing.materials.forEach(material => {
          doc.rect(50, y, 495, 18).stroke(borderColor);
          doc.fontSize(8).fillColor(darkText)
             .text(material.name || 'Material', 60, y + 5, { width: 180 })
             .text(`${material.quantity || 0} ${material.unit || ''}`, 250, y + 5)
             .text(`$${(material.unitPrice || 0).toFixed(2)}`, 320, y + 5)
             .text(`$${(material.total || 0).toFixed(2)}`, 450, y + 5);
          y += 18;
        });
        
        // Materials subtotal
        const materialsTotal = pricing.materials.reduce((sum, item) => sum + (item.total || 0), 0);
        doc.rect(350, y, 195, 18).fillAndStroke('#f1f5f9', borderColor);
        doc.fontSize(9).fillColor(mediumText)
           .text('Materials Subtotal:', 360, y + 5)
           .text(`$${materialsTotal.toFixed(2)}`, 450, y + 5);
        y += 30;
      }

      if (pricing.labor.length > 0) {
        // Labor table
        doc.fontSize(11).fillColor(mediumText).text('LABOR', 60, y);
        y += 20;
        
        // Table header
        doc.rect(50, y, 495, 20).fillAndStroke('#f8f9fa', borderColor);
        doc.fontSize(9).fillColor(darkText)
           .text('Description', 60, y + 6)
           .text('Qty', 250, y + 6)
           .text('Unit Price', 320, y + 6)
           .text('Total', 450, y + 6);
        y += 20;

        // Labor rows
        pricing.labor.forEach(labor => {
          doc.rect(50, y, 495, 18).stroke(borderColor);
          doc.fontSize(8).fillColor(darkText)
             .text(labor.name || 'Labor', 60, y + 5, { width: 180 })
             .text(`${labor.quantity || 0} ${labor.unit || ''}`, 250, y + 5)
             .text(`$${(labor.unitPrice || 0).toFixed(2)}`, 320, y + 5)
             .text(`$${(labor.total || 0).toFixed(2)}`, 450, y + 5);
          y += 18;
        });
        
        // Labor subtotal
        const laborTotal = pricing.labor.reduce((sum, item) => sum + (item.total || 0), 0);
        doc.rect(350, y, 195, 18).fillAndStroke('#f1f5f9', borderColor);
        doc.fontSize(9).fillColor(mediumText)
           .text('Labor Subtotal:', 360, y + 5)
           .text(`$${laborTotal.toFixed(2)}`, 450, y + 5);
        y += 30;
      }
    } else {
      // SIMPLE VIEW - Clean summary
      const materialsTotal = pricing.materials.reduce((sum, item) => sum + (item.total || 0), 0);
      const laborTotal = pricing.labor.reduce((sum, item) => sum + (item.total || 0), 0);
      
      if (materialsTotal > 0) {
        doc.fontSize(11).fillColor(darkText).text('Materials & Supplies:', 60, y);
        doc.text(`$${materialsTotal.toFixed(2)}`, 450, y);
        y += 25;
      }
      
      if (laborTotal > 0) {
        doc.fontSize(11).fillColor(darkText).text('Installation & Labor:', 60, y);
        doc.text(`$${laborTotal.toFixed(2)}`, 450, y);
        y += 25;
      }
      
      y += 10;
    }

    // TOTAL SECTION
    doc.rect(50, y, 495, 40).fillAndStroke('#e6f3ff', '#1e40af');
    doc.fontSize(16).fillColor('#1e40af')
       .text(`PROJECT TOTAL: $${total.toFixed(2)}`, 0, y + 12, { 
         align: 'center', 
         width: 595 
       });

    y += 60;

    // NOTES SECTION (if present)
    if (proposalData.notes) {
      doc.fontSize(12).fillColor(darkText).text('ADDITIONAL NOTES', 60, y);
      y += 20;
      
      doc.rect(50, y, 495, 50).fillAndStroke('#fffbeb', '#f59e0b');
      doc.fontSize(10).fillColor(mediumText)
         .text(proposalData.notes, 60, y + 10, { width: 475, height: 30 });
      
      y += 70;
    }

    // TERMS & CONDITIONS
    doc.fontSize(11).fillColor(darkText).text('TERMS & CONDITIONS', 60, y);
    y += 15;

    const terms = [
      '• This proposal is valid for 30 days from the date above',
      '• All work performed according to local building codes and manufacturer specifications',
      '• Materials and workmanship warranty as specified',
      '• Final payment due upon completion and customer satisfaction'
    ];

    doc.fontSize(9).fillColor(lightText);
    terms.forEach(term => {
      doc.text(term, 60, y);
      y += 12;
    });

    // FOOTER with company info
    const footerY = 750; // Fixed footer position
    doc.strokeColor(borderColor).lineWidth(1).moveTo(50, footerY).lineTo(545, footerY).stroke();
    
    doc.fontSize(8).fillColor(lightText)
       .text(`${company.name} | ${company.phone} | ${company.email}`, 60, footerY + 10)
       .text(`${company.license} | ${company.insurance}`, 60, footerY + 22)
       .text(company.address, 60, footerY + 34);
    
    doc.text('Thank you for choosing our services!', 400, footerY + 22);
  }
};

export default pdfService;