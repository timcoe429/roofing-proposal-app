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
      name: 'Professional Roofing Co.',
      address: '123 Business Ave, City, State 12345',
      phone: '(555) 123-4567',
      email: 'info@roofingcompany.com',
      website: 'www.roofingcompany.com',
      license: 'License #123456',
      insurance: 'Insured & Bonded'
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
    
    // Professional color scheme
    const darkGray = '#2d3748';
    const mediumGray = '#4a5568';
    const lightGray = '#718096';
    const veryLightGray = '#edf2f7';
    const accentColor = '#1a365d'; // Professional dark blue, used sparingly

    // HEADER SECTION
    doc.fontSize(24).fillColor(darkGray).text(company.name, 50, 40);
    doc.fontSize(12).fillColor(mediumGray).text('Licensed & Insured Roofing Contractor', 50, 70);
    
    // Company contact info - right aligned
    doc.fontSize(10).fillColor(lightGray)
       .text(company.phone, 400, 40)
       .text(company.email, 400, 55)
       .text(company.website, 400, 70)
       .text(company.address, 400, 85);

    // Clean separator line
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, 110).lineTo(545, 110).stroke();

    // PROPOSAL TITLE
    doc.fontSize(20).fillColor(darkGray).text('ROOFING PROPOSAL', 50, 130);
    
    // Proposal details - right aligned
    const proposalNumber = proposalData.proposalNumber || Date.now().toString().slice(-6);
    const currentDate = new Date().toLocaleDateString();
    doc.fontSize(10).fillColor(lightGray)
       .text(`Proposal #: ${proposalNumber}`, 400, 130)
       .text(`Date: ${currentDate}`, 400, 145)
       .text(`Valid Until: ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}`, 400, 160);

    let y = 190;

    // CLIENT & PROJECT INFO - Two column layout
    doc.fontSize(14).fillColor(darkGray).text('CLIENT INFORMATION', 50, y);
    doc.text('PROJECT DETAILS', 300, y);
    
    y += 25;
    
    // Left column - Client info
    const clientInfo = [
      ['Client:', proposalData.clientName || 'Not specified'],
      ['Email:', proposalData.clientEmail || 'Not specified'],
      ['Phone:', proposalData.clientPhone || 'Not specified'],
      ['Property:', proposalData.propertyAddress || proposalData.clientAddress || 'Not specified']
    ];

    // Right column - Project info
    const projectInfo = [
      ['Scope:', 'Complete Roof Replacement'],
      ['Area:', `${proposalData.measurements?.totalSquares || 0} squares`],
      ['Material:', proposalData.materialType || 'Standard'],
      ['Timeline:', proposalData.timeline || '5-7 business days']
    ];

    clientInfo.forEach(([label, value], index) => {
      const lineY = y + (index * 18);
      doc.fontSize(10).fillColor(mediumGray).text(label, 50, lineY);
      doc.fillColor(darkGray).text(value, 120, lineY);
    });

    projectInfo.forEach(([label, value], index) => {
      const lineY = y + (index * 18);
      doc.fontSize(10).fillColor(mediumGray).text(label, 300, lineY);
      doc.fillColor(darkGray).text(value, 370, lineY);
    });

    y += 100;

    // DETAILED BREAKDOWN
    if (y > 600) {
      doc.addPage();
      y = 50;
    }

    doc.fontSize(14).fillColor(darkGray).text('COST BREAKDOWN', 50, y);
    y += 30;

    // Materials section
    if (pricing.materials.length > 0) {
      doc.fontSize(12).fillColor(mediumGray).text('MATERIALS', 50, y);
      y += 20;
      
      pricing.materials.forEach(material => {
        if (y > 720) {
          doc.addPage();
          y = 50;
        }
        
        doc.fontSize(10).fillColor(darkGray)
           .text(material.name || 'Material', 60, y)
           .text(`${material.quantity || 0} ${material.unit || ''}`, 250, y)
           .text(`$${(material.unitPrice || 0).toFixed(2)}`, 350, y)
           .text(`$${(material.total || 0).toFixed(2)}`, 450, y);
        
        y += 16;
      });
      
      const materialsTotal = pricing.materials.reduce((sum, item) => sum + (item.total || 0), 0);
      doc.fontSize(11).fillColor(mediumGray)
         .text('Materials Subtotal:', 350, y + 5)
         .text(`$${materialsTotal.toFixed(2)}`, 450, y + 5);
      
      y += 30;
    }

    // Labor section
    if (pricing.labor.length > 0) {
      doc.fontSize(12).fillColor(mediumGray).text('LABOR', 50, y);
      y += 20;
      
      pricing.labor.forEach(labor => {
        if (y > 720) {
          doc.addPage();
          y = 50;
        }
        
        doc.fontSize(10).fillColor(darkGray)
           .text(labor.name || 'Labor', 60, y)
           .text(`${labor.quantity || 0} ${labor.unit || ''}`, 250, y)
           .text(`$${(labor.unitPrice || 0).toFixed(2)}`, 350, y)
           .text(`$${(labor.total || 0).toFixed(2)}`, 450, y);
        
        y += 16;
      });
      
      const laborTotal = pricing.labor.reduce((sum, item) => sum + (item.total || 0), 0);
      doc.fontSize(11).fillColor(mediumGray)
         .text('Labor Subtotal:', 350, y + 5)
         .text(`$${laborTotal.toFixed(2)}`, 450, y + 5);
      
      y += 30;
    }

    // TOTAL SECTION
    if (y > 680) {
      doc.addPage();
      y = 50;
    }

    // Clean total box
    doc.rect(50, y, 495, 50).fillAndStroke(veryLightGray, '#d1d5db');
    doc.fontSize(16).fillColor(accentColor)
       .text(`PROJECT TOTAL: $${total.toFixed(2)}`, 0, y + 18, { 
         align: 'center', 
         width: 595 
       });

    y += 70;

    // NOTES SECTION
    if (proposalData.notes) {
      if (y > 650) {
        doc.addPage();
        y = 50;
      }
      
      doc.fontSize(12).fillColor(darkGray).text('ADDITIONAL NOTES', 50, y);
      y += 20;
      
      doc.rect(50, y, 495, 60).fillAndStroke('#f7fafc', '#e2e8f0');
      doc.fontSize(10).fillColor(mediumGray)
         .text(proposalData.notes, 60, y + 10, { width: 475, height: 40 });
      
      y += 80;
    }

    // TERMS & CONDITIONS
    if (y > 680) {
      doc.addPage();
      y = 50;
    }

    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, y).lineTo(545, y).stroke();
    y += 15;

    doc.fontSize(11).fillColor(darkGray).text('TERMS & CONDITIONS', 50, y);
    y += 15;

    const terms = [
      '• This proposal is valid for 30 days from the date above',
      '• All work performed according to local building codes and manufacturer specifications',
      '• Materials and workmanship warranty as specified',
      '• Final payment due upon completion and customer satisfaction',
      '• Weather conditions may affect project timeline'
    ];

    doc.fontSize(9).fillColor(lightGray);
    terms.forEach(term => {
      doc.text(term, 50, y);
      y += 12;
    });

    y += 20;

    // FOOTER
    doc.fontSize(8).fillColor(lightGray)
       .text(`${company.license} | ${company.insurance}`, 50, y)
       .text('Thank you for choosing our services!', 0, y, { align: 'center', width: 595 });
  }
};

export default pdfService;
