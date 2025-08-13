import React, { useState } from 'react';
import { Calculator, Home, Ruler, Upload } from 'lucide-react';

const PITCH_MULTIPLIERS = {
  '3/12': 1.03,
  '4/12': 1.05,
  '5/12': 1.08,
  '6/12': 1.12,
  '7/12': 1.16,
  '8/12': 1.20,
  '9/12': 1.25,
  '10/12': 1.30,
  '12/12': 1.41
};

export default function MeasurementCalculator({ onCalculated }) {
  const [method, setMethod] = useState('footprint');
  const [inputs, setInputs] = useState({
    length: '',
    width: '',
    pitch: '6/12',
    complexity: 'simple'
  });

  const calculateFromFootprint = () => {
    const length = parseFloat(inputs.length) || 0;
    const width = parseFloat(inputs.width) || 0;
    const baseArea = length * width;
    const pitchMultiplier = PITCH_MULTIPLIERS[inputs.pitch] || 1.12;
    const complexityMultiplier = {
      'simple': 1.0,
      'moderate': 1.15,
      'complex': 1.3
    }[inputs.complexity] || 1.0;

    const totalSqFt = baseArea * pitchMultiplier * complexityMultiplier;
    const squares = totalSqFt / 100;

    return {
      totalSquares: Math.ceil(squares * 10) / 10, // Round to 1 decimal
      method: 'House Footprint Calculation',
      confidence: inputs.complexity === 'simple' ? 85 : 75,
      details: {
        baseArea,
        pitchMultiplier,
        complexityMultiplier,
        totalSqFt
      }
    };
  };

  const handleCalculate = () => {
    const result = calculateFromFootprint();
    onCalculated(result);
  };

  return (
    <div className="measurement-calculator">
      <div className="calculator-header">
        <Calculator size={20} />
        <h3>Quick Measurement Calculator</h3>
      </div>

      <div className="method-selector">
        <button 
          className={`method-option ${method === 'footprint' ? 'active' : ''}`}
          onClick={() => setMethod('footprint')}
        >
          <Home size={16} />
          House Footprint
        </button>
        <button 
          className={`method-option ${method === 'manual' ? 'active' : ''}`}
          onClick={() => setMethod('manual')}
        >
          <Ruler size={16} />
          Manual Measurement
        </button>
        <button 
          className={`method-option ${method === 'satellite' ? 'active' : ''}`}
          onClick={() => setMethod('satellite')}
        >
          <Upload size={16} />
          Satellite Analysis
        </button>
      </div>

      {method === 'footprint' && (
        <div className="footprint-calculator">
          <div className="calc-section">
            <h4>House Dimensions</h4>
            <div className="input-row">
              <div className="input-group">
                <label>Length (ft)</label>
                <input
                  type="number"
                  value={inputs.length}
                  onChange={(e) => setInputs({...inputs, length: e.target.value})}
                  placeholder="40"
                />
              </div>
              <div className="input-group">
                <label>Width (ft)</label>
                <input
                  type="number"
                  value={inputs.width}
                  onChange={(e) => setInputs({...inputs, width: e.target.value})}
                  placeholder="30"
                />
              </div>
            </div>
          </div>

          <div className="calc-section">
            <h4>Roof Details</h4>
            <div className="input-row">
              <div className="input-group">
                <label>Roof Pitch</label>
                <select
                  value={inputs.pitch}
                  onChange={(e) => setInputs({...inputs, pitch: e.target.value})}
                >
                  <option value="3/12">3/12 (Low slope)</option>
                  <option value="4/12">4/12</option>
                  <option value="5/12">5/12</option>
                  <option value="6/12">6/12 (Standard)</option>
                  <option value="7/12">7/12</option>
                  <option value="8/12">8/12 (Steep)</option>
                  <option value="9/12">9/12</option>
                  <option value="10/12">10/12</option>
                  <option value="12/12">12/12 (45°)</option>
                </select>
              </div>
              <div className="input-group">
                <label>Complexity</label>
                <select
                  value={inputs.complexity}
                  onChange={(e) => setInputs({...inputs, complexity: e.target.value})}
                >
                  <option value="simple">Simple (rectangle)</option>
                  <option value="moderate">Moderate (some angles)</option>
                  <option value="complex">Complex (many features)</option>
                </select>
              </div>
            </div>
          </div>

          {inputs.length && inputs.width && (
            <div className="calc-preview">
              <div className="preview-calc">
                <div className="calc-line">
                  <span>Base area:</span>
                  <span>{inputs.length} × {inputs.width} = {(parseFloat(inputs.length) * parseFloat(inputs.width)).toLocaleString()} sq ft</span>
                </div>
                <div className="calc-line">
                  <span>Pitch multiplier ({inputs.pitch}):</span>
                  <span>×{PITCH_MULTIPLIERS[inputs.pitch]}</span>
                </div>
                <div className="calc-line">
                  <span>Complexity ({inputs.complexity}):</span>
                  <span>×{inputs.complexity === 'simple' ? '1.0' : inputs.complexity === 'moderate' ? '1.15' : '1.3'}</span>
                </div>
                <div className="calc-result">
                  <span>Estimated roof area:</span>
                  <span><strong>{calculateFromFootprint().totalSquares} squares</strong></span>
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={handleCalculate}
            className="calculate-btn"
            disabled={!inputs.length || !inputs.width}
          >
            Calculate Roof Area
          </button>
        </div>
      )}

      {method === 'manual' && (
        <div className="manual-calculator">
          <div className="manual-tips">
            <h4>📐 Manual Measurement Tips</h4>
            <ul>
              <li><strong>Ground measurements:</strong> Measure house perimeter</li>
              <li><strong>Pitch calculation:</strong> Use pitch gauge or rise/run method</li>
              <li><strong>Add complexity:</strong> Account for dormers, valleys, hips</li>
              <li><strong>Safety first:</strong> Don't climb on steep or damaged roofs</li>
            </ul>
          </div>
          
          <div className="manual-formula">
            <h4>Quick Formula:</h4>
            <div className="formula-box">
              <strong>Roof Area = Ground Area × Pitch Multiplier × Complexity Factor</strong>
            </div>
          </div>
        </div>
      )}

      {method === 'satellite' && (
        <div className="satellite-calculator">
          <div className="satellite-upload">
            <div className="upload-zone">
              <Upload size={32} />
              <h4>Upload Satellite/Aerial Image</h4>
              <p>I'll analyze the roof and estimate dimensions</p>
              <button className="upload-btn">Choose Image</button>
            </div>
          </div>
          
          <div className="satellite-tips">
            <h4>🛰️ For Best Results:</h4>
            <ul>
              <li>Use recent, high-resolution images</li>
              <li>Include a known reference (house, driveway, etc.)</li>
              <li>Provide approximate house dimensions if known</li>
              <li>Remember: This gives estimates, not exact measurements</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
