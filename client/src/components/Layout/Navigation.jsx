import React from 'react';
import { Upload, Ruler, Package, User, Settings, CheckCircle } from 'lucide-react';
import './Navigation.css';

const tabs = [
  { 
    id: 'upload', 
    label: 'Upload', 
    icon: Upload
  },
  { 
    id: 'measurements', 
    label: 'Measurements', 
    icon: Ruler
  },
  { 
    id: 'materials', 
    label: 'Materials', 
    icon: Package
  },
  { 
    id: 'details', 
    label: 'Client Info', 
    icon: User
  },
  { 
    id: 'pricing', 
    label: 'Pricing', 
    icon: Settings
  },
  { 
    id: 'preview', 
    label: 'Preview', 
    icon: CheckCircle
  }
];

export default function Navigation({ activeTab, setActiveTab, proposalData }) {
  const isTabComplete = (tabId) => {
    switch (tabId) {
      case 'upload':
        return proposalData?.uploadedFiles?.length > 0;
      case 'measurements':
        return proposalData?.measurements?.totalSquares > 0;
      case 'materials':
        return proposalData?.materials?.length > 0;
      case 'details':
        return proposalData?.clientName && proposalData?.clientEmail;
      case 'branding':
        return true; // Always available
      default:
        return false;
    }
  };

  return (
    <nav className="proposal-navigation">
      <div className="nav-container">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isComplete = isTabComplete(tab.id);
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-tab ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
            >
              <div className="tab-icon-wrapper">
                <Icon size={20} className="tab-icon" />
                {isComplete && (
                  <CheckCircle size={12} className="complete-indicator" />
                )}
              </div>
              <span className="tab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
