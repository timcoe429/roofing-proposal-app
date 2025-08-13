import React from 'react';
import { User, MapPin, Clock, Shield, FileText } from 'lucide-react';
import './ProjectDetails.css';

export default function ClientInfo({ clientData, onChange }) {
  const handleChange = (field, value) => {
    onChange(field, value);
  };

  return (
    <div className="client-info-container">
      <div className="client-section">
        <div className="section-header">
          <User size={24} />
          <h2>Client Information</h2>
        </div>
        
        <div className="form-grid">
          <div className="form-group">
            <label>Client Name *</label>
            <input
              type="text"
              value={clientData.clientName}
              onChange={(e) => handleChange('clientName', e.target.value)}
              placeholder="John Smith"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Email Address *</label>
            <input
              type="email"
              value={clientData.clientEmail}
              onChange={(e) => handleChange('clientEmail', e.target.value)}
              placeholder="john@example.com"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              value={clientData.clientPhone}
              onChange={(e) => handleChange('clientPhone', e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
          
          <div className="form-group full-width">
            <label>Client Address</label>
            <input
              type="text"
              value={clientData.clientAddress}
              onChange={(e) => handleChange('clientAddress', e.target.value)}
              placeholder="123 Main St, City, State 12345"
            />
          </div>
        </div>
      </div>

      <div className="property-section">
        <div className="section-header">
          <MapPin size={24} />
          <h2>Property Information</h2>
        </div>
        
        <div className="form-group">
          <label>Property Address</label>
          <input
            type="text"
            value={clientData.propertyAddress}
            onChange={(e) => handleChange('propertyAddress', e.target.value)}
            placeholder="456 Oak Ave, City, State 12345"
          />
          <small>If different from client address</small>
        </div>
      </div>

      <div className="project-section">
        <div className="section-header">
          <Clock size={24} />
          <h2>Project Details</h2>
        </div>
        
        <div className="form-grid">
          <div className="form-group">
            <label>Timeline</label>
            <select
              value={clientData.timeline}
              onChange={(e) => handleChange('timeline', e.target.value)}
            >
              <option value="1-2 days, weather permitting">1-2 days, weather permitting</option>
              <option value="2-3 days, weather permitting">2-3 days, weather permitting</option>
              <option value="3-5 days, weather permitting">3-5 days, weather permitting</option>
              <option value="1 week, weather permitting">1 week, weather permitting</option>
              <option value="2 weeks, weather permitting">2 weeks, weather permitting</option>
              <option value="Custom timeline">Custom timeline</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Warranty</label>
            <select
              value={clientData.warranty}
              onChange={(e) => handleChange('warranty', e.target.value)}
            >
              <option value="50-Year Manufacturer Warranty, 10-Year Workmanship">50-Year Manufacturer, 10-Year Workmanship</option>
              <option value="30-Year Manufacturer Warranty, 5-Year Workmanship">30-Year Manufacturer, 5-Year Workmanship</option>
              <option value="25-Year Manufacturer Warranty, 10-Year Workmanship">25-Year Manufacturer, 10-Year Workmanship</option>
              <option value="Lifetime Manufacturer Warranty, 15-Year Workmanship">Lifetime Manufacturer, 15-Year Workmanship</option>
              <option value="Custom warranty terms">Custom warranty terms</option>
            </select>
          </div>
        </div>
      </div>

      <div className="notes-section">
        <div className="section-header">
          <FileText size={24} />
          <h2>Additional Notes</h2>
        </div>
        
        <div className="form-group">
          <label>Project Notes</label>
          <textarea
            value={clientData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Any special instructions, concerns, or additional details about the project..."
            rows="4"
          />
        </div>
      </div>

      <div className="terms-section">
        <div className="section-header">
          <Shield size={24} />
          <h2>Terms & Conditions</h2>
        </div>
        
        <div className="terms-content">
          <h4>Payment Terms</h4>
          <ul>
            <li>50% deposit required to begin work</li>
            <li>Remaining balance due upon completion</li>
            <li>Payment accepted via check, cash, or credit card</li>
          </ul>
          
          <h4>Work Guarantee</h4>
          <ul>
            <li>All work guaranteed against defects in workmanship</li>
            <li>Materials covered by manufacturer warranty</li>
            <li>Free repairs for workmanship issues within warranty period</li>
          </ul>
          
          <h4>Weather Policy</h4>
          <ul>
            <li>Work may be delayed due to inclement weather</li>
            <li>Safety is our top priority</li>
            <li>Client will be notified of any delays</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
