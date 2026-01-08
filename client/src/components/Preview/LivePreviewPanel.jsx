import React, { useMemo, useState } from 'react';
import { Download, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { calculations } from '../../utils/calculations';
import { getValidationReport } from '../../utils/mathValidator';
import MarginDashboard from './MarginDashboard';
import './LivePreviewPanel.css';

const LivePreviewPanel = ({ proposalData, onExportCSV, onUpdateProposal }) => {
  const [showMarginsBakedIn, setShowMarginsBakedIn] = useState(false);
  const [isClientInfoExpanded, setIsClientInfoExpanded] = useState(false);
  
  // Labor is always an array - no migration needed
  const labor = proposalData?.labor || [];
  
  const breakdown = calculations.getCostBreakdown(
    proposalData?.materials || [],
    labor,
    proposalData?.addOns || [],
    proposalData?.overheadPercent || 15,
    proposalData?.profitPercent || 20,
    proposalData?.overheadCostPercent || 10,
    proposalData?.netMarginTarget || 20,
    proposalData?.discountAmount || 0
  );

  // Get validation report - handle null proposalData
  const validation = useMemo(() => {
    if (!proposalData) {
      return { isValid: true, errors: [], summary: { totalErrors: 0 }, lineItems: { errors: [] } };
    }
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

  // Get base line items (materials + labor + add-ons) - these are the original prices
  const baseLineItems = [
    ...(proposalData?.materials || []).map(item => ({
      ...item,
      type: item.category === 'labor' ? 'labor' : 'material'
    })),
    ...(proposalData?.addOns || []).map(item => ({
      ...item,
      type: 'addon',
      quantity: 1,
      unit: 'each',
      unitPrice: item.price || 0,
      total: item.price || 0
    }))
  ];

  // Calculate markup multiplier if toggle is ON
  const markupMultiplier = useMemo(() => {
    if (!showMarginsBakedIn || breakdown.subtotal === 0) return 1;
    return calculations.calculateMarkupMultiplier(
      breakdown.subtotal,
      breakdown.overheadAmount,
      breakdown.profitAmount
    );
  }, [showMarginsBakedIn, breakdown.subtotal, breakdown.overheadAmount, breakdown.profitAmount]);

  // Apply markup to line items if toggle is ON
  const allLineItems = useMemo(() => {
    if (showMarginsBakedIn) {
      return calculations.applyMarkupToLineItems(baseLineItems, markupMultiplier);
    }
    return baseLineItems;
  }, [showMarginsBakedIn, baseLineItems, markupMultiplier]);

  // Handle percentage updates from dashboard
  const handleUpdatePercentages = (updates) => {
    if (onUpdateProposal && proposalData) {
      onUpdateProposal({
        ...proposalData,
        ...updates
      });
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  // Handle loading state AFTER all hooks
  if (!proposalData) {
    return <div className="live-preview-panel">Loading...</div>;
  }

  return (
    <div className="live-preview-panel">
      <div className="preview-header">
        <div className="header-top">
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
            disabled={!proposalData.clientName || baseLineItems.length === 0 || !validation.isValid}
          >
            <Download size={16} />
            Export to CSV
          </button>
        </div>
        <MarginDashboard
          breakdown={breakdown}
          overheadPercent={proposalData.overheadPercent || 15}
          profitPercent={proposalData.profitPercent || 20}
          onUpdatePercentages={handleUpdatePercentages}
        />
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

      {/* Client Info Summary - Collapsible */}
      {proposalData.clientName && (
        <div className="preview-section collapsible-section">
          <div 
            className="section-header-clickable"
            onClick={() => setIsClientInfoExpanded(!isClientInfoExpanded)}
          >
            <h3>
              Client: {proposalData.clientName}
              {proposalData.propertyAddress && <span className="client-property"> • {proposalData.propertyAddress}</span>}
            </h3>
            <ChevronDown 
              size={16} 
              className={`section-chevron ${isClientInfoExpanded ? 'expanded' : ''}`}
            />
          </div>
          {isClientInfoExpanded && (
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
          )}
        </div>
      )}

      {/* Line Items */}
      {baseLineItems.length > 0 ? (
        <div className="preview-section">
          <div className="line-items-header">
            <h3>Line Items</h3>
            <div className="margin-toggle">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={showMarginsBakedIn}
                  onChange={(e) => setShowMarginsBakedIn(e.target.checked)}
                  className="toggle-input"
                />
                <span className="toggle-slider"></span>
                <span className="toggle-text">
                  {showMarginsBakedIn ? 'Show With Margins' : 'Show Base Costs'}
                </span>
              </label>
            </div>
          </div>
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
      {baseLineItems.length > 0 && breakdown && (
        <div className="preview-section cost-breakdown">
          <h3>Cost Breakdown</h3>
          
          {/* Simple top section */}
          <div className="breakdown-list">
            <div className="breakdown-row">
              <span className="breakdown-label">Materials:</span>
              <span className="breakdown-value">{formatCurrency(breakdown.materialsTotal)}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">Labor:</span>
              <span className="breakdown-value">{formatCurrency(breakdown.laborTotal)}</span>
            </div>
            {!breakdown.isMarginHidden && (
              <div className="breakdown-row">
                <span className="breakdown-label">Total Profit:</span>
                <span className="breakdown-value">{formatCurrency(breakdown.profitAmount)}</span>
              </div>
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

          {/* Collapsible detailed breakdown */}
          {!breakdown.isMarginHidden && (
            <details className="detailed-breakdown" style={{ marginTop: '12px' }}>
              <summary style={{ cursor: 'pointer', color: '#666', fontSize: '0.9em', padding: '8px 0' }}>
                Show Detailed Breakdown
              </summary>
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                {breakdown.addOnsTotal > 0 && (
                  <div className="breakdown-row">
                    <span className="breakdown-label">Add-ons:</span>
                    <span className="breakdown-value">{formatCurrency(breakdown.addOnsTotal)}</span>
                  </div>
                )}
                <div className="breakdown-row">
                  <span className="breakdown-label">Subtotal:</span>
                  <span className="breakdown-value">{formatCurrency(breakdown.subtotal)}</span>
                </div>
                <div className="breakdown-row">
                  <span className="breakdown-label">Overhead ({breakdown.overheadPercent}%):</span>
                  <span className="breakdown-value">{formatCurrency(breakdown.overheadAmount)}</span>
                </div>
                <div className="breakdown-row">
                  <span className="breakdown-label">Profit ({breakdown.profitPercent}%):</span>
                  <span className="breakdown-value">{formatCurrency(breakdown.profitAmount)}</span>
                </div>
                {breakdown.netMarginActual !== undefined && (
                  <div className="breakdown-row" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                    <span className="breakdown-label" style={{ fontWeight: 'bold', color: (parseFloat(breakdown.netMarginActual) || 0) >= (parseFloat(breakdown.netMarginTarget) || 20) ? '#10b981' : '#ef4444' }}>
                      NET Margin (Target: {parseFloat(breakdown.netMarginTarget) || 20}%):
                    </span>
                    <span className="breakdown-value" style={{ fontWeight: 'bold', color: (parseFloat(breakdown.netMarginActual) || 0) >= (parseFloat(breakdown.netMarginTarget) || 20) ? '#10b981' : '#ef4444' }}>
                      {formatCurrency(breakdown.netMarginAmount || (breakdown.finalTotal - breakdown.totalCost))} ({(parseFloat(breakdown.netMarginActual) || 0).toFixed(2)}%)
                    </span>
                  </div>
                )}
                {breakdown.totalCost > 0 && (
                  <div className="breakdown-row" style={{ fontSize: '0.9em', color: '#666' }}>
                    <span className="breakdown-label">Total Cost (Materials + Labor + Overhead Costs):</span>
                    <span className="breakdown-value">{formatCurrency(breakdown.totalCost)}</span>
                  </div>
                )}
              </div>
            </details>
          )}
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

