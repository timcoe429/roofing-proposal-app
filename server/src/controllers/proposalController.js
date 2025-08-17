import Proposal from '../models/Proposal.js';
import Company from '../models/Company.js';
import User from '../models/User.js';

// Get all proposals for a user
export const getProposals = async (req, res) => {
  try {
    // For development - show all proposals regardless of user
    const proposals = await Proposal.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json(proposals);
  } catch (error) {
    console.error('Error getting proposals:', error);
    res.status(500).json({ error: 'Failed to get proposals' });
  }
};

// Get single proposal
export const getProposal = async (req, res) => {
  try {
    console.log('GET /api/proposals/:id - Params:', req.params);
    console.log('GET /api/proposals/:id - User:', req.user);
    
    const where = { id: req.params.id };
    // Temporarily remove user filtering for testing
    // if (req.user?.id) where.userId = req.user.id;
    
    console.log('Looking for proposal with where clause:', where);
    
    console.log('=== EXECUTING DATABASE QUERY ===');
    const proposal = await Proposal.findOne({ where });
    console.log('=== QUERY COMPLETED ===');
    
    console.log('Raw proposal result:', proposal);
    console.log('Proposal type:', typeof proposal);
    console.log('Proposal keys:', proposal ? Object.keys(proposal.dataValues || proposal) : 'null');
    
    if (!proposal) {
      console.log('❌ Proposal not found in database');
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    console.log('✅ Found proposal:', proposal.id, proposal.clientName);
    console.log('Full proposal data:', JSON.stringify(proposal.dataValues || proposal, null, 2));
    
    console.log('=== SENDING RESPONSE ===');
    res.json(proposal);
    console.log('=== RESPONSE SENT ===');
  } catch (error) {
    console.error('Error getting proposal - Full error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    res.status(500).json({ error: 'Failed to get proposal', details: error.message });
  }
};

// Create new proposal
export const createProposal = async (req, res) => {
  try {
    console.log('POST /api/proposals - Request body:', JSON.stringify(req.body, null, 2));
    console.log('User from request:', req.user);
    
    // Resolve user/company when auth is disabled
    let userId = req.user?.id;
    let companyId = req.user?.companyId || req.body.companyId;

    if (!userId) {
      console.log('No user in request, looking up first user...');
      const user = await User.findOne();
      userId = user?.id;
      console.log('Found user:', user?.id, user?.email);
    }
    if (!companyId) {
      console.log('No companyId, looking up first company...');
      const company = await Company.findOne();
      companyId = company?.id;
      console.log('Found company:', company?.id, company?.name);
    }

    const proposalData = {
      ...req.body,
      ...(userId ? { userId } : {}),
      ...(companyId ? { companyId } : {})
    };
    
    console.log('Final proposal data to create:', JSON.stringify(proposalData, null, 2));
    
    const proposal = await Proposal.create(proposalData);
    console.log('Proposal created successfully:', proposal.id);
    res.status(201).json(proposal);
  } catch (error) {
    console.error('Error creating proposal - Full error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.errors) {
      console.error('Validation errors:', error.errors);
    }
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    res.status(500).json({ 
      error: 'Failed to create proposal', 
      details: error.message,
      name: error.name,
      errors: error.errors
    });
  }
};

// Update proposal
export const updateProposal = async (req, res) => {
  try {
    console.log('PUT /api/proposals/:id - Params:', req.params);
    console.log('PUT /api/proposals/:id - Request body:', JSON.stringify(req.body, null, 2));
    
    const where = { id: req.params.id };
    if (req.user?.id) where.userId = req.user.id;
    
    console.log('Looking for proposal with where clause:', where);
    const proposal = await Proposal.findOne({ where });
    
    if (!proposal) {
      console.log('Proposal not found');
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    console.log('Found proposal, updating...');
    await proposal.update(req.body);
    console.log('Proposal updated successfully');
    res.json(proposal);
  } catch (error) {
    console.error('Error updating proposal - Full error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    res.status(500).json({ 
      error: 'Failed to update proposal', 
      details: error.message,
      name: error.name
    });
  }
};

// Delete proposal
export const deleteProposal = async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (req.user?.id) where.userId = req.user.id;
    const proposal = await Proposal.findOne({ where });
    
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    await proposal.destroy();
    res.json({ message: 'Proposal deleted successfully' });
  } catch (error) {
    console.error('Error deleting proposal:', error);
    res.status(500).json({ error: 'Failed to delete proposal' });
  }
};
