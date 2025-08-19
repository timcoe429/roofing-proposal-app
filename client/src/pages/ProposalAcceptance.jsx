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
    email: '',
    preferredStartDate: ''
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
      toast.error('Please fill in your name and phone number');
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

  return (
    <div className="acceptance-container">
      <div className="acceptance-card">
        <div className="header">
          <h1>Proposal Acceptance</h1>
          <p>Please review and accept your roofing proposal</p>
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
          <h3>Confirm Your Information</h3>
          
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
            <label>Email</label>
            <input
              type="email"
              value={clientInfo.email}
              onChange={(e) => setClientInfo(prev => ({ ...prev, email: e.target.value }))}
              placeholder="your@email.com"
            />
          </div>

          <div className="form-group">
            <label>Preferred Start Date</label>
            <input
              type="date"
              value={clientInfo.preferredStartDate}
              onChange={(e) => setClientInfo(prev => ({ ...prev, preferredStartDate: e.target.value }))}
            />
          </div>

          <button 
            type="submit" 
            className="accept-button"
            disabled={acceptMutation.isLoading}
          >
            {acceptMutation.isLoading ? 'Processing...' : 'ACCEPT PROPOSAL'}
          </button>
        </form>

        <div className="contact-info">
          <p>Questions? Contact us:</p>
          <div className="contact-methods">
            <a href={`tel:${proposal.clientPhone || '(555) 123-4567'}`}>
              <Phone size={16} />
              Call Us
            </a>
            <a href={`mailto:info@northstarroofing.com`}>
              <Mail size={16} />
              Email Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProposalAcceptance;
