import Proposal from '../models/Proposal.js';

// Get all proposals for a user
export const getProposals = async (req, res) => {
  try {
    const userId = req.user?.id || 'dummy-user-id';
    const proposals = await Proposal.findAll({
      where: { userId: userId },
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
    const userId = req.user?.id || 'dummy-user-id';
    const proposal = await Proposal.findOne({
      where: { 
        id: req.params.id,
        userId: userId 
      }
    });
    
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    res.json(proposal);
  } catch (error) {
    console.error('Error getting proposal:', error);
    res.status(500).json({ error: 'Failed to get proposal' });
  }
};

// Create new proposal
export const createProposal = async (req, res) => {
  try {
    // For now, use dummy user data if no auth
    const userId = req.user?.id || 'dummy-user-id';
    const companyId = req.user?.companyId || req.body.companyId || 'dummy-company-id';
    
    const proposalData = {
      ...req.body,
      userId: userId,
      companyId: companyId
    };
    
    console.log('Creating proposal with data:', proposalData);
    
    const proposal = await Proposal.create(proposalData);
    res.status(201).json(proposal);
  } catch (error) {
    console.error('Error creating proposal:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ error: 'Failed to create proposal', details: error.message });
  }
};

// Update proposal
export const updateProposal = async (req, res) => {
  try {
    const userId = req.user?.id || 'dummy-user-id';
    const proposal = await Proposal.findOne({
      where: { 
        id: req.params.id,
        userId: userId 
      }
    });
    
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    await proposal.update(req.body);
    res.json(proposal);
  } catch (error) {
    console.error('Error updating proposal:', error);
    res.status(500).json({ error: 'Failed to update proposal' });
  }
};

// Delete proposal
export const deleteProposal = async (req, res) => {
  try {
    const userId = req.user?.id || 'dummy-user-id';
    const proposal = await Proposal.findOne({
      where: { 
        id: req.params.id,
        userId: userId 
      }
    });
    
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
