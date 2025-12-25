import React, { useState } from 'react';
import { Package, Plus, Trash2, DollarSign } from 'lucide-react';
import { calculations } from '../../utils/calculations';
import { formatters } from '../../utils/formatters';
import './Materials.css';

const MATERIAL_TYPES = [
  { id: 'shingles', name: 'Asphalt Shingles', unit: 'square', basePrice: 120 },
  { id: 'underlayment', name: 'Underlayment', unit: 'square', basePrice: 25 },
  { id: 'ridge_cap', name: 'Ridge Cap Shingles', unit: 'linear foot', basePrice: 8 },
  { id: 'valley_metal', name: 'Valley Metal', unit: 'linear foot', basePrice: 12 },
  { id: 'drip_edge', name: 'Drip Edge', unit: 'linear foot', basePrice: 4 },
  { id: 'flashing', name: 'Step Flashing', unit: 'linear foot', basePrice: 6 },
  { id: 'nails', name: 'Roofing Nails', unit: 'box', basePrice: 35 },
  { id: 'vents', name: 'Roof Vents', unit: 'each', basePrice: 45 },
  { id: 'gutters', name: 'Gutters', unit: 'linear foot', basePrice: 15 },
  { id: 'downspouts', name: 'Downspouts', unit: 'linear foot', basePrice: 12 }
];

