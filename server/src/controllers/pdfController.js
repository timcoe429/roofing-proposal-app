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

    // Get company data (you can expand this to fetch from database)
    const companyData = {
      name: 'Your Company Name',
      address: 'Company Address',
      phone: 'Company Phone',
      email: 'Company Email',
      website: 'Company Website',
      license: 'License Number',
      insurance: 'Insurance Policy'
    };

    // Generate PDF
    const pdfBuffer = await pdfService.generateProposalPDF(proposal, companyData);
    
    // Set headers for file download
    const filename = `proposal-${proposal.clientName || 'client'}-${Date.now()}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send PDF
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
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
