import React, { useState, useEffect } from 'react';
import { Building, Phone, Mail, MapPin, Upload, Palette, Shield, Bot, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import './Branding.css';

export default function CompanySettings({ companyData, onCompanyDataChange }) {
  const [isSaving, setIsSaving] = useState(false);
  
  // Initialize aiInstructions if not present
  useEffect(() => {
    if (!companyData.aiInstructions) {
      onCompanyDataChange({
        ...companyData,
        aiInstructions: {
          additionalInstructions: '',
          locationKnowledge: {}
        }
      });
    }
  }, [companyData, onCompanyDataChange]);
  
  const handleChange = (field, value) => {
    onCompanyDataChange({
      ...companyData,
      [field]: value
    });
  };
  
  const handleAIInstructionsChange = (field, value) => {
    const currentAIInstructions = companyData.aiInstructions || { additionalInstructions: '', locationKnowledge: {} };
    onCompanyDataChange({
      ...companyData,
      aiInstructions: {
        ...currentAIInstructions,
        [field]: value
      }
    });
  };
  
  const handleLocationKnowledgeChange = (city, value) => {
    const currentAIInstructions = companyData.aiInstructions || { additionalInstructions: '', locationKnowledge: {} };
    const updatedLocationKnowledge = {
      ...(currentAIInstructions.locationKnowledge || {}),
      [city]: value
    };
    // Keep empty strings - don't delete them (user might be adding a new location)
    handleAIInstructionsChange('locationKnowledge', updatedLocationKnowledge);
  };
  
  const addLocationKnowledge = () => {
    const city = prompt('Enter city name (e.g., "Aspen, CO"):');
    if (city && city.trim()) {
      handleLocationKnowledgeChange(city.trim(), '');
    }
  };
  
  const removeLocationKnowledge = (city) => {
    const currentAIInstructions = companyData.aiInstructions || { additionalInstructions: '', locationKnowledge: {} };
    const updatedLocationKnowledge = { ...(currentAIInstructions.locationKnowledge || {}) };
    delete updatedLocationKnowledge[city];
    handleAIInstructionsChange('locationKnowledge', updatedLocationKnowledge);
  };



  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        handleChange('logo', e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    console.log('=== COMPANY SETTINGS SAVE CLICKED ===');
    console.log('Company data to save:', companyData);
    setIsSaving(true);
    try {
      // Save to database via API
      console.log('Calling api.updateCompanySettings...');
      const result = await api.updateCompanySettings(companyData);
      console.log('✅ API call successful, result:', result);
      
      // Also save to localStorage for immediate UI updates
      localStorage.setItem('companyData', JSON.stringify(companyData));
      console.log('✅ Saved to localStorage');
      
      toast.success('Company settings saved successfully!');
    } catch (error) {
      console.error('❌ Error saving company settings:', error);
      toast.error('Failed to save company settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="company-settings-container">
      <div className="company-info-section">
        <div className="section-header">
          <Building size={24} />
          <h2>Company Information</h2>
        </div>
        
        <div className="form-grid">
          <div className="form-group">
            <label>Company Name</label>
            <input
              type="text"
              value={companyData.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label>License Number</label>
            <input
              type="text"
              value={companyData.license}
              onChange={(e) => handleChange('license', e.target.value)}
            />
          </div>
          
          <div className="form-group full-width">
            <label>Business Address</label>
            <input
              type="text"
              value={companyData.address}
              onChange={(e) => handleChange('address', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="contact-section">
        <div className="section-header">
          <Phone size={24} />
          <h2>Contact Information</h2>
        </div>
        
        <div className="form-grid">
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              value={companyData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={companyData.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label>Website</label>
            <input
              type="url"
              value={companyData.website}
              onChange={(e) => handleChange('website', e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label>Insurance Policy</label>
            <input
              type="text"
              value={companyData.insurance}
              onChange={(e) => handleChange('insurance', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="branding-section">
        <div className="section-header">
          <Palette size={24} />
          <h2>Branding & Design</h2>
        </div>
        
        <div className="branding-grid">
          <div className="logo-section">
            <label>Company Logo</label>
            <div className="logo-upload">
              {companyData.logo ? (
                <div className="logo-preview">
                  <img src={companyData.logo} alt="Company Logo" />
                  <button 
                    onClick={() => handleChange('logo', null)}
                    className="remove-logo-btn"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="logo-placeholder">
                  <Upload size={32} />
                  <p>Upload your company logo</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    style={{ display: 'none' }}
                    id="logo-upload"
                  />
                  <label htmlFor="logo-upload" className="upload-btn">
                    Choose File
                  </label>
                </div>
              )}
            </div>
          </div>
          
          <div className="colors-section">
            <div className="color-group">
              <label>Brand Color</label>
              <div className="color-input">
                <input
                  type="color"
                  value={companyData.primaryColor}
                  onChange={(e) => handleChange('primaryColor', e.target.value)}
                />
                <span>{companyData.primaryColor}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="ai-instructions-section">
        <div className="section-header">
          <Bot size={24} />
          <h2>AI Instructions</h2>
        </div>
        
        <div className="ai-instructions-content">
          <div className="form-group full-width">
            <label>Additional Instructions for AI</label>
            <textarea
              value={(companyData.aiInstructions?.additionalInstructions) || ''}
              onChange={(e) => handleAIInstructionsChange('additionalInstructions', e.target.value)}
              placeholder="Add custom instructions for the AI assistant. For example:&#10;&#10;- Always recommend premium underlayment for high-altitude projects&#10;- Include permit costs for all Denver projects&#10;- Use specific terminology for our company"
              rows={8}
              className="ai-instructions-textarea"
            />
            <small>
              These instructions will be added to the AI's system prompt. Use this to add company-specific rules, 
              preferences, or expertise that should guide the AI's behavior.
            </small>
          </div>
          
          <div className="location-knowledge-section">
            <div className="location-knowledge-header">
              <label>Location-Specific Knowledge</label>
              <button 
                type="button"
                onClick={addLocationKnowledge}
                className="add-location-btn"
              >
                <Plus size={16} />
                Add Location
              </button>
            </div>
            <small>
              Add roofing codes, local requirements, or location-specific knowledge. The AI will automatically 
              use this knowledge when working on proposals for these locations.
            </small>
            
            {(!companyData.aiInstructions?.locationKnowledge || Object.keys(companyData.aiInstructions.locationKnowledge).length === 0) ? (
              <div className="no-locations">
                <p>No location-specific knowledge added yet.</p>
                <p className="hint">Click "Add Location" to add knowledge for specific cities (e.g., "Aspen, CO").</p>
              </div>
            ) : (
              <div className="location-knowledge-list">
                {Object.entries(companyData.aiInstructions.locationKnowledge).map(([city, knowledge]) => (
                  <div key={city} className="location-knowledge-item">
                    <div className="location-city">
                      <strong>{city}</strong>
                      <button
                        type="button"
                        onClick={() => removeLocationKnowledge(city)}
                        className="remove-location-btn"
                        title="Remove location"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <textarea
                      value={knowledge || ''}
                      onChange={(e) => handleLocationKnowledgeChange(city, e.target.value)}
                      placeholder={`Add roofing codes, requirements, or knowledge for ${city}...`}
                      rows={4}
                      className="location-knowledge-textarea"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="terms-section">
        <div className="section-header">
          <Shield size={24} />
          <h2>Legal Links</h2>
        </div>
        
        <div className="terms-content">
          <div className="form-group">
            <label>Terms & Conditions URL</label>
                             <input
                   type="url"
                   value={companyData.termsConditionsUrl || ''}
                   onChange={(e) => handleChange('termsConditionsUrl', e.target.value)}
                 />
            <small>Link to your Terms & Conditions page on your website</small>
          </div>
          
          <div className="form-group">
            <label>Privacy Policy URL</label>
                             <input
                   type="url"
                   value={companyData.privacyPolicyUrl || ''}
                   onChange={(e) => handleChange('privacyPolicyUrl', e.target.value)}
                 />
            <small>Link to your Privacy Policy page on your website</small>
          </div>
        </div>
      </div>

      <div className="preview-section">
        <div className="section-header">
          <Building size={24} />
          <h2>Proposal Header Preview</h2>
        </div>
        
        <div className="header-preview">
          <div className="preview-content">
            {companyData.logo && (
              <img src={companyData.logo} alt="Logo" className="preview-logo" />
            )}
            <div className="preview-info">
              <h3>{companyData.name}</h3>
              <div className="preview-contact">
                <span>{companyData.phone}</span>
                <span>{companyData.email}</span>
                <span>{companyData.website}</span>
              </div>
              <div className="preview-credentials">
                <span>License: {companyData.license}</span>
                <span>Insured: {companyData.insurance}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="save-section">
        <button 
          className="save-settings-btn" 
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Company Settings'}
        </button>
        <p className="save-note">
          These settings will be applied to all future proposals and can be updated anytime.
        </p>
      </div>
    </div>
  );
}