export default function MaterialsList({ 
  materials, 
  laborHours, 
  laborRate, 
  addOns, 
  onMaterialsChange, 
  onLaborChange, 
  onAddOnsChange,
  overheadPercent = 15,
  profitPercent = 20,
  discountAmount = 0
}) {
  const [showAddMaterial, setShowAddMaterial] = useState(false);

  const addMaterial = (materialType) => {
    const newMaterial = {
      id: Date.now(),
      type: materialType.id,
      name: materialType.name,
      quantity: 0,
      unit: materialType.unit,
      unitPrice: materialType.basePrice,
      total: 0
    };
    onMaterialsChange([...materials, newMaterial]);
    setShowAddMaterial(false);
  };

  const updateMaterial = (id, field, value) => {
    const updated = materials.map(material => {
      if (material.id === id) {
        const updatedMaterial = { ...material, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updatedMaterial.total = updatedMaterial.quantity * updatedMaterial.unitPrice;
        }
        return updatedMaterial;
      }
      return material;
    });
    onMaterialsChange(updated);
  };

  const removeMaterial = (id) => {
    onMaterialsChange(materials.filter(m => m.id !== id));
  };

  const addAddOn = () => {
    const newAddOn = {
      id: Date.now(),
      name: '',
      description: '',
      price: 0
    };
    onAddOnsChange([...addOns, newAddOn]);
  };

  const updateAddOn = (id, field, value) => {
    const updated = addOns.map(addon => 
      addon.id === id ? { ...addon, [field]: value } : addon
    );
    onAddOnsChange(updated);
  };

  const removeAddOn = (id) => {
    onAddOnsChange(addOns.filter(addon => addon.id !== id));
  };

  // Use the calculation utilities for consistent calculations (show margins for internal use)
  const costBreakdown = calculations.getCostBreakdown(
    materials, 
    laborHours, 
    laborRate, 
    addOns, 
    overheadPercent, 
    profitPercent,
    10, // overheadCostPercent (workers comp, insurance, office costs)
    20, // netMarginTarget (20% NET margin)
    discountAmount,
    false // Show margins in materials list for internal tracking
  );

  return (
    <div className="materials-container">
      <div className="materials-section">
        <div className="section-header">
          <Package size={24} />
          <h2>Materials & Products</h2>
          <button 
            onClick={() => setShowAddMaterial(true)} 
            className="add-material-btn"
          >
            <Plus size={18} />
            Add Material
          </button>
        </div>

        {showAddMaterial && (
          <div className="add-material-modal">
            <div className="modal-content">
              <h3>Select Material Type</h3>
              <div className="material-types-grid">
                {MATERIAL_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => addMaterial(type)}
                    className="material-type-btn"
                  >
                    <span className="material-name">{type.name}</span>
                    <span className="material-price">${type.basePrice}/{type.unit}</span>
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setShowAddMaterial(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="materials-list">
          {materials.length === 0 ? (
            <div className="no-materials">
              <p>No materials added yet. Click "Add Material" to get started.</p>
            </div>
          ) : (
            materials.map(material => (
              <div key={material.id} className="material-item">
                <div className="material-info">
                  <h4>{material.name}</h4>
                  <span className="material-unit">per {material.unit}</span>
                </div>
                
                <div className="material-inputs">
                  <div className="input-group">
                    <label>Quantity</label>
                    <input
                      type="number"
                      value={material.quantity}
                      onChange={(e) => updateMaterial(material.id, 'quantity', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="input-group">
                    <label>Unit Price</label>
                    <input
                      type="number"
                      value={material.unitPrice}
                      onChange={(e) => updateMaterial(material.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="material-total">
                    <span className="total-label">Total</span>
                    <span className="total-amount">{formatters.formatCurrency(material.total)}</span>
                  </div>
                  
                  <button 
                    onClick={() => removeMaterial(material.id)}
                    className="remove-material-btn"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="labor-section">
        <div className="section-header">
          <DollarSign size={24} />
          <h2>Labor Costs</h2>
        </div>
        
        <div className="labor-inputs">
          <div className="input-group">
            <label>Labor Hours</label>
            <input
              type="number"
              value={laborHours}
              onChange={(e) => onLaborChange({ hours: parseFloat(e.target.value) || 0, rate: laborRate })}
              placeholder="0"
            />
          </div>
          
          <div className="input-group">
            <label>Hourly Rate</label>
            <input
              type="number"
              value={laborRate}
              onChange={(e) => onLaborChange({ hours: laborHours, rate: parseFloat(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
          
          <div className="labor-total">
            <span className="total-label">Labor Total</span>
            <span className="total-amount">{formatters.formatCurrency(laborHours * laborRate)}</span>
          </div>
        </div>
      </div>

      <div className="addons-section">
        <div className="section-header">
          <Plus size={24} />
          <h2>Additional Services</h2>
          <button onClick={addAddOn} className="add-addon-btn">
            Add Service
          </button>
        </div>
        
        {addOns.map(addon => (
          <div key={addon.id} className="addon-item">
            <input
              type="text"
              placeholder="Service name (e.g., 'Gutter cleaning')"
              value={addon.name}
              onChange={(e) => updateAddOn(addon.id, 'name', e.target.value)}
              className="addon-name"
            />
            
            <input
              type="text"
              placeholder="Description"
              value={addon.description}
              onChange={(e) => updateAddOn(addon.id, 'description', e.target.value)}
              className="addon-description"
            />
            
            <input
              type="number"
              placeholder="Price"
              value={addon.price}
              onChange={(e) => updateAddOn(addon.id, 'price', parseFloat(e.target.value) || 0)}
              className="addon-price"
            />
            
            <button 
              onClick={() => removeAddOn(addon.id)}
              className="remove-addon-btn"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="quote-summary">
        <h3>Quote Summary</h3>
        
        {/* Subtotal breakdown */}
        <div className="summary-line">
          <span>Materials & Supplies:</span>
          <span>{formatters.formatCurrency(costBreakdown.materialsTotal)}</span>
        </div>
        <div className="summary-line">
          <span>Installation & Labor:</span>
          <span>{formatters.formatCurrency(costBreakdown.laborTotal)}</span>
        </div>
        {costBreakdown.addOnsTotal > 0 && (
          <div className="summary-line">
            <span>Additional Services:</span>
            <span>{formatters.formatCurrency(costBreakdown.addOnsTotal)}</span>
          </div>
        )}
        
        <div className="summary-divider"></div>
        
        {/* Business costs */}
        <div className="summary-line">
          <span>Subtotal:</span>
          <span>{formatters.formatCurrency(costBreakdown.subtotal)}</span>
        </div>
        <div className="summary-line">
          <span>Overhead Costs (Workers Comp, Insurance, Office - {formatters.formatPercentage(costBreakdown.overheadCostPercent || 10)}):</span>
          <span>{formatters.formatCurrency(costBreakdown.overheadCosts || 0)}</span>
        </div>
        <div className="summary-line">
          <span>Overhead ({formatters.formatPercentage(overheadPercent)}):</span>
          <span>{formatters.formatCurrency(costBreakdown.overheadAmount)}</span>
        </div>
        <div className="summary-line">
          <span>Profit ({formatters.formatPercentage(profitPercent)}):</span>
          <span>{formatters.formatCurrency(costBreakdown.profitAmount)}</span>
        </div>
        
        {discountAmount > 0 && (
          <div className="summary-line discount">
            <span>Discount:</span>
            <span>-{formatters.formatCurrency(discountAmount)}</span>
          </div>
        )}
        
        <div className="summary-total">
          <span>Total:</span>
          <span>{formatters.formatCurrency(costBreakdown.finalTotal)}</span>
        </div>
        
        {/* NET Margin Display */}
        <div className="summary-divider"></div>
        <div className="summary-line" style={{ fontWeight: 'bold', color: costBreakdown.netMarginActual >= (costBreakdown.netMarginTarget || 20) ? '#10b981' : '#ef4444' }}>
          <span>NET Margin (Target: {formatters.formatPercentage(costBreakdown.netMarginTarget || 20)}):</span>
          <span>{formatters.formatPercentage(costBreakdown.netMarginActual || 0)}</span>
        </div>
        {costBreakdown.totalCost > 0 && (
          <div className="summary-line" style={{ fontSize: '0.9em', color: '#666' }}>
            <span>Total Cost (Materials + Labor + Overhead Costs):</span>
            <span>{formatters.formatCurrency(costBreakdown.totalCost || 0)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
