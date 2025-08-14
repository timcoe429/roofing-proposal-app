import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Users, TrendingUp, LogOut, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import CompanySettings from '../components/Branding/CompanySettings';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [showSettings, setShowSettings] = useState(false);
  
  // Company settings state
  const [companyData, setCompanyData] = useState({
    name: user.company || 'Your Company Name',
    address: 'Company Address',
    phone: 'Company Phone',
    email: user.email || 'Company Email',
    website: 'Company Website',
    license: 'License Number',
    insurance: 'Insurance Policy',
    logo: null,
    primaryColor: '#2563eb',
    termsConditionsUrl: '',
    privacyPolicyUrl: ''
  });

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
            <p>{user.company || 'Your Company'}</p>
          </div>
          <div className="header-actions">
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
              <p className="stat-number">12</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon clients">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <h3>Active Clients</h3>
              <p className="stat-number">8</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon revenue">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <h3>This Month</h3>
              <p className="stat-number">$24,500</p>
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
              <div className="proposal-item">
                <div className="proposal-info">
                  <h4>Johnson Residence</h4>
                  <p>Asphalt shingle replacement • 24 squares</p>
                  <span className="proposal-date">2 days ago</span>
                </div>
                <span className="proposal-status pending">Pending</span>
              </div>
              
              <div className="proposal-item">
                <div className="proposal-info">
                  <h4>Smith Commercial</h4>
                  <p>Metal roof repair • 45 squares</p>
                  <span className="proposal-date">1 week ago</span>
                </div>
                <span className="proposal-status approved">Approved</span>
              </div>
              
              <div className="proposal-item">
                <div className="proposal-info">
                  <h4>Brown Family Home</h4>
                  <p>Tile roof installation • 32 squares</p>
                  <span className="proposal-date">2 weeks ago</span>
                </div>
                <span className="proposal-status completed">Completed</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      
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
                onCompanyDataChange={setCompanyData}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
