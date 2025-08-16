import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, Save, Check } from 'lucide-react';
import './ClientInfoTab.css';

const ClientInfoTab = ({ proposalData, onUpdateProposal }) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const handleFieldChange = (field, value) => {
    setHasUnsavedChanges(true);
    onUpdateProposal(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    // This would trigger a save in the parent component
    setHasUnsavedChanges(false);
    setLastSaved(new Date());
  };

  return (
    <div className="client-info-tab">
      <div className="tab-header">
        <div className="header-left">
          <User size={24} />
          <div>
            <h2>Project Details</h2>
            <p>Complete all project information before using AI assistant</p>
          </div>
        </div>
        
        <div className="header-right">
          {hasUnsavedChanges && (
            <span className="unsaved-indicator">
              <Save size={16} />
              Unsaved changes
            </span>
          )}
          {lastSaved && !hasUnsavedChanges && (
            <span className="saved-indicator">
              <Check size={16} />
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
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
          <h3>Project Scope</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="projectType">
                Project Type *
              </label>
              <select
                id="projectType"
                value={proposalData.projectType || ''}
                onChange={(e) => handleFieldChange('projectType', e.target.value)}
                required
              >
                <option value="">Select project type</option>
                <option value="replacement">Full Roof Replacement</option>
                <option value="repair">Roof Repair</option>
                <option value="inspection">Inspection/Assessment</option>
                <option value="maintenance">Maintenance</option>
                <option value="new_construction">New Construction</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="materialType">
                Material Type *
              </label>
              <select
                id="materialType"
                value={proposalData.materialType || ''}
                onChange={(e) => handleFieldChange('materialType', e.target.value)}
                required
              >
                <option value="">Select material</option>
                <option value="asphalt_shingles">Asphalt Shingles</option>
                <option value="metal_roofing">Metal Roofing</option>
                <option value="tile_roofing">Tile Roofing</option>
                <option value="slate">Slate</option>
                <option value="flat_roof">Flat Roof Systems</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full-width">
              <label htmlFor="roofSize">
                Approximate Roof Size
              </label>
              <input
                id="roofSize"
                type="text"
                value={proposalData.roofSize || ''}
                onChange={(e) => handleFieldChange('roofSize', e.target.value)}
                placeholder="e.g., 2,500 sq ft, 25 squares, or 'Not sure'"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Special Requirements</h3>
          
          <div className="form-row">
            <div className="form-group full-width">
              <label htmlFor="specialRequirements">
                Special Requirements & Notes
              </label>
              <textarea
                id="specialRequirements"
                value={proposalData.specialRequirements || ''}
                onChange={(e) => handleFieldChange('specialRequirements', e.target.value)}
                placeholder="Any special requirements, damage areas, access issues, material preferences, etc."
                rows={4}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="urgency">
                Timeline/Urgency
              </label>
              <select
                id="urgency"
                value={proposalData.urgency || ''}
                onChange={(e) => handleFieldChange('urgency', e.target.value)}
              >
                <option value="">Select timeline</option>
                <option value="emergency">Emergency (ASAP)</option>
                <option value="urgent">Urgent (1-2 weeks)</option>
                <option value="normal">Normal (1-2 months)</option>
                <option value="flexible">Flexible timing</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Project Timeline</h3>
          
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
                placeholder="2-3 days, weather permitting"
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
                placeholder="50-Year Manufacturer, 10-Year Workmanship"
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
