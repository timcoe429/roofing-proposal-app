import React from 'react';
import { FileText, Download, Send, Eye } from 'lucide-react';
import './ProposalPreview.css';

export default function ProposalPreview({ proposalData, companyData }) {
  const calculateTotal = () => {
    const materialsTotal = proposalData.materials?.reduce((sum, material) => sum + (material.total || 0), 0) || 0;
    const laborTotal = (proposalData.laborHours || 0) * (proposalData.laborRate || 0);
    const addOnsTotal = proposalData.addOns?.reduce((sum, addon) => sum + (addon.price || 0), 0) || 0;
    return materialsTotal + laborTotal + addOnsTotal;
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
          <button className="preview-btn">
            <Eye size={18} />
            Preview PDF
          </button>
          <button className="download-btn">
            <Download size={18} />
            Download PDF
          </button>
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

        <div className="materials-section">
          <h3>Materials & Labor</h3>
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
              {proposalData.materials?.map(material => (
                <tr key={material.id}>
                  <td>{material.name}</td>
                  <td>{material.quantity} {material.unit}</td>
                  <td>${material.unitPrice?.toFixed(2)}</td>
                  <td>${material.total?.toFixed(2)}</td>
                </tr>
              ))}
              {proposalData.laborHours > 0 && (
                <tr>
                  <td>Labor</td>
                  <td>{proposalData.laborHours} hours</td>
                  <td>${proposalData.laborRate?.toFixed(2)}</td>
                  <td>${((proposalData.laborHours || 0) * (proposalData.laborRate || 0)).toFixed(2)}</td>
                </tr>
              )}
              {proposalData.addOns?.map(addon => (
                <tr key={addon.id}>
                  <td>{addon.name}</td>
                  <td>1</td>
                  <td>${addon.price?.toFixed(2)}</td>
                  <td>${addon.price?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td colSpan="3"><strong>TOTAL PROJECT COST</strong></td>
                <td><strong>${calculateTotal().toFixed(2)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

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
              <h4>Payment Terms</h4>
              <ul>
                <li>50% deposit required to begin work</li>
                <li>Remaining balance due upon completion</li>
                <li>Payment accepted via check, cash, or credit card</li>
              </ul>
              
              <h4>Work Guarantee</h4>
              <ul>
                <li>All work guaranteed against defects in workmanship</li>
                <li>Materials covered by manufacturer warranty</li>
                <li>Free repairs for workmanship issues within warranty period</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="signature-section">
          <div className="signature-block">
            <div className="signature-line">
              <span>Client Signature</span>
              <div className="line"></div>
              <span>Date</span>
            </div>
            <div className="signature-line">
              <span>Contractor Signature</span>
              <div className="line"></div>
              <span>Date</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
