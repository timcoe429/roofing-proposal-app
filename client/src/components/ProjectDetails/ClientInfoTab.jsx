import React from 'react';
import { User, Mail, Phone, MapPin } from 'lucide-react';
import './ClientInfoTab.css';

const ClientInfoTab = ({ proposalData, onUpdateProposal }) => {
  const handleFieldChange = (field, value) => {
    onUpdateProposal(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="client-info-tab">
      <div className="tab-header">
        <User size={24} />
        <h2>Client Information</h2>
        <p>Enter client contact details for the proposal</p>
      </div>

      <div className="client-form">
        <div className="form-section">
          <h3>Contact Information</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="clientName">
                <User size={16} />
                Client Name *
              </label>
              <input
                id="clientName"
                type="text"
                value={proposalData.clientName || ''}
                onChange={(e) => handleFieldChange('clientName', e.target.value)}
                placeholder="Enter client's full name"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="clientEmail">
                <Mail size={16} />
                Email Address
              </label>
              <input
                id="clientEmail"
                type="email"
                value={proposalData.clientEmail || ''}
                onChange={(e) => handleFieldChange('clientEmail', e.target.value)}
                placeholder="client@example.com"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="clientPhone">
                <Phone size={16} />
                Phone Number
              </label>
              <input
                id="clientPhone"
                type="tel"
                value={proposalData.clientPhone || ''}
                onChange={(e) => handleFieldChange('clientPhone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="clientAddress">
                <MapPin size={16} />
                Client Address
              </label>
              <input
                id="clientAddress"
                type="text"
                value={proposalData.clientAddress || ''}
                onChange={(e) => handleFieldChange('clientAddress', e.target.value)}
                placeholder="Client's mailing address"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Property Information</h3>
          
          <div className="form-row">
            <div className="form-group full-width">
              <label htmlFor="propertyAddress">
                <MapPin size={16} />
                Property Address *
              </label>
              <input
                id="propertyAddress"
                type="text"
                value={proposalData.propertyAddress || ''}
                onChange={(e) => handleFieldChange('propertyAddress', e.target.value)}
                placeholder="Property address where work will be performed"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="propertyCity">
                City
              </label>
              <input
                id="propertyCity"
                type="text"
                value={proposalData.propertyCity || ''}
                onChange={(e) => handleFieldChange('propertyCity', e.target.value)}
                placeholder="City"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="propertyState">
                State
              </label>
              <input
                id="propertyState"
                type="text"
                value={proposalData.propertyState || ''}
                onChange={(e) => handleFieldChange('propertyState', e.target.value)}
                placeholder="State"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="propertyZip">
                ZIP Code
              </label>
              <input
                id="propertyZip"
                type="text"
                value={proposalData.propertyZip || ''}
                onChange={(e) => handleFieldChange('propertyZip', e.target.value)}
                placeholder="ZIP"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Project Details</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="timeline">
                Timeline
              </label>
              <input
                id="timeline"
                type="text"
                value={proposalData.timeline || ''}
                onChange={(e) => handleFieldChange('timeline', e.target.value)}
                placeholder="e.g., 2-3 days, weather permitting"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="warranty">
                Warranty
              </label>
              <input
                id="warranty"
                type="text"
                value={proposalData.warranty || ''}
                onChange={(e) => handleFieldChange('warranty', e.target.value)}
                placeholder="e.g., 50-Year Manufacturer, 10-Year Workmanship"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full-width">
              <label htmlFor="notes">
                Project Notes
              </label>
              <textarea
                id="notes"
                value={proposalData.notes || ''}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder="Additional project notes or special requirements"
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientInfoTab;
