import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, FileText, Loader2 } from 'lucide-react';
import './Header.css';

export default function Header({ 
  onSave, 
  onGeneratePdf, 
  isSaving = false, 
  isGeneratingPdf = false,
  hasUnsavedChanges = false 
}) {
  const navigate = useNavigate();

  return (
    <header className="proposal-header">
      <div className="header-container">
        <div className="header-left">
          <button 
            onClick={() => navigate('/')} 
            className="back-button"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
        </div>
        
        <div className="header-center">
          <div className="header-title">
            <h1>Proposal Editor</h1>
            <p>
              Create professional roofing proposals
              {hasUnsavedChanges && <span className="unsaved-indicator"> • Unsaved changes</span>}
            </p>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={onSave}
            disabled={isSaving}
            className="save-button"
          >
            {isSaving ? (
              <Loader2 size={18} className="spinning" />
            ) : (
              <Save size={18} />
            )}
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
          
          <button 
            onClick={onGeneratePdf}
            disabled={isGeneratingPdf}
            className="pdf-button"
          >
            {isGeneratingPdf ? (
              <Loader2 size={18} className="spinning" />
            ) : (
              <FileText size={18} />
            )}
            {isGeneratingPdf ? 'Generating...' : 'Generate PDF'}
          </button>
        </div>
      </div>
    </header>
  );
}
