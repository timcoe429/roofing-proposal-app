import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle, Phone, Mail, Calendar } from 'lucide-react';
import api from '../services/api';
import './ProposalAcceptance.css';

const ProposalAcceptance = () => {
  const { id } = useParams();
  const [isAccepted, setIsAccepted] = useState(false);
  const [clientInfo, setClientInfo] = useState({
    name: '',
    phone: '',
    comments: ''
  });

  // Fetch proposal data
  const { data: proposal, isLoading, error } = useQuery({
    queryKey: ['proposal', id],
    queryFn: () => api.getProposal(id),
    retry: 1
  });

  // Accept proposal mutation
  const acceptMutation = useMutation({
    mutationFn: (acceptanceData) => api.acceptProposal(id, acceptanceData),
    onSuccess: () => {
      setIsAccepted(true);
      toast.success('Proposal accepted successfully!');
    },
    onError: () => {
      toast.error('Failed to accept proposal. Please try again.');
    }
  });

  const handleAccept = (e) => {
    e.preventDefault();
    
    if (!clientInfo.name || !clientInfo.phone) {
      toast.error('Please provide your name and phone number');
      return;
    }

    acceptMutation.mutate(clientInfo);
  };

  if (isLoading) {
    return (
      <div className="acceptance-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading proposal...</p>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="acceptance-container">
        <div className="error">
          <h2>Proposal Not Found</h2>
          <p>This proposal may have expired or been removed.</p>
        </div>
      </div>
    );
  }

  if (isAccepted) {
    return (
      <div className="acceptance-container">
        <div className="success-message">
          <CheckCircle size={64} className="success-icon" />
          <h1>Proposal Accepted!</h1>
          <p>Thank you for accepting our proposal. We'll contact you within 24 hours to schedule your project.</p>
          
          <div className="next-steps">
            <h3>What happens next?</h3>
            <div className="step">
              <Phone size={20} />
              <span>We'll call you within 24 hours</span>
            </div>
            <div className="step">
              <Calendar size={20} />
              <span>Schedule your project start date</span>
            </div>
            <div className="step">
              <CheckCircle size={20} />
              <span>Begin your roofing project</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get company data from localStorage for branding
  const getCompanyData = () => {
    try {
      const saved = localStorage.getItem('companyData');
      return saved ? JSON.parse(saved) : {
        name: 'Professional Roofing Co.',
        phone: '(555) 123-4567',
        email: 'info@roofingcompany.com',
        primaryColor: '#1e40af'
      };
    } catch (e) {
      return {
        name: 'Professional Roofing Co.',
        phone: '(555) 123-4567', 
        email: 'info@roofingcompany.com',
        primaryColor: '#1e40af'
      };
    }
  };

  const companyData = getCompanyData();

  return (
    <div className="acceptance-container">
      <div className="acceptance-card">
        <div className="header">
          {companyData.logo && (
            <img src={companyData.logo} alt="Company Logo" className="company-logo" />
          )}
          <h1 style={{ color: companyData.primaryColor || '#1e40af' }}>
            {companyData.name}
          </h1>
          <h2>Proposal Acceptance</h2>
          <p>Please review and confirm your interest in this roofing proposal</p>
          <div className="not-contract">
            <strong>Note:</strong> This is not a contract - you're simply confirming your interest to move forward.
          </div>
        </div>

        <div className="proposal-summary">
          <h2>Project Summary</h2>
          <div className="summary-item">
            <span>Client:</span>
            <span>{proposal.clientName}</span>
          </div>
          <div className="summary-item">
            <span>Property:</span>
            <span>{proposal.propertyAddress}</span>
          </div>
          <div className="summary-item">
            <span>Total:</span>
            <span className="total">${parseFloat(proposal.totalAmount || 0).toFixed(2)}</span>
          </div>
        </div>

        <form onSubmit={handleAccept} className="acceptance-form">
          <h3>Confirm Your Interest</h3>
          
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              value={clientInfo.name}
              onChange={(e) => setClientInfo(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-group">
            <label>Phone Number *</label>
            <input
              type="tel"
              value={clientInfo.phone}
              onChange={(e) => setClientInfo(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="(555) 123-4567"
              required
            />
          </div>

          <div className="form-group">
            <label>Questions or Special Requests (Optional)</label>
            <textarea
              value={clientInfo.comments}
              onChange={(e) => setClientInfo(prev => ({ ...prev, comments: e.target.value }))}
              placeholder="Any questions about the project or special requests?"
              rows="3"
            />
          </div>

          <button 
            type="submit" 
            className="accept-button"
            style={{ backgroundColor: companyData.primaryColor || '#1e40af' }}
            disabled={acceptMutation.isLoading}
          >
            {acceptMutation.isLoading ? 'Processing...' : 'YES, LET\'S PROCEED'}
          </button>
          
          <p className="disclaimer">
            By clicking above, you're confirming your interest to move forward. 
            This is not a binding contract - we'll contact you to finalize details.
          </p>
        </form>

        <div className="contact-info">
          <p>Questions? Contact {companyData.name}:</p>
          <div className="contact-methods">
            <a href={`tel:${companyData.phone}`}>
              <Phone size={16} />
              {companyData.phone}
            </a>
            <a href={`mailto:${companyData.email}`}>
              <Mail size={16} />
              {companyData.email}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProposalAcceptance;
