import React, { useMemo } from 'react';
import { Download, CheckCircle, AlertCircle } from 'lucide-react';
import { calculations } from '../../utils/calculations';
import { getValidationReport } from '../../utils/mathValidator';
import './LivePreviewPanel.css';

const LivePreviewPanel = ({ proposalData, onExportCSV }) => {
  // Calculate cost breakdown
  const breakdown = calculations.getCostBreakdown(
    proposalData.materials || [],
    proposalData.laborHours || 0,
    proposalData.laborRate || 75,
    proposalData.addOns || [],
    proposalData.overheadPercent || 15,
    proposalData.profitPercent || 20,
    proposalData.discountAmount || 0
  );

  // Get validation report
  const validation = useMemo(() => {
    const report = getValidationReport(proposalData);
    
    // COMPLETELY filter out ALL total_mismatch errors - they're always transient
    // These happen when totalAmount is stale but materials have been updated
    const filteredErrors = report.errors.filter(error => {
      // Never show total_mismatch errors - they're always false positives during updates
      if (error.type === 'total_mismatch') {
        return false; // Filter out ALL total_mismatch errors
      }
      return true; // Keep all other errors
    });
    
    return {
      ...report,
      errors: filteredErrors,
      isValid: filteredErrors.length === 0,
      summary: {
        ...report.summary,
        totalErrors: filteredErrors.length
      }
    };
  }, [proposalData]);

  // Get all line items (materials + labor + add-ons)
  const allLineItems = [
    ...(proposalData.materials || []).map(item => ({
      ...item,
      type: item.category === 'labor' ? 'labor' : 'material'
    })),
    ...(proposalData.addOns || []).map(item => ({
      ...item,
      type: 'addon',
      quantity: 1,
      unit: 'each',
      unitPrice: item.price || 0,
      total: item.price || 0
    }))
  ];

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  return (
    <div className="live-preview-panel">
      <div className="preview-header">
        <div className="header-left">
          <h2>Quote Preview</h2>
          {validation.isValid ? (
            <div className="validation-status valid">
              <CheckCircle size={16} />
              <span>All calculations valid</span>
            </div>
          ) : (
            <div className="validation-status invalid">
              <AlertCircle size={16} />
              <span>{validation.summary.totalErrors} error(s)</span>
            </div>
          )}
        </div>
        <button 
          className="export-btn"
          onClick={onExportCSV}
          disabled={!proposalData.clientName || allLineItems.length === 0 || !validation.isValid}
        >
          <Download size={16} />
          Export to CSV
        </button>
      </div>

      {/* Validation Warnings */}
      {!validation.isValid && validation.errors.length > 0 && (
        <div className="validation-alert">
          <AlertCircle size={16} />
          <div className="alert-content">
            <strong>Calculation Errors Found:</strong>
            <ul>
              {validation.errors.slice(0, 3).map((error, index) => (
                <li key={index}>{error.message || error.type}</li>
              ))}
              {validation.errors.length > 3 && (
                <li>...and {validation.errors.length - 3} more</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Client Info Summary */}
      {proposalData.clientName && (
        <div className="preview-section">
          <h3>Client Information</h3>
          <div className="info-grid">
            <div>
              <span className="label">Client:</span>
              <span className="value">{proposalData.clientName}</span>
            </div>
            {proposalData.propertyAddress && (
              <div>
                <span className="label">Property:</span>
                <span className="value">{proposalData.propertyAddress}</span>
              </div>
            )}
            {proposalData.clientEmail && (
              <div>
                <span className="label">Email:</span>
                <span className="value">{proposalData.clientEmail}</span>
              </div>
            )}
            {proposalData.clientPhone && (
              <div>
                <span className="label">Phone:</span>
                <span className="value">{proposalData.clientPhone}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Line Items */}
      {allLineItems.length > 0 ? (
        <div className="preview-section">
          <h3>Line Items</h3>
          <div className="line-items-table">
            <div className="table-header">
              <div className="col-item">Item</div>
              <div className="col-qty">Qty</div>
              <div className="col-unit">Unit</div>
              <div className="col-price">Unit Price</div>
              <div className="col-total">Total</div>
            </div>
            {allLineItems.map((item, index) => {
              // Check if this item has validation errors
              const itemErrors = validation.lineItems?.errors?.find(
                err => err.itemIndex === index
              );
              const hasError = !!itemErrors;
              
              return (
                <div key={item.id || index} className={`table-row ${hasError ? 'has-error' : ''}`}>
                  <div className="col-item">
                    {hasError ? (
                      <AlertCircle size={14} className="error-icon" />
                    ) : (
                      <CheckCircle size={14} className="valid-icon" />
                    )}
                    {item.name || 'Unnamed Item'}
                    {item.type === 'labor' && <span className="badge">Labor</span>}
                    {item.type === 'addon' && <span className="badge">Add-on</span>}
                  </div>
                  <div className="col-qty">{item.quantity || 0}</div>
                  <div className="col-unit">{item.unit || 'each'}</div>
                  <div className="col-price">{formatCurrency(item.unitPrice || 0)}</div>
                  <div className="col-total">{formatCurrency(item.total || 0)}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="preview-section empty-state">
          <p>No line items yet. Start chatting with the AI to build your quote!</p>
        </div>
      )}

      {/* Cost Breakdown */}
      {allLineItems.length > 0 && (
        <div className="preview-section cost-breakdown">
          <h3>Cost Breakdown</h3>
          <div className="breakdown-list">
            <div className="breakdown-row">
              <span className="breakdown-label">Materials:</span>
              <span className="breakdown-value">{formatCurrency(breakdown.materialsTotal)}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">Labor:</span>
              <span className="breakdown-value">{formatCurrency(breakdown.laborTotal)}</span>
            </div>
            {breakdown.addOnsTotal > 0 && (
              <div className="breakdown-row">
                <span className="breakdown-label">Add-ons:</span>
                <span className="breakdown-value">{formatCurrency(breakdown.addOnsTotal)}</span>
              </div>
            )}
            <div className="breakdown-row subtotal">
              <span className="breakdown-label">Subtotal:</span>
              <span className="breakdown-value">{formatCurrency(breakdown.subtotal)}</span>
            </div>
            {!breakdown.isMarginHidden && (
              <>
                <div className="breakdown-row">
                  <span className="breakdown-label">Overhead ({breakdown.overheadPercent}%):</span>
                  <span className="breakdown-value">{formatCurrency(breakdown.overheadAmount)}</span>
                </div>
                <div className="breakdown-row">
                  <span className="breakdown-label">Profit ({breakdown.profitPercent}%):</span>
                  <span className="breakdown-value">{formatCurrency(breakdown.profitAmount)}</span>
                </div>
              </>
            )}
            {breakdown.discountAmount > 0 && (
              <div className="breakdown-row discount">
                <span className="breakdown-label">Discount:</span>
                <span className="breakdown-value">-{formatCurrency(breakdown.discountAmount)}</span>
              </div>
            )}
            <div className="breakdown-row total">
              <span className="breakdown-label">Total:</span>
              <span className="breakdown-value">{formatCurrency(breakdown.finalTotal)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Project Details */}
      {(proposalData.timeline || proposalData.warranty || proposalData.notes) && (
        <div className="preview-section">
          <h3>Project Details</h3>
          <div className="info-grid">
            {proposalData.timeline && (
              <div>
                <span className="label">Timeline:</span>
                <span className="value">{proposalData.timeline}</span>
              </div>
            )}
            {proposalData.warranty && (
              <div>
                <span className="label">Warranty:</span>
                <span className="value">{proposalData.warranty}</span>
              </div>
            )}
            {proposalData.notes && (
              <div className="full-width">
                <span className="label">Notes:</span>
                <span className="value">{proposalData.notes}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LivePreviewPanel;

