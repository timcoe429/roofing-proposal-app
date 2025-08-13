import React, { useState } from 'react';
import { Upload, Plus, Edit, Trash2, DollarSign, FileSpreadsheet } from 'lucide-react';

export default function PricingManager() {
  const [pricingSheets, setPricingSheets] = useState([
    {
      id: 1,
      name: 'ABC Supply - Standard',
      supplier: 'ABC Supply Co.',
      lastUpdated: '2024-01-15',
      itemCount: 45,
      isActive: true
    },
    {
      id: 2,
      name: 'Home Depot - Contractor',
      supplier: 'Home Depot Pro',
      lastUpdated: '2024-01-10',
      itemCount: 32,
      isActive: false
    }
  ]);

  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="pricing-manager">
      <div className="pricing-header">
        <div>
          <h2>Pricing Sheets Manager</h2>
          <p>Upload and manage your supplier pricing sheets for accurate proposals</p>
        </div>
        <button 
          onClick={() => setShowUpload(true)}
          className="upload-pricing-btn"
        >
          <Upload size={18} />
          Upload Pricing Sheet
        </button>
      </div>

      <div className="pricing-sheets-grid">
        {pricingSheets.map(sheet => (
          <div key={sheet.id} className={`pricing-sheet-card ${sheet.isActive ? 'active' : ''}`}>
            <div className="sheet-header">
              <FileSpreadsheet size={24} />
              <div className="sheet-info">
                <h3>{sheet.name}</h3>
                <p>{sheet.supplier}</p>
              </div>
              {sheet.isActive && <span className="active-badge">Active</span>}
            </div>
            
            <div className="sheet-stats">
              <div className="stat">
                <span className="stat-value">{sheet.itemCount}</span>
                <span className="stat-label">Items</span>
              </div>
              <div className="stat">
                <span className="stat-value">{sheet.lastUpdated}</span>
                <span className="stat-label">Updated</span>
              </div>
            </div>
            
            <div className="sheet-actions">
              <button className="action-btn edit">
                <Edit size={16} />
                Edit
              </button>
              <button className="action-btn delete">
                <Trash2 size={16} />
                Delete
              </button>
              <button className="action-btn activate">
                <DollarSign size={16} />
                {sheet.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
        
        <div className="add-pricing-card" onClick={() => setShowUpload(true)}>
          <Plus size={32} />
          <h3>Add New Pricing Sheet</h3>
          <p>Upload Excel/CSV files from your suppliers</p>
        </div>
      </div>

      {showUpload && (
        <div className="upload-modal">
          <div className="modal-content">
            <h3>Upload Pricing Sheet</h3>
            <div className="upload-area">
              <Upload size={48} />
              <h4>Drop your pricing sheet here</h4>
              <p>Supports Excel (.xlsx, .xls) and CSV files</p>
              <button className="browse-btn">Browse Files</button>
            </div>
            <div className="upload-options">
              <div className="option">
                <label>Supplier Name</label>
                <input type="text" placeholder="e.g., ABC Supply Co." />
              </div>
              <div className="option">
                <label>Sheet Name</label>
                <input type="text" placeholder="e.g., Standard Pricing 2024" />
              </div>
              <div className="option">
                <label>
                  <input type="checkbox" />
                  Set as active pricing sheet
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowUpload(false)} className="cancel-btn">
                Cancel
              </button>
              <button className="upload-btn">
                Upload & Process
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pricing-tips">
        <h3>💡 Tips for Better Pricing</h3>
        <ul>
          <li>Upload current supplier pricing sheets for accurate estimates</li>
          <li>Set different margins for materials vs labor</li>
          <li>Keep multiple pricing sheets for different suppliers</li>
          <li>AI can fetch current market prices if no pricing sheet is available</li>
        </ul>
      </div>
    </div>
  );
}
