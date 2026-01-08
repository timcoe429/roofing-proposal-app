import Proposal from '../models/Proposal.js';
import Company from '../models/Company.js';
import User from '../models/User.js';
import { calculations } from '../utils/calculations.js';

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
    console.log('Sending proposal.dataValues:', proposal.dataValues);
    res.json(proposal.dataValues || proposal);
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
    let userId = req.user?.userId;
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

    // Labor is always an array - no migration needed
    const labor = req.body.labor || [];
    
    const costBreakdown = calculations.getCostBreakdown(
      req.body.materials || [],
      labor,
      req.body.addOns || [],
      req.body.overheadPercent || 15,
      req.body.profitPercent || 20,
      req.body.overheadCostPercent || 10,
      req.body.netMarginTarget || 20,
      req.body.discountAmount || 0,
      false
    );

    // Keep measurements and projectVariables SEPARATE - don't merge them
    const proposalData = {
      ...req.body,
      ...(userId ? { userId } : {}),
      ...(companyId ? { companyId } : {}),
      measurements: req.body.measurements || {},
      projectVariables: req.body.projectVariables || {}
      // Calculated fields removed - always calculate from current data
      // overheadCosts, totalCost, netMarginActual removed - calculate on demand
      overheadCostPercent: req.body.overheadCostPercent || 10,
      netMarginTarget: req.body.netMarginTarget || 20
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
    
    // Labor is always an array - no migration needed
    const labor = req.body.labor !== undefined ? req.body.labor : (proposal.labor || []);
    
    const costBreakdown = calculations.getCostBreakdown(
      req.body.materials || proposal.materials || [],
      labor,
      req.body.addOns || proposal.addOns || [],
      req.body.overheadPercent !== undefined ? req.body.overheadPercent : (proposal.overheadPercent || 15),
      req.body.profitPercent !== undefined ? req.body.profitPercent : (proposal.profitPercent || 20),
      req.body.overheadCostPercent !== undefined ? req.body.overheadCostPercent : (proposal.overheadCostPercent || 10),
      req.body.netMarginTarget !== undefined ? req.body.netMarginTarget : (proposal.netMarginTarget || 20),
      req.body.discountAmount !== undefined ? req.body.discountAmount : (proposal.discountAmount || 0),
      false
    );

    // Keep measurements and projectVariables SEPARATE - don't merge them
    const updateData = {
      ...req.body,
      // Only update measurements if provided, otherwise keep existing
      measurements: req.body.measurements !== undefined 
        ? req.body.measurements 
        : proposal.measurements,
      // Only update projectVariables if provided, otherwise keep existing
      projectVariables: req.body.projectVariables !== undefined 
        ? req.body.projectVariables 
        : proposal.projectVariables
      // Calculated fields removed - always calculate from current data
      // overheadCosts, totalCost, netMarginActual removed - calculate on demand
      overheadCostPercent: req.body.overheadCostPercent !== undefined ? req.body.overheadCostPercent : (proposal.overheadCostPercent || 10),
      netMarginTarget: req.body.netMarginTarget !== undefined ? req.body.netMarginTarget : (proposal.netMarginTarget || 20)
    };
    
    await proposal.update(updateData);
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

// Accept proposal (public endpoint)
export const acceptProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, preferredStartDate } = req.body;
    
    const proposal = await Proposal.findByPk(id);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    // Update proposal status and acceptance data
    await proposal.update({
      status: 'accepted',
      acceptedAt: new Date(),
      acceptanceData: {
        name,
        phone,
        email,
        preferredStartDate,
        acceptedAt: new Date()
      }
    });
    
    res.json({ 
      message: 'Proposal accepted successfully',
      proposal: proposal 
    });
  } catch (error) {
    console.error('Error accepting proposal:', error);
    res.status(500).json({ error: 'Failed to accept proposal' });
  }
};