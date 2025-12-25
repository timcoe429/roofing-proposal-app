import React, { useState } from 'react';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import { calculations } from '../../utils/calculations';
import { formatters } from '../../utils/formatters';
import './ProposalPreview.css';

export default function ProposalPreview({ 
  proposalData, 
  companyData, 
  isDetailedMode = true, 
  onDetailedModeChange 
}) {
  // Get total from AI data or fallback to calculations
  const getFinalTotal = () => {
    // If AI has generated structured pricing with total, use that
    if (proposalData.structuredPricing && proposalData.totalAmount) {
      return proposalData.totalAmount;
    }
    
    // Fallback: calculate from individual items
    const breakdown = calculations.getCostBreakdown(
      proposalData.materials || [],
      proposalData.laborHours || 0,
      proposalData.laborRate || 0,
      proposalData.addOns || [],
      proposalData.overheadPercent || 15,
      proposalData.profitPercent || 20,
      proposalData.overheadCostPercent || 10,
      proposalData.netMarginTarget || 20,
      proposalData.discountAmount || 0,
      true // Hide margins - bake them into materials/labor like real companies do
    );
    return breakdown.finalTotal;
  };

  const getStructuredPricing = () => {
    if (proposalData.structuredPricing) {
      return proposalData.structuredPricing;
    }
    
    // Fallback: organize existing materials by category
    const materials = proposalData.materials?.filter(item => item.category !== 'labor') || [];
    const labor = proposalData.materials?.filter(item => item.category === 'labor') || [];
    
    return {
      materials,
      labor,
      additionalCosts: []
    };
  };

  // Default company data if none provided
  const company = companyData || {
    name: 'Your Company Name',
    address: 'Company Address',
    phone: 'Company Phone',
    email: 'Company Email',
    website: 'Company Website',
    license: 'License Number',
    insurance: 'Insurance Policy'
  };

  return (
    <div className="proposal-preview">
      <div className="preview-header">
        <div>
          <h2>Proposal Preview</h2>
          <p>Review your proposal before generating the final PDF</p>
        </div>
        <div className="preview-actions">
          <div className="mode-toggle">
            <span className={!isDetailedMode ? 'active' : ''}>Simple</span>
            <button 
              className="toggle-btn"
              onClick={() => onDetailedModeChange && onDetailedModeChange(!isDetailedMode)}
            >
              {isDetailedMode ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            </button>
            <span className={isDetailedMode ? 'active' : ''}>Detailed</span>
          </div>

        </div>
      </div>

      <div className="proposal-document">
        <div className="document-header">
          <div className="company-info">
            {company.logo && (
              <div className="company-logo">
                <img src={company.logo} alt="Company Logo" />
              </div>
            )}
            <h1>{company.name}</h1>
            <p>Professional Roofing Services</p>
            <div className="contact-info">
              <span>{company.phone}</span>
              <span>{company.email}</span>
              <span>License: {company.license}</span>
              <span>Insured: {company.insurance}</span>
            </div>
            <div className="company-address">
              <span>{company.address}</span>
              {company.website && <span>{company.website}</span>}
            </div>
          </div>
        </div>

        <div className="proposal-title">
          <h2>ROOFING PROPOSAL</h2>
          <div className="proposal-meta">
            <span>Proposal #: {Date.now().toString().slice(-6)}</span>
            <span>Date: {new Date().toLocaleDateString()}</span>
          </div>
        </div>

        <div className="client-section">
          <h3>Client Information</h3>
          <div className="client-details">
            <div className="detail-row">
              <span>Name:</span>
              <span>{proposalData.clientName || 'Not specified'}</span>
            </div>
            <div className="detail-row">
              <span>Email:</span>
              <span>{proposalData.clientEmail || 'Not specified'}</span>
            </div>
            <div className="detail-row">
              <span>Phone:</span>
              <span>{proposalData.clientPhone || 'Not specified'}</span>
            </div>
            <div className="detail-row">
              <span>Property Address:</span>
              <span>{proposalData.propertyAddress || proposalData.clientAddress || 'Not specified'}</span>
            </div>
          </div>
        </div>

        <div className="project-section">
          <h3>Project Details</h3>
          <div className="project-details">
            <div className="detail-row">
              <span>Scope:</span>
              <span>Complete Roof Replacement</span>
            </div>
            <div className="detail-row">
              <span>Roof Area:</span>
              <span>{proposalData.measurements?.totalSquares || 0} squares</span>
            </div>
            <div className="detail-row">
              <span>Pitch:</span>
              <span>{proposalData.measurements?.pitch || 'Not specified'}</span>
            </div>
            <div className="detail-row">
              <span>Timeline:</span>
              <span>{proposalData.timeline || 'Not specified'}</span>
            </div>
            <div className="detail-row">
              <span>Warranty:</span>
              <span>{proposalData.warranty || 'Not specified'}</span>
            </div>
          </div>
        </div>

        {isDetailedMode ? (
          // DETAILED MODE
          <div className="materials-section detailed-mode">
            <h3>Materials & Labor Breakdown</h3>
            
            {(() => {
              const pricing = getStructuredPricing();
              return (
                <>
                  {/* Materials Section */}
                  {pricing.materials.length > 0 && (
                    <div className="pricing-subsection">
                      <h4>Materials</h4>
                      <table className="materials-table">
                        <thead>
                          <tr>
                            <th>Description</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pricing.materials.map(material => (
                            <tr key={material.id}>
                              <td>{material.name}</td>
                              <td>{material.quantity} {material.unit}</td>
                              <td>{formatters.formatCurrency(material.unitPrice)}</td>
                              <td>{formatters.formatCurrency(material.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Labor Section */}
                  {pricing.labor.length > 0 && (
                    <div className="pricing-subsection">
                      <h4>Labor</h4>
                      <table className="materials-table">
                        <thead>
                          <tr>
                            <th>Description</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pricing.labor.map(labor => (
                            <tr key={labor.id}>
                              <td>{labor.name}</td>
                              <td>{labor.quantity} {labor.unit}</td>
                              <td>{formatters.formatCurrency(labor.unitPrice)}</td>
                              <td>{formatters.formatCurrency(labor.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Additional Costs Section */}
                  {pricing.additionalCosts.length > 0 && (
                    <div className="pricing-subsection">
                      <h4>Additional Costs</h4>
                      <table className="materials-table">
                        <thead>
                          <tr>
                            <th>Description</th>
                            <th>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pricing.additionalCosts.map(cost => (
                            <tr key={cost.id}>
                              <td>{cost.name}</td>
                              <td>{formatters.formatCurrency(cost.cost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Total */}
                  <div className="total-section">
                    <div className="total-row">
                      <strong>TOTAL PROJECT COST: {formatters.formatCurrency(getFinalTotal())}</strong>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        ) : (
          // SIMPLE MODE
          <div className="materials-section simple-mode">
            <h3>Project Cost</h3>
            <div className="simple-pricing">
              <div className="cost-line">
                <span>Complete Roof Replacement</span>
                <span>{proposalData.measurements?.totalSquares || 0} squares - {proposalData.materialType || 'metal_roofing'}</span>
              </div>
              
              {(() => {
                // Use AI structured pricing if available, otherwise calculate
                if (proposalData.structuredPricing) {
                  const structured = proposalData.structuredPricing;
                  const materialsTotal = (structured.materials || []).reduce((sum, item) => sum + (item.total || 0), 0);
                  const laborTotal = (structured.labor || []).reduce((sum, item) => sum + (item.total || 0), 0);
                  
                  return (
                    <>
                      <div className="cost-line">
                        <span>Materials & Supplies:</span>
                        <span>{formatters.formatCurrency(materialsTotal)}</span>
                      </div>
                      
                      <div className="cost-line">
                        <span>Installation & Labor:</span>
                        <span>{formatters.formatCurrency(laborTotal)}</span>
                      </div>
                    </>
                  );
                }
                
                // Fallback calculation for old proposals without structured pricing
                const costBreakdown = calculations.getCostBreakdown(
                  proposalData.materials || [],
                  proposalData.laborHours || 0,
                  proposalData.laborRate || 0,
                  proposalData.addOns || [],
                  proposalData.overheadPercent || 15,
                  proposalData.profitPercent || 20,
                  proposalData.overheadCostPercent || 10,
                  proposalData.netMarginTarget || 20,
                  proposalData.discountAmount || 0,
                  true
                );
                
                return (
                  <>
                    <div className="cost-line">
                      <span>Materials & Supplies:</span>
                      <span>{formatters.formatCurrency(costBreakdown.materialsTotal)}</span>
                    </div>
                    
                    <div className="cost-line">
                      <span>Installation & Labor:</span>
                      <span>{formatters.formatCurrency(costBreakdown.laborTotal)}</span>
                    </div>
                  </>
                );
              })()}
              
              <div className="cost-line total-line">
                <span><strong>TOTAL:</strong></span>
                <span><strong>{formatters.formatCurrency(getFinalTotal())}</strong></span>
              </div>
            </div>
          </div>
        )}

        {proposalData.notes && (
          <div className="notes-section">
            <h3>Additional Notes</h3>
            <p>{proposalData.notes}</p>
          </div>
        )}

                <div className="terms-section">
          <h3>Legal Information</h3>
          <div className="terms-content">
            <p>
              This proposal is subject to our{' '}
              {company.termsConditionsUrl ? (
                <a href={company.termsConditionsUrl} target="_blank" rel="noopener noreferrer">
                  Terms & Conditions
                </a>
              ) : (
                'Terms & Conditions'
              )}
              {company.privacyPolicyUrl && (
                <>
                  {' '}and{' '}
                  <a href={company.privacyPolicyUrl} target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </a>
                </>
              )}
              .
            </p>
            
            <div className="legal-details">
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
