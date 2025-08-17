import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, Users, TrendingUp, LogOut, Settings, TestTube, DollarSign, Calendar, Eye, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import CompanySettings from '../components/Branding/CompanySettings';
import ApiTester from '../components/Test/ApiTester';
import CompanyPricing from '../components/Pricing/CompanyPricing';
import api from '../services/api';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [showSettings, setShowSettings] = useState(false);
  const [showApiTester, setShowApiTester] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  // Fetch proposals
  const { data: proposals = [], isLoading: proposalsLoading, error: proposalsError } = useQuery({
    queryKey: ['proposals'],
    queryFn: api.getProposals,
    refetchOnWindowFocus: false,
  });

  // Delete proposal mutation
  const deleteMutation = useMutation({
    mutationFn: api.deleteProposal,
    onSuccess: () => {
      toast.success('Proposal deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
    onError: (error) => {
      toast.error('Failed to delete proposal');
      console.error(error);
    }
  });

  // Calculate stats from proposals
  const totalProposals = proposals.length;
  const activeClients = new Set(proposals.map(p => p.clientEmail || p.clientName)).size;
  const thisMonthRevenue = proposals
    .filter(p => {
      const createdDate = new Date(p.createdAt);
      const now = new Date();
      return createdDate.getMonth() === now.getMonth() && 
             createdDate.getFullYear() === now.getFullYear() &&
             p.status === 'accepted';
    })
    .reduce((sum, p) => sum + (parseFloat(p.totalAmount) || 0), 0);
  
  // Load company data from localStorage or use defaults
  const getInitialCompanyData = () => {
    const saved = localStorage.getItem('companyData');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      name: user.company || '',
      address: '',
      phone: '',
      email: user.email || '',
      website: '',
      license: '',
      insurance: '',
      logo: null,
      primaryColor: '#2563eb',
      termsConditionsUrl: '',
      privacyPolicyUrl: ''
    };
  };

  const [companyData, setCompanyData] = useState(getInitialCompanyData);

  // Save company data to localStorage whenever it changes
  const handleCompanyDataChange = (newData) => {
    setCompanyData(newData);
    localStorage.setItem('companyData', JSON.stringify(newData));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const handleNewProposal = () => {
    navigate('/proposal/new');
  };

  const handleViewProposal = (proposalId) => {
    navigate(`/proposal/${proposalId}`);
  };

  const handleDeleteProposal = (proposalId, clientName) => {
    if (window.confirm(`Are you sure you want to delete the proposal for "${clientName}"? This action cannot be undone.`)) {
      deleteMutation.mutate(proposalId);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Welcome back, {user.name || 'User'}!</h1>
            <p>{companyData.name || 'Your Company'}</p>
          </div>
          <div className="header-actions">

            <button onClick={() => setShowPricing(true)} className="pricing-btn">
              <DollarSign size={18} />
              Pricing Sheets
            </button>
            <button onClick={() => setShowSettings(true)} className="settings-btn">
              <Settings size={18} />
              Company Settings
            </button>
            <button onClick={handleLogout} className="logout-btn">
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-grid">
          <div className="stat-card">
            <div className="stat-icon proposals">
              <FileText size={24} />
            </div>
            <div className="stat-content">
              <h3>Total Proposals</h3>
              <p className="stat-number">{proposalsLoading ? '...' : totalProposals}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon clients">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <h3>Active Clients</h3>
              <p className="stat-number">{proposalsLoading ? '...' : activeClients}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon revenue">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <h3>This Month</h3>
              <p className="stat-number">{proposalsLoading ? '...' : formatCurrency(thisMonthRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="action-section">
          <div className="action-card">
            <h2>Create New Proposal</h2>
            <p>Upload photos and measurements to generate AI-powered roofing proposals</p>
            <button onClick={handleNewProposal} className="primary-btn">
              <Plus size={20} />
              New Proposal
            </button>
          </div>

          <div className="recent-section">
            <h2>Recent Proposals</h2>
            <div className="proposal-list">
              {proposalsLoading ? (
                <div className="loading-state">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p>Loading proposals...</p>
                </div>
              ) : proposalsError ? (
                <div className="error-state">
                  <p>Failed to load proposals. Please try again.</p>
                </div>
              ) : proposals.length === 0 ? (
                <div className="empty-state">
                  <p>No proposals yet. Create your first one!</p>
                </div>
              ) : (
                <div className="proposals-grid">
                  {proposals.slice(0, 6).map((proposal) => (
                    <div key={proposal.id} className="proposal-card">
                      <div className="proposal-header">
                        <h3>{proposal.clientName || 'Unnamed Client'}</h3>
                        <span className={`status-badge status-${proposal.status}`}>
                          {proposal.status}
                        </span>
                      </div>
                      <div className="proposal-details">
                        <p className="property-address">
                          {proposal.propertyAddress || 'No address provided'}
                        </p>
                        <div className="proposal-meta">
                          <div className="meta-item">
                            <Calendar size={14} />
                            <span>{formatDate(proposal.createdAt)}</span>
                          </div>
                          {proposal.totalAmount && (
                            <div className="meta-item">
                              <span className="amount">{formatCurrency(proposal.totalAmount)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="proposal-actions">
                        <button
                          onClick={() => handleViewProposal(proposal.id)}
                          className="view-btn"
                        >
                          <Eye size={16} />
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteProposal(proposal.id, proposal.clientName || 'Unnamed Client')}
                          className="delete-btn"
                          disabled={deleteMutation.isLoading}
                        >
                          <Trash2 size={16} />
                          {deleteMutation.isLoading ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      

        {/* Company Pricing Modal */}
        {showPricing && (
          <div className="settings-modal-overlay" onClick={() => setShowPricing(false)}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px' }}>
              <div className="settings-modal-header">
                <h2>Company Pricing Sheets</h2>
                <button onClick={() => setShowPricing(false)} className="close-btn">×</button>
              </div>
              <div className="settings-modal-content">
                <CompanyPricing />
              </div>
            </div>
          </div>
        )}

        {/* Company Settings Modal */}
        {showSettings && (
          <div className="settings-modal-overlay" onClick={() => setShowSettings(false)}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
              <div className="settings-modal-header">
                <h2>Company Settings</h2>
                <button onClick={() => setShowSettings(false)} className="close-btn">×</button>
              </div>
              <div className="settings-modal-content">
                <CompanySettings
                  companyData={companyData}
                  onCompanyDataChange={handleCompanyDataChange}
                />
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
