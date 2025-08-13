import React from 'react';
import { Calculator, Home, Ruler } from 'lucide-react';
import './Measurements.css';

export default function MeasurementsPanel({ 
  measurements, 
  damageAreas, 
  onMeasurementsChange, 
  onDamageAreasChange 
}) {
  const handleMeasurementChange = (field, value) => {
    onMeasurementsChange({
      ...measurements,
      [field]: value
    });
  };

  const addDamageArea = () => {
    const newArea = {
      id: Date.now(),
      type: '',
      severity: 'medium',
      location: '',
      description: '',
      repairNeeded: ''
    };
    onDamageAreasChange([...damageAreas, newArea]);
  };

  const updateDamageArea = (id, field, value) => {
    const updated = damageAreas.map(area => 
      area.id === id ? { ...area, [field]: value } : area
    );
    onDamageAreasChange(updated);
  };

  const removeDamageArea = (id) => {
    onDamageAreasChange(damageAreas.filter(area => area.id !== id));
  };

  return (
    <div className="measurements-container">
      <div className="measurements-section">
        <div className="section-header">
          <Calculator size={24} />
          <h2>Roof Measurements</h2>
        </div>
        
        <div className="measurements-grid">
          <div className="measurement-group">
            <label>Total Squares</label>
            <input
              type="number"
              value={measurements.totalSquares}
              onChange={(e) => handleMeasurementChange('totalSquares', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            <span className="unit">squares</span>
          </div>

          <div className="measurement-group">
            <label>Ridge Length</label>
            <input
              type="number"
              value={measurements.ridgeLength}
              onChange={(e) => handleMeasurementChange('ridgeLength', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            <span className="unit">linear feet</span>
          </div>

          <div className="measurement-group">
            <label>Valley Length</label>
            <input
              type="number"
              value={measurements.valleyLength}
              onChange={(e) => handleMeasurementChange('valleyLength', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            <span className="unit">linear feet</span>
          </div>

          <div className="measurement-group">
            <label>Edge Length</label>
            <input
              type="number"
              value={measurements.edgeLength}
              onChange={(e) => handleMeasurementChange('edgeLength', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            <span className="unit">linear feet</span>
          </div>

          <div className="measurement-group">
            <label>Roof Pitch</label>
            <select
              value={measurements.pitch}
              onChange={(e) => handleMeasurementChange('pitch', e.target.value)}
            >
              <option value="">Select pitch</option>
              <option value="3/12">3/12</option>
              <option value="4/12">4/12</option>
              <option value="5/12">5/12</option>
              <option value="6/12">6/12</option>
              <option value="7/12">7/12</option>
              <option value="8/12">8/12</option>
              <option value="9/12">9/12</option>
              <option value="10/12">10/12</option>
              <option value="12/12">12/12</option>
            </select>
          </div>

          <div className="measurement-group">
            <label>Existing Layers</label>
            <select
              value={measurements.layers}
              onChange={(e) => handleMeasurementChange('layers', parseInt(e.target.value))}
            >
              <option value={1}>1 layer</option>
              <option value={2}>2 layers</option>
              <option value={3}>3 layers</option>
            </select>
          </div>

          <div className="measurement-group">
            <label>Penetrations</label>
            <input
              type="number"
              value={measurements.penetrations}
              onChange={(e) => handleMeasurementChange('penetrations', parseInt(e.target.value) || 0)}
              placeholder="0"
            />
            <span className="unit">vents, pipes, etc.</span>
          </div>

          <div className="measurement-group">
            <label>Skylights</label>
            <input
              type="number"
              value={measurements.skylights}
              onChange={(e) => handleMeasurementChange('skylights', parseInt(e.target.value) || 0)}
              placeholder="0"
            />
            <span className="unit">skylights</span>
          </div>
        </div>
      </div>

      <div className="damage-section">
        <div className="section-header">
          <Home size={24} />
          <h2>Damage Areas</h2>
          <button onClick={addDamageArea} className="add-damage-btn">
            Add Damage Area
          </button>
        </div>

        {damageAreas.length === 0 ? (
          <div className="no-damage">
            <p>No damage areas recorded. Click "Add Damage Area" to document any issues.</p>
          </div>
        ) : (
          <div className="damage-list">
            {damageAreas.map((area) => (
              <div key={area.id} className="damage-item">
                <div className="damage-header">
                  <select
                    value={area.type}
                    onChange={(e) => updateDamageArea(area.id, 'type', e.target.value)}
                    className="damage-type"
                  >
                    <option value="">Select damage type</option>
                    <option value="missing_shingles">Missing Shingles</option>
                    <option value="wind_damage">Wind Damage</option>
                    <option value="hail_damage">Hail Damage</option>
                    <option value="water_damage">Water Damage</option>
                    <option value="wear_tear">Normal Wear & Tear</option>
                    <option value="flashing_issues">Flashing Issues</option>
                    <option value="gutter_damage">Gutter Damage</option>
                  </select>
                  
                  <select
                    value={area.severity}
                    onChange={(e) => updateDamageArea(area.id, 'severity', e.target.value)}
                    className={`severity-select ${area.severity}`}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  
                  <button 
                    onClick={() => removeDamageArea(area.id)}
                    className="remove-damage-btn"
                  >
                    Remove
                  </button>
                </div>
                
                <div className="damage-details">
                  <input
                    type="text"
                    placeholder="Location (e.g., 'North side near chimney')"
                    value={area.location}
                    onChange={(e) => updateDamageArea(area.id, 'location', e.target.value)}
                    className="damage-location"
                  />
                  
                  <textarea
                    placeholder="Detailed description of the damage..."
                    value={area.description}
                    onChange={(e) => updateDamageArea(area.id, 'description', e.target.value)}
                    className="damage-description"
                    rows="2"
                  />
                  
                  <input
                    type="text"
                    placeholder="Repair needed (e.g., 'Replace 15 shingles')"
                    value={area.repairNeeded}
                    onChange={(e) => updateDamageArea(area.id, 'repairNeeded', e.target.value)}
                    className="damage-repair"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
