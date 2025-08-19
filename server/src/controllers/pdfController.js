import pdfService from '../services/pdfService.js';
import { Proposal } from '../models/index.js';

export const generatePDF = async (req, res) => {
  console.log('=== PDF GENERATION STARTED ===');
  console.log('Request params:', req.params);
  
  try {
    const { id } = req.params;
    console.log('Looking for proposal with ID:', id);
    
    // Get proposal data
    const proposal = await Proposal.findByPk(id);
    console.log('Proposal found:', !!proposal);
    
    if (!proposal) {
      console.log('Proposal not found, returning 404');
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    console.log('Proposal client name:', proposal.clientName);

    // Get company data from request body or use defaults
    const companyData = req.body.companyData || {
      name: 'Professional Roofing Co.',
      address: '123 Business Ave, City, State 12345',
      phone: '(555) 123-4567',
      email: 'info@roofingcompany.com',
      website: 'www.roofingcompany.com',
      license: 'License #123456',
      insurance: 'Insured & Bonded'
    };
    
    console.log('Using company data:', companyData.name);

    // Generate PDF
    console.log('Generating PDF for proposal:', proposal.clientName);
    const pdfBuffer = await pdfService.generateProposalPDF(proposal, companyData);
    console.log('PDF buffer generated, size:', pdfBuffer.length, 'bytes');
    
    // Validate PDF buffer
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated PDF buffer is empty');
    }
    
    // Check if buffer starts with PDF header
    const pdfHeader = pdfBuffer.slice(0, 4).toString();
    console.log('PDF header:', pdfHeader);
    if (pdfHeader !== '%PDF') {
      console.warn('Warning: PDF buffer does not start with %PDF header');
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
