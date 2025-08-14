import React, { useState } from 'react';
import { Building, Phone, Mail, MapPin, Upload, Palette, Shield } from 'lucide-react';
import './Branding.css';

export default function CompanySettings({ companyData, onCompanyDataChange }) {
  const handleChange = (field, value) => {
    onCompanyDataChange({
      ...companyData,
      [field]: value
    });
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

  const handleSave = () => {
    // Placeholder for actual save logic
    alert('Company settings saved successfully!');
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
        <button className="save-settings-btn" onClick={handleSave}>
          Save Company Settings
        </button>
        <p className="save-note">
          These settings will be applied to all future proposals and can be updated anytime.
        </p>
      </div>
    </div>
  );
}
