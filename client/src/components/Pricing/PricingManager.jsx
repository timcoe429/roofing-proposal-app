import React, { useState, useEffect } from 'react';
import { Upload, Plus, Edit, Trash2, DollarSign, FileSpreadsheet, FileText, FileImage, Brain } from 'lucide-react';
import api from '../../services/api';
import './PricingManager.css';

export default function PricingManager() {
  // Load saved pricing sheets from localStorage
  const [pricingSheets, setPricingSheets] = useState(() => {
    const saved = localStorage.getItem('pricingSheets');
    return saved ? JSON.parse(saved) : [];
  });

  const [showUpload, setShowUpload] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const [sheetName, setSheetName] = useState('');
  const [inputMethod, setInputMethod] = useState('file'); // 'file' or 'url'
  const [documentUrl, setDocumentUrl] = useState('');

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handlePricingUpload = async () => {
    // Check if required fields are filled
    if (!sheetName.trim()) {
      alert('Please fill in Document Name');
      return;
    }

    // Check if we have either file or pasted data based on selected method
    if (inputMethod === 'file' && selectedFiles.length === 0) {
      alert('Please select a file to upload');
      return;
    }

    if (inputMethod === 'url' && !documentUrl.trim()) {
      alert('Please enter a Google Sheets URL');
      return;
    }

    try {
      // Show processing state
      const processingSheet = {
        id: Date.now(),
        name: sheetName,
        supplier: 'Processing...', 
        lastUpdated: new Date().toISOString().split('T')[0],
        itemCount: '...',
        isActive: false,
        type: inputMethod === 'file' ? getFileType(selectedFiles[0]) : 'url',
        files: inputMethod === 'file' ? selectedFiles.map(f => ({ name: f.name, size: f.size })) : [{ name: documentUrl, size: 0 }],
        isProcessing: true
      };

      // Add processing sheet immediately
      const updatedSheets = [...pricingSheets, processingSheet];
      setPricingSheets(updatedSheets);
      
      // Save to localStorage immediately
      localStorage.setItem('pricingSheets', JSON.stringify(updatedSheets));

      // Close modal
      setShowUpload(false);
      setSelectedFiles([]);
      setSheetName('');
      setDocumentUrl('');
      setInputMethod('file');

      // Actually process with Claude AI
      let processedData;
      if (inputMethod === 'url') {
        // Process Google Sheets URL
        processedData = await api.analyzePricingDocument({
          documentUrl: documentUrl,
          documentType: 'google_sheets'
        });
      } else {
        // Process uploaded files
        const fileData = await Promise.all(
          selectedFiles.map(file => {
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve({
                name: file.name,
                data: e.target.result,
                type: file.type
              });
              reader.readAsDataURL(file);
            });
          })
        );

        processedData = await api.analyzePricingDocument({
          files: fileData,
          documentType: 'pricing_sheet'
        });
      }

      // Debug the API response
      console.log('API Response:', processedData);
      
      // Update with real processed data
      const finalSheet = {
        ...processingSheet,
        supplier: 'Multiple Suppliers',
        itemCount: processedData.itemCount || processedData.data?.itemCount || 0,
        extractedData: processedData.data || processedData,
        isProcessing: false
      };

      // Update the processing sheet with real data
      const finalSheets = updatedSheets.map(sheet => 
        sheet.id === processingSheet.id ? finalSheet : sheet
      );
      
      setPricingSheets(finalSheets);
      localStorage.setItem('pricingSheets', JSON.stringify(finalSheets));

    } catch (error) {
      console.error('Error processing document:', error);
      
      // Show detailed error message
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      alert(`Failed to process document: ${errorMessage}\n\nPlease check:\n1. ANTHROPIC_API_KEY is set\n2. Google Sheets URL is publicly accessible\n3. Network connection is stable`);
      
      // Remove the processing sheet on error
      const sheetsWithoutProcessing = pricingSheets.filter(sheet => !sheet.isProcessing);
      setPricingSheets(sheetsWithoutProcessing);
      localStorage.setItem('pricingSheets', JSON.stringify(sheetsWithoutProcessing));
    }


  };

  const deleteSheet = (id) => {
    const updatedSheets = pricingSheets.filter(sheet => sheet.id !== id);
    setPricingSheets(updatedSheets);
    localStorage.setItem('pricingSheets', JSON.stringify(updatedSheets));
  };

  const toggleActive = (id) => {
    const updatedSheets = pricingSheets.map(sheet => 
      sheet.id === id ? { ...sheet, isActive: !sheet.isActive } : sheet
    );
    setPricingSheets(updatedSheets);
    localStorage.setItem('pricingSheets', JSON.stringify(updatedSheets));
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
                <label>How would you like to add your pricing data?</label>
                <div className="input-method-tabs">
                  <button 
                    type="button"
                    className={`method-tab ${inputMethod === 'file' ? 'active' : ''}`}
                    onClick={() => setInputMethod('file')}
                  >
                    📁 Upload CSV/Excel
                  </button>
                  <button 
                    type="button"
                    className={`method-tab ${inputMethod === 'url' ? 'active' : ''}`}
                    onClick={() => setInputMethod('url')}
                  >
                    🔗 Google Sheets URL
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

              {/* Google Sheets URL Section */}
              {inputMethod === 'url' && (
                <div className="form-group">
                  <label>Google Sheets URL</label>
                  <input 
                    type="url"
                    value={documentUrl}
                    onChange={(e) => setDocumentUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="url-input"
                  />
                  <div className="url-instructions">
                    <strong>How it works:</strong>
                    <ol>
                      <li>Server fetches your Google Sheet as CSV</li>
                      <li>Claude AI analyzes the data and counts items</li>
                      <li>You get real pricing data with accurate counts</li>
                    </ol>
                    <strong>Requirements:</strong> Sheet must be publicly viewable (Share → Anyone with link can view)
                  </div>
                </div>
              )}
              
              <div className="form-group">
                <label>Document Name</label>
                <input 
                  type="text" 
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                />
                <small>Give your pricing document a descriptive name</small>
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
