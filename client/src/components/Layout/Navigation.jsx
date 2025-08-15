import React from 'react';
import { MessageCircle, Settings, CheckCircle } from 'lucide-react';
import './Navigation.css';

const tabs = [
  {
    id: 'preview',
    label: 'Preview',
    icon: CheckCircle
  }
];

export default function Navigation({ activeTab, setActiveTab, proposalData }) {
  const isTabComplete = (tabId) => {
    switch (tabId) {
      case 'preview':
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
