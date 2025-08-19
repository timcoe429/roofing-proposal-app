import pdfService from '../services/pdfService.js';
import { Proposal } from '../models/index.js';

export const generatePDF = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get proposal data
    const proposal = await Proposal.findByPk(id);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    // Get company data and PDF options from request body
    const companyData = req.body.companyData || {
      name: 'Professional Roofing Co.',
      address: '123 Business Ave, City, State 12345',
      phone: '(555) 123-4567',
      email: 'info@roofingcompany.com',
      website: 'www.roofingcompany.com',
      license: 'License #123456',
      insurance: 'Insured & Bonded'
    };
    
    // Get PDF options (detailed vs simple)
    const pdfOptions = req.body.pdfOptions || { isDetailed: true };

    // Generate PDF
    const pdfBuffer = await pdfService.generateProposalPDF(proposal, companyData, pdfOptions);
    
    // Validate PDF buffer
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated PDF buffer is empty');
    }
    
    // Set headers for file download
    const filename = `proposal-${proposal.clientName || 'client'}-${Date.now()}.pdf`;
    
    // CORS and security headers
    res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    
    // File download headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Send PDF
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('=== PDF GENERATION ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);
    
    res.status(500).json({ 
      error: 'Failed to generate PDF',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const downloadPDF = async (req, res) => {
  try {
    // This is now handled by generatePDF
    res.json({ message: 'Use generatePDF endpoint instead' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to download PDF' });
  }
};
