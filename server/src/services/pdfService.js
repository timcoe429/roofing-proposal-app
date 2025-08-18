import puppeteer from 'puppeteer';

const pdfService = {
  async generateProposalPDF(proposalData, companyData) {
    let browser = null;
    
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 800 });
      
      const htmlContent = this.generateProposalHTML(proposalData, companyData);
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      });

      return pdfBuffer;
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  },

  generateProposalHTML(proposalData, companyData) {
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
      if (proposalData.totalAmount) {
        return parseFloat(proposalData.totalAmount);
      }
      
      const materialsTotal = proposalData.materials?.reduce((sum, material) => sum + (material.total || 0), 0) || 0;
      const laborTotal = (proposalData.laborHours || 0) * (proposalData.laborRate || 0);
      const addOnsTotal = proposalData.addOns?.reduce((sum, addon) => sum + (addon.price || 0), 0) || 0;
      const additionalTotal = proposalData.structuredPricing?.additionalCosts?.reduce((sum, cost) => sum + (cost.cost || 0), 0) || 0;
      
      return materialsTotal + laborTotal + addOnsTotal + additionalTotal;
    };

    const getStructuredPricing = () => {
      if (proposalData.structuredPricing) {
        return proposalData.structuredPricing;
      }
      
      const materials = proposalData.materials?.filter(item => item.category !== 'labor') || [];
      const labor = proposalData.materials?.filter(item => item.category === 'labor') || [];
      
      return { materials, labor, additionalCosts: [] };
    };

    const pricing = getStructuredPricing();
    const total = calculateTotal();

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Roofing Proposal</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: white; }
        .document { max-width: 800px; margin: 0 auto; padding: 40px; }
        .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .company-name { font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 5px; }
        .company-tagline { font-size: 16px; color: #666; margin-bottom: 10px; }
        .contact-info { font-size: 14px; color: #666; }
        .proposal-title { text-align: center; margin: 30px 0; }
        .proposal-title h1 { font-size: 24px; color: #2563eb; margin-bottom: 10px; }
        .proposal-meta { display: flex; justify-content: space-between; font-size: 14px; color: #666; }
        .section { margin-bottom: 30px; }
        .section h2 { font-size: 18px; color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
        .detail-row:last-child { border-bottom: none; }
        .detail-row span:first-child { font-weight: 600; color: #374151; }
        .materials-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .materials-table th, .materials-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .materials-table th { background-color: #f9fafb; font-weight: 600; color: #374151; }
        .materials-table td { color: #6b7280; }
        .total-section { background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: center; }
        .total-amount { font-size: 24px; font-weight: bold; color: #2563eb; }
        .notes-section { background-color: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; }
        .terms-section { font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="document">
        <div class="header">
            <div class="company-name">${company.name}</div>
            <div class="company-tagline">Professional Roofing Services</div>
            <div class="contact-info">
                ${company.phone} • ${company.email}<br>
                License: ${company.license} • Insured: ${company.insurance}<br>
                ${company.address}${company.website ? `<br>${company.website}` : ''}
            </div>
        </div>

        <div class="proposal-title">
            <h1>ROOFING PROPOSAL</h1>
            <div class="proposal-meta">
                <span>Proposal #: ${Date.now().toString().slice(-6)}</span>
                <span>Date: ${new Date().toLocaleDateString()}</span>
            </div>
        </div>

        <div class="section">
            <h2>Client Information</h2>
            <div class="detail-row"><span>Name:</span><span>${proposalData.clientName || 'Not specified'}</span></div>
            <div class="detail-row"><span>Email:</span><span>${proposalData.clientEmail || 'Not specified'}</span></div>
            <div class="detail-row"><span>Phone:</span><span>${proposalData.clientPhone || 'Not specified'}</span></div>
            <div class="detail-row"><span>Property Address:</span><span>${proposalData.propertyAddress || proposalData.clientAddress || 'Not specified'}</span></div>
        </div>

        <div class="section">
            <h2>Project Details</h2>
            <div class="detail-row"><span>Scope:</span><span>Complete Roof Replacement</span></div>
            <div class="detail-row"><span>Roof Area:</span><span>${proposalData.measurements?.totalSquares || 0} squares</span></div>
            <div class="detail-row"><span>Pitch:</span><span>${proposalData.measurements?.pitch || 'Not specified'}</span></div>
            <div class="detail-row"><span>Timeline:</span><span>${proposalData.timeline || 'Not specified'}</span></div>
            <div class="detail-row"><span>Warranty:</span><span>${proposalData.warranty || 'Not specified'}</span></div>
        </div>

        <div class="section">
            <h2>Materials & Labor Breakdown</h2>
            ${pricing.materials.length > 0 ? `
                <h3>Materials</h3>
                <table class="materials-table">
                    <thead><tr><th>Description</th><th>Quantity</th><th>Unit Price</th><th>Total</th></tr></thead>
                    <tbody>
                        ${pricing.materials.map(material => `
                            <tr>
                                <td>${material.name}</td>
                                <td>${material.quantity} ${material.unit}</td>
                                <td>$${material.unitPrice?.toFixed(2)}</td>
                                <td>$${material.total?.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : ''}

            ${pricing.labor.length > 0 ? `
                <h3>Labor</h3>
                <table class="materials-table">
                    <thead><tr><th>Description</th><th>Quantity</th><th>Unit Price</th><th>Total</th></tr></thead>
                    <tbody>
                        ${pricing.labor.map(labor => `
                            <tr>
                                <td>${labor.name}</td>
                                <td>${labor.quantity} ${labor.unit}</td>
                                <td>$${labor.unitPrice?.toFixed(2)}</td>
                                <td>$${labor.total?.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : ''}

            ${pricing.additionalCosts.length > 0 ? `
                <h3>Additional Costs</h3>
                <table class="materials-table">
                    <thead><tr><th>Description</th><th>Amount</th></tr></thead>
                    <tbody>
                        ${pricing.additionalCosts.map(cost => `
                            <tr><td>${cost.name}</td><td>$${cost.cost?.toFixed(2)}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : ''}

            <div class="total-section">
                <div class="total-amount">TOTAL PROJECT COST: $${total.toFixed(2)}</div>
            </div>
        </div>

        ${proposalData.notes ? `
            <div class="section">
                <h2>Additional Notes</h2>
                <div class="notes-section"><p>${proposalData.notes}</p></div>
            </div>
        ` : ''}

        <div class="terms-section">
            <h2>Legal Information</h2>
            <p>This proposal is subject to our Terms & Conditions. All work performed is guaranteed according to our warranty terms. Proposal is valid for 30 days from date of issue.</p>
        </div>
    </div>
</body>
</html>`;
  }
};

export default pdfService;
