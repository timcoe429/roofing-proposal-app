import Proposal from '../models/Proposal.js';

// Get all proposals for a user
export const getProposals = async (req, res) => {
  try {
    const proposals = await Proposal.findAll({
      where: { userId: req.user.id },
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
    const proposal = await Proposal.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
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
    const proposalData = {
      ...req.body,
      userId: req.user.id,
      companyId: req.user.companyId || req.body.companyId
    };
    
    const proposal = await Proposal.create(proposalData);
    res.status(201).json(proposal);
  } catch (error) {
    console.error('Error creating proposal:', error);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
};

// Update proposal
export const updateProposal = async (req, res) => {
  try {
    const proposal = await Proposal.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
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
    const proposal = await Proposal.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
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
