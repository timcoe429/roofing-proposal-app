import React, { useState, useCallback } from 'react';
import { Upload, FileText, Image, X, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import './Upload.css';

const FileUpload = ({ files, onFilesChange, onProcessComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  const handleFileSelect = useCallback((event) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    const newFiles = selectedFiles.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2),
      type: file.type.startsWith('image/') ? 'image' : 'document',
      status: 'pending',
      file: file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));

    onFilesChange([...files, ...newFiles]);
  }, [files, onFilesChange]);

  const removeFile = (fileId) => {
    const updatedFiles = files.filter(f => f.id !== fileId);
    onFilesChange(updatedFiles);
  };

  const processFiles = async () => {
    if (files.length === 0) {
      toast.error('Please upload files first');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Converting files to base64...');

    try {
      // Convert files to base64
      const imageFiles = files.filter(f => f.type === 'image');
      const documentFiles = files.filter(f => f.type === 'document');
      
      const base64Images = await Promise.all(
        imageFiles.map(async (fileObj) => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(fileObj.file);
          });
        })
      );

      let analysisResult = {};

      // Process images with Vision AI
      if (base64Images.length > 0) {
        setProcessingStatus('Analyzing images with AI...');
        
        const visionResponse = await api.processImages(base64Images, 'damage_photos');
        
        if (visionResponse.success) {
          analysisResult = { ...analysisResult, ...visionResponse.analysis };
          
          // Update file statuses
          const updatedFiles = files.map(f => ({
            ...f,
            status: f.type === 'image' ? 'processed' : f.status
          }));
          onFilesChange(updatedFiles);
        }
      }

      // Process documents
      if (documentFiles.length > 0) {
        setProcessingStatus('Extracting measurements from documents...');
        
        for (const docFile of documentFiles) {
          const base64Doc = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(docFile.file);
          });

          const docResponse = await api.extractMeasurements(base64Doc);
          
          if (docResponse.success) {
            analysisResult.measurements = {
              ...analysisResult.measurements,
              ...docResponse.measurements
            };
          }
        }

        // Update document statuses
        const updatedFiles = files.map(f => ({
          ...f,
          status: 'processed'
        }));
        onFilesChange(updatedFiles);
      }

      setProcessingStatus('Processing complete!');
      toast.success('Files processed successfully!');
      
      // Pass the analysis results to parent
      onProcessComplete(analysisResult);
      
    } catch (error) {
      console.error('Processing error:', error);
      toast.error('Failed to process files. Please try again.');
      setProcessingStatus('Processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="file-upload-container">
      <div className="upload-area">
        <div className="dropzone">
          <input 
            type="file" 
            multiple 
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            id="file-upload"
          />
          <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
            <Upload className="upload-icon" />
            <h3>Click to upload files</h3>
            <p>Support for images, PDFs, Excel files, and measurement reports</p>
            <p className="upload-hint">Maximum file size: 10MB</p>
          </label>
        </div>
        
        {files.length > 0 && (
          <div className="files-list">
            <h3>Uploaded Files ({files.length})</h3>
            <div className="files-grid">
              {files.map(file => (
                <div key={file.id} className="file-card">
                  <div className="file-header">
                    {file.type === 'image' ? (
                      <Image className="file-icon" />
                    ) : (
                      <FileText className="file-icon" />
                    )}
                    <button 
                      onClick={() => removeFile(file.id)}
                      className="remove-file-btn"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  {file.preview && (
                    <img src={file.preview} alt={file.name} className="file-preview" />
                  )}
                  
                  <div className="file-info">
                    <p className="file-name">{file.name}</p>
                    <p className="file-size">{file.size} MB</p>
                    
                    <div className={`file-status status-${file.status}`}>
                      {file.status === 'processed' ? (
                        <>
                          <CheckCircle size={14} />
                          <span>Processed</span>
                        </>
                      ) : file.status === 'error' ? (
                        <>
                          <AlertCircle size={14} />
                          <span>Error</span>
                        </>
                      ) : (
                        <span>Ready</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="upload-actions">
              <button 
                onClick={processFiles}
                disabled={isProcessing}
                className="btn btn-primary btn-lg process-btn"
              >
                {isProcessing ? (
                  <>
                    <span className="spinner"></span>
                    {processingStatus}
                  </>
                ) : (
                  <>
                    Process with Vision AI
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
