// Proposal controller
export const getProposals = async (req, res) => {
  try {
    // TODO: Implement proposal retrieval
    res.json({ message: 'Proposal routes working' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get proposals' });
  }
};
