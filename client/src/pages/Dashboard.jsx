import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Users, TrendingUp, LogOut, Settings, TestTube } from 'lucide-react';
import toast from 'react-hot-toast';
import CompanySettings from '../components/Branding/CompanySettings';
import ApiTester from '../components/Test/ApiTester';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [showSettings, setShowSettings] = useState(false);
  const [showApiTester, setShowApiTester] = useState(false);
  
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

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Welcome back, {user.name || 'User'}!</h1>
            <p>{companyData.name || 'Your Company'}</p>
          </div>
          <div className="header-actions">
            <button onClick={() => setShowApiTester(true)} className="test-btn">
              <TestTube size={18} />
              Test API
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
              <p className="stat-number">0</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon clients">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <h3>Active Clients</h3>
              <p className="stat-number">0</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon revenue">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <h3>This Month</h3>
              <p className="stat-number">$0</p>
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
              <div className="empty-state">
                <p>No proposals yet. Create your first one!</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
              {/* API Tester Modal */}
        {showApiTester && (
          <div className="settings-modal-overlay" onClick={() => setShowApiTester(false)}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
              <div className="settings-modal-header">
                <h2>Google Sheets API Tester</h2>
                <button onClick={() => setShowApiTester(false)} className="close-btn">×</button>
              </div>
              <div className="settings-modal-content">
                <ApiTester />
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
