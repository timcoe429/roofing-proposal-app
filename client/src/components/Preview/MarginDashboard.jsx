import React, { useState } from 'react';
import { TrendingUp, DollarSign, Percent, ChevronDown, ChevronUp } from 'lucide-react';
import './MarginDashboard.css';

const MarginDashboard = ({ breakdown, overheadPercent, profitPercent, onUpdatePercentages }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Safety check
  if (!breakdown) {
    return null;
  }

  // Helper to safely convert strings/numbers to numbers
  const toNumber = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === '') return defaultValue;
    if (typeof value === 'number') return isNaN(value) ? defaultValue : value;
    const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(num) ? num : defaultValue;
  };

  const formatCurrency = (amount) => {
    const num = toNumber(amount, 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatPercentage = (value) => {
    const num = toNumber(value, 0);
    return `${num.toFixed(1)}%`;
  };

  const handleProfitChange = (e) => {
    const newProfit = parseFloat(e.target.value) || 0;
    onUpdatePercentages({ profitPercent: newProfit });
  };

  const handleOverheadChange = (e) => {
    const newOverhead = parseFloat(e.target.value) || 0;
    onUpdatePercentages({ overheadPercent: newOverhead });
  };

  // Convert to numbers - breakdown values might be strings from API
  const netMarginActual = toNumber(breakdown.netMarginActual, 0);
  const netMarginTarget = toNumber(breakdown.netMarginTarget, 20);
  const netMarginColor = netMarginActual >= netMarginTarget 
    ? '#10b981' 
    : netMarginActual >= netMarginTarget * 0.8
    ? '#f59e0b'
    : '#ef4444';

  return (
    <div className={`margin-dashboard ${isCollapsed ? 'collapsed' : ''}`}>
      <button 
        className="dashboard-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Expand dashboard' : 'Collapse dashboard'}
      >
        {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        <span>{isCollapsed ? 'Show Margins' : 'Hide'}</span>
      </button>

      {/* Compact summary shown when collapsed */}
      {isCollapsed && (
        <div className="dashboard-summary">
          <div className="summary-item">
            <span className="summary-label">Profit:</span>
            <span className="summary-value">{formatPercentage(profitPercent || 20)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Overhead:</span>
            <span className="summary-value">{formatPercentage(overheadPercent || 10)}</span>
          </div>
          <div className="summary-item net-margin-summary" style={{ color: netMarginColor }}>
            <TrendingUp size={14} />
            <span className="summary-label">NET:</span>
            <span className="summary-value">{formatPercentage(netMarginActual)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total:</span>
            <span className="summary-value final">{formatCurrency(breakdown.finalTotal || 0)}</span>
          </div>
        </div>
      )}

      {/* Full dashboard when expanded */}
      {!isCollapsed && (
        <div className="dashboard-content">
          <div className="dashboard-card profit-card">
            <div className="card-header">
              <Percent size={14} />
              <span className="card-label">Profit %</span>
            </div>
            <div className="card-content">
              <input
                type="range"
                min="0"
                max="50"
                step="0.5"
                value={toNumber(profitPercent, 20)}
                onChange={handleProfitChange}
                className="slider"
              />
              <div className="card-value">{formatPercentage(profitPercent || 20)}</div>
            </div>
            <div className="card-amount">{formatCurrency(breakdown.profitAmount || 0)}</div>
          </div>

          <div className="dashboard-card overhead-card">
            <div className="card-header">
              <Percent size={14} />
              <span className="card-label">Overhead %</span>
            </div>
            <div className="card-content">
              <input
                type="range"
                min="0"
                max="30"
                step="0.5"
                value={toNumber(overheadPercent, 10)}
                onChange={handleOverheadChange}
                className="slider"
              />
              <div className="card-value">{formatPercentage(overheadPercent || 10)}</div>
            </div>
            <div className="card-amount">{formatCurrency(breakdown.overheadAmount || 0)}</div>
          </div>

          <div className="dashboard-card overhead-costs-card">
            <div className="card-header">
              <DollarSign size={14} />
              <span className="card-label">Overhead Costs</span>
            </div>
            <div className="card-content">
              <div className="card-value fixed">{formatPercentage(breakdown.overheadCostPercent || 10)}</div>
            </div>
            <div className="card-amount">{formatCurrency(breakdown.overheadCosts || 0)}</div>
          </div>

          <div className="dashboard-card net-margin-card" style={{ borderColor: netMarginColor }}>
            <div className="card-header">
              <TrendingUp size={14} />
              <span className="card-label">NET Margin</span>
            </div>
            <div className="card-content">
              <div className="card-value net-margin-value" style={{ color: netMarginColor }}>
                {formatPercentage(netMarginActual)}
              </div>
              <div className="card-subtext">Target: {formatPercentage(netMarginTarget)}</div>
            </div>
            <div className="card-status" style={{ color: netMarginColor }}>
              {netMarginActual >= netMarginTarget ? '✓ ON TARGET' : '⚠ BELOW TARGET'}
            </div>
          </div>

          <div className="dashboard-card total-cost-card">
            <div className="card-header">
              <DollarSign size={14} />
              <span className="card-label">Total Cost</span>
            </div>
            <div className="card-content">
              <div className="card-value">{formatCurrency(breakdown.totalCost || 0)}</div>
            </div>
          </div>

          <div className="dashboard-card final-total-card">
            <div className="card-header">
              <DollarSign size={14} />
              <span className="card-label">Final Total</span>
            </div>
            <div className="card-content">
              <div className="card-value final">{formatCurrency(breakdown.finalTotal || 0)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarginDashboard;

