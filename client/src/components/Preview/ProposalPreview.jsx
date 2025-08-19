import React, { useState } from 'react';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import './ProposalPreview.css';

export default function ProposalPreview({ 
  proposalData, 
  companyData, 
  isDetailedMode = true, 
  onDetailedModeChange 
}) {
  const calculateTotal = () => {
    // Use AI's calculated total if available, otherwise calculate from components
    if (proposalData.totalAmount) {
      return parseFloat(proposalData.totalAmount);
    }
    
    const materialsTotal = proposalData.materials?.reduce((sum, material) => sum + (material.total || 0), 0) || 0;
    const laborTotal = (proposalData.laborHours || 0) * (proposalData.laborRate || 0);
    const addOnsTotal = proposalData.addOns?.reduce((sum, addon) => sum + (addon.price || 0), 0) || 0;
    
    // Add additional costs from structured pricing if available
    const additionalTotal = proposalData.structuredPricing?.additionalCosts?.reduce((sum, cost) => sum + (cost.cost || 0), 0) || 0;
    
    return materialsTotal + laborTotal + addOnsTotal + additionalTotal;
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
                              <td>${material.unitPrice?.toFixed(2)}</td>
                              <td>${material.total?.toFixed(2)}</td>
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
                              <td>${labor.unitPrice?.toFixed(2)}</td>
                              <td>${labor.total?.toFixed(2)}</td>
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
                              <td>${cost.cost?.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Total */}
                  <div className="total-section">
                    <div className="total-row">
                      <strong>TOTAL PROJECT COST: ${calculateTotal().toFixed(2)}</strong>
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
                <span>{proposalData.measurements?.totalSquares || 0} squares - {proposalData.materialType || 'Materials'}</span>
              </div>
              
              {(() => {
                const pricing = getStructuredPricing();
                const materialsTotal = pricing.materials.reduce((sum, item) => sum + (item.total || 0), 0);
                const laborTotal = pricing.labor.reduce((sum, item) => sum + (item.total || 0), 0);
                const additionalTotal = pricing.additionalCosts.reduce((sum, item) => sum + (item.cost || 0), 0);
                
                return (
                  <>
                    {materialsTotal + laborTotal > 0 && (
                      <div className="cost-line">
                        <span>Materials & Installation:</span>
                        <span>${(materialsTotal + laborTotal).toFixed(2)}</span>
                      </div>
                    )}
                    
                    {additionalTotal > 0 && (
                      <div className="cost-line">
                        <span>Permits & Additional Costs:</span>
                        <span>${additionalTotal.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                );
              })()}
              
              <div className="cost-line total-line">
                <span><strong>TOTAL:</strong></span>
                <span><strong>${calculateTotal().toFixed(2)}</strong></span>
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
