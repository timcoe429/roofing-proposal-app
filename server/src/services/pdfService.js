import PDFDocument from 'pdfkit';
import fetch from 'node-fetch';
import QRCode from 'qrcode';

const pdfService = {
  async generateProposalPDF(proposalData, companyData, pdfOptions = {}) {
    return new Promise(async (resolve, reject) => {
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
            console.log(`PDF completed with ${doc._pageBuffer.length} pages`);
            resolve(pdfData);
          } catch (concatError) {
            reject(concatError);
          }
        });
        
        doc.on('error', (error) => {
          reject(error);
        });

        // Generate PDF content
        await this.buildPDF(doc, proposalData, companyData, pdfOptions);
        
        // Important: End the document
        doc.end();
        
      } catch (error) {
        console.error('PDF generation error:', error);
        reject(new Error(`Failed to generate PDF: ${error.message}`));
      }
    });
  },

  async buildPDF(doc, proposalData, companyData, pdfOptions = {}) {
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
    let headerHeight = 90;
    
    // Handle logo vs company name
    if (company.logo) {
      try {
        // Try to fetch and embed the logo
        const logoResponse = await fetch(company.logo);
        if (logoResponse.ok) {
          const logoBuffer = Buffer.from(await logoResponse.arrayBuffer());
          
          // Embed logo (left side)
          doc.image(logoBuffer, 50, 60, { 
            fit: [200, 60],
            align: 'left'
          });
          
          // Company tagline below logo
          doc.fontSize(12).fillColor(mediumText).text('Licensed & Insured Roofing Contractor', 50, 130);
          headerHeight = 140;
        } else {
          throw new Error('Logo fetch failed');
        }
      } catch (error) {
        // Fallback to company name
        doc.fontSize(26).fillColor(darkText).text(company.name, 50, 60);
        doc.fontSize(12).fillColor(mediumText).text('Licensed & Insured Roofing Contractor', 50, 90);
      }
    } else {
      // No logo, use company name
      doc.fontSize(26).fillColor(darkText).text(company.name, 50, 60);
      doc.fontSize(12).fillColor(mediumText).text('Licensed & Insured Roofing Contractor', 50, 90);
    }

    // Separator line (dynamic position based on logo)
    const separatorY = headerHeight + 10;
    doc.strokeColor(borderColor).lineWidth(1).moveTo(50, separatorY).lineTo(545, separatorY).stroke();

    // PROPOSAL TITLE & INFO
    const titleY = separatorY + 20;
    doc.fontSize(18).fillColor(darkText).text('ROOFING PROPOSAL', 50, titleY);
    
    // Proposal meta info - right aligned
    const proposalNumber = proposalData.proposalNumber || `P${Date.now().toString().slice(-6)}`;
    const currentDate = new Date().toLocaleDateString();
    const validUntil = new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString();
    
    doc.fontSize(10).fillColor(lightText)
       .text(`Proposal #: ${proposalNumber}`, 400, titleY)
       .text(`Date: ${currentDate}`, 400, titleY + 15)
       .text(`Valid Until: ${validUntil}`, 400, titleY + 30);

    let y = titleY + 60;

    // CLIENT & PROJECT INFO - Clean two-column layout
    console.log(`=== PDF DEBUG: Starting content Y: ${y} ===`);
    doc.rect(50, y, 495, 25).fillAndStroke(headerBg, borderColor);
    doc.fontSize(12).fillColor(darkText)
       .text('CLIENT INFORMATION', 60, y + 8)
       .text('PROJECT DETAILS', 310, y + 8);
    
    y += 35;
    console.log(`After client headers Y: ${y}`);
    
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
    console.log(`Before cost breakdown Y: ${y}`);
    doc.rect(50, y, 495, 25).fillAndStroke(headerBg, borderColor);
    doc.fontSize(12).fillColor(darkText).text('COST BREAKDOWN', 60, y + 8);
    y += 35;
    console.log(`After cost breakdown header Y: ${y}`);

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
        pricing.materials.forEach((material, index) => {
          console.log(`Material ${index + 1} Y: ${y}`);
          // Check if we need a new page (conservative check)
          if (y > 720) {
            console.log(`=== MATERIALS PAGE BREAK AT Y: ${y} ===`);
            doc.addPage();
            y = 60;
            // Redraw table header on new page
            doc.rect(50, y, 495, 20).fillAndStroke('#f8f9fa', borderColor);
            doc.fontSize(9).fillColor(darkText)
               .text('Description', 60, y + 6)
               .text('Qty', 250, y + 6)
               .text('Unit Price', 320, y + 6)
               .text('Total', 450, y + 6);
            y += 20;
          }
          
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
          // Check if we need a new page (conservative check)
          if (y > 720) {
            doc.addPage();
            y = 60;
            // Redraw table header on new page
            doc.rect(50, y, 495, 20).fillAndStroke('#f8f9fa', borderColor);
            doc.fontSize(9).fillColor(darkText)
               .text('Description', 60, y + 6)
               .text('Qty', 250, y + 6)
               .text('Unit Price', 320, y + 6)
               .text('Total', 450, y + 6);
            y += 20;
          }
          
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
      // Check if we need a new page for notes
      if (y > 650) {
        doc.addPage();
        y = 60;
      }
      
      doc.fontSize(12).fillColor(darkText).text('ADDITIONAL NOTES', 60, y);
      y += 20;
      
      doc.rect(50, y, 495, 50).fillAndStroke('#fffbeb', '#f59e0b');
      doc.fontSize(10).fillColor(mediumText)
         .text(proposalData.notes, 60, y + 10, { width: 475, height: 30 });
      
      y += 70;
    }

    // TERMS & CONDITIONS - check space first
    console.log(`Before terms Y: ${y}`);
    if (y > 650) {
      console.log(`=== TERMS PAGE BREAK AT Y: ${y} ===`);
      doc.addPage();
      y = 60;
    }

    doc.fontSize(11).fillColor(darkText).text('TERMS & CONDITIONS', 60, y);
    y += 20;
    console.log(`After terms header Y: ${y}`);

    const terms = [
      '• This proposal is valid for 30 days from the date above',
      '• All work performed according to local building codes and manufacturer specifications', 
      '• Materials and workmanship warranty as specified',
      '• Final payment due upon completion and customer satisfaction'
    ];

    // Write all terms as a single text block to avoid page breaks
    const termsText = terms.join('\n');
    doc.fontSize(9).fillColor(lightText).text(termsText, 60, y, {
      width: 485,
      lineGap: 3
    });

    y += 80; // Fixed height for terms section
    console.log(`After terms content Y: ${y}`);

    // NEXT STEPS - Force to new page to control layout
    console.log(`=== FORCING NEXT STEPS PAGE BREAK ===`);
    doc.addPage();
    y = 80;
    console.log(`Next steps page Y: ${y}`);

    // Page title
    doc.fontSize(24).fillColor(darkText).text('NEXT STEPS', 0, y, { 
      align: 'center', 
      width: 595 
    });
    y += 50;

    // Simple steps
    doc.fontSize(14).fillColor(mediumText)
       .text('1. Review this proposal', 60, y)
       .text('2. Accept using link or QR code below', 60, y + 25)
       .text('3. We\'ll call you within 24 hours', 60, y + 50);

    y += 100;

    // BIG ACCEPT PROPOSAL BUTTON
    const buttonY = y;
    const buttonHeight = 60;
    const buttonWidth = 400;
    const buttonX = (595 - buttonWidth) / 2;

    // Button background
    doc.rect(buttonX, buttonY, buttonWidth, buttonHeight)
       .fillAndStroke('#1e40af', '#1e3a8a');
    
    // Button text
    doc.fontSize(22).fillColor('white').text('ACCEPT PROPOSAL', 0, buttonY + 20, {
      align: 'center',
      width: 595
    });

    // Proposal URL
    const baseUrl = 'https://roofproposal.app';
    const proposalUrl = `${baseUrl}/proposal/accept/${proposalData.id || 'PROPOSAL_ID'}`;
    
    y += buttonHeight + 30;

    // URL below button
    doc.fontSize(10).fillColor(mediumText).text('Or visit:', 0, y, { align: 'center', width: 595 });
    y += 15;
    doc.fontSize(10).fillColor('#1e40af').text(proposalUrl, 0, y, { 
      align: 'center', 
      width: 595,
      link: proposalUrl
    });

    y += 40;

    // QR code
    doc.fontSize(12).fillColor(mediumText).text('Scan with your phone:', 0, y, { align: 'center', width: 595 });
    y += 20;
    
    try {
      const qrBuffer = await QRCode.toBuffer(proposalUrl, {
        width: 120,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      
      const qrSize = 120;
      const qrX = (595 - qrSize) / 2;
      doc.image(qrBuffer, qrX, y, { width: qrSize, height: qrSize });
      
      y += qrSize + 30;
    } catch (qrError) {
      y += 30;
    }

    // Contact info
    doc.fontSize(12).fillColor(mediumText).text('Questions? Contact us:', 0, y, { align: 'center', width: 595 });
    y += 20;
    doc.fontSize(14).fillColor(darkText).text(`${company.phone} • ${company.email}`, 0, y, { 
      align: 'center', 
      width: 595 
    });

    // FOOTER with company info - always at bottom of last page
    console.log(`Before footer Y: ${y}`);
    const currentPage = doc.page;
    const pageHeight = currentPage.height;
    const footerY = pageHeight - 60; // 60px from bottom
    console.log(`Page height: ${pageHeight}, Footer Y: ${footerY}`);
    
    // Only add footer line if we have space
    if (y < footerY - 50) {
      doc.strokeColor(borderColor).lineWidth(1).moveTo(50, footerY - 20).lineTo(545, footerY - 20).stroke();
    }
    
    console.log(`Writing footer at Y: ${footerY}`);
    doc.fontSize(8).fillColor(lightText)
       .text(`${company.name} | ${company.phone} | ${company.email}`, 60, footerY)
       .text(`${company.license} | ${company.insurance}`, 60, footerY + 12)
       .text(company.address, 60, footerY + 24);
    
    doc.text('Thank you for choosing our services!', 400, footerY + 12);
    console.log(`=== PDF GENERATION COMPLETE ===`);
  }
};

export default pdfService;