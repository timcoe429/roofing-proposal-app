import React, { useState } from 'react';
import { Upload, Plus, Edit, Trash2, DollarSign, FileSpreadsheet, FileText, FileImage, Brain } from 'lucide-react';
import './PricingManager.css';

export default function PricingManager() {
  const [pricingSheets, setPricingSheets] = useState([]);

  const [showUpload, setShowUpload] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [supplierName, setSupplierName] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [inputMethod, setInputMethod] = useState('file'); // 'file' or 'url'
  const [documentUrl, setDocumentUrl] = useState('');

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handlePricingUpload = async () => {
    // Check if required fields are filled
    if (!supplierName.trim() || !sheetName.trim()) {
      alert('Please fill in Supplier Name and Document Name');
      return;
    }

    // Check if we have either file or URL based on selected method
    if (inputMethod === 'file' && selectedFiles.length === 0) {
      alert('Please select a file to upload');
      return;
    }

    if (inputMethod === 'url' && !documentUrl.trim()) {
      alert('Please enter a Google Docs/Sheets URL');
      return;
    }

    // Here you would integrate with Claude AI to process the files
    // For now, we'll simulate the process
    const newSheet = {
      id: Date.now(),
      name: sheetName,
      supplier: supplierName,
      lastUpdated: new Date().toISOString().split('T')[0],
      itemCount: 0, // Will be populated by Claude AI
      isActive: false,
      type: getFileType(selectedFiles[0]),
      files: selectedFiles.map(f => ({ name: f.name, size: f.size }))
    };

    setPricingSheets([...pricingSheets, newSheet]);
    setShowUpload(false);
    setSelectedFiles([]);
    setSupplierName('');
    setSheetName('');
    setDocumentUrl('');
    setInputMethod('file');
  };

  const getFileType = (file) => {
    if (file.name.includes('.xlsx') || file.name.includes('.xls')) return 'excel';
    if (file.name.includes('.pdf')) return 'pdf';
    if (file.name.includes('.doc') || file.name.includes('.docx')) return 'word';
    if (file.name.includes('.csv')) return 'csv';
    if (file.name.includes('docs.google.com')) return 'google_doc';
    return 'other';
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'excel': return <FileSpreadsheet size={24} />;
      case 'pdf': return <FileText size={24} />;
      case 'word': return <FileText size={24} />;
      case 'csv': return <FileSpreadsheet size={24} />;
      case 'google_doc': return <FileText size={24} />;
      default: return <FileText size={24} />;
    }
  };

  const toggleActive = (id) => {
    setPricingSheets(pricingSheets.map(sheet => ({
      ...sheet,
      isActive: sheet.id === id ? !sheet.isActive : false
    })));
  };

  const deleteSheet = (id) => {
    setPricingSheets(pricingSheets.filter(sheet => sheet.id !== id));
  };

  return (
    <div className="pricing-manager">
      <div className="pricing-header">
        <div>
          <h2>Pricing Sheets Manager</h2>
          <p>Upload any pricing document and let Claude AI extract the data automatically</p>
        </div>
        <button 
          onClick={() => setShowUpload(true)}
          className="upload-pricing-btn"
        >
          <Upload size={18} />
          Add Pricing Document
        </button>
      </div>

      <div className="pricing-sheets-grid">
        {pricingSheets.map(sheet => (
          <div key={sheet.id} className={`pricing-sheet-card ${sheet.isActive ? 'active' : ''}`}>
            <div className="sheet-header">
              {getFileIcon(sheet.type)}
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
              <button 
                className="action-btn delete"
                onClick={() => deleteSheet(sheet.id)}
              >
                <Trash2 size={16} />
                Delete
              </button>
              <button 
                className={`action-btn ${sheet.isActive ? 'deactivate' : 'activate'}`}
                onClick={() => toggleActive(sheet.id)}
              >
                <DollarSign size={16} />
                {sheet.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
        
        <div className="add-pricing-card" onClick={() => setShowUpload(true)}>
          <Plus size={32} />
          <h3>Add Pricing Document</h3>
          <p>Upload any format - Claude AI will extract the data</p>
        </div>
      </div>

      {showUpload && (
        <div className="upload-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Upload Pricing Document</h3>
              <p>Upload any pricing document and Claude AI will extract product names, prices, and categories</p>
            </div>
            
            <div className="upload-form">
              {/* Input Method Selector */}
              <div className="form-group">
                <label>How would you like to add your pricing document?</label>
                <div className="input-method-tabs">
                  <button 
                    type="button"
                    className={`method-tab ${inputMethod === 'file' ? 'active' : ''}`}
                    onClick={() => setInputMethod('file')}
                  >
                    📁 Upload File
                  </button>
                  <button 
                    type="button"
                    className={`method-tab ${inputMethod === 'url' ? 'active' : ''}`}
                    onClick={() => setInputMethod('url')}
                  >
                    🔗 Google Docs/Sheets URL
                  </button>
                </div>
              </div>

              {/* File Upload Section */}
              {inputMethod === 'file' && (
                <div className="form-group">
                  <label>Select Pricing Document(s)</label>
                  <input 
                    type="file" 
                    multiple
                    accept=".xlsx,.xls,.pdf,.doc,.docx,.csv,.txt"
                    onChange={handleFileSelect}
                    className="file-input"
                  />
                  <small>Supports Excel, PDF, Word, CSV, and text files</small>
                </div>
              )}

              {/* URL Input Section */}
              {inputMethod === 'url' && (
                <div className="form-group">
                  <label>Google Docs/Sheets URL</label>
                  <input 
                    type="url"
                    value={documentUrl}
                    onChange={(e) => setDocumentUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="url-input"
                  />
                  <small>Paste the shareable link to your Google Docs or Google Sheets document</small>
                </div>
              )}
              
              <div className="form-row">
                <div className="form-group">
                  <label>Supplier Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g., ABC Supply Co."
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Document Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Standard Pricing 2024"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                  />
                </div>
              </div>

              {selectedFiles.length > 0 && (
                <div className="selected-files">
                  <label>Selected Files:</label>
                  <div className="files-list">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="file-item">
                        {getFileIcon(getFileType(file))}
                        <span>{file.name}</span>
                        <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="ai-info">
              <Brain size={20} />
              <div>
                <h4>Claude AI Processing</h4>
                <p>AI will automatically identify product names, prices, and categories from any document format</p>
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowUpload(false)} className="cancel-btn">
                Cancel
              </button>
              <button onClick={handlePricingUpload} className="upload-btn">
                <Upload size={16} />
                Upload & Process
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
