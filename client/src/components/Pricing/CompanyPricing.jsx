import React, { useState, useEffect } from 'react';
import { Upload, Plus, Edit, Trash2, DollarSign, FileSpreadsheet, FileText, FileImage, Brain, Zap } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../services/api';
import './PricingManager.css';

export default function CompanyPricing() {
  const queryClient = useQueryClient();
  
  // Load pricing sheets from database
  const { data: pricingSheets = [], isLoading: sheetsLoading, error: sheetsError } = useQuery({
    queryKey: ['materials'],
    queryFn: api.getMaterials,
    refetchOnWindowFocus: false,
  });

  // Create material mutation
  const createMaterialMutation = useMutation({
    mutationFn: api.createMaterial,
    onSuccess: () => {
      toast.success('Pricing sheet saved to database!');
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
    onError: (error) => {
      toast.error('Failed to save pricing sheet');
      console.error(error);
    }
  });

  // Delete material mutation
  const deleteMaterialMutation = useMutation({
    mutationFn: api.deleteMaterial,
    onSuccess: () => {
      toast.success('Pricing sheet deleted!');
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
    onError: (error) => {
      toast.error('Failed to delete pricing sheet');
      console.error(error);
    }
  });

  const [showUpload, setShowUpload] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [sheetName, setSheetName] = useState('');
  const [inputMethod, setInputMethod] = useState('file'); // 'file' or 'url'
  const [documentUrl, setDocumentUrl] = useState('');
  const [editingSheet, setEditingSheet] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handlePricingUpload = async () => {
    // Check if required fields are filled
    if (!sheetName.trim()) {
      toast.error('Please fill in Document Name');
      return;
    }

    // Check if we have either file or URL based on selected method
    if (inputMethod === 'file' && selectedFiles.length === 0) {
      toast.error('Please select a file to upload');
      return;
    }

    if (inputMethod === 'url' && !documentUrl.trim()) {
      toast.error('Please enter a Google Sheets URL');
      return;
    }

    try {
      // Create material in database
      const materialData = {
        name: sheetName,
        category: 'pricing_sheet',
        subcategory: inputMethod === 'file' ? getFileType(selectedFiles[0]) : 'url',
        description: `Pricing sheet: ${sheetName}`,
        specifications: {
          type: inputMethod,
          files: inputMethod === 'file' ? selectedFiles.map(f => ({ name: f.name, size: f.size })) : [{ name: documentUrl, size: 0 }],
          uploadDate: new Date().toISOString(),
          isActive: true
        },
        isActive: true
      };

      console.log('Saving pricing sheet to database:', materialData);
      createMaterialMutation.mutate(materialData);

      // Close modal
      setShowUpload(false);
      setSelectedFiles([]);
      setSheetName('');
      setDocumentUrl('');
      setInputMethod('file');

    } catch (error) {
      console.error('Error saving pricing sheet:', error);
      toast.error('Failed to save pricing sheet');
    }
  };

  const deleteSheet = (id) => {
    if (window.confirm('Are you sure you want to delete this pricing sheet? This action cannot be undone.')) {
      console.log('Deleting pricing sheet from database:', id);
      deleteMaterialMutation.mutate(id);
    }
  };

  // Update material mutation
  const updateMaterialMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateMaterial(id, data),
    onSuccess: () => {
      toast.success('Material updated!');
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
    onError: (error) => {
      toast.error('Failed to update material');
      console.error(error);
    }
  });

  const toggleActive = (id) => {
    // Find the sheet to toggle
    const sheet = pricingSheets.find(s => s.id === id);
    if (sheet) {
      // Update in database
      const updatedData = { isActive: !sheet.isActive };
      console.log('Toggling sheet active state:', updatedData);
      updateMaterialMutation.mutate({ id, data: updatedData });
    }
  };

  const startEdit = (sheet) => {
    setEditingSheet(sheet);
    setSheetName(sheet.name);
    setInputMethod(sheet.specifications?.type || 'file');
    setDocumentUrl(sheet.specifications?.files?.[0]?.name || '');
    setShowEdit(true);
  };

  const handleEditSave = async () => {
    if (!editingSheet) return;

    if (!sheetName.trim()) {
      toast.error('Please fill in Document Name');
      return;
    }

    try {
      const updatedData = {
        name: sheetName,
        description: `Updated pricing sheet: ${sheetName}`,
        specifications: {
          ...editingSheet.specifications,
          type: inputMethod,
          updatedDate: new Date().toISOString()
        }
      };

      console.log('Updating material in database:', updatedData);
      updateMaterialMutation.mutate({ id: editingSheet.id, data: updatedData });

      // Close modal
      setShowEdit(false);
      setEditingSheet(null);
      setSheetName('');
      setDocumentUrl('');

    } catch (error) {
      console.error('Error updating material:', error);
      toast.error('Failed to update material');
    }
  };

  const getFileType = (file) => {
    if (file.name.includes('.xlsx') || file.name.includes('.xls')) return 'excel';
    if (file.name.includes('.pdf')) return 'pdf';
    if (file.name.includes('.doc') || file.name.includes('.docx')) return 'word';
    if (file.name.includes('.csv')) return 'csv';
    if (file.name.includes('docs.google.com')) return 'google_doc';
    return 'text';
  };

  const getFileIcon = (file) => {
    const type = getFileType(file);
    switch (type) {
      case 'excel': return <FileSpreadsheet size={16} style={{ color: '#10b981' }} />;
      case 'pdf': return <FileText size={16} style={{ color: '#ef4444' }} />;
      case 'word': return <FileText size={16} style={{ color: '#3b82f6' }} />;
      case 'csv': return <FileSpreadsheet size={16} style={{ color: '#f59e0b' }} />;
      default: return <FileImage size={16} style={{ color: '#6b7280' }} />;
    }
  };

  return (
    <div className="pricing-manager">
      <div className="pricing-header">
        <div>
          <p>Manage your pricing data that will be available to all proposals</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="modern-add-btn">
          <Plus size={18} />
          Add Pricing Sheet
        </button>
      </div>

      <div className="pricing-grid">
        {sheetsLoading ? (
          <div className="loading-state">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p>Loading pricing sheets from database...</p>
          </div>
        ) : sheetsError ? (
          <div className="error-state">
            <p>Failed to load pricing sheets. Please try again.</p>
          </div>
        ) : pricingSheets.length === 0 ? (
          <div className="empty-state">
            <p>No pricing sheets yet. Upload your first one!</p>
          </div>
        ) : (
          pricingSheets.map(sheet => (
            <div key={sheet.id} className={`pricing-card ${sheet.isActive ? 'active' : 'inactive'}`}>
            <div className="card-header">
              <div className="card-title">
                <div className="sheet-icon">
                  {sheet.isProcessing ? (
                    <div className="processing-spinner">⏳</div>
                  ) : (
                    getFileIcon(sheet.specifications?.files?.[0] || { name: sheet.subcategory || 'file' })
                  )}
                </div>
                <div>
                  <h3>{sheet.name}</h3>
                  <p>{sheet.manufacturer || sheet.subcategory || 'Pricing Sheet'}</p>
                </div>
              </div>
              {sheet.isActive && <div className="active-badge">Active</div>}
            </div>
            
            <div className="sheet-stats">
              <div className="stat">
                <span className="stat-value">{sheet.lastUpdated}</span>
                <span className="stat-label">Updated</span>
              </div>
            </div>
            
            <div className="sheet-actions">
              <button 
                className="action-btn edit"
                onClick={() => startEdit(sheet)}
              >
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
          ))
        )}
        
        {!sheetsLoading && !sheetsError && (
          <div className="add-pricing-card" onClick={() => setShowUpload(true)}>
            <Plus size={32} />
            <h3>Add Pricing Sheet</h3>
            <p>Upload pricing data for all your proposals</p>
          </div>
        )}
      </div>

      {/* Upload Modal - Same as before but with company branding */}
      {showUpload && (
        <div className="upload-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add Company Pricing Sheet</h3>
              <p>This pricing data will be available to all proposals</p>
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
                      <li>Server fetches your Google Sheet using the API</li>
                      <li>Claude AI analyzes the data and counts items</li>
                      <li>Pricing data becomes available to all proposals</li>
                    </ol>
                    <strong>Requirements:</strong> Sheet must be publicly viewable (Share → Anyone with link can view)
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Pricing Sheet Name</label>
                <input 
                  type="text"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                />
                <small>Give your pricing sheet a descriptive name</small>
              </div>

              {selectedFiles.length > 0 && (
                <div className="selected-files">
                  <label>Selected Files:</label>
                  <div className="files-list">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="file-item">
                        {getFileIcon(file)}
                        <span>{file.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button onClick={() => setShowUpload(false)} className="cancel-btn">Cancel</button>
                <button onClick={handlePricingUpload} className="upload-btn">
                  <Brain size={18} />
                  Upload & Process
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - Same as PricingManager */}
      {showEdit && editingSheet && (
        <div className="upload-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Company Pricing Sheet</h3>
              <p>Update pricing data and resync from source</p>
            </div>

            <div className="upload-form">
              {/* Input Method Selector */}
              <div className="form-group">
                <label>Document Type</label>
                <div className="input-method-tabs">
                  <button
                    type="button"
                    className={`method-tab ${inputMethod === 'file' ? 'active' : ''}`}
                    onClick={() => setInputMethod('file')}
                  >
                    📁 File Upload
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
                    <strong>Resync:</strong> Update the URL and click save to fetch fresh data from your Google Sheet.
                  </div>
                </div>
              )}

              {/* File info for file-based sheets */}
              {inputMethod === 'file' && (
                <div className="form-group">
                  <label>Current Files</label>
                  <div className="current-files">
                    {editingSheet.files?.map((file, index) => (
                      <div key={index} className="file-item">
                        <span>{file.name}</span>
                      </div>
                    ))}
                  </div>
                  <small>File-based sheets cannot be resynced. Delete and re-upload to update.</small>
                </div>
              )}

              <div className="form-group">
                <label>Pricing Sheet Name</label>
                <input
                  type="text"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                />
                <small>Give your pricing sheet a descriptive name</small>
              </div>

              <div className="modal-actions">
                <button 
                  onClick={() => {
                    setShowEdit(false);
                    setEditingSheet(null);
                    setSheetName('');
                    setDocumentUrl('');
                  }} 
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button onClick={handleEditSave} className="upload-btn">
                  <Brain size={18} />
                  {inputMethod === 'url' ? 'Save & Resync' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
